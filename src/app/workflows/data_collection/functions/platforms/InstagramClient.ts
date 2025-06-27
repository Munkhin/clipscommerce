// difficult: Instagram Graph API client implementation
import { BasePlatformClient } from './BasePlatformClient';
import { PostMetrics, InstagramMediaProductType, PaginatedResponse, Pagination } from '../types';
import { Platform } from '../../../deliverables/types/deliverables_types';

// Helper function to extract hashtags from caption
function extractHashtags(caption: string | undefined): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[a-zA-Z0-9_]+/g) || [];
  return matches.map(tag => tag.substring(1)); // Remove the '#' character
}

// Helper function to get a metric value from insights
function getMetricValue(insights: any, metricName: string): number {
  if (!insights?.data) return 0;
  const metric = insights.data.find((item: any) => item.name === metricName);
  return metric?.values?.[0]?.value || 0;
}

// Helper function to get engagement metrics
function getEngagementMetric(insights: any, metricType: string): number {
  if (!insights?.data) return 0;
  const metric = insights.data.find((item: any) => 
    item.title.toLowerCase().includes(metricType.toLowerCase())
  );
  return metric?.values?.[0]?.value || 0;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_product_type?: InstagramMediaProductType;
  thumbnail_url?: string;
  video_title?: string;
  media_url: string;
  permalink: string;
  timestamp: string;
  username: string;
  insights?: {
    data: Array<{
      name: string;
      period: string;
      values: Array<{ value: number }>;
      title: string;
      description: string;
      id: string;
    }>;
  };
  children?: {
    data: Array<{ id: string }>;
  };
}

