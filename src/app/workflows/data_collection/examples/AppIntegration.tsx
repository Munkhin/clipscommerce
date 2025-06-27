/**
 * Example of integrating the EnhancedScannerService into a Next.js application
 * 
 * This shows how to properly use the service in a real-world context with:
 * - React hooks for managing scanner state
 * - Error handling and loading states
 * - Clean integration with the UI layer
 * - Proper resource management
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ScannerServiceAdapter } from '../functions/ScannerServiceAdapter';
import type { Platform, ScanOptions, ScanStatus } from '../functions/types';

// Custom hook for managing scanner service
function useScannerService(userId: string) {
  const serviceRef = useRef<ScannerServiceAdapter | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize scanner service
  useEffect(() => {
    // Create scanner service instance
    const scannerService = new ScannerServiceAdapter();
    serviceRef.current = scannerService;
    
    // Function to initialize platforms
    const initPlatforms = async () => {
      try {
        // Get tokens from secure storage - in production, use a proper secret management system
        const tokens = [
          { platform: 'instagram' as Platform, accessToken: process.env.NEXT_PUBLIC_INSTAGRAM_TOKEN || '' },
          { platform: 'tiktok' as Platform, accessToken: process.env.NEXT_PUBLIC_TIKTOK_TOKEN || '' }
        ].filter(t => t.accessToken);
        
        if (tokens.length === 0) {
          throw new Error('No platform tokens available');
        }
        
        await scannerService.initializePlatforms(tokens);
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize scanner');
        console.error('Scanner initialization error:', err);
      }
    };
    
    // Initialize platforms
    initPlatforms();
    
    // Clean up on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy().catch(console.error);
      }
    };
  }, [userId]);
  
  return {
    scannerService: serviceRef.current,
    isInitialized,
    error
  };
}

// Custom hook for managing scan state
function useScanState(scannerService: ScannerServiceAdapter | null, userId: string) {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set up event listeners for scan lifecycle
  useEffect(() => {
    if (!scannerService) return;
    
    const handleScanCompleted = (scan: any) => {
      if (scan.userId === userId) {
        setScanResult(scan);
        setScanStatus('completed');
        setIsLoading(false);
      }
    };
    
    const handleScanFailed = (data: { scan: any; error: string }) => {
      if (data.scan.userId === userId) {
        setScanStatus('failed');
        setError(data.error);
        setIsLoading(false);
      }
    };
    
    // Subscribe to events
    scannerService.on('scan.completed', handleScanCompleted);
    scannerService.on('scan.failed', handleScanFailed);
    
    // Unsubscribe on cleanup
    return () => {
      scannerService.off('scan.completed', handleScanCompleted);
      scannerService.off('scan.failed', handleScanFailed);
    };
  }, [scannerService, userId]);
  
  // Function to start a new scan
  const startScan = async (options: ScanOptions) => {
    if (!scannerService) {
      setError('Scanner service not initialized');
      return;
    }
    
    try {
      setIsLoading(true);
      setScanStatus('pending');
      setError(null);
      
      // Start scan
      const scanId = await scannerService.startScan(userId, options);
      setActiveScanId(scanId);
      setScanStatus('in_progress');
      
      // Start polling for results
      pollScanResult(scanId);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      console.error('Scan error:', err);
    }
  };
  
  // Poll for scan results
  const pollScanResult = async (scanId: string) => {
    if (!scannerService) return;
    
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 30; // 1 minute max (30 * 2s)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      try {
        const result = await scannerService.getScan(scanId);
        
        if (!result) {
          continue;
        }
        
        if (result.status === 'completed') {
          setScanResult(result);
          setScanStatus('completed');
          setIsLoading(false);
          return;
        } else if (result.status === 'failed') {
          setScanStatus('failed');
          setError(result.error || 'Scan failed');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error polling scan result:', err);
      }
    }
    
    // If we reach here, polling timed out
    setError('Scan timed out');
    setIsLoading(false);
  };
  
  return {
    activeScanId,
    scanResult,
    scanStatus,
    isLoading,
    error,
    startScan
  };
}

// Main component for scanner functionality
export function SocialScanner({ userId }: { userId: string }) {
  // Use scanner service hook
  const { scannerService, isInitialized, error: initError } = useScannerService(userId);
  
  // Use scan state hook
  const {
    scanResult,
    scanStatus,
    isLoading,
    error: scanError,
    startScan
  } = useScanState(scannerService, userId);
  
  // Form state
  const [platforms, setPlatforms] = useState<Platform[]>(['INSTAGRAM' as any]);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [includeOwnPosts, setIncludeOwnPosts] = useState(true);
  const [timezone, setTimezone] = useState('America/New_York');
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isInitialized) {
      return;
    }
    
    startScan({
      platforms: platforms as [Platform, ...Platform[]],
      lookbackDays,
      includeOwnPosts,
      timezone
    });
  };
  
  // Handle platform selection
  const togglePlatform = (platform: Platform) => {
    setPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US');
  };
  
  return (
    <div className="social-scanner p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Social Media Scanner</h1>
      
      {/* Initialization Error */}
      {initError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Initialization Error</p>
          <p>{initError}</p>
        </div>
      )}
      
      {/* Scan Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Start New Scan</h2>
        
        {/* Platform Selection */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Platforms</label>
          <div className="flex flex-wrap gap-3">
            {['instagram', 'tiktok', 'youtube'].map((platform) => (
              <label key={platform} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={platforms.includes(platform as Platform)}
                  onChange={() => togglePlatform(platform as Platform)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                  disabled={isLoading}
                />
                <span className="ml-2 capitalize">{platform}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Lookback Days */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Lookback Period (days)
          </label>
          <input
            type="number"
            min="1"
            max="90"
            value={lookbackDays}
            onChange={(e) => setLookbackDays(parseInt(e.target.value) || 30)}
            className="form-input w-full rounded"
            disabled={isLoading}
          />
        </div>
        
        {/* Include Own Posts */}
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={includeOwnPosts}
              onChange={(e) => setIncludeOwnPosts(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
              disabled={isLoading}
            />
            <span className="ml-2">Include my own posts</span>
          </label>
        </div>
        
        {/* Timezone */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="form-select w-full rounded"
            disabled={isLoading}
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={!isInitialized || isLoading || platforms.length === 0}
        >
          {isLoading ? 'Scanning...' : 'Start Scan'}
        </button>
      </form>
      
      {/* Scan Error */}
      {scanError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Scan Error</p>
          <p>{scanError}</p>
        </div>
      )}
      
      {/* Scan Progress */}
      {isLoading && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Scan in Progress</h2>
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mr-3"></div>
            <p>Scanning social media data. This may take a minute...</p>
          </div>
        </div>
      )}
      
      {/* Scan Results */}
      {scanResult && scanStatus === 'completed' && (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Scan Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p>Completed at: {formatDate(scanResult.completedAt || Date.now())}</p>
              <p>Total Posts: {scanResult.metrics.totalPosts}</p>
              <p>Average Engagement: {scanResult.metrics.averageEngagement.toFixed(2)}%</p>
            </div>
            
            {/* Peak Times */}
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Peak Posting Times</h3>
              {scanResult.metrics.peakTimes.length > 0 ? (
                <ul>
                  {scanResult.metrics.peakTimes
                    .sort((a: any, b: any) => b.engagementScore - a.engagementScore)
                    .slice(0, 5)
                    .map((peak: any, index: number) => (
                      <li key={index} className="mb-1">
                        Hour {peak.hour}: {peak.engagementScore.toFixed(1)} engagement score
                      </li>
                    ))}
                </ul>
              ) : (
                <p>No peak times detected</p>
              )}
            </div>
          </div>
          
          {/* Top Posts */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">Top Performing Posts</h3>
            {scanResult.metrics.topPerformingPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanResult.metrics.topPerformingPosts.slice(0, 6).map((post: any) => (
                  <div key={post.id} className="border rounded overflow-hidden">
                    {post.metadata?.thumbnail && (
                      <img 
                        src={post.metadata.thumbnail} 
                        alt="Post thumbnail" 
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <div className="flex items-center mb-2">
                        <span className="capitalize font-semibold mr-2">{post.platform}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(post.timestamp).toLocaleDateString('en-US')}
                        </span>
                      </div>
                      <p className="text-sm truncate mb-2">{post.caption || 'No caption'}</p>
                      <div className="flex justify-between text-sm">
                        <span>Likes: {post.likes.toLocaleString()}</span>
                        <span>Engagement: {post.engagementRate.toFixed(1)}%</span>
                      </div>
                      <a 
                        href={post.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 text-sm block mt-2 hover:underline"
                      >
                        View post
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No posts available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
