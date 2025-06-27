// difficult: YouTube Data API v3 client implementation
import { BasePlatformClient } from './BasePlatformClient';
import { PostMetrics, PaginatedResponse, Pagination } from '../types';
import { Platform } from '../../../deliverables/types/deliverables_types';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    channelTitle: string;
    tags?: string[];
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    favoriteCount: string;
  };
  player: {
    embedHtml: string;
  };
  error?: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

interface YouTubePlaylistItem {
  id: string;
  contentDetails: {
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelTitle: string;
    playlistId: string;
    position: number;
    resourceId: {
      kind: string;
      videoId: string;
    };
  };
  status?: {
    privacyStatus: string;
  };
}

interface YouTubeChannel {
  id: string;
  contentDetails: {
    relatedPlaylists: {
      uploads: string;
    };
  };
}

interface YouTubePlaylistItemsApiResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export class YouTubeClient extends BasePlatformClient {
  private readonly API_BASE = 'https://www.googleapis.com/youtube/v3';
  private readonly SHORTS_MAX_DURATION = 60; // 60 seconds for Shorts
  private readonly MAX_RESULTS = 50; // YouTube API max results per page
  private readonly DEFAULT_LOOKBACK_DAYS = 30;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL
  
  private cache = new Map<string, {
    data?: any;
    expires: number;
    uploadsPlaylistId?: string;
  }>();

  constructor(accessToken: string) {
    super(accessToken, Platform.YOUTUBE);
  }
  
  /**
   * Fetches posts for a specific YouTube channel
   * @param channelId The YouTube channel ID
   * @param lookbackDays Number of days to look back for posts (default: 30)
   */
  async getUserPosts(
    userId: string, 
    lookbackDays: number = this.DEFAULT_LOOKBACK_DAYS, 
    maxPages: number = 5,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    const cacheKey = `user_posts_${userId}_${lookbackDays}`;
    const cached = this.getFromCache<PaginatedResponse<PostMetrics>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get the uploads playlist ID for the channel
      const uploadsPlaylistId = await this.getUploadsPlaylistId(userId);
      
      // Get videos from the uploads playlist
      const videos = await this.getVideosFromPlaylist(uploadsPlaylistId, lookbackDays, maxPages);
      
      // Convert to PostMetrics format and cache the result
      const posts = videos.map(video => this.mapToPostMetrics(video));
      this.setCache(cacheKey, posts);
      
      return {
        data: posts,
        pagination: {
          total: posts.length,
          hasMore: false, // YouTube API doesn't provide a reliable way to determine if there are more pages
          page: 1,
          pageSize: posts.length,
          cursor: undefined
        }
      };
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
  }
  
  /**
   * Fetches posts for a competitor's YouTube channel
   * @param channelId The competitor's YouTube channel ID
   * @param lookbackDays Number of days to look back for posts (default: 30)
   */
  async getCompetitorPosts(
    username: string, 
    lookbackDays: number = this.DEFAULT_LOOKBACK_DAYS, 
    maxPages: number = 5,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    // Reuse the same logic as getUserPosts but with username parameter
    return this.getUserPosts(username, lookbackDays, maxPages, maxResultsPerPage);
  }
  
  /**
   * Gets metrics for a specific YouTube video
   * @param videoId The YouTube video ID
   */
  async getPostMetrics(videoId: string): Promise<PostMetrics> {
    const cacheKey = `video_${videoId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as PostMetrics;
    }
    
    try {
      const url = `${this.API_BASE}/videos?part=snippet,contentDetails,statistics,player&id=${videoId}&key=${this.accessToken}`;
      const data = await this.fetchWithRetry<{ items: YouTubeVideo[] }>(url);
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }
      
      const video = data.items[0];
      const metrics = this.mapToPostMetrics(video);
      
      // Cache the result
      this.setCache(cacheKey, metrics);
      
      return metrics;
    } catch (error) {
      console.error('Error fetching video metrics:', error);
      throw error;
    }
  }

  /**
   * Gets the uploads playlist ID for a channel
   * @private
   */
  private async getUploadsPlaylistId(channelId: string): Promise<string> {
    const cacheKey = `channel_${channelId}`;
    
    // Define the type for cached channel data
    interface CachedChannelData {
      uploadsPlaylistId: string;
    }
    
    // Get cached data with proper type
    const cached = this.getFromCache<CachedChannelData>(cacheKey);
    if (cached?.uploadsPlaylistId) {
      return cached.uploadsPlaylistId;
    }

    const url = `${this.API_BASE}/channels?part=contentDetails&id=${channelId}&key=${this.accessToken}`;
    const data = await this.fetchWithRetry<{ items: YouTubeChannel[] }>(url);
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }
    
    const uploadsPlaylistId = data.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Cache the result with proper typing
    this.setCache(cacheKey, { uploadsPlaylistId } as CachedChannelData);
    
    return uploadsPlaylistId;
  }
  
  /**
   * Gets videos from a playlist with optional date filtering
   * @private
   */
  private async getVideosFromPlaylist(playlistId: string, lookbackDays: number, maxPagesToFetch: number = 5): Promise<YouTubeVideo[]> {
    const cacheKey = `playlist_${playlistId}_${lookbackDays}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as YouTubeVideo[];
    }

