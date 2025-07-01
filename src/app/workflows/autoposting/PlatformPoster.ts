export interface ContentValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface PostScheduleResult {
  postId: string;
  scheduledTime: Date;
  estimatedPublishTime?: Date;
  platformSpecificData?: any;
}

export interface PostStatusResult {
  status: 'scheduled' | 'published' | 'failed' | 'processing';
  url?: string;
  error?: string;
  metrics?: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
  };
  publishedAt?: Date;
}

export interface PlatformPoster {
  platform: string;
  validateContent(content: any): Promise<ContentValidationResult>;
  schedulePost(content: any, scheduleTime: Date): Promise<PostScheduleResult>;
  getPostStatus(postId: string): Promise<PostStatusResult>;
  cancelScheduledPost?(postId: string): Promise<boolean>;
  updateScheduledPost?(postId: string, content: any, newScheduleTime?: Date): Promise<boolean>;
  getBatchPostStatus?(postIds: string[]): Promise<Record<string, PostStatusResult>>;
}

export class TikTokPoster implements PlatformPoster {
  platform = 'tiktok';
  private apiClient: any; // In production, use official TikTok API client
  private rateLimiter: Map<string, number> = new Map();
  
  constructor() {
    // Initialize TikTok API client with credentials
    this.apiClient = this.initializeApiClient();
  }
  
  private initializeApiClient() {
    // In production, initialize with TikTok Business API credentials
    return {
      clientId: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      accessToken: process.env.TIKTOK_ACCESS_TOKEN
    };
  }
  
  private async checkRateLimit(userId: string): Promise<boolean> {
    const key = `tiktok:${userId}`;
    const lastCall = this.rateLimiter.get(key) || 0;
    const now = Date.now();
    
    // TikTok allows 20 posts per day per user
    const dayInMs = 24 * 60 * 60 * 1000;
    if (now - lastCall < dayInMs / 20) {
      return false;
    }
    
    this.rateLimiter.set(key, now);
    return true;
  }
  
  async validateContent(content: any): Promise<ContentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields validation
    if (!content) {
      errors.push('Content is required');
      return { isValid: false, errors };
    }
    
    if (!content.mediaUrl && !content.videoUrl) {
      errors.push('TikTok content must include a mediaUrl or videoUrl field');
    }
    
    // Video format validation
    if (content.videoUrl) {
      const supportedFormats = ['.mp4', '.mov', '.avi'];
      const hasValidFormat = supportedFormats.some(format => 
        content.videoUrl.toLowerCase().includes(format)
      );
      if (!hasValidFormat) {
        errors.push('Video format must be MP4, MOV, or AVI');
      }
    }
    
    // Duration validation (TikTok allows 15s to 10min)
    if (content.duration) {
      if (content.duration < 15 || content.duration > 600) {
        errors.push('Video duration must be between 15 seconds and 10 minutes');
      }
    }
    
    // Caption length validation
    if (content.caption && content.caption.length > 2200) {
      errors.push('Caption must be 2200 characters or less');
    }
    
