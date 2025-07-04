'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, ChevronDown, Menu, User, Users, ArrowLeftRight } from 'lucide-react';

interface HeaderProps {
  breadcrumb?: React.ReactNode;
}

export default function Header({ breadcrumb }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if we're currently in team mode
  const isTeamMode = pathname?.startsWith('/team-dashboard');
  
  const handleModeToggle = () => {
    if (isTeamMode) {
      // Switch to personal mode
      router.push('/dashboard');
    } else {
      // Switch to team mode
      router.push('/team-dashboard/operations');
    }
  };

  return (
    <header className="bg-[#FFFFFF] border-b border-[#E5E7EB] sticky top-0 z-10 text-[#111827]">
      <div className="px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="hover:bg-[#F3F4F6] text-[#111827]"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>

          {/* Breadcrumb area */}
          <div className="hidden md:flex md:flex-shrink-0 items-center">
            <div className="flex items-center space-x-2 text-sm">
              {breadcrumb}
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Team Mode Toggle */}
            <div className="hidden sm:flex items-center space-x-3 mr-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-[#6B7280]" />
                <span className="text-xs font-medium text-[#6B7280]">Personal</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleModeToggle}
                className="h-6 w-12 p-0 rounded-full bg-[#FFFFFF] border border-[#D1D5DB] transition-all duration-300 hover:bg-[#F9FAFB]"
                aria-label={`Switch to ${isTeamMode ? 'Personal' : 'Team'} Mode`}
              >
                <div className={`absolute h-4 w-4 rounded-full bg-[#8B5CF6] transition-transform duration-300 ${
                  isTeamMode ? 'translate-x-2' : '-translate-x-2'
                }`}>
                  {isTeamMode ? (
                    <Users className="h-3 w-3 text-white m-0.5" />
                  ) : (
                    <User className="h-3 w-3 text-white m-0.5" />
                  )}
                </div>
              </Button>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-[#6B7280]">Team</span>
                <Users className="h-4 w-4 text-[#6B7280]" />
              </div>
            </div>

            {/* Mobile Team Mode Toggle */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleModeToggle}
                className="hover:bg-[#F3F4F6]"
                aria-label={`Switch to ${isTeamMode ? 'Personal' : 'Team'} Mode`}
              >
                {isTeamMode ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </Button>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#8B5CF6] animate-pulse"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#FFFFFF] border border-[#E5E7EB] shadow-lg">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="py-2 px-4 text-sm text-[#6B7280]">
                  No new notifications
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 hover:bg-[#F3F4F6] px-3 py-2 rounded-lg"
                >
                  <div className="h-8 w-8 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-[#111827]">
                      {user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronDown className="ml-1 h-4 w-4 text-[#6B7280]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#FFFFFF] border border-[#E5E7EB] shadow-lg">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="hover:bg-[#F3F4F6]">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="hover:bg-[#F3F4F6]">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/subscription" className="hover:bg-[#F3F4F6]">Subscription</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button onClick={handleModeToggle} className="w-full text-left flex items-center hover:bg-[#F3F4F6]">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Switch to {isTeamMode ? 'Personal' : 'Team'} Mode
                  </button>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="hover:bg-[#F3F4F6]">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="space-y-1 px-4 py-3">
            {[
              { name: 'Dashboard', href: '/dashboard' },
              { name: 'Accelerate', href: '/dashboard/accelerate' },
              { name: 'Blitz', href: '/dashboard/blitz' },
              { name: 'Cycle', href: '/dashboard/cycle' },
              { name: 'Settings', href: '/dashboard/settings' },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F3F4F6]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
