import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Bug, ExternalLink, Mail, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Error States Components
 * Provides user-friendly error messages and recovery options
 */

interface BaseErrorProps {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

interface ErrorMessageProps extends BaseErrorProps {
  variant?: 'destructive' | 'default';
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

export function ErrorMessage({ 
  title = "Something went wrong", 
  description, 
  variant = 'destructive',
  icon,
  className,
  children,
  onDismiss 
}: ErrorMessageProps) {
  const defaultIcon = <AlertTriangle className="h-4 w-4" />;
  
  return (
    <Alert variant={variant} className={cn('', className)} role="alert">
      {icon || defaultIcon}
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {children}
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto" 
          onClick={onDismiss}
          aria-label="Dismiss error message"
        >
          ×
        </Button>
      )}
    </Alert>
  );
}

interface NetworkErrorProps extends BaseErrorProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function NetworkError({ 
  title = "Connection Failed", 
  description = "Unable to connect to our servers. Please check your internet connection and try again.",
  onRetry, 
  isRetrying = false,
  className,
  children 
}: NetworkErrorProps) {
  return (
    <div className={cn('text-center p-8 space-y-4', className)} role="alert" aria-live="polite">
      <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <WifiOff className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </div>
      {children}
      {onRetry && (
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          className="flex items-center gap-2"
          aria-label="Retry connection"
        >
          <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      )}
    </div>
  );
}

interface ApiErrorProps extends BaseErrorProps {
  statusCode?: number;
  onRetry?: () => void;
  onGoBack?: () => void;
  supportEmail?: string;
}

export function ApiError({ 
  title,
  description,
  statusCode,
  onRetry,
  onGoBack,
  supportEmail = "support@clipscommerce.com",
  className,
  children 
}: ApiErrorProps) {
  const getErrorDetails = (code?: number) => {
    switch (code) {
      case 400:
        return {
          title: 'Bad Request',
          description: 'The request was invalid. Please check your input and try again.'
        };
      case 401:
        return {
          title: 'Authentication Required',
          description: 'Please sign in to continue.'
        };
      case 403:
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to access this resource.'
        };
      case 404:
        return {
          title: 'Not Found',
          description: 'The requested resource could not be found.'
        };
      case 429:
        return {
          title: 'Too Many Requests',
          description: 'You\'re sending requests too quickly. Please wait a moment and try again.'
        };
      case 500:
        return {
          title: 'Server Error',
          description: 'Our servers are experiencing issues. Please try again later.'
        };
      default:
        return {
          title: 'Request Failed',
          description: 'Something went wrong with your request. Please try again.'
        };
    }
  };

  const errorDetails = getErrorDetails(statusCode);
  const finalTitle = title || errorDetails.title;
  const finalDescription = description || errorDetails.description;

  return (
    <div className={cn('text-center p-8 space-y-6 max-w-md mx-auto', className)} role="alert" aria-live="polite">
      <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{finalTitle}</h3>
        {statusCode && <p className="text-xs text-muted-foreground font-mono">Error {statusCode}</p>}
        <p className="text-sm text-muted-foreground">{finalDescription}</p>
      </div>

      {children}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button onClick={onRetry} variant="default" aria-label="Retry request">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline" aria-label="Go back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Still having issues?{' '}
          <a 
            href={`mailto:${supportEmail}`} 
            className="text-primary hover:underline inline-flex items-center gap-1"
            aria-label={`Contact support at ${supportEmail}`}
          >
            Contact Support
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}

interface UploadErrorProps extends BaseErrorProps {
  fileName?: string;
  fileSize?: number;
  errorType?: 'size' | 'format' | 'network' | 'processing';
  onRetry?: () => void;
  onRemove?: () => void;
}

