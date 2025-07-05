import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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

    // Get processing status from video_processing_results
    let query = supabase
      .from('video_processing_results')
      .select(`
        *,
        video_edits!inner(user_id, video_id, operations, status as edit_status)
      `)
      .eq('video_edits.user_id', user.id)
      .order('created_at', { ascending: false });

    if (editId) {
      query = query.eq('processing_id', editId);
    } else if (videoId) {
      query = query.eq('video_id', videoId);
    }

    const { data: processingResults, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching processing status:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch processing status'
      }, { status: 500 });
    }

    if (!processingResults || processingResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No processing records found'
      }, { status: 404 });
    }

    // Get the latest processing result
    const latestResult = processingResults[0];
    const editInfo = latestResult.video_edits;

    // Also get the video edit record for additional context
    const { data: editRecord, error: editError } = await supabase
      .from('video_edits')
      .select('*')
      .eq('id', latestResult.processing_id)
      .single();

    const response = {
      success: true,
      editId: latestResult.processing_id,
      videoId: latestResult.video_id,
      status: latestResult.status,
      stage: latestResult.stage,
      progress: latestResult.progress || 0,
      error: latestResult.error_message,
      operations: editInfo?.operations || [],
      editStatus: editInfo?.edit_status,
      previewUrl: editRecord?.preview_url,
      outputUrl: editRecord?.output_url,
      createdAt: latestResult.created_at,
      updatedAt: latestResult.updated_at,
      completedAt: editRecord?.completed_at,
      processingTimeSeconds: editRecord?.processing_time_seconds,
      // Include recent processing stages
      stages: processingResults.slice(0, 10).map(result => ({
        stage: result.stage,
        status: result.status,
        progress: result.progress,
        message: result.error_message || 'Processing...',
        timestamp: result.created_at
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
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

    const body = await request.json();
    const { editId, action } = body;

    if (!editId || !action) {
      return NextResponse.json({
        success: false,
        error: 'editId and action are required'
      }, { status: 400 });
    }

    // Verify user owns this edit
    const { data: editRecord, error: editError } = await supabase
      .from('video_edits')
      .select('user_id, status')
      .eq('id', editId)
      .eq('user_id', user.id)
      .single();

    if (editError || !editRecord) {
      return NextResponse.json({
        success: false,
        error: 'Edit not found or access denied'
      }, { status: 404 });
    }

    switch (action) {
      case 'cancel':
        if (editRecord.status === 'processing') {
          // Import and cancel the processing job
          const { videoProcessingService } = await import('@/services/videoProcessingService');
          const result = await videoProcessingService.cancelProcessing(editId);
          
          if (!result.success) {
            return NextResponse.json({
              success: false,
              error: result.error || 'Failed to cancel processing'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            message: 'Processing cancelled successfully'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Cannot cancel processing - job is not in processing state'
          }, { status: 400 });
        }

      case 'retry':
        if (editRecord.status === 'failed') {
          // Reset status and restart processing
          await supabase
            .from('video_edits')
            .update({
              status: 'queued',
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', editId);

          // Start processing again
          const { videoProcessingService } = await import('@/services/videoProcessingService');
          const result = await videoProcessingService.startProcessing(editId);
          
          if (!result.success) {
            return NextResponse.json({
              success: false,
              error: result.error || 'Failed to restart processing'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            message: 'Processing restarted successfully'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Cannot retry processing - job has not failed'
          }, { status: 400 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing action:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}