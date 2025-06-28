import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  environment: process.env.NODE_ENV || 'development',
  
  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Configure session replay
  integrations: [
    Sentry.replayIntegration({
      // Mask all text, except for specific selectors
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Enhanced error filtering
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message).toLowerCase();
      
      // Skip network errors that are usually temporary
      if (message.includes('network error') || 
          message.includes('failed to fetch') ||
          message.includes('load denied by x-frame-options') ||
          message.includes('script error') ||
          message.includes('non-error promise rejection') ||
          message.includes('resizeobserver loop limit exceeded')) {
        return null;
      }
      
      // Skip known third-party issues
      if (message.includes('facebook') || 
          message.includes('google') ||
          message.includes('twitter') ||
          message.includes('instagram')) {
        return null;
      }
    }
    
    // Enhanced PII scrubbing
    if (event.exception) {
      event.exception.values?.forEach(exception => {
        if (exception.value) {
          // Remove sensitive patterns
          exception.value = exception.value
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
            .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CREDIT_CARD]')
            .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
            .replace(/password[^&\s]*/gi, 'password=[REDACTED]')
            .replace(/token[^&\s]*/gi, 'token=[REDACTED]')
            .replace(/key[^&\s]*/gi, 'key=[REDACTED]')
            .replace(/secret[^&\s]*/gi, 'secret=[REDACTED]');
        }
      });
    }
    
    // Scrub sensitive data from request data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      
      // Remove sensitive query parameters and form data
      if (event.request.query_string) {
        if (typeof event.request.query_string === 'string') {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]*/gi, 'password=[REDACTED]')
            .replace(/token=[^&]*/gi, 'token=[REDACTED]')
            .replace(/key=[^&]*/gi, 'key=[REDACTED]');
        } else if (Array.isArray(event.request.query_string)) {
          // Handle array of key-value pairs
          event.request.query_string = event.request.query_string.map(([key, value]) => {
            if (/password|token|key/gi.test(key)) {
              return [key, '[REDACTED]'] as [string, string];
            }
            return [key, value] as [string, string];
          });
        }
      }
    }
    
    return event;
  },
  
  // Enhanced breadcrumb filtering
  beforeBreadcrumb(breadcrumb) {
    // Skip noisy console logs in production
    if (process.env.NODE_ENV === 'production' && breadcrumb.category === 'console') {
      if (breadcrumb.level === 'log' || breadcrumb.level === 'debug') {
        return null;
      }
    }
    
    // Skip navigation breadcrumbs for static assets
    if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
      const url = breadcrumb.data.to;
      if (url.includes('/_next/') || 
          url.includes('/favicon.ico') || 
          url.includes('/robots.txt') ||
          url.includes('/.well-known/')) {
        return null;
      }
    }
    
    return breadcrumb;
  },
  
  // Set user context automatically
  initialScope: {
    tags: {
      component: 'client',
      platform: 'web'
    }
  }
});