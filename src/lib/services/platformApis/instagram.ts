import { Platform, PlatformAuth } from "@/types/platform";
import { Post, PostContent, PostStatus } from "@/types/schedule";
import { PlatformApiClient } from "./base";

export class InstagramApiClient extends PlatformApiClient {
  private readonly API_BASE = 'https://graph.instagram.com/v12.0';
  private readonly API_UPLOAD = 'https://graph.facebook.com/v12.0';
  private userId: string | null = null;

  constructor(auth: PlatformAuth) {
    super('instagram', auth);
  }

  // Authentication
  async refreshToken(): Promise<PlatformAuth> {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.auth.accessToken}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to refresh Instagram token');
    }
    
    const data = await response.json();
    return {
      ...this.auth,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const user = await this.getUserProfile();
      return !!user.id;
    } catch (error) {
      return false;
    }
  }

  // Content Management
  async createPost(content: PostContent): Promise<{ id: string; status: PostStatus }> {
    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('Instagram requires at least one media file');
    }

    // For multiple media, create a carousel
    if (content.mediaUrls.length > 1) {
      return this.createCarouselPost(content);
    }

    // For single media, determine if it's an image or video
    const mediaUrl = content.mediaUrls[0];
    const isVideo = mediaUrl.match(/\.(mp4|mov|avi|mkv)$/i);
    
    // In a real app, you would first upload the media and get the container ID
    const containerId = await this.uploadMediaToContainer(mediaUrl, isVideo ? 'video' : 'image');
    
    // Then publish the container
    const response = await this.makeRequest<{ id: string }>(
      `${this.API_UPLOAD}/${this.userId}/media_publish`,
      'POST',
      {
        creation_id: containerId,
        caption: this.formatCaption(content),
      }
    );

    return {
      id: response.id,
      status: {
        status: 'published',
        publishedAt: new Date(),
        platformPostIds: { instagram: response.id },
      },
    };
  }

  private async createCarouselPost(content: PostContent): Promise<{ id: string; status: PostStatus }> {
    if (!content.mediaUrls || content.mediaUrls.length < 2) {
      throw new Error('Carousel posts require at least 2 media items');
    }
    
    // Upload all media and get container IDs
    const containerIds = await Promise.all(
      content.mediaUrls.map(url => {
        const isVideo = url.match(/\.(mp4|mov|avi|mkv)$/i);
        return this.uploadMediaToContainer(url, isVideo ? 'video' : 'image');
      })
    );
    
    // Create carousel container
    const carouselResponse = await this.makeRequest<{ id: string }>(
      `${this.API_UPLOAD}/${this.userId}/media`,
      'POST',
      {
        media_type: 'CAROUSEL',
        children: containerIds,
        caption: this.formatCaption(content),
      }
    );
    
    // Publish the carousel
    const publishResponse = await this.makeRequest<{ id: string }>(
      `${this.API_UPLOAD}/${carouselResponse.id}/publish`,
      'POST',
      { creation_id: carouselResponse.id }
    );

    return {
      id: publishResponse.id,
      status: {
        status: 'published',
        publishedAt: new Date(),
        platformPostIds: { instagram: publishResponse.id },
      },
    };
  }

  async updatePost(postId: string, content: Partial<PostContent>): Promise<boolean> {
    try {
      await this.makeRequest(
        `${this.API_BASE}/${postId}`,
        'POST',
        {
          caption: content.text ? this.formatCaption(content as PostContent) : undefined,
        }
      );
      return true;
    } catch (error) {
      console.error('Error updating post:', error);
      return false;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `${this.API_BASE}/${postId}`,
        'DELETE'
      );
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  async getPost(postId: string): Promise<Post | null> {
    try {
      const response = await this.makeRequest<any>(
        `${this.API_BASE}/${postId}?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username`,
        'GET'
      );
      
      return {
        id: response.id,
        userId: this.userId || '',
        content: {
          text: response.caption || '',
          mediaUrls: [response.media_url],
          hashtags: this.extractHashtags(response.caption || ''),
          mentions: this.extractMentions(response.caption || ''),
          links: [],
          customFields: {},
        },
        platforms: ['instagram'],
        status: {
          status: 'published',
          publishedAt: new Date(response.timestamp),
          platformPostIds: { instagram: response.id },
        },
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
          linkClicks: 0,
          updatedAt: new Date(),
        },
        createdAt: new Date(response.timestamp),
        updatedAt: new Date(),
        createdBy: response.username || 'unknown',
        updatedBy: 'system',
        tags: this.extractHashtags(response.caption || ''),
        isRepost: false,
      };
    } catch (error) {
      console.error('Error getting post:', error);
      return null;
    }
  }

  // Scheduling
  async schedulePost(postId: string, publishAt: Date): Promise<boolean> {
    // Instagram API doesn't support native scheduling
    // This would typically integrate with a scheduling service
    console.warn('Instagram native scheduling not supported. Use third-party scheduling service.');
    return false;
  }

  async getScheduledPosts(startDate: Date, endDate: Date): Promise<Post[]> {
    // Instagram API doesn't provide scheduled posts endpoint
    console.warn('Instagram scheduled posts retrieval not supported.');
    return [];
  }

  async getPostsInsights(postIds: string[]): Promise<Record<string, any>> {
    const insights: Record<string, any> = {};
    
    for (const postId of postIds) {
      try {
        insights[postId] = await this.getPostInsights(postId);
      } catch (error) {
        console.error(`Failed to get insights for post ${postId}:`, error);
        insights[postId] = null;
      }
    }
    
    return insights;
  }

  async getAccountMetrics(): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(
        `${this.API_BASE}/${this.userId}/insights?metric=impressions,reach,profile_views,follower_count`,
        'GET'
      );
      
      return response.data.reduce((acc, item) => {
        acc[item.name] = item.values[0].value;
        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      console.error('Error getting account metrics:', error);
      return {};
    }
  }

  // Comments & Engagement
  async getComments(postId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(
        `${this.API_BASE}/${postId}/comments?fields=id,text,timestamp,username,replies`,
        'GET'
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  async replyToComment(commentId: string, message: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `${this.API_BASE}/${commentId}/replies`,
        'POST',
        { message }
      );
      return true;
    } catch (error) {
      console.error('Error replying to comment:', error);
      return false;
    }
  }

  async likeComment(commentId: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `${this.API_BASE}/${commentId}/likes`,
        'POST'
      );
      return true;
    } catch (error) {
      console.error('Error liking comment:', error);
      return false;
    }
  }

  // User Management
  async getFollowers(): Promise<any[]> {
    // Instagram Basic Display API doesn't provide follower list
    console.warn('Instagram follower list not available via Basic Display API');
    return [];
  }

  async followUser(userId: string): Promise<boolean> {
    // Instagram Basic Display API doesn't support following users
    console.warn('Instagram follow functionality not available via Basic Display API');
    return false;
  }

  async unfollowUser(userId: string): Promise<boolean> {
    // Instagram Basic Display API doesn't support unfollowing users
    console.warn('Instagram unfollow functionality not available via Basic Display API');
    return false;
  }

  // Media Handling
  async uploadMedia(media: File | Blob, type: 'image' | 'video' | 'story'): Promise<{ id: string; url: string }> {
    // This is a simplified example - real implementation would handle file upload
    throw new Error('Direct media upload not implemented. Use uploadMediaToContainer instead.');
  }

  async getMediaStatus(mediaId: string): Promise<{ status: 'processing' | 'succeeded' | 'failed'; url?: string }> {
    try {
      const response = await this.makeRequest<{ status_code: string; status: string }>(
        `${this.API_BASE}/${mediaId}?fields=status_code,status`,
        'GET'
      );
      
      const status = response.status_code === 'FINISHED' ? 'succeeded' : 
                    response.status_code === 'ERROR' ? 'failed' : 'processing';
                    
      return { status };
    } catch (error) {
      console.error('Error getting media status:', error);
      return { status: 'failed' };
    }
  }

  // Media Handling
  private async uploadMediaToContainer(mediaUrl: string, mediaType: 'image' | 'video'): Promise<string> {
    // In a real app, you would:
    // 1. Upload the media file to get a container ID
    // 2. Wait for the container to be processed
    // 3. Return the container ID
    
    // This is a simplified example
    const response = await this.makeRequest<{ id: string }>(
      `${this.API_UPLOAD}/${this.userId}/media`,
      'POST',
      {
        media_type: mediaType.toUpperCase(),
        [mediaType === 'video' ? 'video_url' : 'image_url']: mediaUrl,
        is_carousel_item: true,
      }
    );

    return response.id;
  }

  // Analytics
  async getPostInsights(postId: string): Promise<any> {
    const response = await this.makeRequest<{ data: any[] }>(
      `${this.API_BASE}/${postId}/insights?metric=impressions,reach,engagement,saved,video_views`,
      'GET'
    );
    
    return response.data.reduce((acc, item) => {
      acc[item.name] = item.values[0].value;
      return acc;
    }, {} as Record<string, any>);
  }

  // User Management
  async getUserProfile(): Promise<any> {
    const response = await this.makeRequest<{ id: string, username: string }>(
      `${this.API_BASE}/me?fields=id,username,account_type,media_count`,
      'GET'
    );
    
    this.userId = response.id;
    return response;
  }

  // Helper Methods
  private formatCaption(content: PostContent): string {
    let caption = content.text || '';
    
    // Add hashtags
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      caption += `\n\n${hashtags.join(' ')}`;
    }
    
    // Add mentions
    if (content.mentions && content.mentions.length > 0) {
      const mentions = content.mentions.map(mention => mention.startsWith('@') ? mention : `@${mention}`);
      caption += `\n\n${mentions.join(' ')}`;
    }
    
    return caption.trim();
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex) || [];
    return matches.map(tag => tag.replace('#', ''));
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex) || [];
    return matches.map(mention => mention.replace('@', ''));
  }
}
