'use client';

import * as Sentry from '@sentry/nextjs';
import { v4 as uuidv4 } from 'uuid';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  PAYMENT = 'payment',
  API = 'api',
  UI = 'ui',
  NAVIGATION = 'navigation',
  DATA_PROCESSING = 'data_processing',
  EXTERNAL_SERVICE = 'external_service',
  UNKNOWN = 'unknown'
}

// Extended error information interface
export interface ErrorInfo {
  errorId: string;
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  action?: string;
  additionalContext?: Record<string, any>;
  fingerprint?: string[];
}

// Error reporting configuration
interface ErrorReportingConfig {
  dsn?: string;
  environment: string;
  enableInDevelopment: boolean;
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  maxBreadcrumbs: number;
  beforeSend?: (event: any) => any | null;
  sessionId?: string;
}

// Default configuration
const defaultConfig: ErrorReportingConfig = {
  environment: process.env.NODE_ENV || 'development',
  enableInDevelopment: process.env.NODE_ENV !== 'production',
  enableConsoleLogging: true,
  enableLocalStorage: true,
  maxBreadcrumbs: 50,
  beforeSend: undefined,
};

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private config: ErrorReportingConfig;
  private isInitialized: boolean = false;
  private sessionId: string;

  private constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.sessionId = this.config.sessionId || uuidv4();
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // Initialize Sentry
    if (this.shouldInitializeSentry()) {
      this.isInitialized = true;
    }
  }

  private shouldInitializeSentry(): boolean {
    if (process.env.NODE_ENV === 'production') return true;
    return this.config.enableInDevelopment && !!this.config.dsn;
  }

  private defaultBeforeSend(event: any): any | null {
    // Filter out sensitive information
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.value?.includes('password') || 
          exception?.value?.includes('token') ||
          exception?.value?.includes('secret')) {
        // Sanitize sensitive data
        exception.value = exception.value.replace(/password[^&\s]*/gi, 'password=***');
        exception.value = exception.value.replace(/token[^&\s]*/gi, 'token=***');
        exception.value = exception.value.replace(/secret[^&\s]*/gi, 'secret=***');
      }
    }

    return event;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getContextInfo(): Partial<ErrorInfo> {
    const info: Partial<ErrorInfo> = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    if (typeof window !== 'undefined') {
      info.userAgent = navigator.userAgent;
      info.url = window.location.href;
      
      // Try to extract correlation ID from response headers or generate one
      const correlationId = this.extractCorrelationId();
      if (correlationId) {
        info.requestId = correlationId;
      }
    }

    return info;
  }

  private extractCorrelationId(): string | undefined {
    // Try to get correlation ID from various sources
    if (typeof window !== 'undefined') {
      // Check if there's a global correlation ID set by middleware
      const globalCorrelationId = (window as any).__CORRELATION_ID__;
      if (globalCorrelationId) {
        return globalCorrelationId;
      }
      
      // Check localStorage for persistent correlation tracking
      try {
        const storedCorrelationId = localStorage.getItem('clipscommerce_correlation_id');
        if (storedCorrelationId) {
          return storedCorrelationId;
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    // Generate a new correlation ID
    const newCorrelationId = this.generateCorrelationId();
    
    // Store it for future use
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('clipscommerce_correlation_id', newCorrelationId);
        (window as any).__CORRELATION_ID__ = newCorrelationId;
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    return newCorrelationId;
  }

  private logToConsole(error: Error, errorInfo: ErrorInfo) {
    if (!this.config.enableConsoleLogging) return;

    const logMethod = errorInfo.severity === ErrorSeverity.CRITICAL ? 
      console.error : console.warn;

    logMethod('Error Report:', {
      id: errorInfo.errorId,
      message: error.message,
      stack: error.stack,
      context: errorInfo,
    });
  }

  private storeLocally(error: Error, errorInfo: ErrorInfo) {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return;

    try {
      const storageKey = 'clipscommerce_errors';
      const existingErrors = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const errorRecord = {
        id: errorInfo.errorId,
        message: error.message,
        stack: error.stack?.substring(0, 1000), // Truncate stack trace
        timestamp: errorInfo.timestamp,
        category: errorInfo.category,
        severity: errorInfo.severity,
        url: errorInfo.url,
        component: errorInfo.component,
      };

      existingErrors.push(errorRecord);
      
      // Keep only the last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }

      localStorage.setItem(storageKey, JSON.stringify(existingErrors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }

  /**
   * Report an error with full context
   */
  public reportError(
    error: Error,
    context: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      component?: string;
      action?: string;
      userId?: string;
      requestId?: string;
      additionalContext?: Record<string, any>;
      fingerprint?: string[];
    } = {}
  ): string {
    const errorId = this.generateErrorId();
    
    const contextInfo = this.getContextInfo();
    const errorInfo: ErrorInfo = {
      errorId,
      timestamp: contextInfo.timestamp!,
      category: context.category || ErrorCategory.UNKNOWN,
      severity: context.severity || ErrorSeverity.NORMAL,
      component: context.component,
      action: context.action,
      userId: context.userId,
      requestId: context.requestId,
      additionalContext: context.additionalContext,
      fingerprint: context.fingerprint,
      sessionId: contextInfo.sessionId,
      userAgent: contextInfo.userAgent,
      url: contextInfo.url,
    };

    // Log to console in development or if enabled
    this.logToConsole(error, errorInfo);

    // Store locally if enabled
    this.storeLocally(error, errorInfo);

    // Send to Sentry if initialized
    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        // Set error ID for correlation
        scope.setTag('errorId', errorId);
        scope.setTag('category', errorInfo.category);
        scope.setLevel(this.mapSeverityToSentryLevel(errorInfo.severity));

        // Set user context if available
        if (errorInfo.userId) {
          scope.setUser({ id: errorInfo.userId });
        }

        // Set additional context
        scope.setContext('errorInfo', { ...errorInfo } as Record<string, any>);
        
        if (errorInfo.additionalContext) {
          scope.setContext('additional', errorInfo.additionalContext);
        }

        // Set fingerprint for grouping similar errors
        if (errorInfo.fingerprint) {
          scope.setFingerprint(errorInfo.fingerprint);
        }

        // Add breadcrumb
        Sentry.addBreadcrumb({
          message: `Error in ${errorInfo.component || 'unknown component'}`,
          category: errorInfo.category,
          level: 'error',
          data: {
            action: errorInfo.action,
            url: errorInfo.url,
          },
        });

        // Capture the exception
        Sentry.captureException(error);
      });
    }

    return errorId;
  }

  /**
   * Report a message without an Error object
   */
  public reportMessage(
    message: string,
    context: {
      level?: 'info' | 'warning' | 'error';
      category?: ErrorCategory;
      additionalContext?: Record<string, any>;
    } = {}
  ): string {
    const errorId = this.generateErrorId();

    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        scope.setTag('errorId', errorId);
        scope.setTag('category', context.category || ErrorCategory.UNKNOWN);
        
        if (context.additionalContext) {
          scope.setContext('additional', context.additionalContext);
        }

        Sentry.captureMessage(message, context.level || 'info');
      });
    }

    if (this.config.enableConsoleLogging) {
      console.info('Message Report:', { id: errorId, message, context });
    }

    return errorId;
  }

  /**
   * Set user context for error reporting
   */
  public setUser(user: { id: string; email?: string; username?: string }) {
    if (this.isInitialized) {
      Sentry.setUser(user);
    }
  }

  /**
   * Add a breadcrumb for tracking user actions
   */
  public addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, any>
  ) {
    if (this.isInitialized) {
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }

  /**
   * Get locally stored errors (for debugging or offline analysis)
   */
  public getLocalErrors(): any[] {
    if (typeof window === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem('clipscommerce_errors') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear locally stored errors
   */
  public clearLocalErrors() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('clipscommerce_errors');
    }
  }

  private mapSeverityToSentryLevel(severity: ErrorSeverity): 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.NORMAL:
        return 'warning';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      default:
        return 'error';
    }
  }
}

// Create and export singleton instance
const errorReportingConfig: ErrorReportingConfig = {
  environment: process.env.NODE_ENV || 'development',
  enableInDevelopment: process.env.NODE_ENV !== 'production', // Enable in dev for testing
  enableConsoleLogging: true,
  enableLocalStorage: true,
  maxBreadcrumbs: 50,
};

export const errorReporter = new ErrorReportingService(errorReportingConfig);

// Convenience functions
export const reportError = (error: Error, context?: Parameters<typeof errorReporter.reportError>[1]) => 
  errorReporter.reportError(error, context);

export const reportMessage = (message: string, context?: Parameters<typeof errorReporter.reportMessage>[1]) => 
  errorReporter.reportMessage(message, context);

export const setUser = (user: Parameters<typeof errorReporter.setUser>[0]) => 
  errorReporter.setUser(user);

export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => 
  errorReporter.addBreadcrumb(message, category, data);