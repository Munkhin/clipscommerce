/**
 * Accessibility Auditor
 * Runs accessibility audits and provides fixes for ARIA labels, keyboard navigation, and WCAG compliance
 */

export interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element: string;
  selector: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriteria: string[];
  fix?: {
    description: string;
    code: string;
    automated: boolean;
  };
}

export interface AccessibilityReport {
  timestamp: Date;
  url: string;
  totalIssues: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  score: number; // 0-100
  issues: AccessibilityIssue[];
  recommendations: string[];
}

export interface AccessibilityConfig {
  enableAutomaticFixes: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA';
  includeWarnings: boolean;
  excludeRules: string[];
  customRules: AccessibilityRule[];
}

export interface AccessibilityRule {
  id: string;
  name: string;
  description: string;
  check: (element: Element) => boolean;
  fix?: (element: Element) => void;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriteria: string[];
}

export class AccessibilityAuditor {
  private static instance: AccessibilityAuditor;
  private config: AccessibilityConfig;
  private rules: Map<string, AccessibilityRule> = new Map();

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableAutomaticFixes: false,
      wcagLevel: 'AA',
      includeWarnings: true,
      excludeRules: [],
      customRules: [],
      ...config
    };

    this.initializeRules();
  }

  static getInstance(config?: Partial<AccessibilityConfig>): AccessibilityAuditor {
    if (!AccessibilityAuditor.instance) {
      AccessibilityAuditor.instance = new AccessibilityAuditor(config);
    }
    return AccessibilityAuditor.instance;
  }

  /**
   * Initialize built-in accessibility rules
   */
  private initializeRules(): void {
    // ARIA Label Rules
    this.addRule({
      id: 'aria-label-missing',
      name: 'Missing ARIA Labels',
      description: 'Interactive elements must have accessible names',
      check: (element) => {
        const interactiveElements = ['button', 'input', 'select', 'textarea', 'a'];
        if (!interactiveElements.includes(element.tagName.toLowerCase())) return true;
        
        const hasAriaLabel = element.hasAttribute('aria-label');
        const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
        const hasTitle = element.hasAttribute('title');
        const hasTextContent = element.textContent?.trim().length > 0;
        const hasAlt = element.hasAttribute('alt');
        
        return hasAriaLabel || hasAriaLabelledBy || hasTitle || hasTextContent || hasAlt;
      },
      fix: (element) => {
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute('type');
        
        let label = '';
        if (tagName === 'button') {
          label = 'Button';
        } else if (tagName === 'input') {
          label = type === 'submit' ? 'Submit' : 
                 type === 'search' ? 'Search' : 
                 type === 'email' ? 'Email' : 
                 'Input field';
        } else if (tagName === 'select') {
          label = 'Select option';
        } else if (tagName === 'textarea') {
          label = 'Text area';
        } else if (tagName === 'a') {
          label = 'Link';
        }
        
        element.setAttribute('aria-label', label);
      },
      impact: 'serious',
      wcagCriteria: ['1.3.1', '4.1.2']
    });

    // Keyboard Navigation Rules
    this.addRule({
      id: 'keyboard-navigation',
      name: 'Keyboard Navigation',
      description: 'Interactive elements must be keyboard accessible',
      check: (element) => {
        const interactiveElements = ['button', 'input', 'select', 'textarea', 'a'];
        if (!interactiveElements.includes(element.tagName.toLowerCase())) return true;
        
        const tabIndex = element.getAttribute('tabindex');
        const isDisabled = element.hasAttribute('disabled');
        
        // Element should be focusable unless disabled
        return isDisabled || tabIndex !== '-1';
      },
      fix: (element) => {
        // Remove negative tabindex to make element focusable
        if (element.getAttribute('tabindex') === '-1') {
          element.removeAttribute('tabindex');
        }
      },
      impact: 'serious',
      wcagCriteria: ['2.1.1', '2.1.2']
    });

    // Color Contrast Rules
    this.addRule({
      id: 'color-contrast',
      name: 'Color Contrast',
      description: 'Text must have sufficient color contrast',
      check: (element) => {
        // This would require color analysis - simplified for demo
        const style = window.getComputedStyle(element);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        
        // Simplified check - in production, you'd calculate actual contrast ratio
        return color !== backgroundColor;
      },
      impact: 'serious',
      wcagCriteria: ['1.4.3', '1.4.6']
    });

    // Heading Structure Rules
    this.addRule({
      id: 'heading-structure',
      name: 'Heading Structure',
      description: 'Headings must be properly structured',
      check: (element) => {
        if (!element.tagName.match(/^H[1-6]$/)) return true;
        
        // Check if heading levels are sequential
        const level = parseInt(element.tagName.charAt(1));
        const prevHeading = this.findPreviousHeading(element);
        
        if (!prevHeading) return level === 1;
        
        const prevLevel = parseInt(prevHeading.tagName.charAt(1));
        return level <= prevLevel + 1;
      },
      impact: 'moderate',
      wcagCriteria: ['1.3.1', '2.4.6']
    });

    // Image Alt Text Rules
    this.addRule({
      id: 'image-alt-text',
      name: 'Image Alt Text',
      description: 'Images must have appropriate alt text',
      check: (element) => {
        if (element.tagName.toLowerCase() !== 'img') return true;
        
        const alt = element.getAttribute('alt');
        const role = element.getAttribute('role');
        
        // Decorative images should have empty alt or role="presentation"
        if (role === 'presentation' || role === 'none') {
          return alt === '' || alt === null;
        }
        
        // Content images should have meaningful alt text
        return alt !== null && alt.trim().length > 0;
      },
      fix: (element) => {
        const src = element.getAttribute('src') || '';
        const filename = src.split('/').pop()?.split('.')[0] || 'image';
        element.setAttribute('alt', `Image: ${filename}`);
      },
      impact: 'serious',
      wcagCriteria: ['1.1.1']
    });

    // Form Label Rules
    this.addRule({
      id: 'form-labels',
      name: 'Form Labels',
      description: 'Form inputs must have associated labels',
      check: (element) => {
        const inputTypes = ['input', 'select', 'textarea'];
        if (!inputTypes.includes(element.tagName.toLowerCase())) return true;
        
        const id = element.getAttribute('id');
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        const ariaLabel = element.getAttribute('aria-label');
        
        // Check for associated label
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) return true;
        }
        
        // Check for aria-labelledby or aria-label
        return ariaLabelledBy || ariaLabel;
      },
      fix: (element) => {
        const type = element.getAttribute('type') || element.tagName.toLowerCase();
        const placeholder = element.getAttribute('placeholder');
        const name = element.getAttribute('name');
        
        let labelText = placeholder || name || type;
        labelText = labelText.charAt(0).toUpperCase() + labelText.slice(1);
        
        element.setAttribute('aria-label', labelText);
      },
      impact: 'serious',
      wcagCriteria: ['1.3.1', '3.3.2']
    });

    // Focus Management Rules
    this.addRule({
      id: 'focus-management',
      name: 'Focus Management',
      description: 'Focus must be properly managed',
      check: (element) => {
        // Check for focus traps in modals
        if (element.getAttribute('role') === 'dialog' || element.classList.contains('modal')) {
          const focusableElements = this.getFocusableElements(element);
          return focusableElements.length > 0;
        }
        return true;
      },
      impact: 'serious',
      wcagCriteria: ['2.4.3', '2.4.7']
    });

    // Add custom rules
    this.config.customRules.forEach(rule => this.addRule(rule));
  }

  /**
   * Add a new accessibility rule
   */
  addRule(rule: AccessibilityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Run accessibility audit on the current page
   */
  async auditPage(url?: string): Promise<AccessibilityReport> {
    const currentUrl = url || window.location.href;
    const issues: AccessibilityIssue[] = [];
    
    // Get all elements to check
    const elements = document.querySelectorAll('*');
    
    for (const element of elements) {
      for (const [ruleId, rule] of this.rules) {
        if (this.config.excludeRules.includes(ruleId)) continue;
        
        try {
          const passed = rule.check(element);
          
          if (!passed) {
            const issue: AccessibilityIssue = {
              id: `${ruleId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: rule.impact === 'critical' ? 'error' : 
                    rule.impact === 'serious' ? 'error' : 'warning',
              rule: ruleId,
              description: rule.description,
              element: element.tagName.toLowerCase(),
              selector: this.getElementSelector(element),
              impact: rule.impact,
              wcagLevel: this.getWcagLevel(rule.wcagCriteria),
              wcagCriteria: rule.wcagCriteria
            };

            // Add fix if available
            if (rule.fix) {
              issue.fix = {
                description: `Fix: ${rule.name}`,
                code: this.generateFixCode(element, rule),
                automated: true
              };
            }

            issues.push(issue);
          }
        } catch (error) {
          console.warn(`Error checking rule ${ruleId}:`, error);
        }
      }
    }

    // Calculate scores and counts
    const criticalIssues = issues.filter(i => i.impact === 'critical').length;
    const seriousIssues = issues.filter(i => i.impact === 'serious').length;
    const moderateIssues = issues.filter(i => i.impact === 'moderate').length;
    const minorIssues = issues.filter(i => i.impact === 'minor').length;

    const score = this.calculateAccessibilityScore(issues);
    const recommendations = this.generateRecommendations(issues);

    return {
      timestamp: new Date(),
      url: currentUrl,
      totalIssues: issues.length,
      criticalIssues,
      seriousIssues,
      moderateIssues,
      minorIssues,
      score,
      issues,
      recommendations
    };
  }

  /**
   * Apply automatic fixes for issues
   */
  async applyFixes(issues: AccessibilityIssue[]): Promise<number> {
    if (!this.config.enableAutomaticFixes) {
      throw new Error('Automatic fixes are disabled');
    }

    let fixedCount = 0;

    for (const issue of issues) {
      if (!issue.fix?.automated) continue;

      try {
        const element = document.querySelector(issue.selector);
        if (!element) continue;

        const rule = this.rules.get(issue.rule);
        if (rule?.fix) {
          rule.fix(element);
          fixedCount++;
        }
      } catch (error) {
        console.warn(`Error applying fix for ${issue.rule}:`, error);
      }
    }

    return fixedCount;
  }

  /**
   * Generate accessibility report HTML
   */
  generateReportHTML(report: AccessibilityReport): string {
    const issuesByImpact = {
      critical: report.issues.filter(i => i.impact === 'critical'),
      serious: report.issues.filter(i => i.impact === 'serious'),
      moderate: report.issues.filter(i => i.impact === 'moderate'),
      minor: report.issues.filter(i => i.impact === 'minor')
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accessibility Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          .score { font-size: 2em; font-weight: bold; color: ${report.score >= 80 ? '#28a745' : report.score >= 60 ? '#ffc107' : '#dc3545'}; }
          .issue { margin: 10px 0; padding: 15px; border-left: 4px solid; }
          .critical { border-color: #dc3545; background: #f8d7da; }
          .serious { border-color: #fd7e14; background: #fff3cd; }
          .moderate { border-color: #ffc107; background: #fff3cd; }
          .minor { border-color: #17a2b8; background: #d1ecf1; }
          .fix-code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Accessibility Report</h1>
          <p><strong>URL:</strong> ${report.url}</p>
          <p><strong>Generated:</strong> ${report.timestamp.toLocaleString()}</p>
          <p class="score">Score: ${report.score}/100</p>
          <p><strong>Total Issues:</strong> ${report.totalIssues}</p>
        </div>

        <h2>Issues by Impact</h2>
        ${Object.entries(issuesByImpact).map(([impact, issues]) => `
          <h3>${impact.charAt(0).toUpperCase() + impact.slice(1)} (${issues.length})</h3>
          ${issues.map(issue => `
            <div class="issue ${impact}">
              <h4>${issue.description}</h4>
              <p><strong>Element:</strong> ${issue.element}</p>
              <p><strong>Selector:</strong> <code>${issue.selector}</code></p>
              <p><strong>WCAG:</strong> ${issue.wcagCriteria.join(', ')}</p>
              ${issue.fix ? `
                <details>
                  <summary>Suggested Fix</summary>
                  <p>${issue.fix.description}</p>
                  <div class="fix-code">${issue.fix.code}</div>
                </details>
              ` : ''}
            </div>
          `).join('')}
        `).join('')}

        <h2>Recommendations</h2>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </body>
      </html>
    `;
  }

  /**
   * Helper methods
   */
  private findPreviousHeading(element: Element): Element | null {
    let current = element.previousElementSibling;
    
    while (current) {
      if (current.tagName.match(/^H[1-6]$/)) {
        return current;
      }
      current = current.previousElementSibling;
    }
    
    return null;
  }

  private getFocusableElements(container: Element): Element[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    return Array.from(container.querySelectorAll(focusableSelectors.join(', ')));
  }

  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }
    
    // Generate nth-child selector
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-child(${index})`;
    }
    
    return element.tagName.toLowerCase();
  }

  private getWcagLevel(criteria: string[]): 'A' | 'AA' | 'AAA' {
    // Simplified mapping - in production, you'd have a complete mapping
    const aaaCriteria = ['1.4.6', '2.4.9', '3.1.3'];
    const aaCriteria = ['1.4.3', '2.4.6', '3.3.2'];
    
    if (criteria.some(c => aaaCriteria.includes(c))) return 'AAA';
    if (criteria.some(c => aaCriteria.includes(c))) return 'AA';
    return 'A';
  }

  private calculateAccessibilityScore(issues: AccessibilityIssue[]): number {
    if (issues.length === 0) return 100;
    
    const weights = {
      critical: 25,
      serious: 15,
      moderate: 10,
      minor: 5
    };
    
    const totalDeductions = issues.reduce((sum, issue) => {
      return sum + weights[issue.impact];
    }, 0);
    
    return Math.max(0, 100 - totalDeductions);
  }

  private generateRecommendations(issues: AccessibilityIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.rule === 'aria-label-missing')) {
      recommendations.push('Add meaningful ARIA labels to interactive elements');
    }
    
    if (issues.some(i => i.rule === 'keyboard-navigation')) {
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }
    
    if (issues.some(i => i.rule === 'color-contrast')) {
      recommendations.push('Improve color contrast ratios to meet WCAG standards');
    }
    
    if (issues.some(i => i.rule === 'heading-structure')) {
      recommendations.push('Use proper heading hierarchy (H1, H2, H3, etc.)');
    }
    
    if (issues.some(i => i.rule === 'image-alt-text')) {
      recommendations.push('Provide descriptive alt text for all images');
    }
    
    if (issues.some(i => i.rule === 'form-labels')) {
      recommendations.push('Associate labels with form inputs');
    }
    
    recommendations.push('Test with screen readers and keyboard-only navigation');
    recommendations.push('Consider implementing skip links for better navigation');
    recommendations.push('Ensure sufficient color contrast for all text');
    
    return recommendations;
  }

  private generateFixCode(element: Element, rule: AccessibilityRule): string {
    const tagName = element.tagName.toLowerCase();
    const attributes = Array.from(element.attributes)
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');
    
    return `<${tagName} ${attributes}>`;
  }
}

// Export singleton instance
export const accessibilityAuditor = AccessibilityAuditor.getInstance();

// Utility functions for accessibility improvements
export class AccessibilityHelpers {
  /**
   * Add keyboard navigation to custom components
   */
  static addKeyboardNavigation(element: Element): void {
    element.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        (element as HTMLElement).click();
      }
    });
    
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  }

  /**
   * Create focus trap for modals
   */
  static createFocusTrap(container: Element): () => void {
    const focusableElements = Array.from(
      container.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Announce content changes to screen readers
   */
  static announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Add skip links for better navigation
   */
  static addSkipLinks(): void {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `;
    
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }
} 