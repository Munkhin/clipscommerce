'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, UserCircle, LogOut, Menu, X, Rocket, Users, Briefcase } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar'; // Assuming Sidebar is in the same common directory or accessible
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  isDashboard?: boolean;
  isTeamDashboard?: boolean;
}

export function Header({ isDashboard = false, isTeamDashboard = false }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="w-full p-4 border-b border-gray-800/50 backdrop-blur-lg sticky top-0 z-50 bg-background/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Title */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="gradient-text text-2xl font-bold tracking-tight">
            ClipsCommerce
          </span>
        </Link>

        {/* Desktop Navigation / Dashboard Elements */}
        {!isDashboard ? (
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
            {user ? (
              <Button asChild className="btn-primary">
                <Link href={isTeamDashboard ? "/team-dashboard" : "/dashboard"}>Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild className="btn-primary">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </nav>
        ) : (
          <div className="flex-1 flex items-center justify-end md:justify-between ml-4">
            {/* Search Bar (Dashboard Only) */}
            <div className="relative hidden md:block w-full max-w-sm mr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search content, clients, or features..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Right-aligned dashboard icons */}
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800">
                      <Bell className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 text-white border-gray-700">
                    <p>Notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800">
                      <UserCircle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 text-white border-gray-700">
                    <p>Profile & Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {user && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSignOut}
                        className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                      >
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white border-gray-700">
                      <p>Sign Out</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-gray-900 border-gray-800 text-white w-2/3 max-w-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="gradient-text text-xl font-bold">ClipsCommerce</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6 text-gray-400" />
                </Button>
              </div>
              <nav className="flex flex-col gap-4">
                {!isDashboard && (
                  <>
                    <Link href="#features" className="text-gray-300 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
                    <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                  </>
                )}
                {user ? (
                  <Button asChild className="btn-primary w-full">
                    <Link href={isTeamDashboard ? "/team-dashboard" : "/dashboard"} onClick={() => setIsMobileMenuOpen(false)}>Go to Dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild className="btn-primary w-full">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                  </Button>
                )}
                {isDashboard && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="text-gray-400 text-sm mb-2">Dashboard Navigation</h3>
                    <Sidebar isTeamDashboard={isTeamDashboard} isMobile={true} onLinkClick={() => setIsMobileMenuOpen(false)} />
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 