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

  updateStatus(id: string, status: QueuedContent['metadata']['status']): void {
    const item = this.queue.find(q => q.id === id);
    if (item) {
      item.metadata.status = status;
    }
  }
} 