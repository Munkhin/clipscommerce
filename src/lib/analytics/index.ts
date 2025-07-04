/**
 * Centralized Analytics Management
 * Handles Google Analytics, GTM, and other tracking services with proper error handling
 */

interface AnalyticsConfig {
  gtmId?: string;
  gaTrackingId?: string;
  environment: 'development' | 'staging' | 'production';
  enableDebug?: boolean;
}

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  customParameters?: Record<string, any>;
}

class AnalyticsManager {
  private config: AnalyticsConfig;
  private initialized = false;
  private gtmLoaded = false;
  private gaLoaded = false;

  constructor() {
    this.config = {
      gtmId: process.env.NEXT_PUBLIC_GTM_ID?.trim() || undefined,
      gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID?.trim() || undefined,
      environment: (process.env.NODE_ENV as any) || 'development',
      enableDebug: process.env.NODE_ENV === 'development',
    };

    // Validate environment variables only in development for better debugging
    if (this.config.enableDebug) {
      this.validateConfiguration();
    }
  }

  /**
   * Validate analytics configuration
   */
  private validateConfiguration(): void {
    const warnings: string[] = [];

    if (!this.config.gtmId) {
      warnings.push('NEXT_PUBLIC_GTM_ID environment variable is not set');
    } else if (!this.config.gtmId.startsWith('GTM-')) {
      warnings.push('NEXT_PUBLIC_GTM_ID should start with "GTM-"');
    }

    if (!this.config.gaTrackingId) {
      warnings.push('NEXT_PUBLIC_GA_TRACKING_ID environment variable is not set');
    } else if (!this.config.gaTrackingId.startsWith('GA-') && !this.config.gaTrackingId.startsWith('G-')) {
      warnings.push('NEXT_PUBLIC_GA_TRACKING_ID should start with "GA-" or "G-"');
    }

    if (warnings.length > 0) {
      console.group('[Analytics] Configuration Warnings');
      warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
      console.info('💡 Analytics tracking will be disabled until these issues are resolved');
      console.groupEnd();
    }
  }

  /**
   * Initialize analytics services
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      this.initializeGTM();
      this.initializeGA();
      this.initialized = true;
      
      if (this.config.enableDebug) {
        console.info('[Analytics] Initialized', {
          gtm: !!this.config.gtmId,
          ga: !!this.config.gaTrackingId,
          environment: this.config.environment,
        });
      }
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error);
    }
  }

  /**
   * Initialize Google Tag Manager
   */
  private initializeGTM(): void {
    if (!this.config.gtmId) {
      if (this.config.enableDebug) {
        console.info('[Analytics] GTM ID not provided, skipping GTM initialization');
      }
      return;
    }

    // Validate GTM ID format
    if (!this.config.gtmId.startsWith('GTM-')) {
      console.warn('[Analytics] Invalid GTM ID format. GTM IDs should start with "GTM-"');
      return;
    }

    try {
      // Initialize dataLayer if it doesn't exist
      (window as any).dataLayer = (window as any).dataLayer || [];
      
      // GTM script injection
      const gtmScript = document.createElement('script');
      gtmScript.async = true;
      gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${this.config.gtmId}`;
      
      gtmScript.onload = () => {
        this.gtmLoaded = true;
        if (this.config.enableDebug) {
          console.info('[Analytics] GTM loaded successfully');
        }
      };

      gtmScript.onerror = () => {
        console.warn('[Analytics] Failed to load GTM script');
      };

      document.head.appendChild(gtmScript);

      // Initialize GTM with config
      (window as any).dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });

    } catch (error) {
      console.error('[Analytics] GTM initialization error:', error);
    }
  }

  /**
   * Initialize Google Analytics
   */
  private initializeGA(): void {
    if (!this.config.gaTrackingId) {
      if (this.config.enableDebug) {
        console.info('[Analytics] GA Tracking ID not provided, skipping GA initialization');
      }
      return;
    }

    // Validate GA tracking ID format
    if (!this.config.gaTrackingId.startsWith('GA-') && !this.config.gaTrackingId.startsWith('G-')) {
      console.warn('[Analytics] Invalid GA tracking ID format. GA IDs should start with "GA-" or "G-"');
      return;
    }

    try {
      // Global gtag function
      (window as any).gtag = (window as any).gtag || function() {
        ((window as any).dataLayer = (window as any).dataLayer || []).push(arguments);
      };

      // Initialize dataLayer
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', this.config.gaTrackingId, {
        debug_mode: this.config.enableDebug,
        send_page_view: false, // We'll handle page views manually
      });

      // Load GA script
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.gaTrackingId}`;
      
      gaScript.onload = () => {
        this.gaLoaded = true;
        if (this.config.enableDebug) {
          console.info('[Analytics] GA loaded successfully');
        }
      };

      gaScript.onerror = () => {
        console.warn('[Analytics] Failed to load GA script');
      };

      document.head.appendChild(gaScript);

    } catch (error) {
      console.error('[Analytics] GA initialization error:', error);
    }
  }

