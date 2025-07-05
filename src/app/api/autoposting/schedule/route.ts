import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { RetryService } from '../../workflows/autoposting/RetryService';
import { MonitoringService } from '../../workflows/autoposting/Monitoring';

// Validation schema for scheduling posts
const schedulePostSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  content: z.string().min(1, 'Content is required'),
  media_urls: z.array(z.string().url()).min(1, 'At least one media URL is required'),
  post_time: z.string().datetime('Invalid post time format'),
  hashtags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  max_retries: z.number().min(0).max(10).optional().default(3),
  retry_delay: z.number().min(10000).max(3600000).optional().default(30000), // 10 seconds to 1 hour
  additional_settings: z.object({
    privacy_level: z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']).optional(),
    allow_comments: z.boolean().optional(),
    allow_duet: z.boolean().optional(),
    allow_stitch: z.boolean().optional(),
    brand_content_toggle: z.boolean().optional(),
    brand_organic_toggle: z.boolean().optional(),
  }).optional(),
});

const updatePostSchema = z.object({
  content: z.string().optional(),
  media_urls: z.array(z.string().url()).optional(),
  post_time: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'processing', 'posted', 'failed', 'cancelled', 'retrying']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  max_retries: z.number().min(0).max(10).optional(),
  retry_delay: z.number().min(10000).max(3600000).optional(),
});

// POST - Schedule a new post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schedulePostSchema.parse(body);

    // Validate post time is in the future
    const postTime = new Date(validatedData.post_time);
    const now = new Date();
    
    if (postTime <= now) {
      return NextResponse.json({ 
        error: 'Post time must be in the future' 
      }, { status: 400 });
    }

    // Check if user has connected credentials for the platform
    const { data: credentials, error: credError } = await supabase
      .from('user_social_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', validatedData.platform)
      .single();

    if (credError || !credentials) {
      return NextResponse.json({ 
        error: `No ${validatedData.platform} credentials found. Please connect your account first.` 
      }, { status: 400 });
    }

    // Check token expiry
    if (credentials && typeof credentials === 'object' && 'expires_at' in credentials && (credentials as any).expires_at && new Date((credentials as any).expires_at) <= now) {
      return NextResponse.json({ 
        error: `${validatedData.platform} credentials have expired. Please reconnect your account.` 
      }, { status: 400 });
    }

    // Check usage limits
    const usageCheck = await checkPostingLimits(user.id, validatedData.platform);
    if (!usageCheck.allowed) {
      return NextResponse.json({ 
        error: usageCheck.reason,
        limits: usageCheck.limits 
      }, { status: 429 });
    }

    // Validate media URLs are accessible
    const mediaValidation = await validateMediaUrls(validatedData.media_urls);
    if (!mediaValidation.valid) {
      return NextResponse.json({ 
        error: 'One or more media URLs are not accessible',
        invalid_urls: mediaValidation.invalidUrls 
      }, { status: 400 });
    }

    // Prepare post content with platform-specific formatting
    const formattedContent = formatContentForPlatform(
      validatedData.content,
      validatedData.hashtags,
      validatedData.platform
    );

    // Create scheduled post with enhanced metadata
    const { data: scheduledPost, error: insertError } = await supabase
      .from('autopost_schedule')
      .insert({
        user_id: user.id,
        platform: validatedData.platform,
        content: formattedContent,
        media_urls: validatedData.media_urls,
        post_time: validatedData.post_time,
        status: 'scheduled',
        retry_count: 0,
        max_retries: validatedData.max_retries || 3,
        retry_delay: validatedData.retry_delay || 30000,
        priority: validatedData.priority || 'normal',
        hashtags: validatedData.hashtags,
        additional_settings: validatedData.additional_settings || {},
        metadata: {
          original_content: validatedData.content,
          hashtags: validatedData.hashtags,
          additional_settings: validatedData.additional_settings,
          media_validation: mediaValidation,
          scheduled_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating scheduled post:', insertError);
      return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
    }

    // Update usage tracking
    await updateUsageTracking(user.id, 'posts_scheduled');

    return NextResponse.json({
      success: true,
      scheduled_post: scheduledPost,
      estimated_posting_time: validatedData.post_time,
    });

  } catch (error) {
    console.error('Post scheduling error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
  }
}

// GET - List scheduled posts
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('autopost_schedule')
      .select('*')
      .eq('user_id', user.id)
      .order('post_time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching scheduled posts:', error);
      return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('autopost_schedule')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (platform) {
      countQuery = countQuery.eq('platform', platform);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting posts count:', countError);
    }

    return NextResponse.json({
      success: true,
      posts: posts || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Posts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// Helper functions
async function checkPostingLimits(userId: string, platform: string) {
  const { subscriptionService } = await import('@/services/subscriptionService');

  try {
    // Check subscription limits for autoposts feature
    const canUseResult = await subscriptionService.canUseFeature(userId, 'autoposts');
    
    if (!canUseResult.allowed) {
      return {
        allowed: false,
        reason: canUseResult.used !== undefined && canUseResult.limit !== undefined
          ? `Monthly autopost limit exceeded (${canUseResult.used}/${canUseResult.limit})`
          : 'Autopost feature not available on your plan',
        limits: {
          monthly: { 
            limit: canUseResult.limit || 0, 
            used: canUseResult.used || 0 
          }
        },
        resetDate: canUseResult.resetDate,
      };
    }

    return {
      allowed: true,
      limits: {
        monthly: { 
          limit: canUseResult.limit || -1, 
          used: canUseResult.used || 0 
        }
      },
      remaining: canUseResult.remaining,
      resetDate: canUseResult.resetDate,
    };

  } catch (error) {
    console.error('Error checking posting limits:', error);
    return {
      allowed: false,
      reason: 'Unable to verify posting limits',
    };
  }
}

async function validateMediaUrls(urls: string[]) {
  const validationResults = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
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

function formatContentForPlatform(content: string, hashtags?: string[], platform?: string): string {
  let formattedContent = content;

  // Add hashtags based on platform preferences
  if (hashtags && hashtags.length > 0) {
    const hashtagString = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    
    switch (platform) {
      case 'instagram':
        // Instagram: Add hashtags at the end, optionally with dots for line breaks
        formattedContent += `\n\n${hashtagString}`;
        break;
      case 'tiktok':
        // TikTok: Integrate hashtags more naturally
        formattedContent += ` ${hashtagString}`;
        break;
      case 'youtube':
        // YouTube: Add hashtags in description
        formattedContent += `\n\nTags: ${hashtagString}`;
        break;
      default:
        formattedContent += `\n\n${hashtagString}`;
    }
  }

  return formattedContent;
}

async function updateUsageTracking(userId: string, action: string) {
  try {
    const { subscriptionService } = await import('@/services/subscriptionService');
    
    // Track autopost usage when a post is scheduled
    if (action === 'posts_scheduled') {
      await subscriptionService.trackUsage(userId, 'autoposts', 1);
    }
  } catch (error) {
    console.error('Error updating usage tracking:', error);
    // Don't fail the request if usage tracking fails
  }
}