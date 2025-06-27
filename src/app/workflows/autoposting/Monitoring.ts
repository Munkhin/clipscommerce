import { ContentQueue } from './ContentQueue';

export class MonitoringService {
  private successCount = 0;
  private failureCount = 0;
  private processingTimes: number[] = [];

  recordSuccess() {
    this.successCount++;
  }

  recordFailure() {
    this.failureCount++;
  }

  recordProcessingTime(ms: number) {
    this.processingTimes.push(ms);
  }

  getQueueLength(queue: ContentQueue): number {
    return queue.getNextBatch(Number.MAX_SAFE_INTEGER).length;
  }

  getSuccessRate(): number {
    const total = this.successCount + this.failureCount;
    return total === 0 ? 0 : this.successCount / total;
  }

  getFailureRate(): number {
    const total = this.successCount + this.failureCount;
    return total === 0 ? 0 : this.failureCount / total;
  }

  getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Returns queue health based on length: healthy < 10, warning < 30, critical >= 30
   */
  checkQueueHealth(queue: ContentQueue): 'healthy' | 'warning' | 'critical' {
    const length = this.getQueueLength(queue);
    if (length < 10) return 'healthy';
    if (length < 30) return 'warning';
    return 'critical';
  }

  detectAnomalies(): boolean {
    // Simple anomaly: failure rate > 50% or avg processing time > 10s
    return this.getFailureRate() > 0.5 || this.getAverageProcessingTime() > 10000;
  }

  alertAdmin(message: string) {
    // Stub: send email/webhook
    console.warn(`[ALERT] Admin notified: ${message}`);
  }
}

// Batch API requests and parallel processing stubs
export async function batchProcess<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize = 5): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
} 