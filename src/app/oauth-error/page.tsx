"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

const errorMessages: Record<string, { title: string; description: string; canRetry: boolean }> = {
  state_validation_failed: {
    title: "Security Validation Failed",
    description: "The connection request couldn't be verified for security reasons. This usually happens if you wait too long or if there's an issue with your browser cookies.",
    canRetry: true
  },
  code_missing: {
    title: "Authorization Code Missing",
    description: "The platform didn't provide the required authorization code. This might be due to canceling the connection or a temporary platform issue.",
    canRetry: true
  },
  token_exchange_failed: {
    title: "Authentication Failed",
    description: "We couldn't complete the authentication with the platform. This might be due to incorrect app configuration or a temporary platform issue.",
    canRetry: true
  },
  invalid_token_response: {
    title: "Invalid Response",
    description: "The platform returned an unexpected response during authentication. Please try again or contact support if the issue persists.",
    canRetry: true
  },
  credentials_save_failed: {
    title: "Connection Save Failed",
    description: "We authenticated successfully but couldn't save your connection. Your account wasn't charged. Please try again.",
    canRetry: true
  },
  session_required: {
    title: "Sign In Required",
    description: "You need to be signed in to connect accounts. Please sign in and try again.",
    canRetry: false
  },
  internal_server_error: {
    title: "Server Error",
    description: "Something went wrong on our end. Our team has been notified. Please try again in a few minutes.",
    canRetry: true
  },
  access_denied: {
    title: "Access Denied",
    description: "You canceled the connection or denied permission. If this wasn't intentional, you can try connecting again.",
    canRetry: true
  },
  insufficient_scope: {
    title: "Insufficient Permissions",
    description: "The platform didn't grant all the required permissions. Please try again and make sure to approve all requested permissions.",
    canRetry: true
  }
};

export default function OAuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const error = searchParams.get('error') || 'unknown';
  const description = searchParams.get('description');
  const platform = searchParams.get('platform');

  const errorInfo = errorMessages[error] || {
    title: "Connection Error",
    description: description || "An unexpected error occurred while connecting your account. Please try again or contact support.",
    canRetry: true
  };

  const handleRetry = () => {
    setIsRetrying(true);
    // Add slight delay for UX
    setTimeout(() => {
      router.push('/dashboard/connect');
    }, 500);
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-900">
            {errorInfo.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center leading-relaxed">
            {errorInfo.description}
          </p>

          {platform && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Platform:</strong> {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </p>
            </div>
          )}

          {error !== 'unknown' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                <strong>Error Code:</strong> {error}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-4">
            {errorInfo.canRetry && (
              <Button 
                onClick={handleRetry} 
                className="w-full"
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleGoHome}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>

          {error === 'session_required' && (
            <div className="pt-4 border-t">
              <Button 
                onClick={() => router.push('/sign-in')}
                className="w-full"
                variant="secondary"
              >
                Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}