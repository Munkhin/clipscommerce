'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GlassCard from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
// Import types for components

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
function withLazyLoading<C extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: C }>,
  fallback?: React.ReactNode,
  displayName?: string
) {
  const LazyComponent = lazy(importFn);

  type ComponentProps = React.ComponentProps<C>;

  function LazyWrapper(props: ComponentProps) {
    return (
      <Suspense fallback={fallback || <GenericSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  LazyWrapper.displayName = displayName || 'LazyComponent';
  return LazyWrapper;
}

// Lazy-loaded components
export const LazyClientImportWizard = withLazyLoading(
  () => import('../team-dashboard/ClientImportWizard'),
  <GenericSkeleton title="Loading Import Wizard..." rows={5} />,
  'LazyClientImportWizard'
);

export const LazyWorkflowTemplateManager = withLazyLoading(
  () => import('../team-dashboard/WorkflowTemplateManager'),
  <GenericSkeleton title="Loading Workflow Manager..." rows={4} />,
  'LazyWorkflowTemplateManager'
);

export const LazyPerformanceMonitoringDashboard = withLazyLoading(
  () => import('../team-dashboard/PerformanceMonitoringDashboard'),
  <ChartSkeleton />,
  'LazyPerformanceMonitoringDashboard'
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

// Motion components removed due to constructor issues during SSR
// Use direct imports of framer-motion in client components instead

// Export the wrapper function for custom components
export { withLazyLoading }; 