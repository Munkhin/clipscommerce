import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const getPostsSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube']).optional(),
  limit: z.number().positive().max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  sort_by: z.enum(['posted_at', 'engagement_rate', 'likes', 'comments', 'views']).optional().default('posted_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  min_engagement: z.number().min(0).max(1).optional(),
  include_raw_data: z.boolean().optional().default(false),
});

const updatePostSchema = z.object({
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  engagement_score: z.number().optional(),
  custom_metrics: z.object({}).optional(),
});

// GET - List user posts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      platform: searchParams.get('platform'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: searchParams.get('sort_by') || 'posted_at',
      sort_order: searchParams.get('sort_order') || 'desc',
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      min_engagement: parseFloat(searchParams.get('min_engagement') || '0'),
      include_raw_data: searchParams.get('include_raw_data') === 'true',
    };

    const validatedParams = getPostsSchema.parse(params);

    // Build query
    let selectFields = `
      id, user_id, platform, post_id, platform_post_id, caption, hashtags,
      media_type, media_url, thumbnail_url, posted_at, likes, comments, 
      shares, views, saves, engagement_rate, engagement_score, created_at, updated_at
    `;

    if (validatedParams.include_raw_data) {
      selectFields += ', raw_data';
    }

    let query = supabase
      .from('user_posts')
      .select(selectFields)
      .eq('user_id', user.id)
      .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1);

    // Apply filters
    if (validatedParams.platform) {
      query = query.eq('platform', validatedParams.platform);
    }

    if (validatedParams.date_from) {
      query = query.gte('posted_at', validatedParams.date_from);
    }

    if (validatedParams.date_to) {
      query = query.lte('posted_at', validatedParams.date_to);
    }

    if (validatedParams.min_engagement > 0) {
      query = query.gte('engagement_rate', validatedParams.min_engagement);
    }

    // Apply sorting
    const sortAscending = validatedParams.sort_order === 'asc';
    query = query.order(validatedParams.sort_by, { ascending: sortAscending });

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('user_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (validatedParams.platform) {
      countQuery = countQuery.eq('platform', validatedParams.platform);
    }

    if (validatedParams.date_from) {
      countQuery = countQuery.gte('posted_at', validatedParams.date_from);
    }

    if (validatedParams.date_to) {
      countQuery = countQuery.lte('posted_at', validatedParams.date_to);
    }

    if (validatedParams.min_engagement > 0) {
      countQuery = countQuery.gte('engagement_rate', validatedParams.min_engagement);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting posts count:', countError);
    }

    // Calculate analytics
    const analytics = await calculatePostAnalytics(posts || []);

    return NextResponse.json({
      success: true,
      posts: posts || [],
      pagination: {
        total: count || 0,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: (count || 0) > validatedParams.offset + validatedParams.limit,
      },
      analytics,
      filters_applied: {
        platform: validatedParams.platform,
        date_range: validatedParams.date_from || validatedParams.date_to ? {
          from: validatedParams.date_from,
          to: validatedParams.date_to,
        } : null,
        min_engagement: validatedParams.min_engagement,
      },
    });

  } catch (error) {
    console.error('Posts fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST - Create/sync new post
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields for new post
    const postSchema = z.object({
      platform: z.enum(['instagram', 'tiktok', 'youtube']),
      platform_post_id: z.string(),
      caption: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      media_type: z.string().optional(),
      media_url: z.string().url().optional(),
      thumbnail_url: z.string().url().optional(),
      posted_at: z.string().datetime(),
      likes: z.number().min(0).optional().default(0),
      comments: z.number().min(0).optional().default(0),
      shares: z.number().min(0).optional().default(0),
      views: z.number().min(0).optional().default(0),
      saves: z.number().min(0).optional().default(0),
      raw_data: z.object({}).optional(),
    });

    const validatedData = postSchema.parse(body);

    // Calculate engagement metrics
    const engagementMetrics = calculateEngagementMetrics(validatedData);

    // Create post
    const { data: post, error: insertError } = await supabase
      .from('user_posts')
      .upsert({
        user_id: user.id,
        platform: validatedData.platform,
        post_id: `${validatedData.platform}_${validatedData.platform_post_id}`,
        platform_post_id: validatedData.platform_post_id,
        caption: validatedData.caption,
        hashtags: validatedData.hashtags || [],
        media_type: validatedData.media_type,
        media_url: validatedData.media_url,
        thumbnail_url: validatedData.thumbnail_url,
        posted_at: validatedData.posted_at,
        likes: validatedData.likes,
        comments: validatedData.comments,
        shares: validatedData.shares,
        views: validatedData.views,
        saves: validatedData.saves,
        engagement_rate: engagementMetrics.engagement_rate,
        engagement_score: engagementMetrics.engagement_score,
        raw_data: validatedData.raw_data || {},
      }, {
        onConflict: 'platform,platform_post_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating/updating post:', insertError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      post,
      engagement_metrics: engagementMetrics,
    });

  } catch (error) {
    console.error('Post creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid post data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// Helper functions
function calculateEngagementMetrics(postData: { likes?: number; comments?: number; shares?: number; views?: number; saves?: number }) {
  const { likes = 0, comments = 0, shares = 0, views = 0, saves = 0 } = postData;
  
  // Calculate engagement rate
  let engagement_rate = 0;
  if (views > 0) {
    engagement_rate = (likes + comments + shares + saves) / views;
  } else if (likes + comments + shares + saves > 0) {
    // If no views data, use a base metric
    engagement_rate = (likes + comments + shares + saves) / 1000; // Assume 1000 as base
  }

  // Normalize engagement rate to 0-1 range
  engagement_rate = Math.min(engagement_rate, 1);

  // Calculate engagement score (0-100 scale)
  let engagement_score = 0;
  
  // Weight different engagement types
  const weights = {
    likes: 1,
    comments: 3,
    shares: 5,
    saves: 4,
  };

  engagement_score = (
    (likes * weights.likes) +
    (comments * weights.comments) +
    (shares * weights.shares) +
    (saves * weights.saves)
  ) / Math.max(views, 100); // Prevent division by zero

  // Normalize to 0-100 scale
  engagement_score = Math.min(engagement_score * 100, 100);

  return {
    engagement_rate: Math.round(engagement_rate * 10000) / 10000, // 4 decimal places
    engagement_score: Math.round(engagement_score * 100) / 100, // 2 decimal places
  };
}

async function calculatePostAnalytics(posts: { likes?: number; comments?: number; views?: number; engagement_rate?: number; engagement_score?: number; platform: string; id: string; posted_at: string }[]) {
  if (posts.length === 0) {
    return {
      total_posts: 0,
      avg_engagement_rate: 0,
      avg_engagement_score: 0,
      total_likes: 0,
      total_comments: 0,
      total_views: 0,
      platform_breakdown: {},
      top_performing_post: null,
      recent_activity: {
        last_7_days: 0,
        last_30_days: 0,
      },
    };
  }

  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comments || 0), 0);
  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
  
  const avgEngagementRate = posts.reduce((sum, post) => sum + (post.engagement_rate || 0), 0) / totalPosts;
  const avgEngagementScore = posts.reduce((sum, post) => sum + (post.engagement_score || 0), 0) / totalPosts;

  // Platform breakdown
  const platformBreakdown = posts.reduce((acc, post) => {
    const platform = post.platform;
    if (!acc[platform]) {
      acc[platform] = {
        count: 0,
        avg_engagement: 0,
        total_likes: 0,
        total_views: 0,
      };
    }
    acc[platform].count++;
    acc[platform].avg_engagement += post.engagement_rate || 0;
    acc[platform].total_likes += post.likes || 0;
    acc[platform].total_views += post.views || 0;
    return acc;
  }, {} as Record<string, { count: number; avg_engagement: number; total_likes: number; total_views: number }>);

  // Calculate averages for platform breakdown
  Object.keys(platformBreakdown).forEach(platform => {
    platformBreakdown[platform].avg_engagement /= platformBreakdown[platform].count;
  });

  // Find top performing post
  const topPerformingPost = posts.reduce((best, current) => {
    return (current.engagement_score || 0) > (best.engagement_score || 0) ? current : best;
  }, posts[0]);

  // Recent activity
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentActivity = {
    last_7_days: posts.filter(post => new Date(post.posted_at) > sevenDaysAgo).length,
    last_30_days: posts.filter(post => new Date(post.posted_at) > thirtyDaysAgo).length,
  };

  return {
    total_posts: totalPosts,
    avg_engagement_rate: Math.round(avgEngagementRate * 10000) / 10000,
    avg_engagement_score: Math.round(avgEngagementScore * 100) / 100,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_views: totalViews,
    platform_breakdown: platformBreakdown,
    top_performing_post: {
      id: topPerformingPost.id,
      platform: topPerformingPost.platform,
      engagement_score: topPerformingPost.engagement_score,
      posted_at: topPerformingPost.posted_at,
    },
    recent_activity: recentActivity,
  };
}
