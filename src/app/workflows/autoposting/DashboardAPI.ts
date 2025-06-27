import { AutoPostingScheduler } from './AutoPostingScheduler';
import { MonitoringService } from './Monitoring';
import { NotificationService } from './NotificationService';

// Simulated Express-like API (replace with real framework as needed)
export class DashboardAPI {
  private scheduler: AutoPostingScheduler;
  private monitoring: MonitoringService;
  private notifications: NotificationService;
  private adminToken = 'secure-admin-token';

  constructor(scheduler: AutoPostingScheduler, monitoring: MonitoringService, notifications: NotificationService) {
    this.scheduler = scheduler;
    this.monitoring = monitoring;
    this.notifications = notifications;
  }

  authenticate(token: string): boolean {
    return token === this.adminToken;
  }

  getQueueStatus(token: string) {
    if (!this.authenticate(token)) throw new Error('Unauthorized');
    return {
      length: this.monitoring.getQueueLength(this.scheduler.getQueue()),
      health: this.monitoring.checkQueueHealth(this.scheduler.getQueue()),
    };
  }

  getLogs(token: string) {
    if (!this.authenticate(token)) throw new Error('Unauthorized');
    // Stub: return logs
    return ['Log entry 1', 'Log entry 2'];
  }

  manualOverride(token: string, action: 'pause' | 'resume' | 'forcePost', data?: any) {
    if (!this.authenticate(token)) throw new Error('Unauthorized');
    if (action === 'pause') this.scheduler.stop();
    if (action === 'resume') this.scheduler.start();
    if (action === 'forcePost') this.scheduler.processQueue();
    return { success: true };
  }

  getRealTimeMonitoring(token: string) {
    if (!this.authenticate(token)) throw new Error('Unauthorized');
    return {
      successRate: this.monitoring.getSuccessRate(),
      failureRate: this.monitoring.getFailureRate(),
      avgProcessingTime: this.monitoring.getAverageProcessingTime(),
    };
  }
} 