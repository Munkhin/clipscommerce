'use client';

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

interface AccessibilityContextType {
  // Focus management
  focusFirst: (containerRef: React.RefObject<HTMLElement>) => void;
  focusLast: (containerRef: React.RefObject<HTMLElement>) => void;
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => () => void;
  
  // Keyboard navigation
  handleArrowNavigation: (
    event: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void
  ) => void;
  
  // Announcements
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  
  // ARIA helpers
  generateId: (prefix: string) => string;
  
  // Mobile detection
  isMobile: boolean;
  isTablet: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function TeamModeAccessibilityProvider({ children }: { children: React.ReactNode }) {
  const announcerRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  // Detect mobile/tablet on mount and resize
  useEffect(() => {
    const checkDevice = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        setIsMobile(width < 768);
        setIsTablet(width >= 768 && width < 1024);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Focus first focusable element in container
  const focusFirst = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return;
    
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, []);

  // Focus last focusable element in container
  const focusLast = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return;
    
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, []);

  // Trap focus within container (returns cleanup function)
  const trapFocus = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return () => {};

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(containerRef.current!);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    focusFirst(containerRef);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusFirst]);

  // Handle arrow key navigation
  const handleArrowNavigation = useCallback((
    event: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void
  ) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    onIndexChange(newIndex);
    items[newIndex]?.focus();
  }, []);

  // Announce message to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcerRef.current) return;

    announcerRef.current.setAttribute('aria-live', priority);
    announcerRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  // Generate unique ID
  const generateId = useCallback((prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);

  const value: AccessibilityContextType = {
    focusFirst,
    focusLast,
    trapFocus,
    handleArrowNavigation,
    announce,
    generateId,
    isMobile,
    isTablet,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen reader announcer */}
      <div
        ref={announcerRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
}

// Helper function to get focusable elements
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="menuitem"]:not([disabled])',
    '[role="option"]:not([disabled])',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
}

// Custom hook
export function useTeamModeAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useTeamModeAccessibility must be used within a TeamModeAccessibilityProvider');
  }
  return context;
}

// Higher-order component for accessible team mode components
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>
) {
  const AccessibleComponent = (props: P) => {
    const { announce, generateId } = useTeamModeAccessibility();
    
    // Add accessibility props
    const accessibilityProps = {
      announce,
      generateId,
    };

    return <Component {...props} {...accessibilityProps} />;
  };

  AccessibleComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  
  return AccessibleComponent;
}

// Accessible dropdown hook
export function useAccessibleDropdown() {
  const { handleArrowNavigation, trapFocus, announce } = useTeamModeAccessibility();
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(-1);
    announce('Dropdown opened');
  }, [announce]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    announce('Dropdown closed');
  }, [announce]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        openDropdown();
      }
      return;
    }

    const items = dropdownRef.current?.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
    if (!items) return;

    const itemsArray = Array.from(items);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeDropdown();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].click();
        }
        break;
      default:
        handleArrowNavigation(event, itemsArray, activeIndex, setActiveIndex);
    }
  }, [isOpen, activeIndex, openDropdown, closeDropdown, handleArrowNavigation]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const cleanup = trapFocus(dropdownRef);
      return cleanup;
    }
  }, [isOpen, trapFocus]);

  return {
    isOpen,
    activeIndex,
    dropdownRef,
    openDropdown,
    closeDropdown,
    handleKeyDown,
  };
} 