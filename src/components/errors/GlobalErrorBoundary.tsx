'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, RefreshCw, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { errorReporter, ErrorCategory, ErrorSeverity } from '@/lib/errors/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isRecovering: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global Error Boundary caught an error:', error, errorInfo);
    
    // Generate or extract correlation ID for this error
    const correlationId = this.getOrCreateCorrelationId();
    
    // Report error with context
    const errorId = errorReporter.reportError(error, {
      category: ErrorCategory.UI,
      severity: this.determineSeverity(error),
      component: 'GlobalErrorBoundary',
      action: 'component_render',
      requestId: correlationId,
      additionalContext: {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString(),
        correlationId,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      },
      fingerprint: [
        'global-error-boundary',
        error.name,
        this.extractErrorSignature(error),
      ],
    });

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Auto-recovery for certain types of errors
    this.attemptAutoRecovery(error);
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const errorMessage = error.message.toLowerCase();
    
    // Critical errors that break the entire app
    if (errorMessage.includes('chunk') || 
        errorMessage.includes('loading css') ||
        errorMessage.includes('network error') ||
        error.name === 'ChunkLoadError') {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity errors
    if (errorMessage.includes('cannot read') ||
        errorMessage.includes('undefined') ||
        errorMessage.includes('null')) {
      return ErrorSeverity.HIGH;
    }

    return ErrorSeverity.NORMAL;
  }

  private extractErrorSignature(error: Error): string {
    // Create a signature for similar errors to be grouped together
    const message = error.message.replace(/\d+/g, 'N'); // Replace numbers with N
    return message.substring(0, 50);
  }

  private getOrCreateCorrelationId(): string {
    // Try to get existing correlation ID from various sources
    if (typeof window !== 'undefined') {
      // Check global variable set by middleware
      const globalCorrelationId = (window as any).__CORRELATION_ID__;
      if (globalCorrelationId) {
        return globalCorrelationId;
      }
      
      // Check localStorage
      try {
        const storedCorrelationId = localStorage.getItem('clipscommerce_correlation_id');
        if (storedCorrelationId) {
          return storedCorrelationId;
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    // Generate new correlation ID
    const newCorrelationId = `ui_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store it for future use
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('clipscommerce_correlation_id', newCorrelationId);
        (window as any).__CORRELATION_ID__ = newCorrelationId;
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    return newCorrelationId;
  }

  private attemptAutoRecovery(error: Error) {
    // Auto-recovery for chunk loading errors (common in production)
    if (error.name === 'ChunkLoadError' || 
        error.message.includes('chunk') ||
        error.message.includes('Loading CSS')) {
      
      this.setState({ isRecovering: true });
      
      // Attempt recovery after a delay
      this.retryTimeout = setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 2000);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      // If max retries reached, suggest page reload
      this.handleReload();
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: prevState.retryCount + 1,
      isRecovering: false,
    }));

    // Clear any pending auto-recovery timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  };

  private handleGoHome = () => {
    errorReporter.addBreadcrumb('User navigated to dashboard from error', 'navigation');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private handleReload = () => {
    errorReporter.addBreadcrumb('User reloaded page from error', 'navigation');
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleContactSupport = () => {
    errorReporter.addBreadcrumb('User contacted support from error', 'support');
    
    const subject = encodeURIComponent(`Error Report - ID: ${this.state.errorId}`);
    const body = encodeURIComponent(
      `I encountered an error while using ClipsCommerce.\n\n` +
      `Error ID: ${this.state.errorId}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `Page: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}\n\n` +
      `Please help me resolve this issue.`
    );
    
    const mailtoUrl = `mailto:hello@clipscommerce.com?subject=${subject}&body=${body}`;
    
    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }
  };

  private getErrorTitle(): string {
    if (!this.state.error) return 'Application Error';

    const error = this.state.error;
    
    if (error.name === 'ChunkLoadError' || error.message.includes('chunk')) {
      return 'Loading Error';
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Connection Error';
    }
    
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'Access Error';
    }

    return 'Application Error';
  }

  private getErrorDescription(): string {
    if (!this.state.error) return 'Something unexpected happened.';

    const error = this.state.error;
    
    if (error.name === 'ChunkLoadError' || error.message.includes('chunk')) {
      return 'There was a problem loading part of the application. This usually resolves with a page refresh.';
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to our servers. Please check your internet connection.';
    }
    
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You may need to sign in again to continue using the application.';
    }

    return 'An unexpected error occurred. Our team has been notified and is working on a fix.';
  }

  private getSeverityBadgeColor(): string {
    if (!this.state.error) return 'bg-yellow-100 text-yellow-800';

    const severity = this.determineSeverity(this.state.error);
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-100 text-red-800';
      case ErrorSeverity.HIGH:
        return 'bg-orange-100 text-orange-800';
      case ErrorSeverity.NORMAL:
        return 'bg-yellow-100 text-yellow-800';
      case ErrorSeverity.LOW:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withGlobalErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <GlobalErrorBoundary fallback={fallback}>
      <Component {...props} />
    </GlobalErrorBoundary>
  );

  WrappedComponent.displayName = `withGlobalErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}