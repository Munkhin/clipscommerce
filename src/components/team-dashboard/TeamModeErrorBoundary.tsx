'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class TeamModeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Team Mode Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorId: Date.now().toString(36),
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for monitoring (in production, send to error tracking service)
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'TeamModeErrorBoundary',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, Bugsnag, etc.
      // errorTrackingService.captureException(error, { extra: errorData });
      console.error('Production Error:', errorData);
    } else {
      console.error('Development Error:', errorData);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Team Mode Error
              </CardTitle>
              <CardDescription className="text-lg">
                Something went wrong in the Team Mode dashboard. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Error Details:</h3>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                  {this.state.error.stack && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Error ID for support */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Error ID: <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {this.state.errorId}
                  </code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please include this ID when contacting support
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-mint text-background hover:bg-mint/90"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  If this problem persists, try:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Refreshing the page</li>
                  <li>• Clearing your browser cache</li>
                  <li>• Switching to individual dashboard mode</li>
                  <li>• Contacting support with the error ID above</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withTeamModeErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <TeamModeErrorBoundary fallback={fallback}>
      <Component {...props} />
    </TeamModeErrorBoundary>
  );

  WrappedComponent.displayName = `withTeamModeErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for programmatically triggering error boundary
export function useTeamModeErrorHandler() {
  return {
    captureError: (error: Error, context?: string) => {
      console.error(`Team Mode Error${context ? ` (${context})` : ''}:`, error);
      
      // In a real app, this could dispatch to a global error store
      // or trigger the error boundary programmatically
      throw error;
    },
    
    reportError: (error: Error, additionalInfo?: Record<string, any>) => {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context: 'Team Mode Dashboard',
        ...additionalInfo,
      };
      
      // Log for development
      console.error('Team Mode Error Report:', errorData);
      
      // In production, send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        // errorTrackingService.captureException(error, { extra: errorData });
      }
    }
  };
} 