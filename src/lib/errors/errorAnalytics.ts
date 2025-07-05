'use client';

import { ErrorCategory, ErrorSeverity } from './errorReporting';
import * as Sentry from '@sentry/nextjs';

// Initialize Sentry in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [],
      beforeSend(event) {
        // Filter out non-critical errors in production
        if (event.level === 'info' || event.level === 'debug') {
          return null;
        }
        return event;
      },
    });
  }
}

// Analytics event types
export enum AnalyticsEventType {
  ERROR_OCCURRED = 'error_occurred',
  ERROR_BOUNDARY_TRIGGERED = 'error_boundary_triggered',
  ERROR_RECOVERED = 'error_recovered',
  ERROR_DISMISSED = 'error_dismissed',
  SUPPORT_CONTACTED = 'support_contacted',
  PAGE_RELOADED = 'page_reloaded',
  RETRY_ATTEMPTED = 'retry_attempted'
}

// Error patterns for analysis
interface ErrorPattern {
  signature: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  affectedUsers: Set<string>;
  components: Set<string>;
  urls: Set<string>;
  userAgents: Set<string>;
}

// Analytics data structure
interface ErrorAnalyticsData {
  errorId: string;
  eventType: AnalyticsEventType;
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

// Error metrics
interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByComponent: Record<string, number>;
  errorsByHour: Record<string, number>;
  errorsByDay: Record<string, number>;
  uniqueErrors: number;
  affectedUsers: number;
  errorRate: number;
  recoveryRate: number;
  averageTimeToRecover: number;
}

// Performance impact tracking
interface PerformanceImpact {
  errorId: string;
  beforeError: {
    timestamp: string;
    memory?: number;
    loadTime?: number;
    responseTime?: number;
  };
  afterError: {
    timestamp: string;
    memory?: number;
    loadTime?: number;
    responseTime?: number;
  };
  impact: {
    memoryIncrease: number;
    performanceDegradation: number;
    userExperienceScore: number;
  };
}