    // Hashtag validation
    if (content.hashtags) {
      if (content.hashtags.length > 20) {
        warnings.push('TikTok recommends using 3-5 relevant hashtags for best performance');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  async schedulePost(content: any, scheduleTime: Date): Promise<PostScheduleResult> {
    // Validate content first
    const validation = await this.validateContent(content);
    if (!validation.isValid) {
      throw new Error(`Content validation failed: ${validation.errors?.join(', ')}`);
    }
    
    // Check rate limiting
    const userId = content.userId || 'default';
    if (!await this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded for TikTok posting');
    }
    
    try {
      // In production, use TikTok Business API to schedule post
      const postData = {
        video_url: content.videoUrl || content.mediaUrl,
        caption: content.caption || '',
        hashtags: content.hashtags || [],
        scheduled_time: scheduleTime.toISOString(),
        privacy_level: content.privacy || 'public'
      };
      
      // Simulate API call - in production replace with actual API call
      const mockId = `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store scheduled post metadata
      await this.storeScheduledPost(mockId, postData, scheduleTime);
      
      return {
        postId: mockId,
        scheduledTime: scheduleTime,
        estimatedPublishTime: new Date(scheduleTime.getTime() + 2 * 60 * 1000), // 2min processing time
        platformSpecificData: {
          tiktokId: mockId,
          videoProcessingStatus: 'queued'
        }
      };
    } catch (error) {
      throw new Error(`Failed to schedule TikTok post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getPostStatus(postId: string): Promise<PostStatusResult> {
    try {
      // In production, query TikTok API for post status
      const created = this.extractTimestampFromId(postId);
      const ageMs = Date.now() - created;
      
      // Simulate different post statuses based on time
      if (ageMs < 2 * 60 * 1000) {
        return {
          status: 'processing',
          publishedAt: undefined
        };
      } else if (ageMs < 5 * 60 * 1000) {
        return {
          status: 'scheduled',
          publishedAt: undefined
        };
      } else {
        // Simulate successful publication with metrics
        return {
          status: 'published',
          url: `https://www.tiktok.com/@user/video/${postId}`,
          publishedAt: new Date(created + 5 * 60 * 1000),
          metrics: {
            views: Math.floor(Math.random() * 10000),
            likes: Math.floor(Math.random() * 1000),
            shares: Math.floor(Math.random() * 100),
            comments: Math.floor(Math.random() * 50)
          }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: `Failed to get post status: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  async cancelScheduledPost(postId: string): Promise<boolean> {
    try {
      // In production, cancel via TikTok API
      await this.removeScheduledPost(postId);
      return true;
    } catch (error) {
      console.error('Failed to cancel TikTok post:', error);
      return false;
    }
  }
  
  async getBatchPostStatus(postIds: string[]): Promise<Record<string, PostStatusResult>> {
    const results: Record<string, PostStatusResult> = {};
    
    // Process in batches to respect API limits
    const batchSize = 10;
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (postId) => {
        try {
          const status = await this.getPostStatus(postId);
          return { postId, status };
        } catch (error) {
          return {
            postId,
            status: {
              status: 'failed' as const,
              error: `Batch status check failed: ${error instanceof Error ? error.message : String(error)}`
            }
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ postId, status }) => {
        results[postId] = status;
      });
      
      // Rate limiting between batches
      if (i + batchSize < postIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  private extractTimestampFromId(postId: string): number {
    const parts = postId.split('_');
    return parseInt(parts[1] || '0', 10);
  }
  
  private async storeScheduledPost(postId: string, postData: any, scheduleTime: Date): Promise<void> {
    // In production, store in database for tracking
    console.log(`Stored scheduled TikTok post: ${postId}`);
  }
  
  private async removeScheduledPost(postId: string): Promise<void> {
    // In production, remove from database
    console.log(`Removed scheduled TikTok post: ${postId}`);
  }
}

export class InstagramPoster implements PlatformPoster {
  platform = 'instagram';
  private apiClient: any;
  private rateLimiter: Map<string, number[]> = new Map();
  
  constructor() {
    this.apiClient = this.initializeApiClient();
  }
  
  private initializeApiClient() {
    return {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN
    };
  }
  
  private async checkRateLimit(userId: string): Promise<boolean> {
    const key = `instagram:${userId}`;
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    // Get existing calls in the last hour
    let calls = this.rateLimiter.get(key) || [];
    calls = calls.filter(time => now - time < hourInMs);
    
    // Instagram allows 25 posts per hour
    if (calls.length >= 25) {
      return false;
    }
    
    calls.push(now);
    this.rateLimiter.set(key, calls);
    return true;
  }
  
  async validateContent(content: any): Promise<ContentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!content) {
      errors.push('Content is required');
      return { isValid: false, errors };
    }
    
    if (!content.mediaUrl && !content.imageUrl && !content.videoUrl) {
      errors.push('Instagram content must include a mediaUrl, imageUrl, or videoUrl field');
    }
    
    // Image validation
    if (content.imageUrl || (content.mediaUrl && content.type === 'image')) {
      const supportedFormats = ['.jpg', '.jpeg', '.png'];
      const url = content.imageUrl || content.mediaUrl;
      const hasValidFormat = supportedFormats.some(format => 
        url.toLowerCase().includes(format)
      );
      if (!hasValidFormat) {
        errors.push('Image format must be JPG, JPEG, or PNG');
      }
    }
    
    // Video validation
    if (content.videoUrl || (content.mediaUrl && content.type === 'video')) {
      const supportedFormats = ['.mp4', '.mov'];
      const url = content.videoUrl || content.mediaUrl;
      const hasValidFormat = supportedFormats.some(format => 
        url.toLowerCase().includes(format)
      );
      if (!hasValidFormat) {
        errors.push('Video format must be MP4 or MOV');
      }
      
      // Duration validation (Instagram allows up to 60 seconds for feed posts)
      if (content.duration && content.duration > 60) {
        errors.push('Video duration must be 60 seconds or less for Instagram feed posts');
      }
    }
    
    // Caption validation
    if (content.caption && content.caption.length > 2200) {
      errors.push('Caption must be 2200 characters or less');
    }
    
    // Hashtag validation
    if (content.hashtags) {
      if (content.hashtags.length > 30) {
        errors.push('Instagram allows maximum 30 hashtags per post');
      }
      if (content.hashtags.length > 10) {
        warnings.push('Instagram recommends using 5-10 relevant hashtags for best performance');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  async schedulePost(content: any, scheduleTime: Date): Promise<PostScheduleResult> {
    const validation = await this.validateContent(content);
    if (!validation.isValid) {
      throw new Error(`Content validation failed: ${validation.errors?.join(', ')}`);
    }
    
    const userId = content.userId || 'default';
    if (!await this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded for Instagram posting');
    }
    
    try {
      const postData = {
        media_url: content.mediaUrl || content.imageUrl || content.videoUrl,
        caption: content.caption || '',
        hashtags: content.hashtags || [],
        scheduled_time: scheduleTime.toISOString(),
        media_type: content.type || (content.videoUrl ? 'video' : 'image')
      };
      
      const mockId = `instagram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.storeScheduledPost(mockId, postData, scheduleTime);
      
      return {
        postId: mockId,
        scheduledTime: scheduleTime,
        estimatedPublishTime: new Date(scheduleTime.getTime() + 1 * 60 * 1000), // 1min processing
        platformSpecificData: {
          instagramId: mockId,
          mediaType: postData.media_type
        }
      };
    } catch (error) {
      throw new Error(`Failed to schedule Instagram post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getPostStatus(postId: string): Promise<PostStatusResult> {
    try {
      const created = this.extractTimestampFromId(postId);
      const ageMs = Date.now() - created;
      
      if (ageMs < 1 * 60 * 1000) {
        return { status: 'processing' };
      } else if (ageMs < 3 * 60 * 1000) {
        return { status: 'scheduled' };
      } else {
        return {
          status: 'published',
          url: `https://www.instagram.com/p/${postId.split('_')[2]}/`,
          publishedAt: new Date(created + 3 * 60 * 1000),
          metrics: {
            views: Math.floor(Math.random() * 5000),
            likes: Math.floor(Math.random() * 500),
            shares: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 25)
          }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: `Failed to get post status: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  async cancelScheduledPost(postId: string): Promise<boolean> {
    try {
      await this.removeScheduledPost(postId);
      return true;
    } catch (error) {
      console.error('Failed to cancel Instagram post:', error);
      return false;
    }
  }
  
  async getBatchPostStatus(postIds: string[]): Promise<Record<string, PostStatusResult>> {
    const results: Record<string, PostStatusResult> = {};
    
    const batchSize = 15; // Instagram allows higher batch sizes
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (postId) => {
        try {
          const status = await this.getPostStatus(postId);
          return { postId, status };
        } catch (error) {
          return {
            postId,
            status: {
              status: 'failed' as const,
              error: `Batch status check failed: ${error instanceof Error ? error.message : String(error)}`
            }
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ postId, status }) => {
        results[postId] = status;
      });
      
      if (i + batchSize < postIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
  
  private extractTimestampFromId(postId: string): number {
    const parts = postId.split('_');
    return parseInt(parts[1] || '0', 10);
  }
  
  private async storeScheduledPost(postId: string, postData: any, scheduleTime: Date): Promise<void> {
    console.log(`Stored scheduled Instagram post: ${postId}`);
  }
  
  private async removeScheduledPost(postId: string): Promise<void> {
    console.log(`Removed scheduled Instagram post: ${postId}`);
  }
}

export class YouTubePoster implements PlatformPoster {
  platform = 'youtube';
  private apiClient: any;
  private rateLimiter: Map<string, number[]> = new Map();
  
  constructor() {
    this.apiClient = this.initializeApiClient();
  }
  
  private initializeApiClient() {
    return {
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      apiKey: process.env.YOUTUBE_API_KEY,
      accessToken: process.env.YOUTUBE_ACCESS_TOKEN
    };
  }
  
  private async checkRateLimit(userId: string): Promise<boolean> {
    const key = `youtube:${userId}`;
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    let calls = this.rateLimiter.get(key) || [];
    calls = calls.filter(time => now - time < dayInMs);
    
    // YouTube allows 6 uploads per day
    if (calls.length >= 6) {
      return false;
    }
    
    calls.push(now);
    this.rateLimiter.set(key, calls);
    return true;
  }
  
  async validateContent(content: any): Promise<ContentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!content) {
      errors.push('Content is required');
      return { isValid: false, errors };
    }
    
    if (!content.videoPath && !content.videoUrl) {
      errors.push('YouTube content must include a videoPath or videoUrl');
    }
    
    // Video format validation
    if (content.videoPath || content.videoUrl) {
      const supportedFormats = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
      const path = content.videoPath || content.videoUrl;
      const hasValidFormat = supportedFormats.some(format => 
        path.toLowerCase().includes(format)
      );
      if (!hasValidFormat) {
        errors.push('Video format must be MP4, MOV, AVI, WMV, FLV, or WebM');
      }
    }
    
    // Title validation
    if (!content.title) {
      errors.push('YouTube videos must have a title');
    } else if (content.title.length > 100) {
      errors.push('YouTube title must be 100 characters or less');
    }
    
    // Description validation
    if (content.description && content.description.length > 5000) {
      errors.push('YouTube description must be 5000 characters or less');
    }
    
    // Tags validation
    if (content.tags) {
      if (content.tags.length > 15) {
        warnings.push('YouTube recommends using 10-15 relevant tags');
      }
      const totalTagLength = content.tags.join(',').length;
      if (totalTagLength > 500) {
        errors.push('Total tag length must be 500 characters or less');
      }
    }
    
    // Thumbnail validation
    if (content.thumbnail) {
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
      const hasValidFormat = supportedFormats.some(format => 
        content.thumbnail.toLowerCase().includes(format)
      );
      if (!hasValidFormat) {
        warnings.push('Thumbnail should be JPG, JPEG, PNG, GIF, or BMP for best results');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  async schedulePost(content: any, scheduleTime: Date): Promise<PostScheduleResult> {
    const validation = await this.validateContent(content);
    if (!validation.isValid) {
      throw new Error(`Content validation failed: ${validation.errors?.join(', ')}`);
    }
    
    const userId = content.userId || 'default';
    if (!await this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded for YouTube posting');
    }
    
    try {
      const postData = {
        video_path: content.videoPath || content.videoUrl,
        title: content.title,
        description: content.description || '',
        tags: content.tags || [],
        scheduled_time: scheduleTime.toISOString(),
        privacy: content.privacy || 'public',
        category: content.category || 'Entertainment',
        thumbnail: content.thumbnail
      };
      
      const mockId = `youtube_${Date.now()}_${Math.random().toString(36).substr(2, 11)}`;
      await this.storeScheduledPost(mockId, postData, scheduleTime);
      
      return {
        postId: mockId,
        scheduledTime: scheduleTime,
        estimatedPublishTime: new Date(scheduleTime.getTime() + 5 * 60 * 1000), // 5min processing
        platformSpecificData: {
          youtubeId: mockId,
          uploadStatus: 'queued',
          processingProgress: 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to schedule YouTube post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getPostStatus(postId: string): Promise<PostStatusResult> {
    try {
      const created = this.extractTimestampFromId(postId);
      const ageMs = Date.now() - created;
      
      if (ageMs < 2 * 60 * 1000) {
        return {
          status: 'processing',
          platformSpecificData: {
            processingProgress: Math.min(90, (ageMs / (2 * 60 * 1000)) * 100)
          }
        };
      } else if (ageMs < 5 * 60 * 1000) {
        return { status: 'scheduled' };
      } else {
        const videoId = postId.split('_')[2];
        return {
          status: 'published',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          publishedAt: new Date(created + 5 * 60 * 1000),
          metrics: {
            views: Math.floor(Math.random() * 2000),
            likes: Math.floor(Math.random() * 200),
            shares: Math.floor(Math.random() * 20),
            comments: Math.floor(Math.random() * 10)
          }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: `Failed to get post status: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  async cancelScheduledPost(postId: string): Promise<boolean> {
    try {
      await this.removeScheduledPost(postId);
      return true;
    } catch (error) {
      console.error('Failed to cancel YouTube post:', error);
      return false;
    }
  }
  
  async getBatchPostStatus(postIds: string[]): Promise<Record<string, PostStatusResult>> {
    const results: Record<string, PostStatusResult> = {};
    
    // YouTube has stricter rate limits, so smaller batches
    const batchSize = 5;
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (postId) => {
        try {
          const status = await this.getPostStatus(postId);
          return { postId, status };
        } catch (error) {
          return {
            postId,
            status: {
              status: 'failed' as const,
              error: `Batch status check failed: ${error instanceof Error ? error.message : String(error)}`
            }
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ postId, status }) => {
        results[postId] = status;
      });
      
      if (i + batchSize < postIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for YouTube
      }
    }
    
    return results;
  }
  
  private extractTimestampFromId(postId: string): number {
    const parts = postId.split('_');
    return parseInt(parts[1] || '0', 10);
  }
  
  private async storeScheduledPost(postId: string, postData: any, scheduleTime: Date): Promise<void> {
    console.log(`Stored scheduled YouTube post: ${postId}`);
  }
  
  private async removeScheduledPost(postId: string): Promise<void> {
    console.log(`Removed scheduled YouTube post: ${postId}`);
  }
} 