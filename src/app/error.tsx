'use client';

import { useEffect } from 'react';
import { BouncingButton } from '@/components/ui/bouncing-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({ 
  error, 
  reset, 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void; 
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-graphite to-graphite-dark text-white">
      <AnimatedCard className="w-full max-w-lg bg-graphite-light/10 backdrop-blur-sm border-red-500/30">
        <CardHeader className="text-center">
          <div className="mx-auto bg-red-500/10 p-4 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mt-4">Something went wrong!</CardTitle>
          <CardDescription className="text-muted-foreground">
            {error.message || 'An unexpected error occurred. Please try again later.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-4 bg-black/20 rounded-md overflow-auto">
              <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 text-sm text-red-400 whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
          <BouncingButton onClick={() => reset()} className="bg-mint text-graphite hover:bg-mint/90">
            Try again
          </BouncingButton>
          <BouncingButton asChild variant="outline" className="border-mint/50 text-mint hover:bg-mint/10 hover:text-mint">
            <a href="/">
              Go to Home
            </a>
          </BouncingButton>
        </CardFooter>
      </AnimatedCard>
    </div>
  );
}

