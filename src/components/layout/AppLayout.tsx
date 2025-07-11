'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
// import { Header } from '../common/Header';
// import { Sidebar } from '../common/Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // const pathname = usePathname();
  // Determine if the current route is a dashboard route
  // const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/team-dashboard');
  // const isTeamDashboardRoute = pathname.startsWith('/team-dashboard');

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Removed outer Sidebar for dashboard routes */}
      <div className="flex-1 flex flex-col">
        {/* Removed global Header. Each page should render its own header. */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 