'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

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

// Throttle hook for scroll and resize events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
      
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
      
      throttleRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallRef.current));
    }) as T,
    [callback, delay]
  );
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, IntersectionObserverEntry | null] {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [element, setElement] = useState<Element | null>(null);

  const ref = useCallback((node: Element | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, options.threshold, options.rootMargin]);

  return [ref, entry];
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  useEffect(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length - 1
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // ~60fps

  const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  };
}

// Memory usage monitoring hook
export function useMemoryMonitoring(interval: number = 30000) {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    const checkMemory = () => {
      const memory = (performance as any).memory;
      setMemoryInfo({
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      });
    };

    checkMemory();
    const intervalId = setInterval(checkMemory, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return memoryInfo;
}

// Image preloading hook
export function useImagePreloader(imageSources: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(src));
          resolve();
        };
        img.onerror = () => {
          setFailedImages(prev => new Set(prev).add(src));
          reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
      });
    };

    const preloadAll = async () => {
      const promises = imageSources.map(src => 
        preloadImage(src).catch(() => {}) // Ignore individual failures
      );
      await Promise.allSettled(promises);
    };

    if (imageSources.length > 0) {
      preloadAll();
    }
  }, [imageSources]);

  return {
    loadedImages,
    failedImages,
    isLoaded: (src: string) => loadedImages.has(src),
    hasFailed: (src: string) => failedImages.has(src),
  };
}

// Performance timing hook
export function usePerformanceTiming(name: string) {
  const startTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (startTimeRef.current !== null) {
      const duration = performance.now() - startTimeRef.current;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      
      // Mark performance in browser dev tools
      if (typeof performance.mark === 'function') {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
      
      startTimeRef.current = null;
      return duration;
    }
    return 0;
  }, [name]);

  useEffect(() => {
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
    start();

    return () => {
      end();
    };
  }, [name, start, end]);

  return { start, end };
}

// Idle callback hook for non-critical tasks
export function useIdleCallback(
  callback: () => void,
  dependencies: React.DependencyList = []
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scheduleCallback = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: 5000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(callback, 1);
      }
    };

    scheduleCallback();
  }, dependencies);
}

// Bundle size analyzer hook
export function useBundleAnalysis() {
  const [bundleInfo, setBundleInfo] = useState<{
    scripts: number;
    stylesheets: number;
    totalSize: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const analyzeBundles = () => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      // Estimate total size (this is approximate)
      let totalSize = 0;
             scripts.forEach((script) => {
         const scriptElement = script as HTMLScriptElement;
         if (scriptElement.src && scriptElement.src.includes('_next/static')) {
           // Rough estimation based on typical Next.js bundle sizes
           totalSize += 100; // KB estimate
         }
       });

      setBundleInfo({
        scripts: scripts.length,
        stylesheets: stylesheets.length,
        totalSize,
      });
    };

    // Analyze after page load
    if (document.readyState === 'complete') {
      analyzeBundles();
    } else {
      window.addEventListener('load', analyzeBundles);
      return () => window.removeEventListener('load', analyzeBundles);
    }
  }, []);

  return bundleInfo;
}

interface UsePerformanceOptimizationOptions {
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  debounceMs?: number;
}

interface VirtualScrollData {
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
  totalHeight: number;
  offsetY: number;
}

export function usePerformanceOptimization<T>(
  items: T[],
  options: UsePerformanceOptimizationOptions = {}
) {
  const {
    itemHeight = 60,
    containerHeight = 400,
    overscan = 5,
    debounceMs = 16
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate visible range
  const virtualData = useMemo((): VirtualScrollData => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  // Debounced scroll handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, debounceMs);
  }, [debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Memory optimization: chunk large datasets
  const getChunkedData = useCallback((chunkSize: number = 1000) => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }, [items]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    return {
      totalItems: items.length,
      visibleItems: virtualData.visibleItems.length,
      renderRatio: virtualData.visibleItems.length / items.length,
      memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
      isOptimized: items.length > 100
    };
  }, [items.length, virtualData.visibleItems.length]);

  return {
    virtualData,
    handleScroll,
    isScrolling,
    getChunkedData,
    performanceMetrics,
    // Helper functions
    scrollToIndex: (index: number) => {
      const newScrollTop = index * itemHeight;
      setScrollTop(newScrollTop);
    },
    scrollToTop: () => setScrollTop(0),
    scrollToBottom: () => setScrollTop(items.length * itemHeight)
  };
}

// Hook for managing large datasets with pagination
export function usePaginatedData<T>(
  data: T[],
  pageSize: number = 50
) {
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0]));

  const totalPages = Math.ceil(data.length / pageSize);

  const currentPageData = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  const loadPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      setLoadedPages(prev => new Set([...prev, page]));
    }
  }, [totalPages]);

  const loadNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      loadPage(currentPage + 1);
    }
  }, [currentPage, totalPages, loadPage]);

  const loadPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      loadPage(currentPage - 1);
    }
  }, [currentPage, loadPage]);

  // Preload adjacent pages for smoother experience
  useEffect(() => {
    const preloadPages = [currentPage - 1, currentPage + 1].filter(
      page => page >= 0 && page < totalPages && !loadedPages.has(page)
    );

    preloadPages.forEach(page => {
      setLoadedPages(prev => new Set([...prev, page]));
    });
  }, [currentPage, totalPages, loadedPages]);

  return {
    currentPage,
    currentPageData,
    totalPages,
    loadedPages,
    loadPage,
    loadNextPage,
    loadPreviousPage,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    isFirstPage: currentPage === 0,
    isLastPage: currentPage === totalPages - 1
  };
}

// Hook for debouncing search/filter operations
export function useDebouncedSearch<T>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  debounceMs: number = 300
) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Filter data based on debounced search term
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    return data.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        return value && 
               typeof value === 'string' && 
               value.toLowerCase().includes(searchLower);
      })
    );
  }, [data, debouncedSearchTerm, searchFields]);

  return {
    filteredData,
    isSearching,
    debouncedSearchTerm
  };
}

// Hook for monitoring component performance
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const [performanceData, setPerformanceData] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0
  });

  useEffect(() => {
    renderCountRef.current += 1;
    const currentTime = Date.now();
    const renderTime = currentTime - lastRenderTimeRef.current;
    lastRenderTimeRef.current = currentTime;

    setPerformanceData(prev => {
      const newTotalTime = prev.totalRenderTime + renderTime;
      return {
        renderCount: renderCountRef.current,
        averageRenderTime: newTotalTime / renderCountRef.current,
        lastRenderTime: renderTime,
        totalRenderTime: newTotalTime
      };
    });

    // Log performance data in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        renderCount: renderCountRef.current,
        renderTime,
        averageRenderTime: performanceData.averageRenderTime
      });
    }
  });

  return performanceData;
}

// Combined performance optimization hook
export function useCombinedPerformanceOptimization() {
  const memoryInfo = useMemoryMonitoring();
  const bundleInfo = useBundleAnalysis();

  // Cleanup function for memory optimization
  const cleanup = useCallback(() => {
    // Force garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }, []);

  // Performance recommendations
  const recommendations = useCallback(() => {
    const recs: string[] = [];

    if (memoryInfo && memoryInfo.used / memoryInfo.limit > 0.8) {
      recs.push('High memory usage detected. Consider lazy loading more components.');
    }

    if (bundleInfo && bundleInfo.scripts > 10) {
      recs.push('Many script files loaded. Consider bundle splitting optimization.');
    }

    return recs;
  }, [memoryInfo, bundleInfo]);

  return {
    memoryInfo,
    bundleInfo,
    cleanup,
    recommendations: recommendations(),
  };
} 