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
  // Removed top bar and ClipsCommerce text as requested
  return null;
}
