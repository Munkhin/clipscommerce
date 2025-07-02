import { v4 as uuidv4 } from 'uuid';

export interface QueuedContent {
  id: string;
  content: any;
  platforms: string[];
  metadata: {
    caption?: string;
    hashtags?: string[];
    scheduledTime: Date;
    status: 'pending' | 'scheduled' | 'posted' | 'failed';
    retryCount?: number;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    postId?: string;
    recoveryStrategy?: string;
    timestamp?: string;
    platform?: string;
    error?: string;
    originalError?: string;
    errorId?: string;
    retryable?: boolean;
    recoveryAttempted?: boolean;
  };
}

export class ContentQueue {
  private queue: QueuedContent[] = [];

  addToQueue(content: Omit<QueuedContent, 'id' | 'metadata' | 'metadata.status'> & { metadata: Omit<QueuedContent['metadata'], 'status'> }): string {
    const id = uuidv4();
    this.queue.push({
      ...content,
      id,
      metadata: { ...content.metadata, status: 'pending' },
    });
    return id;
  }

  getNextBatch(limit: number = 10): QueuedContent[] {
    return this.queue.filter(item => item.metadata.status === 'pending').slice(0, limit);
  }

  updateStatus(id: string, status: QueuedContent['metadata']['status'], additionalMetadata?: Partial<QueuedContent['metadata']>): void {
    const item = this.queue.find(q => q.id === id);
    if (item) {
      item.metadata.status = status;
      if (additionalMetadata) {
        Object.assign(item.metadata, additionalMetadata);
      }
    }
  }

  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  getQueueStatus(): {
    total: number;
    pending: number;
    scheduled: number;
    failed: number;
    posted: number;
  } {
    const total = this.queue.length;
    const pending = this.queue.filter(item => item.metadata.status === 'pending').length;
    const scheduled = this.queue.filter(item => item.metadata.status === 'scheduled').length;
    const failed = this.queue.filter(item => item.metadata.status === 'failed').length;
    const posted = this.queue.filter(item => item.metadata.status === 'posted').length;

    return { total, pending, scheduled, failed, posted };
  }

  getItemById(id: string): QueuedContent | undefined {
    return this.queue.find(item => item.id === id);
  }

  getItemsByStatus(status: QueuedContent['metadata']['status']): QueuedContent[] {
    return this.queue.filter(item => item.metadata.status === status);
  }

  getItemsByPlatform(platform: string): QueuedContent[] {
    return this.queue.filter(item => item.platforms.includes(platform));
  }

  clearQueue(): void {
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  // Priority queue functionality
  addToQueueWithPriority(
    content: Omit<QueuedContent, 'id' | 'metadata' | 'metadata.status'> & { 
      metadata: Omit<QueuedContent['metadata'], 'status'> & { priority?: 'low' | 'normal' | 'high' | 'urgent' } 
    }
  ): string {
    const id = uuidv4();
    const item: QueuedContent = {
      ...content,
      id,
      metadata: { ...content.metadata, status: 'pending' },
    };

    // Insert based on priority
    const priority = content.metadata.priority || 'normal';
    const priorityValues = { urgent: 4, high: 3, normal: 2, low: 1 };
    const itemPriority = priorityValues[priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = priorityValues[(this.queue[i].metadata as any).priority || 'normal'];
      if (itemPriority > existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, item);
    return id;
  }
} 