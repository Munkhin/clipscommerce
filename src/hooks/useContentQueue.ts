import { useState, useEffect, useCallback } from 'react';
import { Platform } from '@/types/platform';
import { QueueItem } from '@/types/schedule';

interface UseContentQueueProps {
  platforms?: Platform[];
  status?: string[];
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export function useContentQueue({
  platforms = [],
  status = ['pending', 'scheduled'],
  limit = 50,
  autoRefresh = true,
  refreshInterval = 60, // 1 minute
}: UseContentQueueProps = {}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, you would fetch the queue from your API
      // const response = await api.getQueueItems({ platforms, status, limit });
      // Mock data for now
      const mockQueue: QueueItem[] = [];
      
      setQueue(mockQueue);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch queue'));
    } finally {
      setIsLoading(false);
    }
  }, [platforms, status, limit]);

  // Initial fetch
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Set up refresh interval if autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      fetchQueue();
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchQueue, autoRefresh, refreshInterval]);

  const addToQueue = useCallback(async (postId: string, platform: Platform, scheduledFor: Date) => {
    try {
      // In a real app, you would call your API to add to queue
      // const newItem = await api.addToQueue(postId, platform, scheduledFor);
      const newItem: QueueItem = {
        id: `mock-${Date.now()}`,
        postId,
        platform,
        scheduledFor,
        status: 'scheduled',
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setQueue(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      console.error('Error adding to queue:', err);
      throw err;
    }
  }, []);

  const removeFromQueue = useCallback(async (queueItemId: string) => {
    try {
      // In a real app, you would call your API to remove from queue
      // await api.removeFromQueue(queueItemId);
      setQueue(prev => prev.filter(item => item.id !== queueItemId));
      return true;
    } catch (err) {
      console.error('Error removing from queue:', err);
      throw err;
    }
  }, []);

  const updateQueueItem = useCallback(async (queueItemId: string, updates: Partial<QueueItem>) => {
    try {
      // In a real app, you would call your API to update the queue item
      // const updatedItem = await api.updateQueueItem(queueItemId, updates);
      setQueue(prev => 
        prev.map(item => 
          item.id === queueItemId 
            ? { ...item, ...updates, updatedAt: new Date() } 
            : item
        )
      );
      return true;
    } catch (err) {
      console.error('Error updating queue item:', err);
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchQueue();
  }, [fetchQueue]);

  return {
    queue,
    isLoading,
    error,
    lastUpdated,
    addToQueue,
    removeFromQueue,
    updateQueueItem,
    refresh,
  };
}
