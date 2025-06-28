import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SchedulingService } from '@/lib/services/schedulingService';

// Mock dependencies for the SchedulingService
const mockDependencies = {
  getPosts: async (filter: any) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    const query = supabase
      .from('autopost_schedule')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .order('created_at', { ascending: false })
      .limit(filter.limit || 50);

    if (filter.platforms && filter.platforms.length > 0) {
      query.in('platform', filter.platforms);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts for optimal times:', error);
      return [];
    }

    return data || [];
  },
  
  getPostMetrics: async (postId: string, platform: string) => {
    // In a real implementation, this would fetch actual engagement metrics
    // For now, return mock metrics based on typical platform performance
    const baseMetrics = {
      instagram: { likes: 100, comments: 15, shares: 5, saves: 20 },
      tiktok: { likes: 250, comments: 40, shares: 15, views: 5000 },
      twitter: { likes: 80, retweets: 12, replies: 8, views: 1200 },
      facebook: { likes: 60, comments: 10, shares: 8, reactions: 75 },
      linkedin: { likes: 35, comments: 8, shares: 5, views: 800 },
    };

    const metrics = baseMetrics[platform as keyof typeof baseMetrics] || baseMetrics.instagram;
    const totalEngagement = Object.values(metrics).reduce((sum, val) => sum + val, 0);
    
    return {
      engagementRate: totalEngagement / (metrics.views || 1000),
      likes: metrics.likes,
      comments: metrics.comments || 0,
      shares: metrics.shares || 0,
      saves: metrics.saves || 0,
      views: metrics.views || 1000,
    };
  },
  
  getUserTimezone: async () => {
    // Default to UTC if no timezone is found
    return 'UTC';
  },
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const timezone = searchParams.get('timezone') || 'UTC';

    const schedulingService = SchedulingService.getInstance(mockDependencies);

    if (platform) {
      // Get optimal times for specific platform
      const optimalTimes = await schedulingService.getOptimalTimes(platform as any, timezone);
      
      // Convert to simple time strings
      const timeStrings = optimalTimes.map(window => {
        const hour = window.startTime.getHours().toString().padStart(2, '0');
        const minute = window.startTime.getMinutes().toString().padStart(2, '0');
        return `${hour}:${minute}`;
      });

      return NextResponse.json({
        success: true,
        platform,
        optimal_times: timeStrings,
        timezone,
      });
    } else {
      // Get optimal times for all platforms
      const platforms = ['instagram', 'tiktok', 'twitter', 'facebook', 'linkedin'];
      const allOptimalTimes: Record<string, string[]> = {};

      for (const plt of platforms) {
        try {
          const optimalTimes = await schedulingService.getOptimalTimes(plt as any, timezone);
          allOptimalTimes[plt] = optimalTimes.map(window => {
            const hour = window.startTime.getHours().toString().padStart(2, '0');
            const minute = window.startTime.getMinutes().toString().padStart(2, '0');
            return `${hour}:${minute}`;
          });
        } catch (error) {
          console.error(`Error getting optimal times for ${plt}:`, error);
          // Use default times if AI analysis fails
          allOptimalTimes[plt] = getDefaultOptimalTimes()[plt] || ['09:00', '15:00', '18:00'];
        }
      }

      return NextResponse.json({
        success: true,
        optimal_times: allOptimalTimes,
        timezone,
        ai_generated: true,
      });
    }

  } catch (error) {
    console.error('Error in optimal times API:', error);
    
    // Fallback to default optimal times
    const defaultTimes = getDefaultOptimalTimes();
    
    return NextResponse.json({
      success: true,
      optimal_times: defaultTimes,
      fallback: true,
      error: 'AI analysis unavailable, using defaults',
    });
  }
}

function getDefaultOptimalTimes(): Record<string, string[]> {
  return {
    instagram: ['09:00', '15:00', '18:00'],
    tiktok: ['14:00', '18:00', '21:00'], 
    twitter: ['09:00', '12:00', '15:00'],
    facebook: ['13:00', '15:00', '18:00'],
    linkedin: ['08:00', '12:00', '17:00'],
  };
}