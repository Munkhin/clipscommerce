import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const queueActionSchema = z.object({
  action: z.enum(['process', 'pause', 'resume', 'clear']),
  schedule_ids: z.array(z.string().uuid()).optional(),
});

// GET - Get queue status and analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const includeMetadata = searchParams.get('include_metadata') === 'true';

    // Build base query
    let query = supabase
      .from('autopost_schedule')
      .select(includeMetadata ? '*' : 'id, platform, content, post_time, status, retry_count, priority, created_at')
      .eq('user_id', user.id);

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: queueItems, error: queueError } = await query
      .order('priority', { ascending: false })
      .order('post_time', { ascending: true })
      .limit(100);

    if (queueError) {
      return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 });
    }

    // Get queue statistics
    const { data: statsData, error: statsError } = await supabase
      .from('autopost_schedule')
      .select('status, platform, priority')
      .eq('user_id', user.id);

    if (statsError) {
      console.error('Error fetching queue stats:', statsError);
    }

    // Calculate statistics
    const stats = {
      total: statsData?.length || 0,
      by_status: {} as Record<string, number>,
      by_platform: {} as Record<string, number>,
      by_priority: {} as Record<string, number>,
    };

    statsData?.forEach(item => {
      // Count by status
      stats.by_status[item.status] = (stats.by_status[item.status] || 0) + 1;
      
      // Count by platform
      stats.by_platform[item.platform] = (stats.by_platform[item.platform] || 0) + 1;
      
      // Count by priority
      stats.by_priority[item.priority] = (stats.by_priority[item.priority] || 0) + 1;
    });

    // Get posts ready for processing
    const { data: readyPosts, error: readyError } = await supabase
      .rpc('get_posts_ready_for_processing');

    if (readyError) {
      console.error('Error fetching ready posts:', readyError);
    }

    // Get posts ready for retry
    const { data: retryPosts, error: retryError } = await supabase
      .rpc('get_posts_ready_for_retry');

    if (retryError) {
      console.error('Error fetching retry posts:', retryError);
    }

    return NextResponse.json({
      success: true,
      queue_items: queueItems || [],
      statistics: stats,
      ready_for_processing: readyPosts?.length || 0,
      ready_for_retry: retryPosts?.length || 0,
      next_processing_times: {
        scheduled_posts: readyPosts?.slice(0, 5).map((post: any) => ({
          id: post.id,
          platform: post.platform,
          post_time: post.post_time,
          priority: post.priority
        })) || [],
        retry_posts: retryPosts?.slice(0, 5).map((post: any) => ({
          id: post.id,
          platform: post.platform,
          retry_count: post.retry_count,
          last_error: post.last_error
        })) || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}

// POST - Manage queue operations
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = queueActionSchema.parse(body);

    switch (validatedData.action) {
      case 'process':
        return await processQueue(supabase, user.id, validatedData.schedule_ids);
      
      case 'pause':
        return await pauseQueueItems(supabase, user.id, validatedData.schedule_ids);
      
      case 'resume':
        return await resumeQueueItems(supabase, user.id, validatedData.schedule_ids);
      
      case 'clear':
        return await clearQueue(supabase, user.id, validatedData.schedule_ids);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Queue management error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to manage queue' }, { status: 500 });
  }
}

// Helper function to process queue items
async function processQueue(supabase: any, userId: string, scheduleIds?: string[]) {
  try {
    let query = supabase
      .from('autopost_schedule')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .lte('post_time', new Date().toISOString());

    if (scheduleIds && scheduleIds.length > 0) {
      query = query.in('id', scheduleIds);
    }

    const { data: posts, error } = await query
      .order('priority', { ascending: false })
      .order('post_time', { ascending: true })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch posts for processing' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts ready for processing',
        processed: 0
      });
    }

    // Update status to processing
    const postIds = posts.map(post => post.id);
    const { error: updateError } = await supabase
      .from('autopost_schedule')
      .update({ 
        status: 'processing',
        metadata: supabase.raw(`metadata || '{"processing_started_at": "${new Date().toISOString()}"}'::jsonb`)
      })
      .in('id', postIds);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 });
    }

    // In a real implementation, this would trigger the actual posting process
    // For now, we'll simulate processing by updating the status after a delay
    setTimeout(async () => {
      try {
        // Simulate random success/failure for testing
        for (const post of posts) {
          const success = Math.random() > 0.2; // 80% success rate
          
          if (success) {
            await supabase
              .from('autopost_schedule')
              .update({
                status: 'posted',
                posted_at: new Date().toISOString()
              })
              .eq('id', post.id);
          } else {
            await supabase
              .from('autopost_schedule')
              .update({
                status: 'failed',
                last_error: 'Simulated posting failure',
                last_error_at: new Date().toISOString(),
                retry_count: post.retry_count + 1
              })
              .eq('id', post.id);
          }
        }
      } catch (error) {
        console.error('Error in simulated processing:', error);
      }
    }, 5000); // 5 second delay for simulation

    return NextResponse.json({
      success: true,
      message: `Processing started for ${posts.length} posts`,
      processed: posts.length,
      posts: posts.map(post => ({
        id: post.id,
        platform: post.platform,
        priority: post.priority,
        post_time: post.post_time
      }))
    });

  } catch (error) {
    console.error('Error processing queue:', error);
    return NextResponse.json({ error: 'Failed to process queue' }, { status: 500 });
  }
}

