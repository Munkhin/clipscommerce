'use client';

import { z } from 'zod';

// Type definitions
export type ScheduledPost = {
  id: string;
  content: string;
  platform: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: 'scheduled' | 'posted' | 'failed';
  type: 'video' | 'image' | 'carousel' | 'text';
  thumbnail?: string;
  isOptimalTime?: boolean;
  created_at?: string;
  post_time?: string;
  media_urls?: string[];
  metadata?: Record<string, unknown>;
};

export type CalendarPost = {
  id: string;
  content: string;
  type: 'video' | 'image' | 'carousel' | 'text';
  platform: string;
  time: string;
  status: 'scheduled' | 'posted' | 'failed';
  isOptimalTime?: boolean;
};

export type SchedulePostData = {
  platform: string;
  content: string;
  media_urls: string[];
  post_time: string;
  hashtags?: string[];
  additional_settings?: Record<string, unknown>;
};

export type OptimalTime = {
  platform: string;
  times: string[];
};

// API response schemas
const ScheduledPostsResponseSchema = z.object({
  success: z.boolean(),
  posts: z.array(z.record(z.unknown())),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    has_more: z.boolean(),
  }).optional(),
});

const SchedulePostResponseSchema = z.object({
  success: z.boolean(),
  scheduled_post: z.record(z.unknown()),
  estimated_posting_time: z.string(),
});

const OptimalTimesResponseSchema = z.object({
  success: z.boolean(),
  optimal_times: z.record(z.array(z.string())),
});

class SchedulingApiService {
  private baseUrl = '/api/autoposting';

  async getScheduledPosts(params?: {
    platform?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScheduledPost[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.platform) searchParams.set('platform', params.platform);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      const response = await fetch(`${this.baseUrl}/schedule?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scheduled posts: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = ScheduledPostsResponseSchema.parse(data);

      // Transform API response to match component expectations
      return validatedData.posts.map((post: Record<string, unknown>) => ({
        id: String(post.id),
        content: String(post.content),
        platform: String(post.platform),
        scheduledDate: new Date(String(post.post_time || post.created_at)),
        scheduledTime: new Date(String(post.post_time || post.created_at)).toTimeString().slice(0, 5),
        status: String(post.status) as 'scheduled' | 'posted' | 'failed',
        type: this.inferContentType(post),
        thumbnail: Array.isArray(post.media_urls) ? String(post.media_urls[0]) : undefined,
        isOptimalTime: Boolean((post.metadata as Record<string, unknown>)?.is_optimal_time),
      }));
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      throw error;
    }
  }

  async schedulePost(postData: SchedulePostData): Promise<ScheduledPost> {
    try {
      const response = await fetch(`${this.baseUrl}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to schedule post: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = SchedulePostResponseSchema.parse(data);

      const post = validatedData.scheduled_post;
      return {
        id: String(post.id),
        content: String(post.content),
        platform: String(post.platform),
        scheduledDate: new Date(String(post.post_time)),
        scheduledTime: new Date(String(post.post_time)).toTimeString().slice(0, 5),
        status: String(post.status) as 'scheduled' | 'posted' | 'failed',
        type: this.inferContentType(post),
        thumbnail: Array.isArray(post.media_urls) ? String(post.media_urls[0]) : undefined,
        isOptimalTime: Boolean((post.metadata as Record<string, unknown>)?.is_optimal_time),
      };
    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  }

  async getOptimalTimes(): Promise<Record<string, string[]>> {
    try {
      const response = await fetch('/api/ai/optimal-times', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Return default optimal times if API fails
        console.warn('Failed to fetch AI optimal times, using defaults');
        return this.getDefaultOptimalTimes();
      }

      const data = await response.json();
      const validatedData = OptimalTimesResponseSchema.parse(data);
      return validatedData.optimal_times;
    } catch (error) {
      console.error('Error fetching optimal times:', error);
      return this.getDefaultOptimalTimes();
    }
  }

  async getCalendarPosts(startDate: Date, endDate: Date): Promise<{ [key: string]: CalendarPost[] }> {
    try {
      const posts = await this.getScheduledPosts({
        limit: 100,
      });

      // Filter posts within date range and group by date
      const calendarPosts: { [key: string]: CalendarPost[] } = {};
      
      posts.forEach(post => {
        const postDate = post.scheduledDate;
        if (postDate >= startDate && postDate <= endDate) {
          const dateKey = postDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          if (!calendarPosts[dateKey]) {
            calendarPosts[dateKey] = [];
          }
          
          calendarPosts[dateKey].push({
            id: post.id,
            content: post.content,
            type: post.type,
            platform: post.platform,
            time: post.scheduledTime,
            status: post.status,
            isOptimalTime: post.isOptimalTime,
          });
        }
      });

      return calendarPosts;
    } catch (error) {
      console.error('Error fetching calendar posts:', error);
      return {};
    }
  }

  private inferContentType(post: Record<string, unknown>): 'video' | 'image' | 'carousel' | 'text' {
    const mediaUrls = post.media_urls;
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      if (mediaUrls.length > 1) {
        return 'carousel';
      }
      
      const url = String(mediaUrls[0]);
      if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')) {
        return 'video';
      }
      
      return 'image';
    }
    
    return 'text';
  }

  private getDefaultOptimalTimes(): Record<string, string[]> {
    return {
      instagram: ['09:00', '15:00', '18:00'],
      tiktok: ['14:00', '18:00', '21:00'],
      twitter: ['09:00', '12:00', '15:00'],
      facebook: ['13:00', '15:00', '18:00'],
      linkedin: ['08:00', '12:00', '17:00'],
    };
  }
}

export const schedulingApiService = new SchedulingApiService();