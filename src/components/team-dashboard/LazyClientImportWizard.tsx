'use client';

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load the heavy ClientImportWizard component
const ClientImportWizard = lazy(() => 
  import('./ClientImportWizard').then(module => ({ 
    default: module.ClientImportWizard 
  }))
);

// Loading fallback component
function ImportWizardSkeleton() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Import Wizard...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-8 bg-muted animate-pulse rounded w-1/4" />
        </div>
      </CardContent>
    </Card>
  );
}

// Main lazy wrapper component
export function LazyClientImportWizard() {
  return (
    <Suspense fallback={<ImportWizardSkeleton />}>
      <ClientImportWizard />
    </Suspense>
  );
} 