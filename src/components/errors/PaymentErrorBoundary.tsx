'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, CreditCard, Shield, RotateCcw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { errorReporter, ErrorCategory, ErrorSeverity } from '@/lib/errors/errorReporting';

interface Props {
  children: ReactNode;
  paymentFlow?: 'checkout' | 'subscription' | 'billing' | 'upgrade';
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
  onPaymentRecovery?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  isSecurityRelated: boolean;
}

export class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      isSecurityRelated: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Payment Error Boundary caught an error:', error, errorInfo);
    
    const isSecurityRelated = this.isSecurityError(error);
    
    const errorId = errorReporter.reportError(error, {
      category: ErrorCategory.PAYMENT,
      severity: isSecurityRelated ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
      component: `PaymentErrorBoundary-${this.props.paymentFlow || 'unknown'}`,
      action: 'payment_flow_error',
      additionalContext: {
        paymentFlow: this.props.paymentFlow,
        isSecurityRelated,
        componentStack: errorInfo.componentStack,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      },
      fingerprint: [
        'payment-error-boundary',
        this.props.paymentFlow || 'unknown',
        error.name,
        isSecurityRelated ? 'security' : 'normal',
      ],
    });

    this.setState({
      error,
      errorInfo,
      errorId,
      isSecurityRelated,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  private isSecurityError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('payment') ||
      errorMessage.includes('stripe') ||
      errorMessage.includes('card') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('ssl') ||
      errorMessage.includes('security')
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      isSecurityRelated: false,
    });

    if (this.props.onPaymentRecovery) {
      this.props.onPaymentRecovery();
    }
  };

  private handleGoHome = () => {
    errorReporter.addBreadcrumb('User navigated home from payment error', 'navigation');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private handleContactSupport = () => {
    errorReporter.addBreadcrumb('User contacted support from payment error', 'support');
    
    const subject = encodeURIComponent(`Payment Error - ID: ${this.state.errorId}`);
    const body = encodeURIComponent(
      `I encountered a payment error while using ClipsCommerce.\n\n` +
      `Error ID: ${this.state.errorId}\n` +
      `Payment Flow: ${this.props.paymentFlow || 'unknown'}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `Page: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}\n\n` +
      `Please help me resolve this payment issue urgently.`
    );
    
    const mailtoUrl = `mailto:support@clipscommerce.com?subject=${subject}&body=${body}`;
    
    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }
  };

  private getErrorTitle(): string {
    if (this.state.isSecurityRelated) {
      return 'Secure Payment Error';
    }
    
    switch (this.props.paymentFlow) {
      case 'checkout':
        return 'Checkout Error';
      case 'subscription':
        return 'Subscription Error';
      case 'billing':
        return 'Billing Error';
      case 'upgrade':
        return 'Upgrade Error';
      default:
        return 'Payment Error';
    }
  }

  private getErrorDescription(): string {
    if (this.state.isSecurityRelated) {
      return 'A security error occurred during payment processing. Your payment information is safe and secure.';
    }

    const error = this.state.error;
    if (!error) return 'A payment error occurred.';

    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Unable to connect to our secure payment servers. Please check your internet connection.';
    }
    
    if (errorMessage.includes('card') || errorMessage.includes('payment method')) {
      return 'There was an issue with your payment method. Please verify your payment details.';
    }
    
    if (errorMessage.includes('declined') || errorMessage.includes('insufficient')) {
      return 'Your payment was declined. Please check with your bank or try a different payment method.';
    }

    return 'An unexpected error occurred during payment processing. Your payment information remains secure.';
  }

  private getRecoveryInstructions(): string[] {
    if (this.state.isSecurityRelated) {
      return [
        'Refresh the page and try again',
        'Ensure you\'re on a secure connection (https://)',
        'Try using a different browser or device',
        'Contact support if the issue persists',
      ];
    }

    switch (this.props.paymentFlow) {
      case 'checkout':
        return [
          'Verify your payment method details',
          'Check your internet connection',
          'Try a different payment method',
          'Contact your bank if payment is declined',
        ];
      case 'subscription':
        return [
          'Check your current subscription status',
          'Verify your billing information is up to date',
          'Try updating your payment method',
          'Contact support for subscription issues',
        ];
      case 'billing':
        return [
          'Review your billing history',
          'Update your payment method if needed',
          'Check for any pending charges',
          'Contact support for billing questions',
        ];
      default:
        return [
          'Refresh the page and try again',
          'Check your payment method',
          'Verify your internet connection',
          'Contact support if needed',
        ];
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] bg-background flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                {this.state.isSecurityRelated ? (
                  <Shield className="h-8 w-8 text-red-600" />
                ) : (
                  <CreditCard className="h-8 w-8 text-red-600" />
                )}
              </div>
              
              <CardTitle className="text-2xl font-bold text-foreground">
                {this.getErrorTitle()}
              </CardTitle>
              
              <CardDescription className="text-lg">
                {this.getErrorDescription()}
              </CardDescription>

              {/* Security Badge */}
              {this.state.isSecurityRelated && (
                <div className="flex justify-center mt-4">
                  <Badge className="bg-red-100 text-red-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Security Alert
                  </Badge>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Security Assurance */}
              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  🔒 Your payment information is secure and protected. No sensitive data has been compromised.
                </AlertDescription>
              </Alert>

              {/* Error Details (limited for security) */}
              {process.env.NODE_ENV === 'development' && this.state.error && !this.state.isSecurityRelated && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm font-mono">
                    {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error ID */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Error ID: <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {this.state.errorId}
                  </code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Include this ID when contacting support about payment issues
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-mint text-background hover:bg-mint/90"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Payment Again
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleContactSupport}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Recovery Instructions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground text-center">
                  What you can do:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {this.getRecoveryInstructions().map((instruction, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Support Information */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Need immediate help?</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Our payment support team is available 24/7 to assist with urgent payment issues.
                  Email: support@clipscommerce.com
                </p>
              </div>

              {/* Compliance Information */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  🛡️ We are PCI DSS compliant and use industry-standard encryption to protect your payment data.
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

// Higher-order component for easy wrapping
export function withPaymentErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  paymentFlow?: Props['paymentFlow'],
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <PaymentErrorBoundary paymentFlow={paymentFlow} fallback={fallback}>
      <Component {...props} />
    </PaymentErrorBoundary>
  );

  WrappedComponent.displayName = `withPaymentErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}