// Helper function to pause queue items
async function pauseQueueItems(supabase: any, userId: string, scheduleIds?: string[]) {
  if (!scheduleIds || scheduleIds.length === 0) {
    return NextResponse.json({ error: 'No schedule IDs provided for pause action' }, { status: 400 });
  }

  try {
    const { data: updatedPosts, error } = await supabase
      .from('autopost_schedule')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        metadata: supabase.raw(`metadata || '{"paused_at": "${new Date().toISOString()}", "paused_by": "user"}'::jsonb`)
      })
      .in('id', scheduleIds)
      .eq('user_id', userId)
      .in('status', ['scheduled', 'failed']) // Only pause schedulable posts
      .select();

    if (error) {
      return NextResponse.json({ error: 'Failed to pause posts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Paused ${updatedPosts?.length || 0} posts`,
      paused_posts: updatedPosts?.map(post => ({
        id: post.id,
        platform: post.platform,
        content_preview: post.content.substring(0, 50) + '...'
      })) || []
    });

  } catch (error) {
    console.error('Error pausing queue items:', error);
    return NextResponse.json({ error: 'Failed to pause queue items' }, { status: 500 });
  }
}

// Helper function to resume queue items
async function resumeQueueItems(supabase: any, userId: string, scheduleIds?: string[]) {
  if (!scheduleIds || scheduleIds.length === 0) {
    return NextResponse.json({ error: 'No schedule IDs provided for resume action' }, { status: 400 });
  }

  try {
    const { data: updatedPosts, error } = await supabase
      .from('autopost_schedule')
      .update({ 
        status: 'scheduled',
        metadata: supabase.raw(`metadata || '{"resumed_at": "${new Date().toISOString()}", "resumed_by": "user"}'::jsonb`)
      })
      .in('id', scheduleIds)
      .eq('user_id', userId)
      .eq('status', 'cancelled') // Only resume cancelled posts
      .select();

    if (error) {
      return NextResponse.json({ error: 'Failed to resume posts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Resumed ${updatedPosts?.length || 0} posts`,
      resumed_posts: updatedPosts?.map(post => ({
        id: post.id,
        platform: post.platform,
        content_preview: post.content.substring(0, 50) + '...'
      })) || []
    });

  } catch (error) {
    console.error('Error resuming queue items:', error);
    return NextResponse.json({ error: 'Failed to resume queue items' }, { status: 500 });
  }
}

// Helper function to clear queue items
async function clearQueue(supabase: any, userId: string, scheduleIds?: string[]) {
  try {
    let query = supabase
      .from('autopost_schedule')
      .delete()
      .eq('user_id', userId);

    if (scheduleIds && scheduleIds.length > 0) {
      query = query.in('id', scheduleIds);
    } else {
      // Only clear non-posted items if no specific IDs provided
      query = query.neq('status', 'posted');
    }

    const { data: deletedPosts, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: 'Failed to clear queue' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedPosts?.length || 0} posts from queue`,
      cleared_count: deletedPosts?.length || 0
    });

  } catch (error) {
    console.error('Error clearing queue:', error);
    return NextResponse.json({ error: 'Failed to clear queue' }, { status: 500 });
  }
}