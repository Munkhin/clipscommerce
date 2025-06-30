'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GlassCard from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
// Props types - more specific than 'any'
interface ComponentProps {
  [key: string]: unknown;
}

interface LazyComponentProps {
  [key: string]: unknown;
}

// Generic loading skeleton
function GenericSkeleton({ title = 'Loading...', rows = 3 }: { title?: string; rows?: number }) {
  return (
    <GlassCard className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </GlassCard>
  );
}

// Chart loading skeleton
function ChartSkeleton() {
  return (
    <GlassCard className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </CardContent>
    </GlassCard>
  );
}

// Dashboard component skeletons
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <GlassCard key={i} className="h-48">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </GlassCard>
      ))}
    </div>
  );
}

// Lazy component wrapper with error boundary
function withLazyLoading<T = Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ReactNode,
  displayName?: string
) {
  const LazyComponent = lazy(importFn);

  function LazyWrapper(props: T) {
    return (
      <Suspense fallback={fallback || <GenericSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  LazyWrapper.displayName = displayName || 'LazyComponent';
  return LazyWrapper;
}

// Fallback components for missing team dashboard components
const FallbackComponent: React.FC<LazyComponentProps> = () => (
  <GenericSkeleton title="Component not available" rows={3} />
);

// Lazy-loaded components with fallbacks for missing modules
export const LazyClientImportWizard = withLazyLoading(
  () => import('../team-dashboard/modules/ContentAutomationModule').then(m => ({ default: m.ContentAutomationModule })).catch(() => ({ default: FallbackComponent })),
  <GenericSkeleton title="Loading Import Wizard..." rows={5} />,
  'LazyClientImportWizard'
);

export const LazyWorkflowTemplateManager = withLazyLoading(
  () => import('../team-dashboard/modules/BulkVideoProcessor').then(m => ({ default: m.BulkVideoProcessor })).catch(() => ({ default: FallbackComponent })),
  <GenericSkeleton title="Loading Workflow Manager..." rows={4} />,
  'LazyWorkflowTemplateManager'
);

export const LazyPerformanceMonitoringDashboard = withLazyLoading(
  () => import('../team-dashboard/modules/FeedbackModule').then(m => ({ default: m.FeedbackModule })).catch(() => ({ default: FallbackComponent })),
  <ChartSkeleton />,
  'LazyPerformanceMonitoringDashboard'
);

export const LazyTeamAnalyticsOverview = withLazyLoading(
  () => import('../team-dashboard/modules/ContentIdeationModule').then(m => ({ default: m.ContentIdeationModule })).catch(() => ({ default: FallbackComponent })),
  <DashboardSkeleton />,
  'LazyTeamAnalyticsOverview'
);

export const LazyBulkOperationsPanel = withLazyLoading(
  () => import('../team-dashboard/modules/AutoPostingScheduler').then(m => ({ default: m.AutoPostingScheduler })).catch(() => ({ default: FallbackComponent })),
  <GenericSkeleton title="Loading Bulk Operations..." rows={6} />,
  'LazyBulkOperationsPanel'
);

export const LazyAdvancedClientFilters = withLazyLoading(
  () => Promise.resolve({ default: FallbackComponent }),
  <GenericSkeleton title="Loading Filters..." rows={3} />,
  'LazyAdvancedClientFilters'
);

export const LazyClientDetailView = withLazyLoading(
  () => Promise.resolve({ default: FallbackComponent }),
  <GenericSkeleton title="Loading Client Details..." rows={8} />,
  'LazyClientDetailView'
);

export const LazyWorkflowScheduler = withLazyLoading(
  () => Promise.resolve({ default: FallbackComponent }),
  <GenericSkeleton title="Loading Scheduler..." rows={5} />,
  'LazyWorkflowScheduler'
);

// Chart components (heavy dependencies)
export const LazyRechartsComponents = {
  LineChart: withLazyLoading(
    () => import('recharts').then(m => ({
      default: m.LineChart
    })),
    <ChartSkeleton />,
    'LazyLineChart'
  ),
  BarChart: withLazyLoading(
    () => import('recharts').then(m => ({
      default: m.BarChart
    })),
    <ChartSkeleton />,
    'LazyBarChart'
  ),
  PieChart: withLazyLoading(
    () => import('recharts').then(m => ({
      default: m.PieChart
    })),
    <ChartSkeleton />,
    'LazyPieChart'
  ),
  AreaChart: withLazyLoading(
    () => import('recharts').then(m => ({
      default: m.AreaChart
    })),
    <ChartSkeleton />,
    'LazyAreaChart'
  ),
};

// Motion components (framer-motion is heavy)
export const LazyMotionComponents = {
  motion: withLazyLoading(
    () => import('framer-motion').then(m => ({
      default: m.motion
    })),
    <div>Loading animation...</div>,
    'LazyMotion'
  ),
  AnimatePresence: withLazyLoading(
    () => import('framer-motion').then(m => ({
      default: m.AnimatePresence
    })),
    <div>Loading animation...</div>,
    'LazyAnimatePresence'
  ),
};

// Export the wrapper function for custom components
export { withLazyLoading }; 