'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface TeamModeErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface TeamModeErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

export class TeamModeErrorBoundary extends Component<
  TeamModeErrorBoundaryProps,
  TeamModeErrorBoundaryState
> {
  constructor(props: TeamModeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TeamModeErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TeamModeErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  handleReportError = () => {
    if (this.state.error) {
      console.error('Reporting error:', this.state.error);
      // In a real implementation, you would send this to your error reporting service
      alert('Error reported to the development team.');
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-800">
                Team Dashboard Error
              </CardTitle>
              <CardDescription className="text-lg">
                Something went wrong in the team dashboard. We apologize for the inconvenience.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {this.state.error?.message || 'An unexpected error occurred while loading the team dashboard.'}
                </AlertDescription>
              </Alert>

              {/* Error Details - Only show if enabled */}
              {this.props.showDetails && this.state.error && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700">Technical Details:</h3>
                  <div className="bg-gray-50 p-3 rounded border text-xs font-mono">
                    <p><strong>Error:</strong> {this.state.error.name}</p>
                    <p><strong>Message:</strong> {this.state.error.message}</p>
                    <p><strong>Stack:</strong></p>
                    <pre className="mt-1 text-xs overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  
                  {this.state.errorInfo?.componentStack && (
                    <div className="bg-gray-50 p-3 rounded border text-xs font-mono">
                      <p><strong>Component Stack:</strong></p>
                      <pre className="mt-1 text-xs overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleRetry} 
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleReportError}
                  className="flex-1"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Report Error
                </Button>
              </div>

              {/* Additional Help Text */}
              <div className="text-center text-sm text-gray-600">
                <p>If this problem persists, please contact support.</p>
                <p className="mt-1">
                  <span className="font-medium">Error ID:</span> {Date.now().toString(36)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TeamModeErrorBoundary;