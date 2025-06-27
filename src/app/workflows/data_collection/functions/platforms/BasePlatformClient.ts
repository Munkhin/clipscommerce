// difficult: Base class for platform-specific clients
import { PostMetrics, Platform, PaginatedResponse } from '../types';
import { RateLimiter } from '../utils/RateLimiter';
import EventEmitter from 'events';

export abstract class BasePlatformClient extends EventEmitter {
  protected accessToken: string;
  protected platform: Platform;
  protected rateLimiter: RateLimiter;
  protected rateLimitQueue: Array<() => Promise<any>> = [];
  protected isProcessingQueue = false;
  protected readonly RATE_LIMIT = 5; // 5 requests per second
  protected lastRequestTime = 0;

  constructor(accessToken: string, platform: Platform, rateLimiter?: RateLimiter) {
    super();
    this.accessToken = accessToken;
    this.platform = platform;
    this.rateLimiter = rateLimiter || new RateLimiter({ requestsPerMinute: 60 });
    this.rateLimiter.on('tokenUsed', (data) => this.emit('rateLimitTokenUsed', data));
    this.rateLimiter.on('rateLimitUpdated', (data) => this.emit('rateLimitUpdated', data));
    this.rateLimiter.on('rateLimitDepleted', (data) => this.emit('rateLimitDepleted', data));
  }

  protected async throttleRequest<T>(fn: () => Promise<T>, correlationId?: string): Promise<T> {
    await this.rateLimiter.acquire();
    this.log('info', 'API request throttled', { correlationId });
    return fn();
  }

  updateRateLimit(options: Partial<{ requestsPerMinute: number; burstCapacity: number }>) {
    this.rateLimiter.updateOptions(options);
  }

  protected log(level: string, message: string, context: Record<string, any> = {}) {
    // Add correlationId to all logs for traceability
    if (!context.correlationId) context.correlationId = 'N/A';
    console.log(`[${level.toUpperCase()}][${this.platform}] ${message}`, context);
  }

  private async processQueue() {
    if (this.rateLimitQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const nextRequest = this.rateLimitQueue.shift();
    if (nextRequest) {
      await nextRequest();
    }
  }

  // Abstract methods that must be implemented by platform-specific clients
  abstract getPostMetrics(postId: string): Promise<PostMetrics>;
  
  /**
   * Fetches a user's posts with pagination support
   * @param userId The user ID
   * @param lookbackDays Number of days to look back for posts (default: 30)
   * @param maxPages Maximum number of pages to fetch (default: 10)
   * @param maxResultsPerPage Maximum number of results per page (default: 20)
   * @returns Promise with paginated response containing posts and pagination info
   */
  abstract getUserPosts(
    userId: string, 
    lookbackDays?: number,
    maxPages?: number,
    maxResultsPerPage?: number
  ): Promise<PaginatedResponse<PostMetrics>>;
  
  /**
   * Fetches posts from a competitor's profile with pagination support
   * @param username The username of the competitor
   * @param lookbackDays Number of days to look back for posts (default: 30)
   * @param maxPages Maximum number of pages to fetch (default: 10)
   * @param maxResultsPerPage Maximum number of results per page (default: 20)
   * @returns Promise with paginated response containing posts and pagination info
   */
  abstract getCompetitorPosts(
    username: string, 
    lookbackDays?: number,
    maxPages?: number,
    maxResultsPerPage?: number
  ): Promise<PaginatedResponse<PostMetrics>>;
  
  protected async processInBatches<T_Input, T_Output>(
    items: T_Input[],
    batchSize: number,
    processItemFn: (item: T_Input) => Promise<T_Output>,
    delayBetweenBatchesMs: number = 0 // Optional delay between batches
  ): Promise<T_Output[]> {
    const results: T_Output[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);
      // Process items in the current batch. 
      // Each call to processItemFn will be individually throttled by throttleRequest.
      const batchPromises = batchItems.map(item => processItemFn(item));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (delayBetweenBatchesMs > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
      }
    }
    return results;
  }

  // Common method to calculate engagement rate
  protected calculateEngagementRate(metrics: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
    followerCount: number;
  }): number {
    const { likes, comments, shares, views, followerCount } = metrics;
    const totalEngagement = likes + (comments * 2) + (shares * 3);
    
    if (views && views > 0) {
      return (totalEngagement / views) * 100; // Engagement rate based on views
    }
    
    return (totalEngagement / followerCount) * 100; // Engagement rate based on followers
  }
}
