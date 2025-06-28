'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { CheckCircle, ArrowRight, User, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WelcomePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8D5AFF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
          </div>

          {/* Welcome Message */}
          <h1 className="text-4xl font-bold mb-4">
            Welcome to ClipsCommerce!
          </h1>
          
          <p className="text-xl text-gray-300 mb-8">
            {user ? `Hi ${user.email}! ` : ''}
            Your account has been successfully created. You&apos;re all set to start your journey with us.
          </p>

          {/* Next Steps */}
          <div className="bg-gray-800/50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">What&apos;s Next?</h2>
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#8D5AFF]" />
                <span>Your account is ready to use</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#8D5AFF]" />
                <span>Payment processing is enabled</span>
              </div>
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-[#8D5AFF]" />
                <span>Additional features coming soon</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button asChild className="w-full bg-gradient-to-r from-[#8D5AFF] to-[#5AFCC0] hover:from-[#8D5AFF]/90 hover:to-[#5AFCC0]/90">
              <Link href="/landing/pricing">
                View Pricing Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>

          {/* Support */}
          <div className="mt-8 text-gray-400 text-sm">
            <p>
              Need help? Contact us at{' '}
              <a href="mailto:support@clipscommerce.com" className="text-[#8D5AFF] hover:underline">
                support@clipscommerce.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}