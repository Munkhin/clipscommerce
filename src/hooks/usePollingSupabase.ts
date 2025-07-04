import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isFeatureEnabled } from '@/lib/utils/featureFlags';

interface PollingOptions {
  interval?: number; // Polling interval in milliseconds (default: 15000)
  enabled?: boolean; // Whether polling is enabled (default: true)
  immediate?: boolean; // Whether to fetch immediately on mount (default: true)
}

interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

/**
 * usePollingSupabase - A hook for polling Supabase data as a fallback to realtime channels
 * @param tableName - The table to poll
 * @param query - Query function that returns a Supabase query
 * @param options - Polling configuration options
 */
export function usePollingSupabase<T = any>(
  tableName: string,
  query: (supabase: ReturnType<typeof createClient>) => Promise<{ data: T | null; error: any }>,
  options: PollingOptions = {}
) {
  const {
    interval = 15000, // 15 seconds default
    enabled = true,
    immediate = true
  } = options;

  const [state, setState] = useState<PollingState<T>>({
    data: null,
    loading: immediate,
    error: null,
    lastFetch: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await query(supabaseRef.current);
      
      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error.message || 'An error occurred',
          lastFetch: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          data: result.data,
          loading: false,
          error: null,
          lastFetch: new Date()
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        lastFetch: new Date()
      }));
    }
  }, [query]);

  const startPolling = useCallback(() => {
    if (!enabled) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new polling interval
    intervalRef.current = setInterval(fetchData, interval);
  }, [fetchData, interval, enabled]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Check if realtime updates are disabled via feature flag
  const usePolling = !isFeatureEnabled('REALTIME_UPDATES');

  useEffect(() => {
    if (!usePolling || !enabled) {
      stopPolling();
      return;
    }

    // Immediate fetch if enabled
    if (immediate) {
      fetchData();
    }

    // Start polling
    startPolling();

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [usePolling, enabled, immediate, startPolling, stopPolling, fetchData]);

  // Pause polling when tab is not visible to save resources
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (usePolling && enabled) {
        // Immediately fetch when tab becomes visible
        fetchData();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [usePolling, enabled, startPolling, stopPolling, fetchData]);

  return {
    ...state,
    refetch,
    startPolling,
    stopPolling,
    isPolling: intervalRef.current !== null
  };
}

/**
 * usePollingSupabaseTable - A simplified version for polling a specific table
 */
export function usePollingSupabaseTable<T = any>(
  tableName: string,
  filters?: Record<string, any>,
  options: PollingOptions = {}
) {
  const query = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    let queryBuilder = supabase.from(tableName).select('*');
    
    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryBuilder = queryBuilder.eq(key, value);
        }
      });
    }
    
    return await queryBuilder;
  }, [tableName, filters]);

  return usePollingSupabase<T[]>(tableName, query, options);
}

/**
 * usePollingSupabaseCount - Poll for count of records in a table
 */
export function usePollingSupabaseCount(
  tableName: string,
  filters?: Record<string, any>,
  options: PollingOptions = {}
) {
  const query = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    let queryBuilder = supabase.from(tableName).select('*', { count: 'exact', head: true });
    
    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryBuilder = queryBuilder.eq(key, value);
        }
      });
    }
    
    const result = await queryBuilder;
    return {
      data: result.count,
      error: result.error
    };
  }, [tableName, filters]);

  return usePollingSupabase<number>(tableName, query, options);
}

/**
 * Higher-order function for wrapping components with polling functionality
 * Note: This returns the hook data, not a React component. Use it in your component.
 */
export function withPolling<P extends object>(
  tableName: string,
  options: PollingOptions = {}
) {
  return function usePollingForComponent(pollingQuery?: any) {
    return usePollingSupabase(
      tableName,
      pollingQuery || (() => Promise.resolve({ data: null, error: null })),
      options
    );
  };
}