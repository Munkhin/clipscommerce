'use client';

import React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bell, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';

interface TeamHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
}

export function TeamHeader({ title = "Team Dashboard", subtitle, breadcrumb }: TeamHeaderProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4" role="banner">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>
          )}
          {breadcrumb && <div className="mt-2">{breadcrumb}</div>}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-white"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-white"
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt="User avatar" />
              <AvatarFallback className="bg-[#8D5AFF] text-white">
                {user?.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-neutral-400">Team Admin</p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-neutral-400 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground ml-4">Clients</span>
        </div>
      </div>
    </header>
  );
}

export default TeamHeader; 