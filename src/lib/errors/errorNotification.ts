'use client';

import { errorReporter, ErrorCategory, ErrorSeverity } from './errorReporting';

// Notification types
export enum NotificationType {
  TOAST = 'toast',
  MODAL = 'modal',
  BANNER = 'banner',
  EMAIL = 'email',
  PUSH = 'push'
}

// Notification priority levels
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Notification configuration
interface NotificationConfig {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  errorId?: string;
  timestamp: string;
  persistent?: boolean;
  autoClose?: number; // milliseconds
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// Notification queue item
interface QueuedNotification extends NotificationConfig {
  attempts: number;
  nextRetry?: number;
}

class ErrorNotificationService {
  private notificationQueue: QueuedNotification[] = [];
  private activeNotifications: Map<string, NotificationConfig> = new Map();
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Check for permission to show notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Process notification queue periodically
    setInterval(() => {
      this.processQueue();
    }, 1000);

    // Listen for critical errors
    this.setupCriticalErrorListener();
  }

  private setupCriticalErrorListener() {
    // Listen for unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.notifyCriticalError(
          new Error(event.reason?.message || 'Unhandled promise rejection'),
          {
            category: ErrorCategory.UNKNOWN,
            context: 'Unhandled promise rejection',
            additionalData: { reason: event.reason }
          }
        );
      });

      // Listen for uncaught errors
      window.addEventListener('error', (event) => {
        this.notifyCriticalError(
          event.error || new Error(event.message),
          {
            category: ErrorCategory.UI,
            context: 'Uncaught error',
            additionalData: { 
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          }
        );
      });
    }
  }

  /**
   * Notify about critical errors that require immediate attention
   */
  public notifyCriticalError(
    error: Error,
    context: {
      category?: ErrorCategory;
      component?: string;
      userId?: string;
      context?: string;
      additionalData?: Record<string, any>;
    } = {}
  ) {
    const errorId = errorReporter.reportError(error, {
      category: context.category || ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.CRITICAL,
      component: context.component,
      userId: context.userId,
      additionalContext: {
        notificationContext: context.context,
        ...context.additionalData
      }
    });

    // Create urgent notification
    this.createNotification({
      type: NotificationType.MODAL,
      priority: NotificationPriority.URGENT,
      title: 'Critical Error Detected',
      message: 'A critical error has occurred. Our team has been notified and is working on a fix.',
      category: context.category || ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.CRITICAL,
      errorId,
      persistent: true,
      actions: [
        {
          label: 'Reload Page',
          action: () => window.location.reload(),
          style: 'primary'
        },
        {
          label: 'Contact Support',
          action: () => this.contactSupport(errorId),
          style: 'secondary'
        }
      ]
    });

    // Also show a browser notification if permissions allow
    this.showBrowserNotification({
      title: 'ClipsCommerce - Critical Error',
      message: 'A critical error occurred. Please check the application.',
      icon: '/favicon.ico',
      tag: `critical-error-${errorId}`
    });
  }

  /**
   * Create a notification for display
   */
  public createNotification(config: Omit<NotificationConfig, 'id' | 'timestamp'>) {
    const notification: NotificationConfig = {
      id: this.generateNotificationId(),
      timestamp: new Date().toISOString(),
      ...config
    };

    this.queueNotification(notification);
    return notification.id;
  }

  /**
   * Show error notification based on severity
   */
  public notifyError(
    error: Error,
    context: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      component?: string;
      userId?: string;
      userMessage?: string;
    } = {}
  ) {
    const severity = context.severity || ErrorSeverity.NORMAL;
    const errorId = errorReporter.reportError(error, {
      category: context.category || ErrorCategory.UNKNOWN,
      severity,
      component: context.component,
      userId: context.userId
    });

    // Determine notification type and priority based on severity
    const { type, priority, title, message } = this.getNotificationConfig(severity, error, context.userMessage);

    this.createNotification({
      type,
      priority,
      title,
      message,
      category: context.category || ErrorCategory.UNKNOWN,
      severity,
      errorId,
      autoClose: severity === ErrorSeverity.LOW ? 5000 : severity === ErrorSeverity.NORMAL ? 10000 : undefined,
      actions: this.getErrorActions(errorId, severity)
    });
  }

  private getNotificationConfig(severity: ErrorSeverity, error: Error, userMessage?: string) {
    const config = {
      title: 'Error',
      message: userMessage || 'An error occurred',
      type: NotificationType.TOAST,
      priority: NotificationPriority.NORMAL
    };

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        config.title = 'Critical Error';
        config.message = userMessage || 'A critical error occurred. Our team has been notified.';
        config.type = NotificationType.MODAL;
        config.priority = NotificationPriority.URGENT;
        break;
      
      case ErrorSeverity.HIGH:
        config.title = 'Error';
        config.message = userMessage || 'An error occurred that may affect your experience.';
        config.type = NotificationType.BANNER;
        config.priority = NotificationPriority.HIGH;
        break;
      
      case ErrorSeverity.NORMAL:
        config.title = 'Notice';
        config.message = userMessage || 'Something went wrong. Please try again.';
        config.type = NotificationType.TOAST;
        config.priority = NotificationPriority.NORMAL;
        break;
      
      case ErrorSeverity.LOW:
        config.title = 'Info';
        config.message = userMessage || 'A minor issue was detected.';
        config.type = NotificationType.TOAST;
        config.priority = NotificationPriority.LOW;
        break;
    }

    return config;
  }

  private getErrorActions(errorId: string, severity: ErrorSeverity): NotificationAction[] {
    const actions: NotificationAction[] = [];

    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      actions.push({
        label: 'Retry',
        action: () => window.location.reload(),
        style: 'primary'
      });
    }

    if (severity === ErrorSeverity.CRITICAL) {
      actions.push({
        label: 'Contact Support',
        action: () => this.contactSupport(errorId),
        style: 'secondary'
      });
    }

    return actions;
  }

  private queueNotification(notification: NotificationConfig) {
    const queuedNotification: QueuedNotification = {
      ...notification,
      attempts: 0
    };

    this.notificationQueue.push(queuedNotification);
  }

  private processQueue() {
    const now = Date.now();
    
    this.notificationQueue = this.notificationQueue.filter(notification => {
      // Skip if we're waiting for retry
      if (notification.nextRetry && now < notification.nextRetry) {
        return true;
      }

      // Skip if max retries exceeded
      if (notification.attempts >= this.maxRetries) {
        console.warn('Max retries exceeded for notification:', notification.id);
        return false;
      }

      // Try to show the notification
      try {
        this.showNotification(notification);
        return false; // Remove from queue on success
      } catch (error) {
        console.error('Failed to show notification:', error);
        notification.attempts++;
        notification.nextRetry = now + this.retryDelay;
        return true; // Keep in queue for retry
      }
    });
  }

  private showNotification(notification: NotificationConfig) {
    switch (notification.type) {
      case NotificationType.TOAST:
        this.showToastNotification(notification);
        break;
      case NotificationType.MODAL:
        this.showModalNotification(notification);
        break;
      case NotificationType.BANNER:
        this.showBannerNotification(notification);
        break;
      case NotificationType.PUSH:
        this.showBrowserNotification({
          title: notification.title,
          message: notification.message,
          tag: notification.id
        });
        break;
    }

    this.activeNotifications.set(notification.id, notification);

    // Auto-close if specified
    if (notification.autoClose) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.autoClose);
    }
  }

  private showToastNotification(notification: NotificationConfig) {
    // This would integrate with your toast system (e.g., react-hot-toast, sonner, etc.)
    // For now, we'll create a simple implementation
    if (typeof window !== 'undefined') {
      const toast = this.createToastElement(notification);
      document.body.appendChild(toast);
    }
  }

  private createToastElement(notification: NotificationConfig): HTMLElement {
    const toast = document.createElement('div');
    toast.id = `toast-${notification.id}`;
    toast.className = `
      fixed top-4 right-4 z-50 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg
      transform transition-transform duration-300 translate-x-full
    `;
    
    const bgColor = notification.severity === ErrorSeverity.CRITICAL ? 'bg-red-50 border-red-200' :
                   notification.severity === ErrorSeverity.HIGH ? 'bg-orange-50 border-orange-200' :
                   notification.severity === ErrorSeverity.NORMAL ? 'bg-yellow-50 border-yellow-200' :
                   'bg-blue-50 border-blue-200';
    
    toast.className += ` ${bgColor}`;

    toast.innerHTML = `
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-1">
            <h3 class="text-sm font-medium">${notification.title}</h3>
            <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
            ${notification.errorId ? `<p class="text-xs text-gray-500 mt-2">ID: ${notification.errorId}</p>` : ''}
          </div>
          <button class="ml-2 text-gray-400 hover:text-gray-600" onclick="document.body.removeChild(this.closest('.fixed'))">
            ×
          </button>
        </div>
        ${notification.actions ? this.createActionButtons(notification.actions) : ''}
      </div>
    `;

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    return toast;
  }

  private createActionButtons(actions: NotificationAction[]): string {
    return `
      <div class="mt-3 flex gap-2">
        ${actions.map(action => `
          <button 
            class="px-3 py-1 text-xs rounded ${
              action.style === 'primary' ? 'bg-blue-500 text-white' :
              action.style === 'danger' ? 'bg-red-500 text-white' :
              'bg-gray-200 text-gray-700'
            }"
            onclick="(${action.action.toString()})()"
          >
            ${action.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  private showModalNotification(notification: NotificationConfig) {
    // This would integrate with your modal system
    console.log('Modal notification:', notification);
    // For now, use a simple alert for critical errors
    if (notification.severity === ErrorSeverity.CRITICAL) {
      alert(`${notification.title}: ${notification.message}`);
    }
  }

  private showBannerNotification(notification: NotificationConfig) {
    // This would integrate with your banner system
    console.log('Banner notification:', notification);
  }

  private showBrowserNotification(config: {
    title: string;
    message: string;
    icon?: string;
    tag?: string;
  }) {
    if (typeof window === 'undefined') return;
    
    if (Notification.permission === 'granted') {
      new Notification(config.title, {
        body: config.message,
        icon: config.icon || '/favicon.ico',
        tag: config.tag,
      });
    }
  }

  private contactSupport(errorId: string) {
    const subject = encodeURIComponent(`Error Report - ID: ${errorId}`);
    const body = encodeURIComponent(
      `I need help with an error that occurred.\n\n` +
      `Error ID: ${errorId}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `Page: ${window.location.href}\n\n` +
      `Please help me resolve this issue.`
    );
    
    const mailtoUrl = `mailto:support@clipscommerce.com?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dismiss a notification
   */
  public dismissNotification(notificationId: string) {
    this.activeNotifications.delete(notificationId);
    
    if (typeof window !== 'undefined') {
      const element = document.getElementById(`toast-${notificationId}`);
      if (element) {
        element.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }, 300);
      }
    }
  }

  /**
   * Clear all notifications
   */
  public clearAllNotifications() {
    this.activeNotifications.clear();
    this.notificationQueue = [];
    
    if (typeof window !== 'undefined') {
      const toasts = document.querySelectorAll('[id^="toast-"]');
      toasts.forEach(toast => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  }

  /**
   * Get active notifications
   */
  public getActiveNotifications(): NotificationConfig[] {
    return Array.from(this.activeNotifications.values());
  }
}

// Create and export singleton instance
export const errorNotificationService = new ErrorNotificationService();

// Convenience functions
export const notifyError = (error: Error, context?: Parameters<typeof errorNotificationService.notifyError>[1]) => 
  errorNotificationService.notifyError(error, context);

export const notifyCriticalError = (error: Error, context?: Parameters<typeof errorNotificationService.notifyCriticalError>[1]) => 
  errorNotificationService.notifyCriticalError(error, context);

export const createNotification = (config: Parameters<typeof errorNotificationService.createNotification>[0]) => 
  errorNotificationService.createNotification(config);

export const dismissNotification = (notificationId: string) => 
  errorNotificationService.dismissNotification(notificationId);