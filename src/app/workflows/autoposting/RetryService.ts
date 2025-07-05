import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '../../../utils/logger';
import { logError, notifyAdmin, withExponentialBackoff } from './ErrorHandling';
import { MonitoringService } from './Monitoring';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterFactor: number;
  immediateRetryThreshold: number; // seconds
}

export interface RetryAttempt {
  scheduleId: string;
  retryCount: number;
  error: string;
  errorType: string;
  strategy: string;
  attemptedAt: Date;
  success: boolean;
  processingTime?: number;
  metadata?: Record<string, any>;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  platform: string;
  content: string;
  media_urls: string[];
  post_time: Date;
  status: string;
  retry_count: number;
  max_retries: number;
  last_error?: string;
  last_error_at?: Date;
  next_retry_at?: Date;
  retry_delay: number;
  metadata?: Record<string, any>;
  priority: string;
  hashtags?: string[];
  additional_settings?: Record<string, any>;
}

export class RetryService {
  private monitoring: MonitoringService;
  private defaultConfig: RetryConfig;
  private platformConfigs: Map<string, RetryConfig>;
  private retryHistory: RetryAttempt[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(monitoring: MonitoringService) {
    this.monitoring = monitoring;
    this.defaultConfig = {
      maxRetries: 3,
      baseDelay: 30000, // 30 seconds
      maxDelay: 600000, // 10 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      immediateRetryThreshold: 300, // 5 minutes
    };

    this.platformConfigs = new Map();
    this.initializePlatformConfigs();
    this.startRetryProcessing();

    logger.info('RetryService initialized', {
      defaultConfig: this.defaultConfig,
      platformConfigs: Object.fromEntries(this.platformConfigs),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Initialize platform-specific retry configurations
   */
  private initializePlatformConfigs(): void {
    // TikTok - more aggressive retries due to frequent rate limiting
    this.platformConfigs.set('tiktok', {
      maxRetries: 5,
      baseDelay: 60000, // 1 minute
      maxDelay: 1800000, // 30 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      immediateRetryThreshold: 600, // 10 minutes
    });

    // Instagram - moderate retry policy
    this.platformConfigs.set('instagram', {
      maxRetries: 3,
      baseDelay: 30000, // 30 seconds
      maxDelay: 600000, // 10 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      immediateRetryThreshold: 300, // 5 minutes
    });

    // YouTube - conservative retry policy due to processing requirements
    this.platformConfigs.set('youtube', {
      maxRetries: 3,
      baseDelay: 120000, // 2 minutes
      maxDelay: 1800000, // 30 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      immediateRetryThreshold: 600, // 10 minutes
    });
  }

  /**
   * Get retry configuration for a specific platform
   */
  private getRetryConfig(platform: string): RetryConfig {
    return this.platformConfigs.get(platform) || this.defaultConfig;
  }

  /**
   * Calculate next retry delay with exponential backoff and jitter
   */
  public calculateRetryDelay(retryCount: number, platform: string): number {
    const config = this.getRetryConfig(platform);
    
    // Calculate exponential backoff
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, retryCount);
    
    // Apply jitter to prevent thundering herd
    const jitter = 1 + (Math.random() - 0.5) * config.jitterFactor;
    
    // Calculate final delay with jitter
    const finalDelay = Math.min(exponentialDelay * jitter, config.maxDelay);
    
    return Math.round(finalDelay);
  }

  /**
   * Schedule a retry for a failed post
   */
  public async scheduleRetry(
    scheduleId: string,
    error: Error | string,
    errorType: string,
    strategy: string = 'exponential_backoff'
  ): Promise<boolean> {
    const supabase = await createClient(cookies());
    
    try {
      // Get current post details
      const { data: post, error: fetchError } = await supabase
        .from('autopost_schedule')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (fetchError || !post) {
        logger.error('Failed to fetch post for retry scheduling', {
          scheduleId,
          error: fetchError?.message || 'Post not found'
        });
        return false;
      }

      const typedPost = post as ScheduledPost;
      const config = this.getRetryConfig(typedPost.platform);

      // Check if we've exceeded max retries
      if (typedPost.retry_count >= config.maxRetries) {
        logger.warn('Max retries exceeded, moving to dead letter queue', {
          scheduleId,
          retryCount: typedPost.retry_count,
          maxRetries: config.maxRetries,
          platform: typedPost.platform
        });

        await this.moveToDeadLetterQueue(typedPost, error, 'max_retries_exceeded');
        return false;
      }

      // Calculate next retry time
      const nextRetryDelay = this.calculateRetryDelay(typedPost.retry_count, typedPost.platform);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      // Update post with retry information
      const { error: updateError } = await supabase
        .from('autopost_schedule')
        .update({
          status: 'failed',
          retry_count: typedPost.retry_count + 1,
          last_error: error instanceof Error ? error.message : String(error),
          last_error_at: new Date().toISOString(),
          next_retry_at: nextRetryAt.toISOString(),
          retry_delay: nextRetryDelay
        })
        .eq('id', scheduleId);

      if (updateError) {
        logger.error('Failed to update post with retry information', {
          scheduleId,
          error: updateError.message
        });
        return false;
      }

      // Record retry attempt in history
      await this.recordRetryAttempt({
        scheduleId,
        retryCount: typedPost.retry_count + 1,
        error: error instanceof Error ? error.message : String(error),
        errorType,
        strategy,
        attemptedAt: new Date(),
        success: false
      });

      logger.info('Retry scheduled successfully', {
        scheduleId,
        platform: typedPost.platform,
        retryCount: typedPost.retry_count + 1,
        nextRetryAt: nextRetryAt.toISOString(),
        delay: nextRetryDelay,
        strategy
      });

      return true;

    } catch (error) {
      logger.error('Error scheduling retry', {
        scheduleId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Process posts that are ready for retry
   */
  public async processRetries(): Promise<number> {
    if (this.isProcessing) {
      logger.debug('Retry processing already in progress, skipping');
      return 0;
    }

    this.isProcessing = true;
    const processingStartTime = Date.now();
    let processedCount = 0;

    try {
      const supabase = await createClient(cookies());
      
      // Get posts ready for retry
      const { data: posts, error: fetchError } = await supabase
        .rpc('get_posts_ready_for_retry');

      if (fetchError) {
        logger.error('Failed to fetch posts ready for retry', {
          error: fetchError.message
        });
        return 0;
      }

      if (!posts || posts.length === 0) {
        logger.debug('No posts ready for retry');
        return 0;
      }

      logger.info('Processing retry queue', {
        postsCount: posts.length,
        timestamp: new Date().toISOString()
      });

      // Process each post
      for (const post of posts) {
        try {
          await this.processRetryPost(post);
          processedCount++;
          
          // Add small delay between retries to prevent overwhelming APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error('Error processing retry post', {
            postId: post.id,
            platform: post.platform,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const processingTime = Date.now() - processingStartTime;
      logger.info('Retry processing completed', {
        processedCount,
        totalPosts: posts.length,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return processedCount;

    } catch (error) {
      logger.error('Error in retry processing', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single retry post
   */
  private async processRetryPost(post: any): Promise<void> {
    const supabase = await createClient(cookies());
    const startTime = Date.now();
    
    try {
      // Update status to processing
      await supabase
        .from('autopost_schedule')
        .update({ status: 'processing' })
        .eq('id', post.id);

      // Attempt to post using the existing platform posters
      // This would integrate with your existing PlatformPoster classes
      const success = await this.attemptPost(post);

      if (success) {
        // Mark as successful
        await supabase
          .from('autopost_schedule')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString()
          })
          .eq('id', post.id);

        // Record successful retry
        await this.recordRetryAttempt({
          scheduleId: post.id,
          retryCount: post.retry_count,
          error: '',
          errorType: '',
          strategy: 'retry_success',
          attemptedAt: new Date(),
          success: true,
          processingTime: Date.now() - startTime
        });

        logger.info('Post retry successful', {
          postId: post.id,
          platform: post.platform,
          retryCount: post.retry_count,
          processingTime: Date.now() - startTime
        });

      } else {
        // Schedule next retry or move to dead letter queue
        const error = new Error('Post attempt failed during retry');
        await this.scheduleRetry(post.id, error, 'retry_failed', 'exponential_backoff');
      }

    } catch (error) {
      logger.error('Error processing retry post', {
        postId: post.id,
        platform: post.platform,
        error: error instanceof Error ? error.message : String(error)
      });

      // Update status back to failed and schedule next retry
      await supabase
        .from('autopost_schedule')
        .update({ status: 'failed' })
        .eq('id', post.id);

      await this.scheduleRetry(post.id, error, 'processing_error', 'exponential_backoff');
    }
  }

  /**
   * Attempt to post content using the appropriate platform poster
   */
  private async attemptPost(post: any): Promise<boolean> {
    const supabase = await createClient(cookies());
    
    try {
      // Get user credentials for the platform
      const { data: credentials, error: credError } = await supabase
        .from('user_social_credentials')
        .select('*')
        .eq('user_id', post.user_id)
        .eq('platform', post.platform)
        .single();

      if (credError || !credentials) {
        logger.error('No credentials found for platform', {
          postId: post.id,
          platform: post.platform,
          userId: post.user_id
        });
        return false;
      }

      // Check if credentials are still valid
      if (credentials.expires_at && new Date(credentials.expires_at) <= new Date()) {
        logger.error('Credentials expired for platform', {
          postId: post.id,
          platform: post.platform,
          expiresAt: credentials.expires_at
        });
        return false;
      }

      // Get the appropriate platform poster
      const poster = this.getPlatformPoster(post.platform);
      if (!poster) {
        logger.error('No poster available for platform', {
          postId: post.id,
          platform: post.platform
        });
        return false;
      }

      // Prepare content for the platform
      const content = this.prepareContentForPlatform(post, credentials);
      
      // Validate content first
      const validation = await poster.validateContent(content);
      if (!validation.isValid) {
        logger.error('Content validation failed', {
          postId: post.id,
          platform: post.platform,
          errors: validation.errors,
          warnings: validation.warnings
        });
        return false;
      }

      // Attempt to post immediately (for retry attempts)
      const result = await poster.schedulePost(content, new Date());
      
      if (result.postId) {
        logger.info('Post attempt successful', {
          postId: post.id,
          platform: post.platform,
          platformPostId: result.postId,
          scheduledTime: result.scheduledTime
        });

        // Update the post with platform-specific data
        await supabase
          .from('autopost_schedule')
          .update({
            metadata: {
              ...post.metadata,
              platform_post_id: result.postId,
              platform_data: result.platformSpecificData,
              posted_via_retry: true,
              retry_success_at: new Date().toISOString()
            }
          })
          .eq('id', post.id);

        return true;
      }

      return false;

    } catch (error) {
      logger.error('Error attempting to post content', {
        postId: post.id,
        platform: post.platform,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get the appropriate platform poster for a given platform
   */
  private getPlatformPoster(platform: string): any {
    const { TikTokPoster, InstagramPoster, YouTubePoster } = require('./PlatformPoster');
    
    switch (platform) {
      case 'tiktok':
        return new TikTokPoster();
      case 'instagram':
        return new InstagramPoster();
      case 'youtube':
        return new YouTubePoster();
      default:
        return null;
    }
  }

  /**
   * Prepare content for the specific platform
   */
  private prepareContentForPlatform(post: any, credentials: any): any {
    const baseContent = {
      userId: post.user_id,
      caption: post.content,
      hashtags: post.hashtags || [],
      mediaUrl: post.media_urls?.[0],
      ...post.additional_settings
    };

    switch (post.platform) {
      case 'tiktok':
        return {
          ...baseContent,
          videoUrl: post.media_urls?.[0],
          privacy: post.additional_settings?.privacy_level || 'PUBLIC_TO_EVERYONE',
          allowComments: post.additional_settings?.allow_comments !== false,
          allowDuet: post.additional_settings?.allow_duet !== false,
          allowStitch: post.additional_settings?.allow_stitch !== false,
          brandContentToggle: post.additional_settings?.brand_content_toggle || false,
          brandOrganicToggle: post.additional_settings?.brand_organic_toggle || false
        };
      
      case 'instagram':
        return {
          ...baseContent,
          imageUrl: post.media_urls?.[0],
          videoUrl: post.media_urls?.[0],
          type: this.getMediaTypeFromUrl(post.media_urls?.[0])
        };
      
      case 'youtube':
        return {
          ...baseContent,
          title: this.extractTitleFromContent(post.content),
          description: post.content,
          videoPath: post.media_urls?.[0],
          videoUrl: post.media_urls?.[0],
          tags: post.hashtags?.map(tag => tag.replace('#', '')) || [],
          privacy: post.additional_settings?.privacy_level || 'public',
          category: post.additional_settings?.category || 'Entertainment',
          thumbnail: post.additional_settings?.thumbnail
        };
      
      default:
        return baseContent;
    }
  }

  /**
   * Determine media type from URL
   */
  private getMediaTypeFromUrl(url: string): 'image' | 'video' {
    if (!url) return 'image';
    
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
    const urlLower = url.toLowerCase();
    
    return videoExtensions.some(ext => urlLower.includes(ext)) ? 'video' : 'image';
  }

  /**
   * Extract title from content for YouTube
   */
  private extractTitleFromContent(content: string): string {
    // Take first line or first 100 characters as title
    const firstLine = content.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
  }

  /**
   * Move a post to the dead letter queue
   */
  private async moveToDeadLetterQueue(
    post: ScheduledPost,
    error: Error | string,
    reason: string
  ): Promise<void> {
    const supabase = await createClient(cookies());
    
    try {
      // Insert into dead letter queue
      const { error: insertError } = await supabase
        .from('autopost_dead_letter_queue')
        .insert({
          original_schedule_id: post.id,
          user_id: post.user_id,
          platform: post.platform,
          content: post.content,
          media_urls: post.media_urls,
          original_post_time: post.post_time,
          failure_reason: reason,
          last_error: error instanceof Error ? error.message : String(error),
          retry_count: post.retry_count,
          metadata: post.metadata || {}
        });

      if (insertError) {
        logger.error('Failed to insert into dead letter queue', {
          postId: post.id,
          error: insertError.message
        });
        return;
      }

      // Update original post status
      await supabase
        .from('autopost_schedule')
        .update({
          status: 'failed',
          last_error: `Moved to dead letter queue: ${reason}`
        })
        .eq('id', post.id);

      logger.warn('Post moved to dead letter queue', {
        postId: post.id,
        platform: post.platform,
        reason,
        retryCount: post.retry_count
      });

      // Notify admin about dead letter queue addition
      await notifyAdmin(new Error(`Post moved to dead letter queue: ${reason}`), {
        operation: 'dead_letter_queue_add',
        component: 'RetryService',
        contentId: post.id,
        platform: post.platform,
        userId: post.user_id,
        additionalData: {
          reason,
          retryCount: post.retry_count,
          originalPostTime: post.post_time
        }
      });

    } catch (error) {
      logger.error('Error moving post to dead letter queue', {
        postId: post.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Record retry attempt in history
   */
  private async recordRetryAttempt(attempt: RetryAttempt): Promise<void> {
    const supabase = await createClient(cookies());
    
    try {
      const { error } = await supabase
        .from('autopost_retry_history')
        .insert({
          schedule_id: attempt.scheduleId,
          retry_attempt: attempt.retryCount,
          error_message: attempt.error,
          error_type: attempt.errorType,
          retry_strategy: attempt.strategy,
          attempted_at: attempt.attemptedAt.toISOString(),
          success: attempt.success,
          processing_time: attempt.processingTime,
          metadata: attempt.metadata || {}
        });

      if (error) {
        logger.error('Failed to record retry attempt', {
          scheduleId: attempt.scheduleId,
          error: error.message
        });
      }

      // Also store in memory for quick access
      this.retryHistory.push(attempt);
      
      // Trim history if it gets too large
      if (this.retryHistory.length > 1000) {
        this.retryHistory = this.retryHistory.slice(-500);
      }

    } catch (error) {
      logger.error('Error recording retry attempt', {
        scheduleId: attempt.scheduleId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Start background retry processing
   */
  private startRetryProcessing(): void {
    // Process retries every 2 minutes
    this.processingInterval = setInterval(() => {
      this.processRetries().catch(error => {
        logger.error('Error in retry processing interval', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, 120000); // 2 minutes

    logger.info('Retry processing started', {
      interval: '2 minutes',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Stop background retry processing
   */
  public stopRetryProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    logger.info('Retry processing stopped', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get retry statistics
   */
  public getRetryStats(): {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    successRate: number;
    averageRetryCount: number;
    platformStats: Record<string, any>;
  } {
    const totalRetries = this.retryHistory.length;
    const successfulRetries = this.retryHistory.filter(r => r.success).length;
    const failedRetries = totalRetries - successfulRetries;
    const successRate = totalRetries > 0 ? successfulRetries / totalRetries : 0;
    
    const retryCountSum = this.retryHistory.reduce((sum, r) => sum + r.retryCount, 0);
    const averageRetryCount = totalRetries > 0 ? retryCountSum / totalRetries : 0;

    const platformStats: Record<string, any> = {};
    this.retryHistory.forEach(attempt => {
      const platform = attempt.scheduleId.split('_')[0] || 'unknown';
      if (!platformStats[platform]) {
        platformStats[platform] = {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 0
        };
      }
      
      platformStats[platform].total++;
      if (attempt.success) {
        platformStats[platform].successful++;
      } else {
        platformStats[platform].failed++;
      }
      
      platformStats[platform].successRate = 
        platformStats[platform].successful / platformStats[platform].total;
    });

    return {
      totalRetries,
      successfulRetries,
      failedRetries,
      successRate,
      averageRetryCount,
      platformStats
    };
  }

  /**
   * Get dead letter queue items for a user
   */
  public async getDeadLetterQueueItems(userId: string): Promise<any[]> {
    const supabase = await createClient(cookies());
    
    try {
      const { data: items, error } = await supabase
        .from('autopost_dead_letter_queue')
        .select('*')
        .eq('user_id', userId)
        .is('resolved_at', null)
        .order('moved_to_dlq_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch dead letter queue items', {
          userId,
          error: error.message
        });
        return [];
      }

      return items || [];

    } catch (error) {
      logger.error('Error fetching dead letter queue items', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Resolve a dead letter queue item
   */
  public async resolveDeadLetterQueueItem(
    itemId: string,
    resolutionNotes: string
  ): Promise<boolean> {
    const supabase = await createClient(cookies());
    
    try {
      const { error } = await supabase
        .from('autopost_dead_letter_queue')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes
        })
        .eq('id', itemId);

      if (error) {
        logger.error('Failed to resolve dead letter queue item', {
          itemId,
          error: error.message
        });
        return false;
      }

      logger.info('Dead letter queue item resolved', {
        itemId,
        resolutionNotes,
        timestamp: new Date().toISOString()
      });

      return true;

    } catch (error) {
      logger.error('Error resolving dead letter queue item', {
        itemId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopRetryProcessing();
    
    logger.info('RetryService destroyed', {
      retryHistorySize: this.retryHistory.length,
      timestamp: new Date().toISOString()
    });
  }
}