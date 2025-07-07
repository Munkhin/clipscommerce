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
import { Bell, ChevronDown, Menu, User } from 'lucide-react';

interface HeaderProps {
  breadcrumb?: React.ReactNode;
}

export default function Header({ breadcrumb }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  

  return (
    <header className="w-full p-4 border-b border-gray-800/50 backdrop-blur-lg sticky top-0 z-50 bg-black">
      <div className="flex items-center w-full">
        <div className="flex-1 flex justify-center"></div>
        <a href="/dashboard" className="flex items-center gap-2 group" style={{ minWidth: 0, flex: '0 1 320px', justifyContent: 'center' }}>
          <span className="gradient-text text-2xl font-bold tracking-tight block text-center w-full">ClipsCommerce</span>
        </a>
      </div>
    </header>
  );
}