export function UploadError({ 
  fileName,
  fileSize,
  errorType = 'processing',
  onRetry,
  onRemove,
  className,
  children 
}: UploadErrorProps) {
  const getErrorMessage = (type: string) => {
    switch (type) {
      case 'size':
        return {
          title: 'File Too Large',
          description: `The file ${fileName} exceeds the maximum size limit of 100MB.`
        };
      case 'format':
        return {
          title: 'Unsupported Format',
          description: `The file ${fileName} is not a supported video format. Please use MP4, MOV, or AVI.`
        };
      case 'network':
        return {
          title: 'Upload Failed',
          description: `Failed to upload ${fileName}. Please check your connection and try again.`
        };
      default:
        return {
          title: 'Processing Failed',
          description: `There was an error processing ${fileName}. Our AI couldn't analyze this video.`
        };
    }
  };

  const error = getErrorMessage(errorType);

  return (
    <div className={cn('border border-destructive/20 bg-destructive/5 rounded-lg p-4', className)} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-medium text-destructive">{error.title}</h4>
            <p className="text-sm text-muted-foreground">{error.description}</p>
            {fileSize && (
              <p className="text-xs text-muted-foreground mt-1">
                File size: {(fileSize / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
          {children}
          <div className="flex gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} aria-label={`Retry upload for ${fileName}`}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onRemove && (
              <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${fileName}`}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProcessingErrorProps extends BaseErrorProps {
  type?: 'ai' | 'video' | 'analysis';
  onRetry?: () => void;
  onContactSupport?: () => void;
}

export function ProcessingError({ 
  type = 'ai',
  title,
  description,
  onRetry,
  onContactSupport,
  className,
  children 
}: ProcessingErrorProps) {
  const getTypeDetails = (processingType: string) => {
    switch (processingType) {
      case 'video':
        return {
          title: 'Video Processing Failed',
          description: 'We encountered an error while processing your video. The file may be corrupted or in an unsupported format.'
        };
      case 'analysis':
        return {
          title: 'Analysis Failed',
          description: 'Our AI couldn\'t analyze your content. This might be due to audio quality or content format issues.'
        };
      default:
        return {
          title: 'AI Processing Failed',
          description: 'Our AI systems are currently experiencing issues. Please try again in a few moments.'
        };
    }
  };

  const typeDetails = getTypeDetails(type);
  const finalTitle = title || typeDetails.title;
  const finalDescription = description || typeDetails.description;

  return (
    <div className={cn('text-center p-6 space-y-4 border border-destructive/20 bg-destructive/5 rounded-lg', className)} role="alert">
      <div className="mx-auto w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
        <Bug className="h-6 w-6 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-destructive">{finalTitle}</h3>
        <p className="text-sm text-muted-foreground">{finalDescription}</p>
      </div>

      {children}

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {onRetry && (
          <Button size="sm" onClick={onRetry} aria-label="Retry processing">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {onContactSupport && (
          <Button size="sm" variant="outline" onClick={onContactSupport} aria-label="Contact support">
            <Mail className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline error component for form fields
interface FieldErrorProps {
  message: string;
  className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
  return (
    <p className={cn('text-sm text-destructive flex items-center gap-1 mt-1', className)} role="alert">
      <AlertTriangle className="h-3 w-3" />
      {message}
    </p>
  );
}

// Error boundary fallback component
interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetError?: () => void;
  className?: string;
}

export function ErrorBoundaryFallback({ error, resetError, className }: ErrorBoundaryFallbackProps) {
  return (
    <div className={cn('min-h-[400px] flex items-center justify-center p-8', className)} role="alert">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Bug className="h-8 w-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Don&apos;t worry, our team has been notified.
          </p>
          {error && process.env.NODE_ENV === 'development' && (
            <details className="text-left mt-4 p-3 bg-muted rounded text-xs">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 overflow-auto">{error instanceof Error ? error.message : String(error)}</pre>
            </details>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {resetError && (
            <Button onClick={resetError} aria-label="Try again">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.reload()} aria-label="Reload page">
            Reload Page
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          If this problem persists, please{' '}
          <a href="mailto:support@clipscommerce.com" className="text-primary hover:underline">
            contact our support team
          </a>
        </p>
      </div>
    </div>
  );
}