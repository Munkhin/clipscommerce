import { ContentQueue, QueuedContent } from './ContentQueue';
import { TikTokPoster, InstagramPoster, YouTubePoster, PlatformPoster } from './PlatformPoster';
import { MonitoringService } from './Monitoring';

export class AutoPostingScheduler {
  private queue: ContentQueue;
  private platformPosters: Record<string, PlatformPoster>;
  private intervalId?: NodeJS.Timeout;
  private monitoring: MonitoringService;

  constructor() {
    this.queue = new ContentQueue();
    this.platformPosters = {
      tiktok: new TikTokPoster(),
      instagram: new InstagramPoster(),
      youtube: new YouTubePoster(),
    };
    this.monitoring = new MonitoringService();
  }

  async processQueue(): Promise<void> {
    const batch = this.queue.getNextBatch();
    for (const item of batch) {
      for (const platform of item.platforms) {
        const poster = this.platformPosters[platform];
        if (!poster) continue;
        try {
          await poster.validateContent(item.content);
          const postId = await poster.schedulePost(item.content, item.metadata.scheduledTime);
          this.queue.updateStatus(item.id, 'scheduled');
        } catch (error) {
          this.queue.updateStatus(item.id, 'failed');
          // TODO: Log error and continue with next item
        }
      }
    }
    const health = this.monitoring.checkQueueHealth(this.queue);
    if (health !== 'healthy') {
      this.monitoring.alertAdmin(`Queue health: ${health}`);
    }
    if (this.monitoring.detectAnomalies()) {
      this.monitoring.alertAdmin('Anomaly detected in autoposting workflow');
    }
  }

  start(intervalMs: number = 300000): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.processQueue(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  getQueue(): ContentQueue {
    return this.queue;
  }
} 