'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { TeamModeProvider } from '@/providers/TeamModeProvider';
import { TeamModeErrorBoundary } from '@/components/team-dashboard/TeamModeErrorBoundary';
import { TeamModeAccessibilityProvider } from '@/components/team-dashboard/TeamModeAccessibilityProvider';
import { TeamHeader } from '@/components/team-dashboard/TeamHeader';
import { TeamSidebar } from '@/components/team-dashboard/TeamSidebar';

export default function TeamDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Simple breadcrumb from path segments
  const segments = pathname?.split('/').filter(Boolean).slice(1); // remove 'team-dashboard'
  const breadcrumb = segments && segments.length > 0 ? (
    <nav aria-label="Breadcrumb" className="text-sm text-secondaryText">
      <ol className="inline-flex items-center space-x-1">
        <li>
          <span className="capitalize text-creative">Team Dashboard</span>
        </li>
        {segments.map((seg, idx) => (
          <li key={idx} className="flex items-center space-x-1">
            <span>/</span>
            <span className="capitalize">{seg.replace('-', ' ')}</span>
          </li>
        ))}
      </ol>
    </nav>
  ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mint mx-auto"></div>
          <p className="text-secondaryText">Loading Team Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <TeamModeErrorBoundary>
      <TeamModeAccessibilityProvider>
        <TeamModeProvider>
          <div className="flex h-screen bg-gradient-to-br from-background to-muted/10 text-text overflow-hidden">
            <TeamSidebar />
            <div className="flex-1 flex flex-col min-h-0">
              <TeamHeader breadcrumb={breadcrumb} />
              <main className="flex-1 bg-background/95 backdrop-blur-sm overflow-hidden">
                <div className="h-full overflow-y-auto scrollbar-dark">
                  <div className="min-h-full">
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </TeamModeProvider>
      </TeamModeAccessibilityProvider>
    </TeamModeErrorBoundary>
  );
} 