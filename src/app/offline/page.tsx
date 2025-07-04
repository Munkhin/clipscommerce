'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  if (isOnline) {
    // Redirect to home if back online
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-[#8B5CF6] flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded" style={{ filter: 'invert(1)' }} />
            </div>
            <span className="text-white text-2xl font-bold">ClipsCommerce</span>
          </div>
        </div>

        {/* Offline Status */}
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            {isOnline ? (
              <Wifi className="h-8 w-8 text-green-400" />
            ) : (
              <WifiOff className="h-8 w-8 text-red-400" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
          </h1>
          
          <p className="text-gray-400 mb-6">
            {isOnline 
              ? 'Your internet connection has been restored. Redirecting...'
              : 'Please check your internet connection and try again.'
            }
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            disabled={isOnline}
            className="w-full flex items-center justify-center px-6 py-3 bg-[#8B5CF6] text-white rounded-lg font-medium hover:bg-[#8B5CF6]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again {retryCount > 0 && `(${retryCount})`}
          </button>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 border border-gray-600 text-white rounded-lg font-medium hover:bg-gray-800 transition-all min-h-[44px] flex items-center justify-center"
          >
            Go to Homepage
          </Link>
        </div>

        {/* Cached Content Available */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-white mb-2">Available Offline</h3>
          <div className="space-y-1 text-xs text-gray-400">
            <div>• Homepage and landing pages</div>
            <div>• Pricing information</div>
            <div>• Sign in and sign up forms</div>
            <div>• Terms of service</div>
          </div>
        </div>

        {/* Network Status Indicator */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </div>
  );
}