class ErrorAnalyticsService {
  private analyticsData: ErrorAnalyticsData[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private performanceTracking: Map<string, PerformanceImpact> = new Map();
  private maxStorageSize = 1000; // Maximum number of analytics records to keep in memory
  private storageKey = 'clipscommerce_error_analytics';

  constructor() {
    this.loadStoredData();
    this.setupPerformanceMonitoring();
    this.setupPeriodicCleanup();
  }

  private loadStoredData() {
    if (typeof window === 'undefined') return;
    
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (storedData) {
        const data = JSON.parse(storedData);
        this.analyticsData = data.analyticsData || [];
        
        // Reconstruct error patterns (Sets need special handling)
        if (data.errorPatterns) {
          for (const [signature, pattern] of Object.entries(data.errorPatterns)) {
            this.errorPatterns.set(signature, {
              ...(pattern as any),
              affectedUsers: new Set((pattern as any).affectedUsers || []),
              components: new Set((pattern as any).components || []),
              urls: new Set((pattern as any).urls || []),
              userAgents: new Set((pattern as any).userAgents || [])
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load stored analytics data:', error);
    }
  }

  private saveData() {
    if (typeof window === 'undefined') return;
    
    try {
      // Convert Sets to arrays for JSON serialization
      const patternsForStorage: Record<string, any> = {};
      for (const [signature, pattern] of this.errorPatterns.entries()) {
        patternsForStorage[signature] = {
          ...pattern,
          affectedUsers: Array.from(pattern.affectedUsers),
          components: Array.from(pattern.components),
          urls: Array.from(pattern.urls),
          userAgents: Array.from(pattern.userAgents)
        };
      }

      const dataToStore = {
        analyticsData: this.analyticsData.slice(-this.maxStorageSize),
        errorPatterns: patternsForStorage,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save analytics data:', error);
    }
  }

  private setupPerformanceMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.trackPerformanceBaseline(entry as PerformanceNavigationTiming);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  private trackPerformanceBaseline(timing: PerformanceNavigationTiming) {
    const baseline = {
      timestamp: new Date().toISOString(),
      memory: (performance as any).memory?.usedJSHeapSize,
      loadTime: timing.loadEventEnd - timing.startTime,
      responseTime: timing.responseEnd - timing.requestStart
    };

    // Store baseline for comparison when errors occur
    sessionStorage.setItem('performance_baseline', JSON.stringify(baseline));
  }

  private setupPeriodicCleanup() {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour
  }

  private cleanupOldData() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Remove analytics data older than 24 hours
    this.analyticsData = this.analyticsData.filter(data => 
      new Date(data.timestamp) > oneDayAgo
    );

    // Clean up error patterns that haven't been seen recently
    for (const [signature, pattern] of this.errorPatterns.entries()) {
      if (new Date(pattern.lastSeen) < oneDayAgo) {
        this.errorPatterns.delete(signature);
      }
    }

    this.saveData();
  }

  /**
   * Track an error analytics event
   */
  public trackErrorEvent(data: Omit<ErrorAnalyticsData, 'timestamp'>) {
    const analyticsData: ErrorAnalyticsData = {
      ...data,
      timestamp: new Date().toISOString()
    };

    this.analyticsData.push(analyticsData);
    
    // Update error patterns
    if (data.eventType === AnalyticsEventType.ERROR_OCCURRED) {
      this.updateErrorPattern(analyticsData);
      
      // Send error to Sentry in production
      if (process.env.NODE_ENV === 'production') {
        Sentry.withScope((scope) => {
          scope.setTag('category', data.category);
          scope.setTag('severity', data.severity);
          scope.setLevel(data.severity === ErrorSeverity.CRITICAL ? 'error' : 'warning');
          
          if (data.component) scope.setTag('component', data.component);
          if (data.userId) scope.setUser({ id: data.userId });
          if (data.url) scope.setContext('page', { url: data.url });
          if (data.additionalData) scope.setContext('additional', data.additionalData);
          
          Sentry.captureMessage(`Error in ${data.component || 'Unknown Component'}: ${data.action || 'Unknown Action'}`, 'error');
        });
      }
    }

    // Limit storage size
    if (this.analyticsData.length > this.maxStorageSize) {
      this.analyticsData = this.analyticsData.slice(-this.maxStorageSize);
    }

    this.saveData();
  }

  private updateErrorPattern(data: ErrorAnalyticsData) {
    const signature = this.generateErrorSignature(data);
    
    if (this.errorPatterns.has(signature)) {
      const pattern = this.errorPatterns.get(signature)!;
      pattern.count++;
      pattern.lastSeen = data.timestamp;
      
      if (data.userId) pattern.affectedUsers.add(data.userId);
      if (data.component) pattern.components.add(data.component);
      if (data.url) pattern.urls.add(data.url);
      if (data.userAgent) pattern.userAgents.add(data.userAgent);
    } else {
      const newPattern: ErrorPattern = {
        signature,
        count: 1,
        firstSeen: data.timestamp,
        lastSeen: data.timestamp,
        category: data.category,
        severity: data.severity,
        affectedUsers: new Set(data.userId ? [data.userId] : []),
        components: new Set(data.component ? [data.component] : []),
        urls: new Set(data.url ? [data.url] : []),
        userAgents: new Set(data.userAgent ? [data.userAgent] : [])
      };
      
      this.errorPatterns.set(signature, newPattern);
    }
  }

  private generateErrorSignature(data: ErrorAnalyticsData): string {
    // Create a signature for grouping similar errors
    const parts = [
      data.category,
      data.severity,
      data.component || 'unknown',
      data.action || 'unknown'
    ];
    
    return parts.join('|');
  }

  /**
   * Track performance impact of an error
   */
  public trackPerformanceImpact(errorId: string) {
    if (typeof window === 'undefined') return;

    try {
      const baselineData = sessionStorage.getItem('performance_baseline');
      if (!baselineData) return;

      const baseline = JSON.parse(baselineData);
      const current = {
        timestamp: new Date().toISOString(),
        memory: (performance as any).memory?.usedJSHeapSize,
        loadTime: performance.now(),
        responseTime: 0 // Would need to be measured separately
      };

      const impact: PerformanceImpact = {
        errorId,
        beforeError: baseline,
        afterError: current,
        impact: {
          memoryIncrease: current.memory ? current.memory - (baseline.memory || 0) : 0,
          performanceDegradation: current.loadTime - (baseline.loadTime || 0),
          userExperienceScore: this.calculateUserExperienceScore(baseline, current)
        }
      };

      this.performanceTracking.set(errorId, impact);
    } catch (error) {
      console.warn('Failed to track performance impact:', error);
    }
  }

  private calculateUserExperienceScore(baseline: any, current: any): number {
    // Calculate a score from 0-100 based on performance impact
    let score = 100;
    
    // Deduct points for memory increase
    if (current.memory && baseline.memory) {
      const memoryIncrease = (current.memory - baseline.memory) / baseline.memory;
      score -= Math.min(memoryIncrease * 100, 30);
    }
    
    // Deduct points for performance degradation
    if (current.loadTime && baseline.loadTime) {
      const performanceDecrease = (current.loadTime - baseline.loadTime) / baseline.loadTime;
      score -= Math.min(performanceDecrease * 100, 30);
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Get comprehensive error metrics
   */
  public getErrorMetrics(): ErrorMetrics {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Filter to recent data
    const recentData = this.analyticsData.filter(data => 
      new Date(data.timestamp) > oneDayAgo
    );

    const errorEvents = recentData.filter(data => 
      data.eventType === AnalyticsEventType.ERROR_OCCURRED
    );

    const recoveryEvents = recentData.filter(data => 
      data.eventType === AnalyticsEventType.ERROR_RECOVERED
    );

    // Calculate metrics
    const totalErrors = errorEvents.length;
    const uniqueErrors = new Set(errorEvents.map(e => e.errorId)).size;
    const affectedUsers = new Set(errorEvents.map(e => e.userId).filter(Boolean)).size;
    
    const errorsByCategory = this.groupBy(errorEvents, 'category');
    const errorsBySeverity = this.groupBy(errorEvents, 'severity');
    const errorsByComponent = this.groupBy(errorEvents, 'component');
    
    const errorsByHour = this.groupByTimeInterval(errorEvents, 'hour');
    const errorsByDay = this.groupByTimeInterval(errorEvents, 'day');
    
    const recoveryRate = totalErrors > 0 ? (recoveryEvents.length / totalErrors) * 100 : 0;
    const errorRate = totalErrors; // Errors per day
    
    // Calculate average time to recover
    const averageTimeToRecover = this.calculateAverageRecoveryTime(errorEvents, recoveryEvents);

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      errorsByComponent,
      errorsByHour,
      errorsByDay,
      uniqueErrors,
      affectedUsers,
      errorRate,
      recoveryRate,
      averageTimeToRecover
    };
  }

  private groupBy<T extends Record<string, any>>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByTimeInterval(events: ErrorAnalyticsData[], interval: 'hour' | 'day'): Record<string, number> {
    return events.reduce((acc, event) => {
      const date = new Date(event.timestamp);
      const key = interval === 'hour' 
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageRecoveryTime(errorEvents: ErrorAnalyticsData[], recoveryEvents: ErrorAnalyticsData[]): number {
    const recoveryTimes: number[] = [];
    
    for (const recovery of recoveryEvents) {
      const originalError = errorEvents.find(error => error.errorId === recovery.errorId);
      if (originalError) {
        const errorTime = new Date(originalError.timestamp).getTime();
        const recoveryTime = new Date(recovery.timestamp).getTime();
        recoveryTimes.push(recoveryTime - errorTime);
      }
    }
    
    return recoveryTimes.length > 0 
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length / 1000 // Convert to seconds
      : 0;
  }

  /**
   * Get error patterns for analysis
   */
  public getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count); // Sort by frequency
  }

  /**
   * Get performance impact data
   */
  public getPerformanceImpacts(): PerformanceImpact[] {
    return Array.from(this.performanceTracking.values());
  }

  /**
   * Get error trend analysis
   */
  public getTrendAnalysis(days: number = 7): {
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    dailyAverages: Record<string, number>;
  } {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const recentData = this.analyticsData.filter(data => 
      data.eventType === AnalyticsEventType.ERROR_OCCURRED &&
      new Date(data.timestamp) > startDate
    );

    const dailyAverages = this.groupByTimeInterval(recentData, 'day');
    
    const dates = Object.keys(dailyAverages).sort();
    if (dates.length < 2) {
      return {
        trend: 'stable',
        changePercentage: 0,
        dailyAverages
      };
    }

    const firstHalf = dates.slice(0, Math.floor(dates.length / 2));
    const secondHalf = dates.slice(Math.floor(dates.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, date) => sum + dailyAverages[date], 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, date) => sum + dailyAverages[date], 0) / secondHalf.length;
    
    const changePercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(changePercentage) < 10) {
      trend = 'stable';
    } else if (changePercentage > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      trend,
      changePercentage,
      dailyAverages
    };
  }

  /**
   * Export analytics data for external analysis
   */
  public exportAnalyticsData(): {
    analyticsData: ErrorAnalyticsData[];
    errorPatterns: ErrorPattern[];
    performanceImpacts: PerformanceImpact[];
    metrics: ErrorMetrics;
  } {
    return {
      analyticsData: this.analyticsData,
      errorPatterns: this.getErrorPatterns(),
      performanceImpacts: this.getPerformanceImpacts(),
      metrics: this.getErrorMetrics()
    };
  }

  /**
   * Clear all analytics data
   */
  public clearAnalyticsData() {
    this.analyticsData = [];
    this.errorPatterns.clear();
    this.performanceTracking.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

// Create and export singleton instance
export const errorAnalytics = new ErrorAnalyticsService();

// Convenience functions
export const trackErrorEvent = (data: Parameters<typeof errorAnalytics.trackErrorEvent>[0]) => 
  errorAnalytics.trackErrorEvent(data);

export const getErrorMetrics = () => errorAnalytics.getErrorMetrics();

export const getErrorPatterns = () => errorAnalytics.getErrorPatterns();

export const getTrendAnalysis = (days?: number) => errorAnalytics.getTrendAnalysis(days);

export const trackPerformanceImpact = (errorId: string) => 
  errorAnalytics.trackPerformanceImpact(errorId);