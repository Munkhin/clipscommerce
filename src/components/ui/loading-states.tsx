import React from 'react';
import { Loader2, Sparkles, Upload, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading States Components
 * Provides consistent loading indicators throughout the application
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function LoadingSpinner({ size = 'md', className, children }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status" aria-label="Loading">
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {children && <span className="text-sm text-muted-foreground">{children}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface ProcessingIndicatorProps {
  type?: 'ai' | 'upload' | 'optimization';
  className?: string;
  children?: React.ReactNode;
}

export function ProcessingIndicator({ type = 'ai', className, children }: ProcessingIndicatorProps) {
  const icons = {
    ai: Sparkles,
    upload: Upload,
    optimization: Zap
  };

  const Icon = icons[type];

  return (
    <div 
      className={cn('flex items-center justify-center gap-3 p-4 rounded-lg bg-primary/10', className)}
      role="status"
      aria-label={`${type} processing`}
    >
      <Icon className="h-6 w-6 text-primary animate-pulse" />
      <div className="text-center">
        {children || (
          <div>
            <p className="font-medium text-primary">Processing...</p>
            <p className="text-sm text-muted-foreground">Please wait while we work on your request</p>
          </div>
        )}
      </div>
      <span className="sr-only">{type} processing in progress</span>
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
  className?: string;
  showAvatar?: boolean;
}

export function CardSkeleton({ count = 1, className, showAvatar = false }: CardSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          {showAvatar && (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading content cards</span>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading table data">
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 bg-muted/50 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-border/50">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading table data</span>
    </div>
  );
}

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading dashboard">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <CardSkeleton count={3} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      
      <span className="sr-only">Loading dashboard content</span>
    </div>
  );
}

interface VideoProcessingSkeletonProps {
  className?: string;
}

export function VideoProcessingSkeleton({ className }: VideoProcessingSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading video processing interface">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-muted rounded-lg p-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
      
      {/* Processing Pipeline */}
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      
      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-28 w-full rounded" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1 w-full" />
            </div>
          </div>
        ))}
      </div>
      
      <span className="sr-only">Loading video processing interface</span>
    </div>
  );
}

// Loading overlay for full page loading
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function LoadingOverlay({ isLoading, children, loadingText = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          role="status"
          aria-label={loadingText}
        >
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{loadingText}</p>
          </div>
        </div>
      )}
    </div>
  );
}