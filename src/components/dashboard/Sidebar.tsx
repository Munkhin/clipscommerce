'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { 
  Home as HomeIcon,
  Zap as ZapIcon,
  CalendarDays as CalendarDaysIcon,
  LineChart as LineChartIcon,
  Settings as SettingsIcon,
  Lightbulb as LightbulbIcon,
  Crown as CrownIcon,
  Link as LinkIcon,
  RefreshCw as RefreshCwIcon,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import FeedbackBoard from './FeedbackBoard';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: LineChartIcon },
];

const sellFasterNav = [
  { name: 'Accelerate', href: '/dashboard/accelerate', icon: ZapIcon },
  { name: 'Blitz', href: '/dashboard/blitz', icon: CalendarDaysIcon },
  { name: 'Cycle', href: '/dashboard/cycle', icon: RefreshCwIcon },
];

const howToSellNav = [
  { name: 'Ideator', href: '/dashboard/ideator', icon: LightbulbIcon },
  { name: 'Competitor tactics', href: '/dashboard/competitor-tactics', icon: LineChartIcon },
];

const accountNav = [
  { name: 'Connect', href: '/dashboard/connect', icon: LinkIcon },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CrownIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [sellFasterOpen, setSellFasterOpen] = useState<boolean>(true);
  const [sellOpen, setSellOpen] = useState<boolean>(true);
  const role = useRole();

  return (
    <aside 
      className="w-[280px] h-screen bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl backdrop-blur-sm"
      aria-label="Main navigation"
    >
      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-4" aria-label="Dashboard navigation">
        {/* Primary Navigation */}
        <div>
          <h3 className="sr-only">Main navigation</h3>
          <div className="space-y-1">
            {mainNav.map((item) => {
              if (item.name === 'Reports' && !role.isAdmin) {
                return null;
              }
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 group relative hover:transform hover:translate-x-1",
                    isActive 
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-purple-500/25 border border-purple-400/20" 
                      : "text-gray-300 hover:bg-gray-800/60 hover:text-white hover:shadow-md"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300", 
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-400 group-hover:text-white group-hover:scale-110"
                    )} 
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="absolute right-3 w-2 h-2 bg-white rounded-full opacity-75 animate-pulse" aria-hidden="true" />
                  )}
                  {!isActive && (
                    <div className="absolute left-0 w-1 h-0 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full transition-all duration-300 group-hover:h-full opacity-0 group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sell Faster Section */}
        <div className="relative">
          <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/20 to-transparent"></div>
          <button
            onClick={() => setSellFasterOpen(!sellFasterOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-4 py-3 hover:text-gray-300 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg hover:bg-gray-800/30 relative"
            aria-expanded={sellFasterOpen}
            aria-controls="sell-faster-nav"
          >
            <span className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              Sell Faster
            </span>
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-all duration-300 group-hover:text-gray-300 group-hover:scale-110", 
                sellFasterOpen ? "rotate-90 text-purple-400" : ""
              )}
              aria-hidden="true"
            />
          </button>
          <div 
            id="sell-faster-nav"
            className={cn(
              "space-y-1 overflow-hidden transition-all duration-300 pl-4",
              sellFasterOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {sellFasterNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 group relative hover:transform hover:translate-x-1",
                    isActive 
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-purple-500/25 border border-purple-400/20" 
                      : "text-gray-300 hover:bg-gray-800/60 hover:text-white hover:shadow-md"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300", 
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-400 group-hover:text-white group-hover:scale-110"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="absolute right-3 w-2 h-2 bg-white rounded-full opacity-75 animate-pulse" aria-hidden="true" />
                  )}
                  {!isActive && (
                    <div className="absolute left-0 w-1 h-0 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full transition-all duration-300 group-hover:h-full opacity-0 group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* How to Sell Section */}
        <div className="relative">
          <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/20 to-transparent"></div>
          <button
            onClick={() => setSellOpen(!sellOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-4 py-3 hover:text-gray-300 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg hover:bg-gray-800/30 relative"
            aria-expanded={sellOpen}
            aria-controls="how-to-sell-nav"
          >
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              How to Sell
            </span>
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-all duration-300 group-hover:text-gray-300 group-hover:scale-110", 
                sellOpen ? "rotate-90 text-blue-400" : ""
              )}
              aria-hidden="true"
            />
          </button>
          <div 
            id="how-to-sell-nav"
            className={cn(
              "space-y-1 overflow-hidden transition-all duration-300 pl-4",
              sellOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {howToSellNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 group relative hover:transform hover:translate-x-1",
                    isActive 
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-purple-500/25 border border-purple-400/20" 
                      : "text-gray-300 hover:bg-gray-800/60 hover:text-white hover:shadow-md"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300", 
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-400 group-hover:text-white group-hover:scale-110"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="absolute right-3 w-2 h-2 bg-white rounded-full opacity-75 animate-pulse" aria-hidden="true" />
                  )}
                  {!isActive && (
                    <div className="absolute left-0 w-1 h-0 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full transition-all duration-300 group-hover:h-full opacity-0 group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Account Section */}
        <div className="pt-2 mt-4 border-t border-gray-800/50 relative">
          <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-500/20 to-transparent"></div>
          <h3 className="sr-only">Account settings</h3>
          <div className="space-y-1">
            {accountNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 group relative hover:transform hover:translate-x-1",
                    isActive 
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-purple-500/25 border border-purple-400/20" 
                      : "text-gray-300 hover:bg-gray-800/60 hover:text-white hover:shadow-md"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300", 
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-400 group-hover:text-white group-hover:scale-110"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="absolute right-3 w-2 h-2 bg-white rounded-full opacity-75 animate-pulse" aria-hidden="true" />
                  )}
                  {!isActive && (
                    <div className="absolute left-0 w-1 h-0 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full transition-all duration-300 group-hover:h-full opacity-0 group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <div className="absolute bottom-0 left-0 w-full p-4 flex justify-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="secondary"
              size="lg"
              className="w-full flex items-center gap-2"
              aria-label="Open feedback board"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              <span className="font-medium">Feedback</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="max-w-md w-full">
            <FeedbackBoard />
          </SheetContent>
        </Sheet>
      </div>
    </aside>
  );
}
