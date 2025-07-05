import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateScheduleSchema = z.object({
  content: z.string().optional(),
  media_urls: z.array(z.string().url()).optional(),
  post_time: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'posted', 'failed', 'cancelled']).optional(),
  additional_settings: z.object({}).optional(),
});

interface RouteParams {
  params: Promise<{
    scheduleId: string;
  }>;
}

// GET - Get specific scheduled post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await params;

    // Get scheduled post
    const { data: post, error } = await supabase
      .from('autopost_schedule')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      scheduled_post: post,
    });

  } catch (error) {
    console.error('Scheduled post fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled post' }, { status: 500 });
  }
}

// PATCH - Update scheduled post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await params;
    const body = await request.json();
    const validatedData = updateScheduleSchema.parse(body);

    // Get current scheduled post
    const { data: currentPost, error: fetchError } = await supabase
      .from('autopost_schedule')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentPost) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    // Validate status transitions
    if (validatedData.status) {
      let currentStatus: string | undefined = undefined;
      if (currentPost && typeof currentPost === 'object' && 'status' in currentPost) {
        currentStatus = (currentPost as { status: string }).status;
      }
      if (!currentStatus) {
        return NextResponse.json({ error: 'Current post status not found' }, { status: 400 });
      }
      const validTransitions = getValidStatusTransitions(currentStatus);
      if (!validTransitions.includes(validatedData.status)) {
        return NextResponse.json({ 
          error: `Cannot transition from ${currentStatus} to ${validatedData.status}` 
        }, { status: 400 });
      }
    }

    // Validate post time if being updated
    if (validatedData.post_time) {
      const postTime = new Date(validatedData.post_time);
      const now = new Date();
      
      if (postTime <= now && currentPost && typeof currentPost === 'object' && 'status' in currentPost && (currentPost as any).status === 'scheduled') {
        return NextResponse.json({ 
          error: 'Post time must be in the future for scheduled posts' 
        }, { status: 400 });
      }
    }

    // Validate media URLs if being updated
    if (validatedData.media_urls) {
      const mediaValidation = await validateMediaUrls(validatedData.media_urls);
      if (!mediaValidation.valid) {
        return NextResponse.json({ 
          error: 'One or more media URLs are not accessible',
          invalid_urls: mediaValidation.invalidUrls 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content;
    }
    
    if (validatedData.media_urls !== undefined) {
      updateData.media_urls = validatedData.media_urls;
    }
    
    if (validatedData.post_time !== undefined) {
      updateData.post_time = validatedData.post_time;
    }
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      
      // Add timestamps for status changes
      if (validatedData.status === 'posted') {
        updateData.posted_at = new Date().toISOString();
      } else if (validatedData.status === 'failed') {
        updateData.failed_at = new Date().toISOString();
      } else if (validatedData.status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
    }

    // Update metadata
    if (validatedData.additional_settings) {
      updateData.metadata = {
        ...(currentPost && typeof currentPost === 'object' && 'metadata' in currentPost ? (currentPost as { metadata: Record<string, unknown> }).metadata : {}),
        additional_settings: validatedData.additional_settings,
      };
    }

    // Update scheduled post
    const { data: updatedPost, error: updateError } = await supabase
      .from('autopost_schedule')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scheduled post:', updateError);
      return NextResponse.json({ error: 'Failed to update scheduled post' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scheduled_post: updatedPost,
    });

  } catch (error) {
    console.error('Scheduled post update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update scheduled post' }, { status: 500 });
  }
}

// DELETE - Delete/cancel scheduled post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await params;

    // Get current scheduled post
    const { data: currentPost, error: fetchError } = await supabase
      .from('autopost_schedule')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentPost) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    // Check if post can be deleted
    if (currentPost && typeof currentPost === 'object' && 'status' in currentPost && (currentPost as any).status === 'posted') {
      return NextResponse.json({ 
        error: 'Cannot delete a post that has already been posted' 
      }, { status: 400 });
    }

    // Soft delete by updating status to cancelled
    const { data: cancelledPost, error: updateError } = await supabase
      .from('autopost_schedule')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling scheduled post:', updateError);
      return NextResponse.json({ error: 'Failed to cancel scheduled post' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled post cancelled successfully',
      scheduled_post: cancelledPost,
    });

  } catch (error) {
    console.error('Scheduled post deletion error:', error);
    return NextResponse.json({ error: 'Failed to cancel scheduled post' }, { status: 500 });
  }
}

// Helper functions
function getValidStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    scheduled: ['posted', 'failed', 'cancelled'],
    posted: [], // Final state - no transitions allowed
    failed: ['scheduled', 'cancelled'], // Can reschedule or cancel
    cancelled: ['scheduled'], // Can reschedule
  };

  return transitions[currentStatus] || [];
}

async function validateMediaUrls(urls: string[]) {
  const validationResults = await Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        return {
          url,
          valid: response.ok,
          contentType: response.headers.get('content-type'),
          size: response.headers.get('content-length'),
        };
      } catch (error) {
        return {
          url,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  const invalidUrls = validationResults.filter(result => !result.valid);

  return {
    valid: invalidUrls.length === 0,
    invalidUrls: invalidUrls.map(result => result.url),
    results: validationResults,
  };
}
