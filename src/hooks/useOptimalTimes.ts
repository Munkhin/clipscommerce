import { useState, useEffect, useCallback } from 'react';
import { Platform } from '@/types/platform';
import { Scheduler, OptimalTimeWindow } from '@/lib/ai/scheduling';

interface HistoricalEngagementData {
  date: string;
  engagementScore: number;
}

interface UseOptimalTimesProps {
  platform: Platform;
  timezone?: string;
  refreshInterval?: number; // in minutes
}

export function useOptimalTimes({
  platform,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  refreshInterval = 60, // 1 hour
}: UseOptimalTimesProps) {
  const [optimalTimes, setOptimalTimes] = useState<OptimalTimeWindow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOptimalTimes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, you would fetch historical data from your API
      // const historicalData = await api.getHistoricalEngagement(platform);
      const historicalData: HistoricalEngagementData[] = []; // Mock data for now
      
      const times = await Scheduler.calculateOptimalTimes(
        platform,
        historicalData,
        timezone
      );
      
      setOptimalTimes(times);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching optimal times:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch optimal times'));
    } finally {
      setIsLoading(false);
    }
  }, [platform, timezone]);

  // Initial fetch
  useEffect(() => {
    fetchOptimalTimes();
  }, [fetchOptimalTimes]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      fetchOptimalTimes();
    }, refreshInterval * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchOptimalTimes, refreshInterval]);

  const refresh = useCallback(() => {
    return fetchOptimalTimes();
  }, [fetchOptimalTimes]);

  return {
    optimalTimes,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}

// Hook for getting the next best time to post
export function useNextBestTime(platform: Platform) {
  const { optimalTimes, ...rest } = useOptimalTimes({ platform });
  
  const nextBestTime = optimalTimes.length > 0 
    ? optimalTimes[0].startTime 
    : null;
    
  return {
    nextBestTime,
    ...rest,
  };
}
