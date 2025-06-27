import React, { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Debounce hook for search and filter operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for scroll events and rapid UI updates
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Intersection Observer hook for infinite scrolling
 */
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): IntersectionObserverEntry | null {
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [targetRef, options.threshold, options.rootMargin]);

  return entry;
}

/**
 * Virtualization helper for large client lists
 */
export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
}

export function useVirtualization(
  items: any[],
  config: VirtualizationConfig,
  scrollTop: number = 0
) {
  return useMemo(() => {
    const { itemHeight, containerHeight, overscan } = config;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0,
      },
    }));

    return {
      visibleItems,
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex,
    };
  }, [items, config, scrollTop]);
}

/**
 * Performance-optimized search hook
 */
export function useOptimizedSearch<T>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[],
  delay: number = 300
) {
  const debouncedQuery = useDebounce(searchQuery, delay);

  return useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const query = debouncedQuery.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === 'number') {
          return value.toString().includes(query);
        }
        return false;
      })
    );
  }, [items, debouncedQuery, searchFields]);
}

/**
 * Optimized bulk operations handler
 */
export function useBulkOperations<T extends { id: string }>(
  items: T[],
  onUpdate: (updates: { [id: string]: Partial<T> }) => Promise<void>
) {
  const pendingUpdates = useRef<{ [id: string]: Partial<T> }>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const queueUpdate = useCallback((id: string, update: Partial<T>) => {
    pendingUpdates.current[id] = {
      ...pendingUpdates.current[id],
      ...update,
    };

    // Batch updates to avoid too many API calls
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      const updates = { ...pendingUpdates.current };
      pendingUpdates.current = {};

      try {
        await onUpdate(updates);
      } catch (error) {
        console.error('Bulk update failed:', error);
        // Re-queue failed updates
        Object.assign(pendingUpdates.current, updates);
      }
    }, 1000);
  }, [onUpdate]);

  const flushUpdates = useCallback(async () => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    const updates = { ...pendingUpdates.current };
    pendingUpdates.current = {};

    if (Object.keys(updates).length > 0) {
      await onUpdate(updates);
    }
  }, [onUpdate]);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return { queueUpdate, flushUpdates };
}

/**
 * Memory-efficient data caching
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
         } else if (this.cache.size >= this.maxSize) {
       // Remove least recently used
       const firstKey = this.cache.keys().next().value;
       if (firstKey !== undefined) {
         this.cache.delete(firstKey);
       }
     }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTiming(operation: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(operation: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getAllMetrics(): Record<string, ReturnType<PerformanceMonitor['getMetrics']>> {
    const result: Record<string, ReturnType<PerformanceMonitor['getMetrics']>> = {};
    
    for (const [operation] of this.metrics) {
      result[operation] = this.getMetrics(operation);
    }
    
    return result;
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(operation: string) {
  const startTiming = useCallback(() => {
    return performanceMonitor.startTiming(operation);
  }, [operation]);

  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics(operation);
  }, [operation]);

  return { startTiming, getMetrics };
}

/**
 * Optimized component update checker
 */
export function useShallowCompare<T extends Record<string, any>>(obj: T): T {
  const ref = useRef<T>(obj);
  
  const isEqual = useMemo(() => {
    const keys = Object.keys(obj);
    const prevKeys = Object.keys(ref.current);
    
    if (keys.length !== prevKeys.length) return false;
    
    return keys.every(key => obj[key] === ref.current[key]);
  }, [obj]);

  if (!isEqual) {
    ref.current = obj;
  }

  return ref.current;
}

/**
 * Error boundary performance helper
 */
export function capturePerformanceError(error: Error, context: string): void {
  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    memory: typeof performance !== 'undefined' && 'memory' in performance 
      ? (performance as any).memory 
      : null,
  };

  console.error('Performance Error:', errorData);
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
  }
} 