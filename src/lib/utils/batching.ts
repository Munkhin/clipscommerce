/**
 * Request batching utilities
 * Provides functionality to batch multiple requests into a single operation
 */

import { delay } from './resilience';

/**
 * Type for batch processor function
 */
export type BatchProcessor<TItem, TResult> = (
  items: TItem[]
) => Promise<TResult[]>;

/**
 * Batch queue item
 */
interface BatchQueueItem<TItem, TResult> {
  item: TItem;
  resolve: (value: TResult) => void;
  reject: (reason: unknown) => void;
}

/**
 * Configuration for the batch processor
 */
export interface BatchProcessorConfig {
  /** Maximum batch size */
  maxBatchSize: number;
  /** Maximum wait time in ms before processing a batch */
  maxWaitMs: number;
  /** Minimum batch size before immediate processing */
  minBatchSize?: number;
}

/**
 * Default configuration for the batch processor
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessorConfig = {
  maxBatchSize: 10,
  maxWaitMs: 100,
  minBatchSize: 5,
};

/**
 * Request batcher for batching multiple requests into a single operation
 */
export class RequestBatcher<TItem, TResult> {
  private queue: BatchQueueItem<TItem, TResult>[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private config: BatchProcessorConfig;
  private processor: BatchProcessor<TItem, TResult>;
  private isProcessing = false;
  
  /**
   * Create a new request batcher
   * @param processor Function to process batched items
   * @param config Configuration options
   */
  constructor(
    processor: BatchProcessor<TItem, TResult>,
    config: Partial<BatchProcessorConfig> = {}
  ) {
    this.processor = processor;
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }
  
  /**
   * Add an item to the batch queue
   * @param item Item to add to the batch
   * @returns Promise that resolves when the item is processed
   */
  async add(item: TItem): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      
      // Schedule processing if this is the first item
      if (this.queue.length === 1) {
        this.scheduleProcessing();
      }
      
      // Process immediately if we've reached the min batch size
      if (this.config.minBatchSize && this.queue.length >= this.config.minBatchSize) {
        this.processBatch();
      }
    });
  }
  
  /**
   * Schedule processing of the batch
   */
  private scheduleProcessing(): void {
    if (this.timeoutId) return;
    
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.processBatch();
    }, this.config.maxWaitMs);
  }
  
  /**
   * Process the current batch
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    // Cancel any pending timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Get the items to process, respecting the max batch size
    const itemsToProcess = this.queue.splice(0, this.config.maxBatchSize);
    
    // Schedule next batch if there are remaining items
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
    
    // Process the batch
    this.isProcessing = true;
    try {
      const items = itemsToProcess.map(item => item.item);
      const results = await this.processor(items);
      
      // Validate results length
      if (results.length !== itemsToProcess.length) {
        throw new Error(`Batch processor returned ${results.length} results but expected ${itemsToProcess.length}`);
      }
      
      // Resolve each promise
      itemsToProcess.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      itemsToProcess.forEach(item => {
        item.reject(error);
      });
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Flush all pending items in the batch queue
   */
  async flush(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processBatch();
    }
    // Wait for any current processing to complete
    while (this.isProcessing) {
      await delay(10);
    }
  }
  
  /**
   * Get the current queue length
   */
  get queueLength(): number {
    return this.queue.length;
  }
}
