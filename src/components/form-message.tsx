'use client';

import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface FormMessageProps {
  message?: {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
  };
}

export function FormMessage({ message }: FormMessageProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const success = searchParams.get('success');

  // If no message or search params, don't render anything
  if (!message?.message && !error && !success) return null;

  // Determine the message to display and its type
  const displayMessage = message?.message || error || success || '';
  const messageType = message?.type || 
    (error ? 'error' : success ? 'success' : 'info');

  // Map message types to their respective styles and icons
  const alertVariants = {
    success: {
      className: 'border-dominator-green/30 bg-dominator-green/10 text-dominator-green',
      icon: <CheckCircle2 className="h-4 w-4" />
    },
    error: {
      className: 'border-dominator-red/30 bg-dominator-red/10 text-dominator-red',
      icon: <AlertCircle className="h-4 w-4" />
    },
    warning: {
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
      icon: <AlertTriangle className="h-4 w-4" />
    },
    info: {
      className: 'border-dominator-blue/30 bg-dominator-blue/10 text-dominator-blue',
      icon: <Info className="h-4 w-4" />
    }
  };

  const variant = alertVariants[messageType] || alertVariants.info;

  return (
    <Alert className={`mb-6 ${variant.className}`}>
      <div className="flex items-center space-x-2">
        {variant.icon}
        <AlertDescription className="text-sm">
          {displayMessage}
        </AlertDescription>
      </div>
    </Alert>
  );
}
