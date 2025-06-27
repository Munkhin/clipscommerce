'use client';

import { useEffect } from 'react';

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
      <div className="max-w-2xl w-full p-8 rounded-xl bg-graphite-light/10 backdrop-blur-sm border border-mint/20">
        <h2 className="text-2xl font-bold text-mint mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'An unexpected error occurred. Please try again later.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-mint text-graphite rounded-md font-medium hover:bg-mint/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-mint/50 text-mint rounded-md font-medium hover:bg-mint/10 transition-colors text-center"
          >
            Go to Home
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 p-4 bg-black/20 rounded-md overflow-auto">
            <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
              Error details
            </summary>
            <pre className="mt-2 text-sm text-red-400 whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
