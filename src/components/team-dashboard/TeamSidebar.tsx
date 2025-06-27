import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Zap,
  Home,
  ChevronRight
} from 'lucide-react';

interface TeamSidebarProps {
  className?: string;
}

const navigation = [
  {
    name: 'Overview',
    href: '/team-dashboard',
    icon: Home,
  },
  {
    name: 'Operations',
    href: '/team-dashboard/operations',
    icon: Users,
  },
  {
    name: 'Workflows',
    href: '/team-dashboard/operations/workflows',
    icon: Zap,
  },
  {
    name: 'Analytics',
    href: '/team-dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/team-dashboard/settings',
    icon: Settings,
  },
];

export function TeamSidebar({ className }: TeamSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col w-64 bg-neutral-900 border-r border-neutral-800", className)}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-white">Team Dashboard</h2>
        <p className="text-sm text-neutral-400 mt-1">Manage your team operations</p>
      </div>
      
      <nav className="flex-1 px-4 pb-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <button
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-[#8D5AFF]/20 text-[#8D5AFF] border border-[#8D5AFF]/30"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default TeamSidebar; 