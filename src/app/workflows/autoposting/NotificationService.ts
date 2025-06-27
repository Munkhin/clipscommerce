type NotificationType = 'error' | 'success' | 'anomaly';

interface Notification {
  type: NotificationType;
  message: string;
  timestamp: Date;
}

export class NotificationService {
  private queue: Notification[] = [];
  private lastSent: Date | null = null;
  private throttleMs = 60000; // 1 minute

  sendNotification(type: NotificationType, message: string) {
    const now = new Date();
    if (this.lastSent && now.getTime() - this.lastSent.getTime() < this.throttleMs) {
      this.queue.push({ type, message, timestamp: now });
      return;
    }
    this.deliver({ type, message, timestamp: now });
    this.lastSent = now;
  }

  deliver(notification: Notification) {
    // Stub: send email, webhook, etc.
    console.info(`[NOTIFY] ${notification.type.toUpperCase()}: ${notification.message}`);
  }

  flushQueue() {
    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      if (notification) this.deliver(notification);
    }
    this.lastSent = new Date();
  }
} 