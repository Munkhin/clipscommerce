'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorReporter, ErrorCategory, ErrorSeverity } from '@/lib/errors/errorReporting';

interface Props {
  children: ReactNode;
  section?: 'main' | 'sidebar' | 'content' | 'profile' | 'settings' | 'subscription';
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    
    const errorId = errorReporter.reportError(error, {
      category: ErrorCategory.UI,
      severity: this.determineSeverity(error),
      component: `DashboardErrorBoundary-${this.props.section || 'unknown'}`,
      action: 'dashboard_render',
      additionalContext: {
        section: this.props.section,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      },
      fingerprint: [
        'dashboard-error-boundary',
        this.props.section || 'unknown',
        error.name,
      ],
    });

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const errorMessage = error.message.toLowerCase();
    
    // Critical errors that could affect billing or data
    if (this.props.section === 'subscription' || this.props.section === 'settings') {
      return ErrorSeverity.HIGH;
    }
    
    // High severity for main dashboard components
    if (this.props.section === 'main' || this.props.section === 'content') {
      if (errorMessage.includes('cannot read') || errorMessage.includes('undefined')) {
        return ErrorSeverity.HIGH;
      }
    }

    return ErrorSeverity.NORMAL;
  }

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      this.handleRefreshSection();
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleRefreshSection = () => {
    errorReporter.addBreadcrumb(
      `User refreshed dashboard section: ${this.props.section}`, 
      'navigation'
    );
    
    // For specific sections, try to refresh just that part
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    errorReporter.addBreadcrumb('User navigated to dashboard home', 'navigation');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private getSectionDisplayName(): string {
    switch (this.props.section) {
      case 'main':
        return 'Dashboard';
      case 'sidebar':
        return 'Navigation';
      case 'content':
        return 'Content Area';
      case 'profile':
        return 'Profile';
      case 'settings':
        return 'Settings';
      case 'subscription':
        return 'Subscription';
      default:
        return 'Dashboard Section';
    }
  }

  private getRecoveryInstructions(): string[] {
    switch (this.props.section) {
      case 'subscription':
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact support if billing issues persist',
        ];
      case 'settings':
        return [
          'Try refreshing the page',
          'Check if you have the required permissions',
          'Clear browser cache if the issue persists',
        ];
      case 'sidebar':
        return [
          'Try refreshing the page',
          'Use the main dashboard navigation',
          'Clear browser cache if needed',
        ];
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Navigate to a different section and return',
        ];
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Compact error UI for sections
      return (
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 p-2 bg-red-100 rounded-full w-12 h-12 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-foreground">
                {this.getSectionDisplayName()} Error
              </CardTitle>
              <CardDescription>
                Something went wrong in this section. Your other dashboard features should still work.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Alert */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {this.state.error?.message || 'An unexpected error occurred in this section.'}
                </AlertDescription>
              </Alert>

              {/* Error ID */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Error ID: <code className="font-mono bg-muted px-1 py-0.5 rounded">
                    {this.state.errorId}
                  </code>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  disabled={this.state.retryCount >= this.maxRetries}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {this.state.retryCount >= this.maxRetries ? 'Refresh Section' : 'Try Again'}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard Home
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleRefreshSection}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Recovery Instructions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Troubleshooting steps:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {this.getRecoveryInstructions().map((instruction, index) => (
                    <li key={index}>• {instruction}</li>
                  ))}
                </ul>
              </div>

              {/* Development Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground mb-2">
                    Development Details
                  </summary>
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <p><strong>Error:</strong> {this.state.error.message}</p>
                    <p><strong>Section:</strong> {this.props.section}</p>
                    <p><strong>Retry Count:</strong> {this.state.retryCount}</p>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withDashboardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  section?: Props['section'],
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <DashboardErrorBoundary section={section} fallback={fallback}>
      <Component {...props} />
    </DashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withDashboardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}