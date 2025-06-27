'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function ConnectAccountSuccessPage() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/dashboard/onboarding-success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Account Connected Successfully!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your social media account has been successfully connected. You can now start scheduling your posts.
        </p>
        <div className="mt-8">
          <Button
            onClick={handleContinue}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
