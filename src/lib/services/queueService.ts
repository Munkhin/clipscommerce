import { Platform } from "@/types/platform";
import { Post, QueueItem } from "@/types/schedule";
import { PlatformApiFactory, getPlatformClient } from "./platformApis/factory";

interface QueueServiceDependencies {
  getPlatformAuth: (platform: Platform) => Promise<{ accessToken: string; refreshToken: string } | null>;
  onPostPublished?: (post: Post, platform: Platform) => Promise<void>;
  onPostFailed?: (post: Post, platform: Platform, error: Error) => Promise<void>;
  onQueueItemUpdated?: (queueItem: QueueItem) => Promise<void>;
}

export class QueueService {
  private static instance: QueueService;
  private dependencies: QueueServiceDependencies;
  private processing: Set<string> = new Set();
  private isProcessing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly PROCESS_INTERVAL_MS = 30000; // 30 seconds

  private constructor(dependencies: QueueServiceDependencies) {
    this.dependencies = dependencies;
  }

  public static getInstance(dependencies: QueueServiceDependencies): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService(dependencies);
    }
    return QueueService.instance;
  }

  /**
   * Start the queue processing
   */
  public startProcessing(): void {
    if (this.processInterval) return;
    
    console.log('Starting queue processing...');
    this.processQueue(); // Initial process
    this.processInterval = setInterval(() => this.processQueue(), this.PROCESS_INTERVAL_MS);
  }

  /**
   * Stop the queue processing
   */
  public stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('Queue processing stopped');
    }
  }

  /**
   * Process all pending queue items
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // In a real app, you would fetch pending queue items from your database
      // const queueItems = await db.queueItems.findMany({
      //   where: {
      //     status: 'pending',
      //     scheduledFor: { lte: new Date() },
      //     id: { notIn: Array.from(this.processing) }
      //   },
      //   orderBy: { scheduledFor: 'asc' },
      //   take: 10 // Process in batches of 10
      // });
      
      const queueItems: QueueItem[] = []; // Mock for now
      
      await Promise.all(
        queueItems.map(queueItem => this.processQueueItem(queueItem))
      );
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(queueItem: QueueItem): Promise<void> {
    if (this.processing.has(queueItem.id)) return;
    
    this.processing.add(queueItem.id);
    
    try {
      // Mark as processing
      await this.updateQueueItem(queueItem.id, { status: 'processing', lastAttempt: new Date() });
      
      // Get the post data
      // In a real app, you would fetch this from your database
      // const post = await db.posts.findUnique({ where: { id: queueItem.postId } });
      const post = {} as Post; // Mock for now
      
      if (!post) {
        throw new Error(`Post not found: ${queueItem.postId}`);
      }
      
      // Get platform client
      const auth = await this.dependencies.getPlatformAuth(queueItem.platform);
      if (!auth) {
        throw new Error(`No auth credentials found for ${queueItem.platform}`);
      }
      
      const client = await getPlatformClient(queueItem.platform, {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        expiresAt: new Date(), // This would be set from your auth system
        scopes: [] // Add required scopes
      });
      
      // Publish the post
      const result = await client.createPost(post.content);
      
      // Update the post with the published ID
      // await db.posts.update({
      //   where: { id: queueItem.postId },
      //   data: {
      //     status: {
      //       ...post.status,
      //       platformPostIds: {
      //         ...post.status.platformPostIds,
      //         [queueItem.platform]: result.id
      //       },
      //       publishedAt: new Date()
      //     }
      //   }
      // });
      
      // Update queue item
      await this.updateQueueItem(queueItem.id, {
        status: 'published',
        metadata: {
          ...queueItem.metadata,
          publishedAt: new Date().toISOString(),
          platformPostId: result.id
        }
      });
      
      // Trigger post-published hook
      if (this.dependencies.onPostPublished) {
        await this.dependencies.onPostPublished(post, queueItem.platform);
      }
      
      console.log(`Published post ${queueItem.postId} to ${queueItem.platform}`);
    } catch (error) {
      console.error(`Error processing queue item ${queueItem.id}:`, error);
      
      // Update queue item with error
      await this.updateQueueItem(queueItem.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: (queueItem.retryCount || 0) + 1
      });
      
      // Trigger post-failed hook
      if (this.dependencies.onPostFailed) {
        // In a real app, you would fetch the post from the database
        const post = {} as Post; // Mock for now
        await this.dependencies.onPostFailed(
          post,
          queueItem.platform,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      this.processing.delete(queueItem.id);
    }
  }

  /**
   * Add a post to the queue for scheduling
   */
  public async schedulePost(
    postId: string,
    platform: Platform,
    scheduledFor: Date,
    metadata: Record<string, any> = {}
  ): Promise<QueueItem> {
    // In a real app, you would save this to your database
    // const queueItem = await db.queueItems.create({
    //   data: {
    //     postId,
    //     platform,
    //     scheduledFor,
    //     status: 'scheduled',
    //     metadata,
    //     retryCount: 0,
    //   }
    // });
    
    const queueItem: QueueItem = {
      id: `mock-${Date.now()}`,
      postId,
      platform,
      scheduledFor,
      status: 'scheduled',
      retryCount: 0,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // If the scheduled time is in the past, process it immediately
    if (scheduledFor <= new Date()) {
      this.processQueueItem(queueItem).catch(console.error);
    }
    
    return queueItem;
  }

  /**
   * Update a queue item
   */
  private async updateQueueItem(
    queueItemId: string,
    updates: Partial<Omit<QueueItem, 'id'>>
  ): Promise<void> {
    // In a real app, you would update this in your database
    // await db.queueItems.update({
    //   where: { id: queueItemId },
    //   data: { ...updates, updatedAt: new Date() }
    // });
    
    // For now, just log the update
    console.log(`Updating queue item ${queueItemId}:`, updates);
    
    // Trigger update hook if provided
    if (this.dependencies.onQueueItemUpdated) {
      // In a real app, you would fetch the updated item from the database
      const queueItem = {} as QueueItem; // Mock for now
      await this.dependencies.onQueueItemUpdated({
        ...queueItem,
        ...updates,
        updatedAt: new Date()
      });
    }
  }
}
