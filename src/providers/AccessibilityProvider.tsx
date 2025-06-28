'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityAuditor, AccessibilityHelpers, AccessibilityReport } from '@/lib/accessibility/accessibilityAuditor';

/**
 * Accessibility Provider
 * Provides accessibility context and features throughout the application
 */

interface AccessibilityContextType {
  // Audit functions
  runAudit: () => Promise<AccessibilityReport>;
  lastReport: AccessibilityReport | null;
  isAuditing: boolean;
  
  // Accessibility features
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  createFocusTrap: (container: Element) => () => void;
  addKeyboardNavigation: (element: Element) => void;
  
  // Settings
  highContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  fontSize: 'normal' | 'large' | 'larger';
  setFontSize: (size: 'normal' | 'large' | 'larger') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: React.ReactNode;
  enableAutomaticAudits?: boolean;
  auditInterval?: number; // in milliseconds
}

export function AccessibilityProvider({ 
  children, 
  enableAutomaticAudits = false,
  auditInterval = 30000 // 30 seconds
}: AccessibilityProviderProps) {
  const [lastReport, setLastReport] = useState<AccessibilityReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');
  
  const auditorRef = useRef<AccessibilityAuditor>();
  const auditIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize auditor
  useEffect(() => {
    auditorRef.current = AccessibilityAuditor.getInstance({
      enableAutomaticFixes: false,
      wcagLevel: 'AA',
      includeWarnings: true,
      excludeRules: [],
      customRules: []
    });

    // Add skip links
    AccessibilityHelpers.addSkipLinks();

    return () => {
      if (auditIntervalRef.current) {
        clearInterval(auditIntervalRef.current);
      }
    };
  }, []);

  // Set up automatic audits
  useEffect(() => {
    if (enableAutomaticAudits && auditorRef.current) {
      auditIntervalRef.current = setInterval(async () => {
        await runAudit();
      }, auditInterval);
    }

    return () => {
      if (auditIntervalRef.current) {
        clearInterval(auditIntervalRef.current);
      }
    };
  }, [enableAutomaticAudits, auditInterval]);

  // Apply user preferences
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Font size
    root.classList.remove('font-large', 'font-larger');
    if (fontSize === 'large') {
      root.classList.add('font-large');
    } else if (fontSize === 'larger') {
      root.classList.add('font-larger');
    }
  }, [highContrastMode, reducedMotion, fontSize]);

  // Check for user's system preferences
  useEffect(() => {
    // Check for prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(reducedMotionQuery.matches);
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Check for prefers-contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrastMode(contrastQuery.matches);
    
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setHighContrastMode(e.matches);
    };
    
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  const runAudit = async (): Promise<AccessibilityReport> => {
    if (!auditorRef.current || isAuditing) {
      return lastReport || {
        timestamp: new Date(),
        url: window.location.href,
        totalIssues: 0,
        criticalIssues: 0,
        seriousIssues: 0,
        moderateIssues: 0,
        minorIssues: 0,
        score: 100,
        issues: [],
        recommendations: []
      };
    }

    setIsAuditing(true);
    
    try {
      const report = await auditorRef.current.auditPage();
      setLastReport(report);
      
      // Log issues in development
      if (process.env.NODE_ENV === 'development' && report.issues.length > 0) {
        console.group('🔍 Accessibility Audit Results');
        console.log(`Score: ${report.score}/100`);
        console.log(`Total Issues: ${report.totalIssues}`);
        console.log(`Critical: ${report.criticalIssues}, Serious: ${report.seriousIssues}`);
        console.log('Issues:', report.issues);
        console.groupEnd();
      }
      
      return report;
    } catch (error) {
      console.error('Accessibility audit failed:', error);
      return lastReport || {
        timestamp: new Date(),
        url: window.location.href,
        totalIssues: 0,
        criticalIssues: 0,
        seriousIssues: 0,
        moderateIssues: 0,
        minorIssues: 0,
        score: 100,
        issues: [],
        recommendations: []
      };
    } finally {
      setIsAuditing(false);
    }
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    AccessibilityHelpers.announceToScreenReader(message, priority);
  };

  const createFocusTrap = (container: Element): (() => void) => {
    return AccessibilityHelpers.createFocusTrap(container);
  };

  const addKeyboardNavigation = (element: Element) => {
    AccessibilityHelpers.addKeyboardNavigation(element);
  };

  const contextValue: AccessibilityContextType = {
    runAudit,
    lastReport,
    isAuditing,
    announceToScreenReader,
    createFocusTrap,
    addKeyboardNavigation,
    highContrastMode,
    setHighContrastMode,
    reducedMotion,
    setReducedMotion,
    fontSize,
    setFontSize
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
      {/* Screen reader only styles */}
      <style jsx global>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .skip-links {
          position: absolute;
          top: -40px;
          left: 6px;
          z-index: 9999;
        }

        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px;
          text-decoration: none;
          border-radius: 4px;
          z-index: 9999;
        }

        .skip-link:focus {
          top: 6px;
        }

        /* High contrast mode */
        .high-contrast {
          filter: contrast(150%);
        }

        .high-contrast button,
        .high-contrast input,
        .high-contrast select,
        .high-contrast textarea {
          border: 2px solid !important;
        }

        .high-contrast a {
          text-decoration: underline;
        }

        /* Reduced motion */
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }

        /* Font sizes */
        .font-large {
          font-size: 110%;
        }

        .font-larger {
          font-size: 125%;
        }

        /* Focus indicators */
        :focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        /* Skip to main content */
        #main-content:focus {
          outline: none;
        }
      `}</style>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Accessibility tools component for development
export function AccessibilityTools() {
  const { runAudit, lastReport, isAuditing, highContrastMode, setHighContrastMode, reducedMotion, setReducedMotion, fontSize, setFontSize } = useAccessibility();
  const [showTools, setShowTools] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowTools(!showTools)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
        aria-label="Toggle accessibility tools"
      >
        ♿
      </button>
      
      {showTools && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
          <h3 className="font-semibold mb-3">Accessibility Tools</h3>
          
          <div className="space-y-3">
            <button
              onClick={runAudit}
              disabled={isAuditing}
              className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
            >
              {isAuditing ? 'Running Audit...' : 'Run Accessibility Audit'}
            </button>
            
            {lastReport && (
              <div className="text-sm bg-gray-100 p-2 rounded">
                <p>Score: {lastReport.score}/100</p>
                <p>Issues: {lastReport.totalIssues}</p>
                <p>Critical: {lastReport.criticalIssues}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                />
                High Contrast
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
                Reduce Motion
              </label>
              
              <div>
                <label className="block text-sm font-medium mb-1">Font Size:</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                >
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                  <option value="larger">Larger</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}