'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Menu, ChevronDown, Star } from 'lucide-react';
import { Cross2Icon } from '@radix-ui/react-icons';

function NavigationBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const dropdownRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Check if banner was dismissed from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('promo-banner-dismissed');
    if (dismissed === 'true') {
      setBannerDismissed(true);
    }
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('promo-banner-dismissed', 'true');
  };

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown && dropdownRefs.current[openDropdown] && 
          !dropdownRefs.current[openDropdown]?.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);
  
  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Navigation items
  // Define interface for navigation items
interface DropdownItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  key?: string;
  href?: string;
  hasDropdown: boolean;
  dropdown?: DropdownItem[];
}

const navItems: NavItem[] = [
    { 
      label: 'Features', 
      key: 'features',
      hasDropdown: true,
      dropdown: [
        { label: 'Content Optimization', href: '/features' },
        { label: 'Precise Autoposting', href: '/features' },
        { label: 'AI Analytics', href: '/features' },
      ]
    },
    { 
      label: 'Solutions', 
      key: 'solutions',
      hasDropdown: true,
      dropdown: [
        { label: 'E-commerce', href: '/landing/solutions' },
        { label: 'Content Marketing', href: '/landing/solutions' },
        { label: 'Team', href: '/landing/team' },
      ]
    },
    { label: 'Pricing', href: '/landing/pricing', hasDropdown: false },
    { label: 'Terms of Service', href: '/landing/terms-of-service', hasDropdown: false },
    { 
      label: 'Resources', 
      key: 'resources',
      hasDropdown: true,
      dropdown: [
        { label: 'Blog', href: '/landing/resources' },
        { label: 'Guides', href: '/landing/resources' },
        { label: 'API Docs', href: '/api-docs' },
      ]
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-black/80 backdrop-blur-md border-b border-white/5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Announcement banner */}
      {!bannerDismissed && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium text-white relative">
            <span className="flex items-center">
              <Star className="h-4 w-4 mr-1.5 text-yellow-300 fill-yellow-300" />
              Limited time pro plan offer
            </span>
            <Link
              href="/landing/pricing"
              legacyBehavior
            >
              <a
                className="font-bold underline hover:text-white/90 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                upgrade now
              </a>
            </Link>
            <button
              onClick={dismissBanner}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Main navigation */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                  <Image 
                    src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png" 
                    alt="ClipsCommerce logo" 
                    fill
                    style={{
                      objectFit: 'cover',
                      filter: 'invert(1)'
                    }}
                    sizes="40px"
                    priority
                  />
                </div>
                <span className="text-white text-2xl font-bold">ClipsCommerce</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <div 
                key={item.label}
                className="relative"
                ref={(el) => {
                  if (item.hasDropdown && el !== null && item.key) {
                    // We've already checked that item.key exists above
                    dropdownRefs.current[item.key] = el;
                  }
                }}
              >
                {item.hasDropdown ? (
                  <button 
                    onClick={() => item.key && toggleDropdown(item.key)}
                    className="flex items-center text-sm text-gray-200 hover:text-white transition-colors duration-300"
                  >
                    {item.label}
                    <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${openDropdown === item.key ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <Link 
                    href={item.href || '#'}
                    legacyBehavior
                  >
                    <a className="text-sm text-gray-200 hover:text-white transition-colors duration-300">
                      {item.label}
                    </a>
                  </Link>
                )}
                
                {/* Dropdown menu */}
                {item.hasDropdown && item.key && openDropdown === item.key && (
                  <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-gray-900 border border-gray-800 ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      {item.dropdown?.map((dropdownItem) => (
                        <Link
                          key={dropdownItem.label}
                          href={dropdownItem.href}
                          legacyBehavior
                        >
                          <a
                            className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-white"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {dropdownItem.label}
                          </a>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/sign-in"
              legacyBehavior
            >
              <a className="text-sm text-gray-200 hover:text-white transition-colors duration-300">
                Sign In
              </a>
            </Link>
            <Link
              href="/sign-up"
              legacyBehavior
            >
              <a className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors duration-300">
                Get Started
              </a>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <Cross2Icon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            {navItems.map((item) => (
              <div key={item.label} className="px-3 py-2">
                {item.hasDropdown ? (
                  <div>
                    <button
                      onClick={() => item.key && toggleDropdown(item.key)}
                      className="w-full flex items-center justify-between text-gray-200 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-base font-medium min-h-[44px]"
                    >
                      {item.label}
                      <ChevronDown 
                        className={`ml-2 h-4 w-4 transition-transform ${openDropdown === item.key ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    {item.key && openDropdown === item.key && (
                      <div className="mt-2 pl-4 space-y-1">
                        {item.dropdown?.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.label}
                            href={dropdownItem.href}
                            className="block px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md text-sm min-h-[44px] flex items-center"
                            onClick={() => {
                              setOpenDropdown(null);
                              setMobileMenuOpen(false);
                            }}
                          >
                            {dropdownItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href || '#'}
                    className="block px-3 py-2 text-gray-200 hover:bg-gray-800 hover:text-white rounded-md text-base font-medium min-h-[44px] flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-4 pb-2 px-3 space-y-2">
              <Link
                href="/sign-in"
                className="block w-full px-4 py-2 text-center text-sm font-medium text-gray-200 hover:text-white min-h-[44px] flex items-center justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="block w-full text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 min-h-[44px] flex items-center justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default NavigationBar;