export class InstagramClient extends BasePlatformClient {
  private readonly API_BASE = 'https://graph.instagram.com/v16.0';
  private readonly API_VERSION = 'v16.0';
  private readonly FIELDS = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'timestamp',
    'username',
    'children{media_url,media_type}',
    'media_product_type',
    'thumbnail_url',
    'video_title',
  ].join(',');
  
  constructor(accessToken: string) {
    super(accessToken, Platform.INSTAGRAM);
  }

  async getPostMetrics(postId: string, mediaProductType?: InstagramMediaProductType): Promise<PostMetrics> {
    return this.throttleRequest(async () => {
      // First, get the basic media data
      const mediaUrl = `${this.API_BASE}/${postId}?fields=${this.FIELDS}&access_token=${this.accessToken}`;
      const mediaResponse = await fetch(mediaUrl);
      
      if (!mediaResponse.ok) {
        throw new Error(`Instagram API error: ${mediaResponse.statusText}`);
      }
      
      const media = await mediaResponse.json() as InstagramMedia;
      
      // Then get the insights
      let insightMetrics = ['engagement', 'impressions', 'reach', 'saved'];
      if (mediaProductType === 'STORY') {
        insightMetrics.push('story_replies', 'story_exits');
      } else {
        insightMetrics.push('video_views');
      }
      
      const insightsUrl = `${this.API_BASE}/${postId}/insights?metric=${insightMetrics.join(',')}&access_token=${this.accessToken}`;
      const insightsResponse = await fetch(insightsUrl);
      
      if (!insightsResponse.ok) {
        console.warn('Could not fetch insights for post', postId);
      }
      
      const insights = await insightsResponse.json();
      
      return this.mapToPostMetrics(media, insights, mediaProductType);
    });
  }

  private async _getBusinessAccountId(username: string): Promise<string> {
    const accountInfoUrl = `${this.API_BASE}/me/accounts?fields=instagram_business_account&access_token=${this.accessToken}`;
    const accountResponse = await fetch(accountInfoUrl);

    if (!accountResponse.ok) {
      throw new Error(`Failed to get Instagram Business Account for user ${username}: ${accountResponse.statusText}`);
    }

    const accountData = await accountResponse.json();
    const businessAccountId = accountData.data[0]?.instagram_business_account?.id;

    if (!businessAccountId) {
      throw new Error(`No Instagram Business Account found for user ${username}`);
    }
    return businessAccountId;
  }

  private async _fetchPaginatedMedia(
    userId: string,
    lookbackDays: number = 30,
    mediaProductType?: InstagramMediaProductType,
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    const allPosts: PostMetrics[] = [];
    let nextPageUrl: string | null = null;
    let hasMore = true;
    let pagesFetched = 0;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    // Build the base URL with common parameters
    const baseUrl = `${this.API_BASE}/${userId}/media`;
    const params = new URLSearchParams({
      fields: this.FIELDS,
      limit: Math.min(maxResultsPerPage, 100).toString(),
      access_token: this.accessToken,
    });
    
    // Add media product type filter if specified
    if (mediaProductType) {
      params.append('media_product_type', mediaProductType);
    }
    
    // Add date range filter if lookbackDays is specified
    if (lookbackDays) {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (lookbackDays * 24 * 60 * 60);
      params.append('since', startTime.toString());
      params.append('until', endTime.toString());
    }
    
    nextPageUrl = `${baseUrl}?${params.toString()}`;
    
    while (hasMore && nextPageUrl && retryCount < MAX_RETRIES && pagesFetched < maxPages) {
      try {
        const response: Response = await fetch(nextPageUrl);
        
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited, implement exponential backoff
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
            await new Promise(resolve => setTimeout(resolve, (2 ** retryCount) * retryAfter * 1000));
            retryCount++;
            continue;
          }
          throw new Error(`Instagram API error: ${response.statusText}`);
        }

        const data: {
          data?: any[];
          paging?: {
            next?: string;
          };
        } = await response.json();
        pagesFetched++;
        
        // Process the current page of media items
        if (data.data && Array.isArray(data.data)) {
          const pagePosts = await Promise.all(
            data.data.map((item: any) => 
              this.getPostMetrics(item.id, item.media_product_type as InstagramMediaProductType)
                .catch(error => {
                  console.error(`Error fetching metrics for post ${item.id}:`, error);
                  return null;
                })
            )
          );
          
          allPosts.push(...pagePosts.filter((post): post is PostMetrics => post !== null));
        }

        // Check for next page
        if (data.paging?.next && pagesFetched < maxPages) {
          nextPageUrl = data.paging.next;
        } else {
          hasMore = false;
        }
        
        // Reset retry count after successful request
        retryCount = 0;
        
      } catch (error) {
        console.error('Error fetching paginated media:', error);
        retryCount++;
        
        if (retryCount >= MAX_RETRIES) {
          throw new Error(`Failed to fetch media after ${MAX_RETRIES} attempts: ${error}`);
        }
      }
    }
    
    return {
      data: allPosts,
      pagination: {
        total: allPosts.length,
        hasMore,
        page: pagesFetched,
        pageSize: maxResultsPerPage,
        cursor: nextPageUrl
      }
    };
  }

  private mapToPostMetrics(media: InstagramMedia, insights: any, mediaProductType?: InstagramMediaProductType): PostMetrics {
    const timestamp = new Date(media.timestamp);
    const caption = media.caption || '';
    const hashtags = extractHashtags(caption);
    
    // Get basic metrics using helper functions
    const likes = getMetricValue(insights, 'like');
    const comments = getMetricValue(insights, 'comments');
    const shares = getMetricValue(insights, 'shares');
    const saves = getMetricValue(insights, 'saved');
    const reach = getMetricValue(insights, 'reach');
    const impressions = getMetricValue(insights, 'impressions');
    const videoViews = getMetricValue(insights, 'video_views');
    
    // Calculate engagement rate (simplified)
    const engagementRate = ((likes + comments + shares + saves) / Math.max(impressions, 1)) * 100;
    
    // Additional metrics for different media types
    const additionalMetrics: Record<string, any> = {
      mediaType: media.media_type,
      mediaProductType: mediaProductType || 'FEED',
      thumbnailUrl: media.thumbnail_url,
      videoTitle: media.video_title
    };
    
    if (mediaProductType === 'REELS') {
      const plays = getMetricValue(insights, 'plays');
      const accountsReached = getMetricValue(insights, 'accounts_reached');
      const totalInteractions = getMetricValue(insights, 'total_interactions');
      
      additionalMetrics.videoPlays = plays;
      additionalMetrics.accountsReached = accountsReached;
      additionalMetrics.totalInteractions = totalInteractions;
    } else if (mediaProductType === 'STORY') {
      const replies = getMetricValue(insights, 'replies');
      const exits = getMetricValue(insights, 'exits');
      const tapsForward = getMetricValue(insights, 'taps_forward');
      const tapsBack = getMetricValue(insights, 'taps_back');
      
      additionalMetrics.storyReplies = replies;
      additionalMetrics.storyExits = exits;
      additionalMetrics.tapsForward = tapsForward;
      additionalMetrics.tapsBack = tapsBack;
    }
    
    return {
      id: media.id,
      platform: Platform.INSTAGRAM,
      views: videoViews || impressions,
      likes,
      comments,
      shares,
      engagementRate,
      timestamp,
      caption,
      hashtags,
      url: media.permalink,
      mediaProductType: mediaProductType || 'FEED',
      storyReplies: mediaProductType === 'STORY' ? additionalMetrics.storyReplies : undefined,
      storyExits: mediaProductType === 'STORY' ? additionalMetrics.storyExits : undefined,
      metadata: additionalMetrics,
      metrics: {
        engagement: {
          likes,
          comments,
          shares,
          views: videoViews || impressions,
          saves,
          reach,
          impressions
        },
        ...(mediaProductType === 'REELS' ? {
          video: {
            plays: additionalMetrics.videoPlays,
            accountsReached: additionalMetrics.accountsReached,
            totalInteractions: additionalMetrics.totalInteractions
          }
        } : {}),
        ...(mediaProductType === 'STORY' ? {
          story: {
            replies: additionalMetrics.storyReplies,
            exits: additionalMetrics.storyExits,
            tapsForward: additionalMetrics.tapsForward,
            tapsBack: additionalMetrics.tapsBack
          }
        } : {})
      }
    };
  }
  
  async getUserPosts(
    username: string,
    lookbackDays: number = 30,
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    try {
      // First, get the business account ID
      const businessAccountId = await this._getBusinessAccountId(username);
      
      // Fetch posts using the business account ID
      return this._fetchPaginatedMedia(
        businessAccountId,
        lookbackDays,
        'FEED',
        maxPages,
        maxResultsPerPage
      );
    } catch (error) {
      console.error('Error in getUserPosts:', error);
      throw error;
    }
  }
  
  async getReels(
    username: string,
    lookbackDays: number = 30,
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    try {
      // First, get the business account ID
      const businessAccountId = await this._getBusinessAccountId(username);
      
      // Fetch reels using the business account ID
      return this._fetchPaginatedMedia(
        businessAccountId,
        lookbackDays,
        'REELS',
        maxPages,
        maxResultsPerPage
      );
    } catch (error) {
      console.error('Error in getReels:', error);
      throw error;
    }
  }
  
  async getStories(
    username: string,
    lookbackDays: number = 1, // Stories are only available for 24 hours
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    try {
      // First, get the business account ID
      const businessAccountId = await this._getBusinessAccountId(username);
      
      // Fetch stories using the business account ID
      return this._fetchPaginatedMedia(
        businessAccountId,
        lookbackDays,
        'STORY',
        maxPages,
        maxResultsPerPage
      );
    } catch (error) {
      console.error('Error in getStories:', error);
      throw error;
    }
  }
  
  async getCompetitorPosts(
    username: string,
    lookbackDays: number = 30,
    maxPages: number = 10,
    maxResultsPerPage: number = 20
  ): Promise<PaginatedResponse<PostMetrics>> {
    // For Instagram, getting competitor posts is similar to getting user posts
    // since we can access public content with the right permissions
    return this.getUserPosts(username, lookbackDays, maxPages, maxResultsPerPage);
  }
}
