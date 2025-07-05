'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize analytics on mount with error handling
    try {
      analytics.initialize();
    } catch (error) {
      console.error('[AnalyticsProvider] Failed to initialize analytics:', error);
      // Don't break the app if analytics fails
    }
  }, []);

  useEffect(() => {
    // Track page views on route changes with error handling
    if (pathname) {
      try {
        analytics.trackPageView(pathname);
      } catch (error) {
        console.error('[AnalyticsProvider] Failed to track page view:', error);
        // Don't break the app if page view tracking fails
      }
    }
  }, [pathname]);

  return <>{children}</>;
}