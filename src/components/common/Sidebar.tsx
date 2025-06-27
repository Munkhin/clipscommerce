'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, Video, BarChart3, Calendar, Settings, Rocket, Users, Briefcase, LayoutGrid, ClipboardList, TrendingUp, Zap, FlaskConical, LifeBuoy, BellRing, Settings2, FolderKanban, Workflow } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  isTeamDashboard?: boolean;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export function Sidebar({ isTeamDashboard = false, isMobile = false, onLinkClick }: SidebarProps) {
  const pathname = usePathname();

  const generalLinks = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/dashboard/ideator', icon: Sparkles, label: 'Ideator' },
    { href: '/dashboard/accelerate', icon: Rocket, label: 'Accelerate' },
    { href: '/dashboard/blitz', icon: Zap, label: 'Blitz' },
    { href: '/dashboard/cycle', icon: FlaskConical, label: 'Cycle' },
    { href: '/dashboard/competitor-tactics', icon: TrendingUp, label: 'Competitor Tactics' },
  ];

  const teamLinks = [
    { href: '/team-dashboard', icon: LayoutGrid, label: 'Team Overview' },
    { href: '/team-dashboard/clients', icon: Users, label: 'Clients' },
    { href: '/team-dashboard/automation', icon: Workflow, label: 'Automation' },
    { href: '/team-dashboard/operations', icon: ClipboardList, label: 'Operations' },
    { href: '/team-dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/team-dashboard/workflows', icon: FolderKanban, label: 'Workflows' },
  ];

  const bottomLinks = [
    { href: isTeamDashboard ? '/team-dashboard/settings' : '/dashboard/settings', icon: Settings, label: 'Settings' },
    { href: '/support', icon: LifeBuoy, label: 'Support' },
  ];

  const links = isTeamDashboard ? [...teamLinks, ...bottomLinks] : [...generalLinks, ...bottomLinks];

  const sidebarClass = isMobile
    ? "flex-col w-full" // Mobile specific classes, handled by SheetContent
    : "hidden md:flex flex-col w-[260px] p-4 border-r border-gray-800/50 bg-background/80 backdrop-blur-lg sticky top-[65px] h-[calc(100vh-65px)]";

  const linkClass = "flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-200";
  const activeLinkClass = "bg-gray-800 text-white border border-violet-500/50 shadow-inner";

  return (
    <aside className={sidebarClass}>
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <TooltipProvider key={link.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    className={`${linkClass} ${isActive ? activeLinkClass : ''}`}
                    onClick={onLinkClick}
                  >
                    <link.icon className="h-5 w-5" />
                    {!isMobile && <span className="text-sm font-medium">{link.label}</span>}
                  </Link>
                </TooltipTrigger>
                {!isMobile && (
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>{link.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>
    </aside>
  );
} 