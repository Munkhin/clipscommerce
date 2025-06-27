// difficult: TikTok API client implementation
import { BasePlatformClient } from './BasePlatformClient';
import { PostMetrics, PaginatedResponse, Pagination } from '../types';
import { Platform } from '../../../deliverables/types/deliverables_types';

interface TikTokVideo {
  id: string;
  create_time: number;
  stats: {
    play_count: number;
    digg_count: number;
    comment_count: number;
    share_count: number;
    play_time: number;
  };
  /**
   * The description of the video (not a subtitle). This is the main caption/description field.
   */
  desc?: string;
  video_url: string;
  [key: string]: any; // For any additional fields
}

// Extend the base Pagination interface to include TikTok-specific fields
interface TikTokPagination extends Pagination {
  cursor: string | null;
  has_more: boolean;
}

interface TikTokVideoListResponse {
  videos: TikTokVideo[];
  cursor: string | null;
  has_more: boolean;
}

interface TikTokUserInfoResponse {
  user: {
    id: string;
    follower_count: number;
    [key: string]: any;
  };
}

interface TikTokBatchVideoResponse {
  data: {
    videos: TikTokVideo[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export class TikTokClient extends BasePlatformClient {
  private readonly API_BASE = 'https://open.tiktokapis.com/v2';
  
  constructor(accessToken: string) {
    super(accessToken, Platform.TIKTOK);
  }

  async getPostMetrics(postId: string): Promise<PostMetrics> {
    return this.throttleRequest(async () => {
      const response = await fetch(`${this.API_BASE}/video/query/?video_ids=${postId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.statusText}`);
      }

      const data = await response.json();
      const video = data.data.videos[0] as TikTokVideo;
      
      return this.mapToPostMetrics(video);
    });
  }

  /**
   * Fetches a user's posts with pagination support
   * @param userId The TikTok user ID
   * @param lookbackDays Number of days to look back for posts (default: 30)
   * @param maxPages Maximum number of pages to fetch (default: 10)
   * @param maxResultsPerPage Maximum number of results per page (default: 20, max: 50)
   * @returns Promise with array of PostMetrics and pagination info
   */
  async getUserPosts(
    userId: string, 
    lookbackDays: number = 30,
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    return this.throttleRequest(async () => {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (lookbackDays * 24 * 60 * 60);
      
      let cursor: string | null = null;
      let hasMore = true;
      let page = 0;
      const allVideos: TikTokVideo[] = [];
      
      while (hasMore && page < maxPages) {
        page++;
        const params = new URLSearchParams({
          user_id: userId,
          start_time: startTime.toString(),
          end_time: endTime.toString(),
          max_count: Math.min(maxResultsPerPage, 50).toString(),
          ...(cursor ? { cursor } : {})
        });

        const response = await fetch(
          `${this.API_BASE}/video/list/?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            `TikTok API error (${response.status}): ${error.error?.message || response.statusText}`
          );
        }

        const data: TikTokVideoListResponse = await response.json();
        
        if (data.videos && data.videos.length > 0) {
          allVideos.push(...data.videos);
        }
        
        cursor = data.cursor || null;
        hasMore = data.has_more && !!cursor;
        
        // If we've reached the lookback period, we can stop
        if (data.videos.length === 0 || 
            (data.videos[data.videos.length - 1].create_time < startTime)) {
          hasMore = false;
        }
      }
      
      // Process videos in batches to get detailed metrics
      const BATCH_SIZE = 5; // Process 5 videos at a time
      const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second between batches
      
      const posts = await this.processInBatches<TikTokVideo, PostMetrics>(
        allVideos,
        BATCH_SIZE,
        (video) => this.getPostMetrics(video.id),
        DELAY_BETWEEN_BATCHES_MS
      );
      
      // Ensure we have valid pagination values
      const pageSize = Math.min(maxResultsPerPage, posts.length);
      const totalPages = Math.ceil(posts.length / maxResultsPerPage);
      
      return {
        data: posts,
        pagination: {
          cursor: cursor || null,
          hasMore,
          pageSize,
          page: Math.min(maxPages, totalPages),
          total: posts.length
        }
      };
    });
  }
  
  /**
   * Fetches detailed metrics for multiple video IDs in a single batch request
   * @param videoIds Array of video IDs to fetch metrics for
   */
  private async getBatchVideoMetrics(videoIds: string[]): Promise<PostMetrics[]> {
    if (videoIds.length === 0) return [];
    
    const response = await fetch(
      `${this.API_BASE}/video/query/?video_ids=${videoIds.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `TikTok batch API error (${response.status}): ${error.error?.message || response.statusText}`
      );
    }
    
    const data: TikTokBatchVideoResponse = await response.json();
    
    if (data.error) {
      throw new Error(`TikTok batch API error: ${data.error.message}`);
    }
    
    return data.data.videos.map(video => this.mapToPostMetrics(video));
  }

  /**
   * Fetches posts from a competitor's profile
   * @param username TikTok username
   * @param lookbackDays Number of days to look back for posts (default: 30)
   * @param maxPages Maximum number of pages to fetch (default: 10)
   * @param maxResultsPerPage Maximum number of results per page (default: 20)
   * @returns Promise with array of PostMetrics and pagination info
   */
  async getCompetitorPosts(
    username: string, 
    lookbackDays: number = 30,
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    // First, get the user ID from username
    const userResponse = await fetch(`${this.API_BASE}/user/info/username/${username}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const error = await userResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to get user ID for ${username}: ${error.error?.message || userResponse.statusText}`
      );
    }

    const userData: { data: TikTokUserInfoResponse } = await userResponse.json();
    const userId = userData.data.user.id;
    
    // Then get their posts with pagination
    return this.getUserPosts(userId, lookbackDays, maxPages, maxResultsPerPage);
  }

  private mapToPostMetrics(video: TikTokVideo): PostMetrics {
    if (!video) {
      throw new Error('Invalid video data provided to mapToPostMetrics');
    }
    
    const hashtags = video.desc ? this.extractHashtags(video.desc) : [];
    const timestamp = new Date(video.create_time * 1000);
    const views = video.stats?.play_count || 0;
    const likes = video.stats?.digg_count || 0;
    const comments = video.stats?.comment_count || 0;
    const shares = video.stats?.share_count || 0;
    const watchTime = video.stats?.play_time || 0;
    
    return {
      id: video.id,
      platform: Platform.TIKTOK,
      views: video.view_count || 0,
      likes,
      comments,
      shares,
      watchTime,
      engagementRate: this.calculateEngagementRate({
        likes,
        comments,
        shares,
        views,
        followerCount: 0, // This would come from user data
      }),
      timestamp,
      caption: video.desc,
      hashtags,
      url: video.video_url,
      metadata: {
        isShort: true, // All TikTok videos are considered short-form
        videoDuration: watchTime,
        // Add any other relevant metadata
      },
      metrics: {
        engagement: {
          likes,
          comments,
          shares,
          views,
        },
        // Add any other relevant metrics
      }
    };
  }

  private extractHashtags(caption: string): string[] {
    const hashtagRegex = /#([\w\d]+)/g;
    const matches = caption.match(hashtagRegex) || [];
    return matches.map(tag => tag.substring(1)); // Remove the '#'
  }
}
