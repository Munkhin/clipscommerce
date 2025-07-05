import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { RetryService } from '../../../workflows/autoposting/RetryService';
import { MonitoringService } from '../../../workflows/autoposting/Monitoring';

// Initialize services
const monitoring = new MonitoringService();
const retryService = new RetryService(monitoring);

const retryPostSchema = z.object({
  schedule_id: z.string().uuid('Invalid schedule ID'),
  error_type: z.string().optional().default('manual_retry'),
  strategy: z.string().optional().default('exponential_backoff'),
});

const bulkRetrySchema = z.object({
  schedule_ids: z.array(z.string().uuid()).min(1, 'At least one schedule ID is required'),
  error_type: z.string().optional().default('bulk_retry'),
  strategy: z.string().optional().default('exponential_backoff'),
});

// POST - Manually retry a failed post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = retryPostSchema.parse(body);

    // Verify the post belongs to the authenticated user
    const { data: post, error: fetchError } = await supabase
      .from('autopost_schedule')
      .select('*')
      .eq('id', validatedData.schedule_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ 
        error: 'Scheduled post not found or access denied' 
      }, { status: 404 });
    }

    // Check if post is in a retryable state
    if (post.status === 'posted') {
      return NextResponse.json({ 
        error: 'Cannot retry a post that has already been posted' 
      }, { status: 400 });
    }

    if (post.status === 'cancelled') {
      return NextResponse.json({ 
        error: 'Cannot retry a cancelled post' 
      }, { status: 400 });
    }

    // Schedule the retry
    const retryScheduled = await retryService.scheduleRetry(
      validatedData.schedule_id,
      new Error('Manual retry requested'),
      validatedData.error_type,
      validatedData.strategy
    );

    if (!retryScheduled) {
      return NextResponse.json({ 
        error: 'Failed to schedule retry. Post may have exceeded maximum retry attempts.' 
      }, { status: 400 });
    }

    // Get updated post data
    const { data: updatedPost } = await supabase
      .from('autopost_schedule')
      .select('*')
      .eq('id', validatedData.schedule_id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Retry scheduled successfully',
      scheduled_post: updatedPost,
      retry_info: {
        retry_count: updatedPost?.retry_count || 0,
        next_retry_at: updatedPost?.next_retry_at,
        retry_delay: updatedPost?.retry_delay,
        max_retries: updatedPost?.max_retries
      }
    });

  } catch (error) {
    console.error('Retry scheduling error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to schedule retry' }, { status: 500 });
  }
}

// PUT - Bulk retry multiple posts
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkRetrySchema.parse(body);

    // Verify all posts belong to the authenticated user
    const { data: posts, error: fetchError } = await supabase
      .from('autopost_schedule')
      .select('*')
      .in('id', validatedData.schedule_ids)
      .eq('user_id', user.id);

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch scheduled posts' 
      }, { status: 500 });
    }

    if (!posts || posts.length !== validatedData.schedule_ids.length) {
      return NextResponse.json({ 
        error: 'Some posts not found or access denied' 
      }, { status: 404 });
    }

    // Filter out posts that cannot be retried
    const retryablePosts = posts.filter(post => 
      post.status !== 'posted' && post.status !== 'cancelled'
    );

    if (retryablePosts.length === 0) {
      return NextResponse.json({ 
        error: 'No posts are eligible for retry' 
      }, { status: 400 });
    }

    // Schedule retries for eligible posts
    const results = [];
    for (const post of retryablePosts) {
      try {
        const retryScheduled = await retryService.scheduleRetry(
          post.id,
          new Error('Bulk retry requested'),
          validatedData.error_type,
          validatedData.strategy
        );

        results.push({
          schedule_id: post.id,
          success: retryScheduled,
          platform: post.platform,
          content_preview: post.content.substring(0, 50) + '...'
        });
      } catch (error) {
        results.push({
          schedule_id: post.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          platform: post.platform
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Bulk retry completed: ${successCount} scheduled, ${failureCount} failed`,
      results,
      summary: {
        total_requested: validatedData.schedule_ids.length,
        eligible_for_retry: retryablePosts.length,
        successfully_scheduled: successCount,
        failed_to_schedule: failureCount
      }
    });

  } catch (error) {
    console.error('Bulk retry error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to process bulk retry' }, { status: 500 });
  }
}

// GET - Get retry statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('include_history') === 'true';
    const platform = searchParams.get('platform');
    const days = parseInt(searchParams.get('days') || '7');

    // Get retry statistics from service
    const retryStats = retryService.getRetryStats();

    // Get database statistics
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let retryHistoryQuery = supabase
      .from('autopost_retry_history')
      .select(`
        *,
        autopost_schedule!inner(user_id, platform)
      `)
      .eq('autopost_schedule.user_id', user.id)
      .gte('attempted_at', startDate.toISOString());

    if (platform) {
      retryHistoryQuery = retryHistoryQuery.eq('autopost_schedule.platform', platform);
    }

    const { data: retryHistory, error: historyError } = await retryHistoryQuery
      .order('attempted_at', { ascending: false })
      .limit(includeHistory ? 100 : 0);

    if (historyError) {
      console.error('Error fetching retry history:', historyError);
    }

    // Get current retry queue status
    const { data: failedPosts, error: failedError } = await supabase
      .from('autopost_schedule')
      .select('id, platform, retry_count, max_retries, next_retry_at, last_error')
      .eq('user_id', user.id)
      .eq('status', 'failed')
      .lt('retry_count', supabase.raw('max_retries'));

    if (failedError) {
      console.error('Error fetching failed posts:', failedError);
    }

    // Get dead letter queue size
    const { data: dlqItems, error: dlqError } = await supabase
      .from('autopost_dead_letter_queue')
      .select('id, platform, failure_reason, moved_to_dlq_at')
      .eq('user_id', user.id)
      .is('resolved_at', null);

    if (dlqError) {
      console.error('Error fetching dead letter queue:', dlqError);
    }

    return NextResponse.json({
      success: true,
      retry_stats: retryStats,
      database_stats: {
        retry_history_count: retryHistory?.length || 0,
        pending_retries: failedPosts?.length || 0,
        dead_letter_queue_size: dlqItems?.length || 0
      },
      pending_retries: failedPosts || [],
      dead_letter_queue: dlqItems || [],
      retry_history: includeHistory ? retryHistory || [] : undefined,
      period_days: days,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching retry statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch retry statistics' }, { status: 500 });
  }
}