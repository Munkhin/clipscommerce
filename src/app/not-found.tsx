'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BouncingButton } from '@/components/ui/bouncing-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { SearchX, Copy, Check } from 'lucide-react';
import { reportError, ErrorCategory, ErrorSeverity } from '@/lib/errors';

export default function NotFound() {
  const pathname = usePathname();
  const [correlationId, setCorrelationId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Extract correlation ID from response headers if available
    const fetchCorrelationId = async () => {
      if (typeof window === 'undefined') return; // Ensure this runs only on the client
      try {
        // Try to get correlation ID from the current response headers
        const response = await fetch(window.location.href, { method: 'HEAD' });
        const headerCorrelationId = response.headers.get('x-correlation-id') || 
                                  response.headers.get('x-request-id') || 
                                  `404_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCorrelationId(headerCorrelationId);
      } catch (error) {
        // Fallback correlation ID if we can't get it from headers
        const fallbackId = `404_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCorrelationId(fallbackId);
      }
    };

    fetchCorrelationId();

    // Report 404 error for tracking
    reportError(new Error(`Page not found: ${pathname}`), {
      category: ErrorCategory.NAVIGATION,
      severity: ErrorSeverity.NORMAL,
      component: 'NotFound',
      action: 'page_not_found',
      additionalContext: {
        pathname,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      },
    });
  }, [pathname]);

  const handleCopyCorrelationId = async () => {
    try {
      await navigator.clipboard.writeText(correlationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy correlation ID:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-graphite to-graphite-dark text-white">
      <AnimatedCard className="w-full max-w-md bg-graphite-light/10 backdrop-blur-sm border-mint/20 text-center">
        <CardHeader>
          <div className="mx-auto bg-mint/10 p-4 rounded-full">
            <SearchX className="w-16 h-16 text-mint" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mt-4">Page Not Found</CardTitle>
          <CardDescription className="text-muted-foreground">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-9xl font-bold text-mint">404</p>
          
          {/* Failed Path Information */}
          <div className="text-left bg-graphite-light/20 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Failed Path:</p>
            <p className="text-sm font-mono text-mint break-all">{pathname}</p>
          </div>
          
          {/* Correlation ID for support */}
          {correlationId && (
            <div className="text-left bg-graphite-light/20 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Reference ID:</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-mint flex-1 break-all">{correlationId}</p>
                <button
                  onClick={handleCopyCorrelationId}
                  className="text-mint hover:text-mint/80 transition-colors"
                  title="Copy Reference ID"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
          <BouncingButton asChild className="bg-mint text-graphite hover:bg-mint/90">
            <Link href="/">
              Go to Homepage
            </Link>
          </BouncingButton>
          <BouncingButton asChild variant="outline" className="border-mint/50 text-mint hover:bg-mint/10 hover:text-mint">
            <Link href="/contact">
              Contact Support
            </Link>
          </BouncingButton>
        </CardFooter>
      </AnimatedCard>
    </div>
  );
}
