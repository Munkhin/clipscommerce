'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import Header from '@/components/dashboard/Header';
import Sidebar from '@/components/dashboard/Sidebar';
import { usePollingSupabaseTable } from '@/hooks/usePollingSupabase';
import { isFeatureEnabled } from '@/lib/utils/featureFlags';
import { initToolbar } from '@stagewise/toolbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Set up polling for dashboard data when realtime is disabled
  const { data: notifications } = usePollingSupabaseTable(
    'user_notifications',
    user ? { user_id: user.id, read: false } : undefined,
    { 
      interval: 15000, // 15 seconds
      enabled: !!user && !isFeatureEnabled('REALTIME_UPDATES'),
      immediate: false
    }
  );

  // Poll for autopost schedules to keep dashboard updated
  const { data: autopostSchedules } = usePollingSupabaseTable(
    'autopost_schedule',
    user ? { user_id: user.id, status: 'scheduled' } : undefined,
    { 
      interval: 15000, // 15 seconds
      enabled: !!user && !isFeatureEnabled('REALTIME_UPDATES'),
      immediate: false
    }
  );

  // simple breadcrumb from path segments (dashboard/accelerate -> Dashboard / Accelerate)
  const segments = pathname?.split('/').filter(Boolean).slice(1); // remove 'dashboard'
  const breadcrumb = segments && segments.length > 0 ? (
    <nav aria-label="Breadcrumb" className="text-sm text-[#6B7280]">
      <ol className="inline-flex items-center space-x-1">
        <li>
          <span className="capitalize">Dashboard</span>
        </li>
        {segments.map((seg, idx) => (
          <li key={idx} className="flex items-center space-x-1">
            <span>/</span>
            <span className="capitalize">{seg}</span>
          </li>
        ))}
      </ol>
    </nav>
  ) : null;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initToolbar({ plugins: [] });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <div className="absolute inset-0 rounded-full border-2 border-gray-700"></div>
          </div>
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <main className="flex-1 bg-gray-900 overflow-hidden">
            <div className="h-full min-h-full p-6 lg:p-8 overflow-y-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