  /**
   * Track a custom event
   */
  public trackEvent(event: AnalyticsEvent): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      // Track with GTM
      if (this.gtmLoaded && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'custom_event',
          event_category: event.category,
          event_action: event.action,
          event_label: event.label,
          event_value: event.value,
          ...event.customParameters,
        });
      }

      // Track with GA
      if (this.gaLoaded && (window as any).gtag) {
        (window as any).gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          ...event.customParameters,
        });
      }

      if (this.config.enableDebug) {
        console.info('[Analytics] Event tracked:', event);
      }

    } catch (error) {
      console.error('[Analytics] Event tracking error:', error);
    }
  }

  /**
   * Track page view
   */
  public trackPageView(path: string, title?: string): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      const pageData = {
        page_path: path,
        page_title: title || document.title,
        page_location: window.location.href,
      };

      // Track with GTM
      if (this.gtmLoaded && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'page_view',
          ...pageData,
        });
      }

      // Track with GA
      if (this.gaLoaded && (window as any).gtag) {
        (window as any).gtag('config', this.config.gaTrackingId, pageData);
      }

      if (this.config.enableDebug) {
        console.info('[Analytics] Page view tracked:', pageData);
      }

    } catch (error) {
      console.error('[Analytics] Page view tracking error:', error);
    }
  }

  /**
   * Track user identification
   */
  public identifyUser(userId: string, properties?: Record<string, any>): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      const userData = {
        user_id: userId,
        ...properties,
      };

      // Track with GTM
      if (this.gtmLoaded && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'user_identification',
          ...userData,
        });
      }

      // Track with GA
      if (this.gaLoaded && (window as any).gtag) {
        (window as any).gtag('config', this.config.gaTrackingId, {
          user_id: userId,
          custom_map: properties,
        });
      }

      if (this.config.enableDebug) {
        console.info('[Analytics] User identified:', { userId, properties });
      }

    } catch (error) {
      console.error('[Analytics] User identification error:', error);
    }
  }

  /**
   * Track conversion/goal completion
   */
  public trackConversion(conversionId: string, value?: number, currency = 'USD'): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      const conversionData = {
        conversion_id: conversionId,
        value,
        currency,
      };

      // Track with GTM
      if (this.gtmLoaded && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'conversion',
          ...conversionData,
        });
      }

      // Track with GA
      if (this.gaLoaded && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', conversionData);
      }

      if (this.config.enableDebug) {
        console.info('[Analytics] Conversion tracked:', conversionData);
      }

    } catch (error) {
      console.error('[Analytics] Conversion tracking error:', error);
    }
  }

  /**
   * Get analytics status
   */
  public getStatus(): { initialized: boolean; gtmLoaded: boolean; gaLoaded: boolean; config: AnalyticsConfig } {
    return {
      initialized: this.initialized,
      gtmLoaded: this.gtmLoaded,
      gaLoaded: this.gaLoaded,
      config: this.config,
    };
  }
}

// Create singleton instance
export const analytics = new AnalyticsManager();

// Convenience functions
export const trackEvent = (event: AnalyticsEvent) => analytics.trackEvent(event);
export const trackPageView = (path: string, title?: string) => analytics.trackPageView(path, title);
export const identifyUser = (userId: string, properties?: Record<string, any>) => analytics.identifyUser(userId, properties);
export const trackConversion = (conversionId: string, value?: number, currency?: string) => analytics.trackConversion(conversionId, value, currency);

// Initialize analytics on import (for client-side)
if (typeof window !== 'undefined') {
  analytics.initialize();
}

export default analytics;