    const videos: YouTubeVideo[] = [];
    let nextPageToken: string | undefined = undefined;
    let pagesFetched = 0;
    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - lookbackDays);
    
    do {
      if (pagesFetched >= maxPagesToFetch) break;
      // Get playlist items
      const playlistItemsUrl: string = `${this.API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}` +
        `&maxResults=${this.MAX_RESULTS}&pageToken=${nextPageToken || ''}&key=${this.accessToken}`;
      
      const playlistData = await this.fetchWithRetry<YouTubePlaylistItemsApiResponse>(playlistItemsUrl);
      
      nextPageToken = playlistData.nextPageToken;
      pagesFetched++;
      
      // Get video details in batches (YouTube allows up to 50 video IDs per request)
      const videoIds = playlistData.items.map((item: YouTubePlaylistItem) => item.contentDetails.videoId).join(',');
      const videosUrl = `${this.API_BASE}/videos?part=snippet,contentDetails,statistics,player&id=${videoIds}&key=${this.accessToken}`;
      
      const videosData = await this.fetchWithRetry<{ items: YouTubeVideo[] }>(videosUrl);
      
      // Filter videos by publish date and add to results
      const newVideos = (videosData.items || []).filter(video => {
        const publishedAt = new Date(video.snippet.publishedAt);
        return publishedAt >= publishedAfter;
      });
      
      videos.push(...newVideos);
      
      // Stop if the API returned fewer items than requested (likely end of playlist for the period)
      // or if we've fetched enough pages.
      if (newVideos.length < playlistData.items.length) { 
        // This condition implies that the publishedAfter filter removed some items, 
        // or it's the last page with fewer than MAX_RESULTS items.
        // If all fetched items are older than 'publishedAfter', nextPageToken might still exist,
        // but we should stop if newVideos is empty for the current page of playlistItems.
        const allFetchedAreOld = playlistData.items.length > 0 && newVideos.length === 0;
        if (allFetchedAreOld) {
            // Check if the *oldest* item on this page of playlist items is already older than our lookback.
            // This is a heuristic to stop early if we are fetching very old playlist items.
            const oldestPlaylistItemDate = playlistData.items.length > 0 ? new Date(playlistData.items[playlistData.items.length -1].snippet.publishedAt) : new Date(0);
            if (oldestPlaylistItemDate < publishedAfter) {
                 break; // All further playlist items will also be too old.
            }
        }
      }
      // The primary stop condition is no nextPageToken or maxPagesFetched reached (handled by the loop condition and initial check)
      
    } while (nextPageToken);
    
    // Cache the result
    this.setCache(cacheKey, videos);
    
    return videos;
  }
  
  /**
   * Maps a YouTube video to the PostMetrics format
   * @private
   */
  private mapToPostMetrics(video: YouTubeVideo): PostMetrics {
    const isShort = this.isShortVideo(video.contentDetails.duration);
    const statistics = video.statistics || {
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
      favoriteCount: '0'
    };
    
    const views = parseInt(statistics.viewCount) || 0;
    const likes = parseInt(statistics.likeCount) || 0;
    const comments = parseInt(statistics.commentCount) || 0;
    const shares = Math.floor(views * 0.02); // Estimate shares as 2% of views
    const duration = this.parseDuration(video.contentDetails.duration);
    
    // Calculate engagement rate (likes + comments + shares) / views * 100
    const engagementRate = views > 0 
      ? ((likes + comments + shares) / views) * 100 
      : 0;
    
    // Extract hashtags from description
    const hashtags = video.snippet.description 
      ? this.extractHashtags(video.snippet.description) 
      : [];

    return {
      id: video.id,
      platform: Platform.YOUTUBE,
      views,
      likes,
      comments,
      shares,
      watchTime: duration,
      engagementRate,
      timestamp: new Date(video.snippet.publishedAt),
      caption: video.snippet.title,
      hashtags,
      url: `https://youtube.com/watch?v=${video.id}`,
      metadata: {
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high?.url || 
                 video.snippet.thumbnails.medium?.url || 
                 video.snippet.thumbnails.default?.url || '',
        duration,
        isShort,
        channelTitle: video.snippet.channelTitle,
        tags: video.snippet.tags || []
      }
    };
  }
  
  /**
   * Checks if a video is a short based on its duration
   * @private
   */
  private isShortVideo(duration: string): boolean {
    return this.parseDuration(duration) <= this.SHORTS_MAX_DURATION;
  }
  
  /**
   * Parses ISO 8601 duration format to seconds
   * @private
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  /**
   * Extracts hashtags from text
   * @private
   */
  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
    return matches.map(tag => tag.substring(1)); // Remove the # symbol
  }
  
  /**
   * Fetches data from URL with retry logic
   * @private
   */
  private async fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
    try {
      const response = await this.throttleRequest<Response>(() => fetch(url));
      
      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
          return this.fetchWithRetry<T>(url, retries - 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry<T>(url, retries - 1);
      }
      throw error;
    }
  }
  
  /**
   * Gets a value from cache if it exists and is not expired
   * @private
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (cached.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    // Handle special case for channel data with uploadsPlaylistId
    if (key.startsWith('channel_') && 'uploadsPlaylistId' in cached) {
      return { uploadsPlaylistId: cached.uploadsPlaylistId } as unknown as T;
    }
    
    // For non-channel data, return the cached data
    return (cached.data ?? cached) as T;
  }
  
  /**
   * Sets a value in the cache
   * @private
   */
  private setCache(key: string, data: any): void {
    const cacheEntry: {
      data?: any;
      expires: number;
      uploadsPlaylistId?: string;
    } = {
      expires: Date.now() + this.CACHE_TTL_MS
    };

    // Special handling for channel data with uploadsPlaylistId
    if (key.startsWith('channel_') && data?.uploadsPlaylistId) {
      cacheEntry.uploadsPlaylistId = data.uploadsPlaylistId;
    } else {
      cacheEntry.data = data;
    }

    this.cache.set(key, cacheEntry);
  }
}
