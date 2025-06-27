'use client';

import { useState, useRef, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { useIntersectionObserver } from '@/hooks/usePerformanceOptimization';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  showLoadingSpinner?: boolean;
  enableProgressiveLoading?: boolean;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  showLoadingSpinner = true,
  enableProgressiveLoading = true,
  onLoadComplete,
  onLoadError,
  className,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const loadStartTime = useRef<number>(0);

  // Intersection observer for lazy loading
  const [ref, entry] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Trigger loading when image enters viewport
  useEffect(() => {
    if (entry?.isIntersecting && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [entry?.isIntersecting, shouldLoad]);

  // Handle image load success
  const handleLoad = () => {
    const loadTime = performance.now() - loadStartTime.current;
    console.log(`[Image Load] ${alt}: ${loadTime.toFixed(2)}ms`);
    
    setIsLoading(false);
    setHasError(false);
    onLoadComplete?.();
  };

  // Handle image load error
  const handleError = () => {
    console.warn(`[Image Error] Failed to load: ${currentSrc}`);
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback image if available
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      setHasError(false);
    } else {
      onLoadError?.(new Error(`Failed to load image: ${currentSrc}`));
    }
  };

  // Start timing when loading begins
  useEffect(() => {
    if (shouldLoad && isLoading) {
      loadStartTime.current = performance.now();
    }
  }, [shouldLoad, isLoading]);

  // Progressive loading with low-quality placeholder
  const getBlurDataURL = (width: number = 10, height: number = 10) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a simple gradient as placeholder
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    return canvas.toDataURL();
  };

  // Render loading skeleton
  const LoadingSkeleton = () => (
    <div 
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
        "flex items-center justify-center",
        className
      )}
      style={{ 
        width: props.width || '100%', 
        height: props.height || '200px' 
      }}
    >
      {showLoadingSpinner && (
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );

  // Render error state
  const ErrorState = () => (
    <div 
      className={cn(
        "bg-gray-100 border-2 border-dashed border-gray-300",
        "flex flex-col items-center justify-center text-gray-500",
        className
      )}
      style={{ 
        width: props.width || '100%', 
        height: props.height || '200px' 
      }}
    >
      <svg 
        className="w-12 h-12 mb-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
        />
      </svg>
      <span className="text-sm">Failed to load image</span>
    </div>
  );

  // Don't render anything until we should load (for non-priority images)
  if (!shouldLoad && !priority) {
    return (
      <div 
        ref={ref}
        className={cn("bg-gray-100", className)}
        style={{ 
          width: props.width || '100%', 
          height: props.height || '200px' 
        }}
      />
    );
  }

  // Show error state
  if (hasError && !fallbackSrc) {
    return <ErrorState />;
  }

  // Show loading state
  if (isLoading && showLoadingSpinner) {
    return <LoadingSkeleton />;
  }

  return (
    <div ref={ref} className="relative">
      <Image
        src={currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        quality={85}
        placeholder={enableProgressiveLoading ? 'blur' : 'empty'}
        blurDataURL={enableProgressiveLoading ? getBlurDataURL() : undefined}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {showLoadingSpinner && (
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
} 