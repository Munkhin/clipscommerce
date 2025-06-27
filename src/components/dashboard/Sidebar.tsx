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
  ChevronRight
} from 'lucide-react';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
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

  return (
    <div className="w-[280px] h-screen bg-[#F9FAFB] border-r border-[#E5E7EB] flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-center">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-[#8B5CF6] flex items-center justify-center">
            <Image
              src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png"
              alt="ClipsCommerce Logo"
              width={40}
              height={40}
              className="object-contain p-1 invert"
              priority
            />
          </div>
          <span className="text-2xl font-bold text-[#111827]">
            ClipsCommerce
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-6">
        {/* Primary Navigation */}
        <div>
          {mainNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center py-3 px-4 rounded-lg text-base font-medium transition-all duration-200",
                  isActive 
                    ? "bg-[#8B5CF6] text-white font-medium shadow-sm" 
                    : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                )}
              >
                <item.icon 
                  className={cn(
                    "mr-3 h-5 w-5", 
                    isActive 
                      ? "text-white" 
                      : "text-[#4B5563]"
                  )} 
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Sell Faster Section */}
        <div>
          <button
            onClick={() => setSellFasterOpen(!sellFasterOpen)}
            className="flex items-center justify-between w-full text-sm font-medium text-[#6B7280] uppercase tracking-wider mb-2 px-4 py-2 hover:text-[#374151] transition-colors"
          >
            <span>Sell Faster</span>
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-transform", 
                sellFasterOpen ? "rotate-90" : ""
              )} 
            />
          </button>
          {sellFasterOpen && (
            <div className="space-y-1">
              {sellFasterNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center py-3 px-4 rounded-lg text-base font-medium transition-all duration-200",
                      isActive 
                        ? "bg-[#8B5CF6] text-white font-medium shadow-sm" 
                        : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                    )}
                  >
                    <item.icon 
                      className={cn(
                        "mr-3 h-5 w-5", 
                        isActive 
                          ? "text-white" 
                          : "text-[#4B5563]"
                      )} 
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* How to Sell Section */}
        <div>
          <button
            onClick={() => setSellOpen(!sellOpen)}
            className="flex items-center justify-between w-full text-sm font-medium text-[#6B7280] uppercase tracking-wider mb-2 px-4 py-2 hover:text-[#374151] transition-colors"
          >
            <span>How to Sell</span>
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-transform", 
                sellOpen ? "rotate-90" : ""
              )} 
            />
          </button>
          {sellOpen && (
            <div className="space-y-1">
              {howToSellNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center py-3 px-4 rounded-lg text-base font-medium transition-all duration-200",
                      isActive 
                        ? "bg-[#8B5CF6] text-white font-medium shadow-sm" 
                        : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                    )}
                  >
                    <item.icon 
                      className={cn(
                        "mr-3 h-5 w-5", 
                        isActive 
                          ? "text-white" 
                          : "text-[#4B5563]"
                      )} 
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="pt-6 mt-6 border-t border-[#E5E7EB]">
          <div className="space-y-1">
            {accountNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center py-3 px-4 rounded-lg text-base font-medium transition-all duration-200",
                    isActive 
                      ? "bg-[#8B5CF6] text-white font-medium shadow-sm" 
                      : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 h-5 w-5", 
                      isActive 
                        ? "text-white" 
                        : "text-[#4B5563]"
                    )} 
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
