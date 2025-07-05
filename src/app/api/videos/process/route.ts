import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { VideoOptimizationAnalysisService } from '@/app/workflows/video_optimization/VideoOptimizationAnalysisService';
import { PlatformEnum } from '@/types/platform';
import { TimeRange } from '@/app/workflows/data_analysis/types/analysis_types';

interface VideoProcessingRequest {
  videoId: string;
  options?: {
    priority?: 'low' | 'normal' | 'high';
    skipAudioAnalysis?: boolean;
    skipHashtagGeneration?: boolean;
    skipEngagementPrediction?: boolean;
  };
}

interface VideoProcessingResponse {
  success: boolean;
  processingId?: string;
  estimatedTime?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  details?: {
    stage?: string;
    progress?: number;
    message?: string;
  };
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
    let body: VideoProcessingRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { videoId, options = {} } = body;

    // Validate required fields
    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'videoId is required'
      }, { status: 400 });
    }

    // Verify video exists and belongs to user
    const { data: video, error: videoError } = await supabase
      .from('user_videos')
      .select('id, user_id, status, title, video_url')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({
        success: false,
        error: 'Video not found or access denied'
      }, { status: 404 });
    }

    // Check if video is in a processable state
    if (video.status === 'processing') {
      return NextResponse.json({
        success: false,
        error: 'Video is already being processed'
      }, { status: 409 });
    }

    if (video.status === 'optimized' && !options.priority) {
      return NextResponse.json({
        success: false,
        error: 'Video has already been processed. Use priority option to reprocess.'
      }, { status: 409 });
    }

    // Update video status to processing
    const { error: updateError } = await supabase
      .from('user_videos')
      .update({
        status: 'processing',
        processing_stage: 'initialization',
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (updateError) {
      console.error('Error updating video status:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to start processing'
      }, { status: 500 });
    }

    // Generate processing ID
    const processingId = `proc_${videoId}_${Date.now()}`;

    // Start background processing (this would typically trigger a queue job)
    const processingResult = await initiateVideoProcessing({
      videoId,
      userId: user.id,
      processingId,
      videoUrl: video.video_url,
      options
    });

    if (!processingResult.success) {
      // Revert video status on failure
      await supabase
        .from('user_videos')
        .update({
          status: 'error',
          error_message: processingResult.error
        })
        .eq('id', videoId);

      return NextResponse.json({
        success: false,
        error: processingResult.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      processingId,
      estimatedTime: calculateEstimatedTime(options),
      status: 'queued',
      details: {
        stage: 'initialization',
        progress: 0,
        message: 'Video processing has been queued successfully'
      }
    });

  } catch (error) {
    console.error('Error processing video:', error);
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
    const videoId = searchParams.get('videoId');
    const processingId = searchParams.get('processingId');

    if (!videoId && !processingId) {
      return NextResponse.json({
        success: false,
        error: 'videoId or processingId is required'
      }, { status: 400 });
    }

    // Get processing status
    let statusQuery = supabase
      .from('user_videos')
      .select(`
        id,
        status,
        processing_stage,
        error_message,
        video_processing_results (
          processing_id,
          stage,
          progress,
          status,
          error_message,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (videoId) {
      statusQuery = statusQuery.eq('id', videoId);
    }

    const { data: videos, error: queryError } = await statusQuery;

    if (queryError) {
      console.error('Error fetching processing status:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch processing status'
      }, { status: 500 });
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No processing records found'
      }, { status: 404 });
    }

    const video = videos[0];
    const latestProcessing = video.video_processing_results?.[0];

    return NextResponse.json({
      success: true,
      videoId: video.id,
      status: video.status,
      stage: video.processing_stage || latestProcessing?.stage,
      progress: latestProcessing?.progress || 0,
      error: video.error_message || latestProcessing?.error_message,
      processingId: latestProcessing?.processing_id,
      updatedAt: latestProcessing?.updated_at
    });

  } catch (error) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to initiate video processing
async function initiateVideoProcessing(params: {
  videoId: string;
  userId: string;
  processingId: string;
  videoUrl: string;
  options: VideoProcessingRequest['options'];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { videoId, userId, processingId, videoUrl, options } = params;

    // Initialize the VideoOptimizationAnalysisService
    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const analysisService = new VideoOptimizationAnalysisService(openAIApiKey);

    // Determine platform based on video metadata or default
    const platform = PlatformEnum.TIKTOK; // Default to TikTok for now
    const timeRange: TimeRange = '1-week'; // Default time range

    console.log(`Processing initiated for video ${videoId} with ID ${processingId}`);

    // Start background processing with stages
    processVideoInBackground({
      videoId,
      userId,
      processingId,
      videoUrl,
      options,
      analysisService,
      platform,
      timeRange
    });

    return { success: true };

  } catch (error) {
    console.error('Error initiating video processing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing initiation failed' 
    };
  }
}

// Background video processing function
async function processVideoInBackground(params: {
  videoId: string;
  userId: string;
  processingId: string;
  videoUrl: string;
  options: VideoProcessingRequest['options'];
  analysisService: VideoOptimizationAnalysisService;
  platform: PlatformEnum;
  timeRange: TimeRange;
}): Promise<void> {
  const { videoId, userId, processingId, videoUrl, options, analysisService, platform, timeRange } = params;
  const supabase = createClient(cookies());

  try {
    // Stage 1: Initialize processing
    await updateProcessingStatus(supabase, videoId, processingId, 'initialization', 'processing', 5, 'Initializing video processing...');
    
    // Stage 2: Video analysis
    await updateProcessingStatus(supabase, videoId, processingId, 'analysis', 'processing', 20, 'Analyzing video content...');
    
    const analysisResult = await analysisService.getVideoOptimizationInsights({
      userId,
      platform,
      timeRange,
      correlationId: processingId,
      mode: options?.priority === 'high' ? 'thorough' : 'fast'
    });

    if (!analysisResult.success) {
      await updateProcessingStatus(supabase, videoId, processingId, 'analysis', 'failed', 20, 'Analysis failed: ' + (analysisResult.error?.message || 'Unknown error'));
      return;
    }

    // Stage 3: Content optimization
    await updateProcessingStatus(supabase, videoId, processingId, 'content_optimization', 'processing', 50, 'Optimizing content recommendations...');
    
    // Generate optimized content if we have analysis data
    let optimizedContent = null;
    if (analysisResult.data) {
      const userPreferences = {
        userId,
        platform,
        correlationId: processingId,
        targetAudience: 'general',
        contentStyle: 'engaging'
      };

      const contentResult = await analysisService.generateOptimizedContent(
        analysisResult.data,
        userPreferences
      );

      if (contentResult.success) {
        optimizedContent = contentResult.data;
      }
    }

    // Stage 4: Audio analysis (if not skipped)
    if (!options?.skipAudioAnalysis) {
      await updateProcessingStatus(supabase, videoId, processingId, 'audio_analysis', 'processing', 70, 'Analyzing audio content...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    }

    // Stage 5: Hashtag generation (if not skipped)
    if (!options?.skipHashtagGeneration) {
      await updateProcessingStatus(supabase, videoId, processingId, 'hashtag_generation', 'processing', 85, 'Generating hashtag recommendations...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
    }

    // Stage 6: Engagement prediction (if not skipped)
    if (!options?.skipEngagementPrediction) {
      await updateProcessingStatus(supabase, videoId, processingId, 'engagement_prediction', 'processing', 95, 'Predicting engagement metrics...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    }

    // Stage 7: Finalization
    await updateProcessingStatus(supabase, videoId, processingId, 'finalization', 'processing', 100, 'Finalizing results...');

    // Store final results
    const finalResults = {
      analysisData: analysisResult.data,
      optimizedContent,
      processingOptions: options,
      completedAt: new Date().toISOString()
    };

    await supabase
      .from('video_processing_results')
      .insert({
        video_id: videoId,
        processing_id: processingId,
        stage: 'completed',
        status: 'completed',
        progress: 100,
        results: finalResults
      });

    // Update main video record
    await supabase
      .from('user_videos')
      .update({
        status: 'optimized',
        processing_stage: null,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);

    console.log(`Video processing completed for ${videoId}`);

  } catch (error) {
    console.error('Error during video processing:', error);
    
    await updateProcessingStatus(
      supabase, 
      videoId, 
      processingId, 
      'error', 
      'failed', 
      0, 
      `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    await supabase
      .from('user_videos')
      .update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Processing failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);
  }
}

// Helper function to update processing status
async function updateProcessingStatus(
  supabase: any,
  videoId: string,
  processingId: string,
  stage: string,
  status: string,
  progress: number,
  message: string
): Promise<void> {
  await supabase
    .from('video_processing_results')
    .insert({
      video_id: videoId,
      processing_id: processingId,
      stage,
      status,
      progress,
      error_message: status === 'failed' ? message : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  // Also update the main video record's processing stage
  await supabase
    .from('user_videos')
    .update({
      processing_stage: stage,
      updated_at: new Date().toISOString()
    })
    .eq('id', videoId);
}

// Helper function to calculate estimated processing time
function calculateEstimatedTime(options: VideoProcessingRequest['options'] = {}): string {
  let baseTime = 120; // 2 minutes base time in seconds

  // Adjust based on options
  if (options.skipAudioAnalysis) baseTime -= 30;
  if (options.skipHashtagGeneration) baseTime -= 20;
  if (options.skipEngagementPrediction) baseTime -= 15;

  // Add priority adjustment
  if (options.priority === 'high') baseTime *= 0.7;
  else if (options.priority === 'low') baseTime *= 1.5;

  const minutes = Math.ceil(baseTime / 60);
  return `${minutes}-${minutes + 2} minutes`;
}