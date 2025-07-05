import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface VideoEditRequest {
  videoId: string;
  operations: VideoEditOperation[];
}

export interface VideoEditOperation {
  type: 'trim' | 'crop' | 'rotate' | 'filter' | 'speed' | 'volume';
  parameters: {
    // For trim operation
    startTime?: number;
    endTime?: number;
    
    // For crop operation
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    
    // For rotate operation
    degrees?: number;
    
    // For filter operation
    filterType?: 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation';
    intensity?: number;
    
    // For speed operation
    speedMultiplier?: number;
    
    // For volume operation
    volumeLevel?: number;
  };
}

export interface VideoEditResponse {
  success: boolean;
  editId?: string;
  previewUrl?: string;
  estimatedTime?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient(cookies());
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Parse request body
    let body: VideoEditRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { videoId, operations } = body;

    // Validate required fields
    if (!videoId || !operations || operations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'videoId and operations are required'
      }, { status: 400 });
    }

    // Verify video exists and belongs to user
    const { data: video, error: videoError } = await supabase
      .from('user_videos')
      .select('id, user_id, video_url, title, file_size')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({
        success: false,
        error: 'Video not found or access denied'
      }, { status: 404 });
    }

    // Validate operations
    const validationError = validateOperations(operations);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }

    // Generate edit ID
    const editId = `edit_${videoId}_${Date.now()}`;

    // Create edit record
    const { data: editRecord, error: editError } = await supabase
      .from('video_edits')
      .insert({
        id: editId,
        video_id: videoId,
        user_id: user.id,
        operations: operations,
        status: 'queued',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (editError) {
      console.error('Error creating edit record:', editError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create edit request'
      }, { status: 500 });
    }

    // Start background editing process
    const editingResult = await initiateVideoEditing({
      editId,
      videoId,
      userId: user.id,
      videoUrl: video.video_url,
      operations
    });

    if (!editingResult.success) {
      // Update edit record with error
      await supabase
        .from('video_edits')
        .update({
          status: 'failed',
          error_message: editingResult.error
        })
        .eq('id', editId);

      return NextResponse.json({
        success: false,
        error: editingResult.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      editId,
      estimatedTime: calculateEditTime(operations),
      status: 'queued'
    });

  } catch (error) {
    console.error('Error processing video edit:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient(cookies());
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const editId = searchParams.get('editId');
    const videoId = searchParams.get('videoId');

    if (!editId && !videoId) {
      return NextResponse.json({
        success: false,
        error: 'editId or videoId is required'
      }, { status: 400 });
    }

    // Get edit status
    let query = supabase
      .from('video_edits')
      .select('*')
      .eq('user_id', user.id);

    if (editId) {
      query = query.eq('id', editId);
    } else if (videoId) {
      query = query.eq('video_id', videoId);
    }

    const { data: edits, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching edit status:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch edit status'
      }, { status: 500 });
    }

    if (!edits || edits.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No edit records found'
      }, { status: 404 });
    }

    const edit = edits[0];

    return NextResponse.json({
      success: true,
      editId: edit.id,
      videoId: edit.video_id,
      status: edit.status,
      operations: edit.operations,
      previewUrl: edit.preview_url,
      outputUrl: edit.output_url,
      error: edit.error_message,
      createdAt: edit.created_at,
      completedAt: edit.completed_at
    });

  } catch (error) {
    console.error('Error fetching edit status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to validate edit operations
function validateOperations(operations: VideoEditOperation[]): string | null {
  for (const operation of operations) {
    switch (operation.type) {
      case 'trim':
        if (!operation.parameters.startTime || !operation.parameters.endTime) {
          return 'Trim operation requires startTime and endTime parameters';
        }
        if (operation.parameters.startTime >= operation.parameters.endTime) {
          return 'Trim startTime must be less than endTime';
        }
        break;
      
      case 'crop':
        const { x, y, width, height } = operation.parameters;
        if (x === undefined || y === undefined || !width || !height) {
          return 'Crop operation requires x, y, width, and height parameters';
        }
        if (x < 0 || y < 0 || width <= 0 || height <= 0) {
          return 'Crop parameters must be positive numbers';
        }
        break;
      
      case 'rotate':
        if (!operation.parameters.degrees) {
          return 'Rotate operation requires degrees parameter';
        }
        break;
      
      case 'filter':
        if (!operation.parameters.filterType) {
          return 'Filter operation requires filterType parameter';
        }
        break;
      
      case 'speed':
        if (!operation.parameters.speedMultiplier) {
          return 'Speed operation requires speedMultiplier parameter';
        }
        if (operation.parameters.speedMultiplier <= 0) {
          return 'Speed multiplier must be positive';
        }
        break;
      
      case 'volume':
        if (operation.parameters.volumeLevel === undefined) {
          return 'Volume operation requires volumeLevel parameter';
        }
        if (operation.parameters.volumeLevel < 0 || operation.parameters.volumeLevel > 100) {
          return 'Volume level must be between 0 and 100';
        }
        break;
      
      default:
        return `Unknown operation type: ${operation.type}`;
    }
  }
  return null;
}

// Helper function to initiate video editing
async function initiateVideoEditing(params: {
  editId: string;
  videoId: string;
  userId: string;
  videoUrl: string;
  operations: VideoEditOperation[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { editId, videoId, userId, videoUrl, operations } = params;

    console.log(`Video editing initiated for edit ${editId} with ${operations.length} operations`);

    // Import and start the video processing service
    const { videoProcessingService } = await import('@/services/videoProcessingService');
    
    // Start processing in background
    const result = await videoProcessingService.startProcessing(editId);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to start video processing'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error initiating video editing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Video editing initiation failed' 
    };
  }
}

// Helper function to calculate estimated edit time
function calculateEditTime(operations: VideoEditOperation[]): string {
  let baseTime = 10; // 10 seconds base time
  
  for (const operation of operations) {
    switch (operation.type) {
      case 'trim':
        baseTime += 5;
        break;
      case 'crop':
        baseTime += 15;
        break;
      case 'rotate':
        baseTime += 10;
        break;
      case 'filter':
        baseTime += 20;
        break;
      case 'speed':
        baseTime += 25;
        break;
      case 'volume':
        baseTime += 5;
        break;
    }
  }
  
  const minutes = Math.ceil(baseTime / 60);
  return `${minutes}-${minutes + 1} minutes`;
}