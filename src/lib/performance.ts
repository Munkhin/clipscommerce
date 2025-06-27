'use client';

import React from 'react';

/**
 * Performance Utility Library
 * Provides functions for optimizing large datasets and monitoring performance
 */

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  bundleSize: number;
  timestamp: number;
}

export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  threshold: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Start performance monitoring for a specific component
   */
  startMonitoring(componentName: string): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name.includes(componentName)) {
          this.recordMetric({
            renderTime: entry.duration,
            memoryUsage: this.getMemoryUsage(),
            componentCount: this.getComponentCount(),
            bundleSize: this.getBundleSize(),
            timestamp: Date.now()
          });
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    this.observers.set(componentName, observer);
  }

  /**
   * Stop monitoring a specific component
   */
  stopMonitoring(componentName: string): void {
    const observer = this.observers.get(componentName);
    if (observer) {
      observer.disconnect();
      this.observers.delete(componentName);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      return (window.performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get approximate component count
   */
  private getComponentCount(): number {
    if (typeof document !== 'undefined') {
      return document.querySelectorAll('[data-reactroot], [data-react-component]').length;
    }
    return 0;
  }

  /**
   * Get approximate bundle size
   */
  private getBundleSize(): number {
    if (typeof window !== 'undefined' && window.performance) {
      const resources = window.performance.getEntriesByType('resource');
      return resources
        .filter(resource => resource.name.includes('.js'))
        .reduce((total, resource) => total + (resource as any).transferSize || 0, 0);
    }
    return 0;
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const latestMetric = this.metrics[this.metrics.length - 1];

    if (!latestMetric) return recommendations;

    if (latestMetric.renderTime > 16) {
      recommendations.push('Render time exceeds 16ms. Consider optimizing component rendering.');
    }

    if (latestMetric.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High memory usage detected. Consider implementing virtualization.');
    }

    if (latestMetric.componentCount > 1000) {
      recommendations.push('High component count. Consider lazy loading and code splitting.');
    }

    if (latestMetric.bundleSize > 1024 * 1024) { // 1MB
      recommendations.push('Large bundle size. Consider code splitting and tree shaking.');
    }

    return recommendations;
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary() {
    if (this.metrics.length === 0) {
      return null;
    }

    const avgRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length;
    const avgMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length;
    const maxRenderTime = Math.max(...this.metrics.map(m => m.renderTime));
    const maxMemoryUsage = Math.max(...this.metrics.map(m => m.memoryUsage));

    return {
      avgRenderTime,
      avgMemoryUsage,
      maxRenderTime,
      maxMemoryUsage,
      sampleCount: this.metrics.length
    };
  }
}

/**
 * Virtual scrolling utilities
 */
export class VirtualScrollHelper {
  static calculateVisibleRange(
    scrollTop: number,
    config: VirtualizationConfig,
    totalItems: number
  ) {
    const { itemHeight, containerHeight, overscan } = config;
    
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);
    
    return { startIndex, endIndex, visibleCount };
  }

  static getItemStyle(index: number, itemHeight: number) {
    return {
      position: 'absolute' as const,
      top: index * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight
    };
  }

  static shouldVirtualize(itemCount: number, threshold: number = 100): boolean {
    return itemCount > threshold;
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static cleanupTasks: (() => void)[] = [];

  static addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  static runCleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
  }

  static forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }

  static getMemoryInfo() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  static optimizeForLargeDatasets<T>(data: T[], chunkSize: number = 1000): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * Component performance utilities
 */
export class ComponentOptimizer {
  static measureRenderTime<T extends (...args: any[]) => any>(
    fn: T,
    componentName: string
  ): T {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      console.log(`[Performance] ${componentName} render time: ${end - start}ms`);
      
      return result;
    }) as T;
  }

  static createMemoizedComponent<P extends object>(
    Component: any,
    areEqual?: (prevProps: P, nextProps: P) => boolean
  ) {
    // This would require React to be imported in the consuming component
    // Return the component as-is for now
    return Component;
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
}

/**
 * Load testing utilities
 */
export class LoadTester {
  static async simulateLoad(
    testFunction: () => Promise<void>,
    concurrentUsers: number,
    duration: number
  ): Promise<{ 
    totalRequests: number; 
    successfulRequests: number; 
    failedRequests: number; 
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    const results: { success: boolean; responseTime: number }[] = [];
    const startTime = Date.now();
    
    const runTest = async (): Promise<{ success: boolean; responseTime: number }> => {
      const testStart = Date.now();
      try {
        await testFunction();
        return { success: true, responseTime: Date.now() - testStart };
      } catch (error) {
        return { success: false, responseTime: Date.now() - testStart };
      }
    };

    // Run concurrent tests
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(
        (async () => {
          while (Date.now() - startTime < duration) {
            const result = await runTest();
            results.push(result);
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        })()
      );
    }

    await Promise.all(promises);

    // Calculate statistics
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const responseTimes = results.map(r => r.responseTime);
    
    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes)
    };
  }

  static async stressTestComponent(
    renderFunction: () => void,
    iterations: number = 1000
  ): Promise<{
    averageRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    totalTime: number;
  }> {
    const renderTimes: number[] = [];
    const totalStart = performance.now();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFunction();
      const end = performance.now();
      renderTimes.push(end - start);
    }

    const totalTime = performance.now() - totalStart;

    return {
      averageRenderTime: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      totalTime
    };
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance(); 