// Error reporting and monitoring
export * from './errorReporting';
export * from './errorNotification';
export * from './errorAnalytics';

// Enhanced error handling utilities
export * from './errorHandling';

// Error boundaries
export { GlobalErrorBoundary, withGlobalErrorBoundary } from '../../components/errors/GlobalErrorBoundary';
export { DashboardErrorBoundary, withDashboardErrorBoundary } from '../../components/errors/DashboardErrorBoundary';
export { PaymentErrorBoundary, withPaymentErrorBoundary } from '../../components/errors/PaymentErrorBoundary';


// Utility functions for easy error handling
export const handleAsyncError = async <T>(
  promise: Promise<T>,
  context?: {
    component?: string;
    action?: string;
    fallback?: T;
  }
): Promise<T | undefined> => {
  try {
    return await promise;
  } catch (error: unknown) {
    const { reportError, ErrorCategory, ErrorSeverity } = await import('./errorReporting');
    
    reportError(error instanceof Error ? error : new Error(String(error)), {
      category: ErrorCategory.API,
      severity: ErrorSeverity.NORMAL,
      component: context?.component,
      action: context?.action,
    });

    return context?.fallback;
  }
};

export const withErrorHandling = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: {
    component?: string;
    action?: string;
  }
): T => {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch(async (error) => {
          const { reportError, ErrorCategory, ErrorSeverity } = await import('./errorReporting');
          
          reportError(error, {
            category: ErrorCategory.UI,
            severity: ErrorSeverity.NORMAL,
            component: context?.component,
            action: context?.action,
          });
          
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      // Handle sync errors
      import('./errorReporting').then(({ reportError, ErrorCategory, ErrorSeverity }) => {
        reportError(error as Error, {
          category: ErrorCategory.UI,
          severity: ErrorSeverity.NORMAL,
          component: context?.component,
          action: context?.action,
        });
      });
      
      throw error;
    }
  }) as T;
};