import { ContentQueue, QueuedContent } from './ContentQueue';
import { TikTokPoster, InstagramPoster, YouTubePoster, PlatformPoster, PostScheduleResult, PostStatusResult } from './PlatformPoster';
import { MonitoringService } from './Monitoring';
import { withExponentialBackoff, logError, notifyAdmin } from './ErrorHandling';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface SchedulerConfig {
  batchSize?: number;
  intervalMs?: number;
  maxRetries?: number;
  enableBatchProcessing?: boolean;
  enableRealTimeUpdates?: boolean;
}

interface SchedulerMetrics {
  totalProcessed: number;
  successfulPosts: number;
  failedPosts: number;
  averageProcessingTime: number;
  queueLength: number;
  platformStats: Record<string, {
    posts: number;
    successes: number;
    failures: number;
  }>;
}

export class AutoPostingScheduler {
  private queue: ContentQueue;
  private platformPosters: Record<string, PlatformPoster>;
  private intervalId?: NodeJS.Timeout;
  private monitoring: MonitoringService;
  private performanceOptimizer: PerformanceOptimizer;
  private config: SchedulerConfig;
  private metrics: SchedulerMetrics;
  private isProcessing = false;
  private subscribers: Set<(update: any) => void> = new Set();

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      batchSize: 10,
      intervalMs: 300000, // 5 minutes
      maxRetries: 3,
      enableBatchProcessing: true,
      enableRealTimeUpdates: false,
      ...config
    };
    
    this.queue = new ContentQueue();
    this.platformPosters = {
      tiktok: new TikTokPoster(),
      instagram: new InstagramPoster(),
      youtube: new YouTubePoster(),
    };
    this.monitoring = new MonitoringService();
    this.performanceOptimizer = new PerformanceOptimizer();
    
    this.metrics = {
      totalProcessed: 0,
      successfulPosts: 0,
      failedPosts: 0,
      averageProcessingTime: 0,
      queueLength: 0,
      platformStats: {}
    };
    
    // Initialize platform stats
    Object.keys(this.platformPosters).forEach(platform => {
      this.metrics.platformStats[platform] = {
        posts: 0,
        successes: 0,
        failures: 0
      };
    });
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