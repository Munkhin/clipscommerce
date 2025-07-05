import { useState, useEffect, useCallback, useRef } from 'react';

export interface ProcessingStatus {
  editId: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stage: string;
  progress: number;
  error?: string;
  operations: any[];
  editStatus: string;
  previewUrl?: string;
  outputUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  processingTimeSeconds?: number;
  stages: {
    stage: string;
    status: string;
    progress: number;
    message: string;
    timestamp: string;
  }[];
}

export interface UseVideoProcessingOptions {
  editId?: string;
  videoId?: string;
  pollInterval?: number;
  onStatusChange?: (status: ProcessingStatus) => void;
  onComplete?: (status: ProcessingStatus) => void;
  onError?: (error: string) => void;
}

export function useVideoProcessing(options: UseVideoProcessingOptions) {
  const {
    editId,
    videoId,
    pollInterval = 2000,
    onStatusChange,
    onComplete,
    onError
  } = options;

  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!editId && !videoId) return;

    try {
      const params = new URLSearchParams();
      if (editId) params.set('editId', editId);
      if (videoId) params.set('videoId', videoId);

      const response = await fetch(`/api/videos/processing-status?${params}`);
      const result = await response.json();

      if (result.success) {
        setStatus(result);
        setError(null);

        // Call status change callback
        if (onStatusChange) {
          onStatusChange(result);
        }

        // Check if status changed to completed
        if (result.status === 'completed' && lastStatusRef.current !== 'completed') {
          if (onComplete) {
            onComplete(result);
          }
          // Stop polling on completion
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }

        // Check if status changed to failed
        if (result.status === 'failed' && lastStatusRef.current !== 'failed') {
          if (onError) {
            onError(result.error || 'Processing failed');
          }
          // Stop polling on failure
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }

        lastStatusRef.current = result.status;
      } else {
        setError(result.error || 'Failed to fetch status');
        if (onError) {
          onError(result.error || 'Failed to fetch status');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [editId, videoId, onStatusChange, onComplete, onError]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial fetch
    fetchStatus();

    // Start polling
    intervalRef.current = setInterval(fetchStatus, pollInterval);
  }, [fetchStatus, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelProcessing = useCallback(async () => {
    if (!editId) return { success: false, error: 'No editId provided' };

    try {
      setIsLoading(true);
      const response = await fetch('/api/videos/processing-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editId,
          action: 'cancel'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh status after cancellation
        await fetchStatus();
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to cancel processing';
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [editId, fetchStatus]);

  const retryProcessing = useCallback(async () => {
    if (!editId) return { success: false, error: 'No editId provided' };

    try {
      setIsLoading(true);
      const response = await fetch('/api/videos/processing-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editId,
          action: 'retry'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Start polling again after retry
        startPolling();
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to retry processing';
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [editId, startPolling]);

  // Start polling when editId or videoId changes
  useEffect(() => {
    if (editId || videoId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [editId, videoId, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    isLoading,
    error,
    startPolling,
    stopPolling,
    cancelProcessing,
    retryProcessing,
    refetch: fetchStatus
  };
}

// Helper hook for multiple video processing jobs
export function useVideoProcessingQueue() {
  const [jobs, setJobs] = useState<Map<string, ProcessingStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const addJob = useCallback((editId: string, videoId?: string) => {
    const processing = useVideoProcessing({
      editId,
      videoId,
      onStatusChange: (status) => {
        setJobs(prev => new Map(prev.set(editId, status)));
      },
      onComplete: (status) => {
        setJobs(prev => new Map(prev.set(editId, status)));
      },
      onError: (error) => {
        console.error(`Processing error for ${editId}:`, error);
      }
    });

    return processing;
  }, []);

  const removeJob = useCallback((editId: string) => {
    setJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.delete(editId);
      return newJobs;
    });
  }, []);

  const getJob = useCallback((editId: string) => {
    return jobs.get(editId);
  }, [jobs]);

  const getAllJobs = useCallback(() => {
    return Array.from(jobs.values());
  }, [jobs]);

  const getActiveJobs = useCallback(() => {
    return Array.from(jobs.values()).filter(job => 
      job.status === 'queued' || job.status === 'processing'
    );
  }, [jobs]);

  const getCompletedJobs = useCallback(() => {
    return Array.from(jobs.values()).filter(job => 
      job.status === 'completed'
    );
  }, [jobs]);

  const getFailedJobs = useCallback(() => {
    return Array.from(jobs.values()).filter(job => 
      job.status === 'failed'
    );
  }, [jobs]);

  return {
    jobs: Array.from(jobs.values()),
    isLoading,
    addJob,
    removeJob,
    getJob,
    getAllJobs,
    getActiveJobs,
    getCompletedJobs,
    getFailedJobs
  };
}