"use client";

import { signInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFormStatus } from "react-dom";
import Image from 'next/image';

interface FormState {
  error: string | null;
  success: boolean;
}

function SubmitButton({ 
  children, 
  loading = false 
}: { 
  children: React.ReactNode; 
  loading?: boolean 
}) {
  return (
    <Button 
      type="submit" 
      className="w-full bg-gradient-to-r from-[#8D5AFF] to-[#5AFCC0] hover:from-[#8D5AFF]/90 hover:to-[#5AFCC0]/90 text-white font-semibold py-3 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-[#8D5AFF]/30 h-12 text-base"
      disabled={loading}
    >
      {loading ? 'Signing in...' : children}
    </Button>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pending } = useFormStatus();

  const message = searchParams.get('message');
  const type = searchParams.get('type') as 'success' | 'error' | 'info' | 'warning' | null;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          router.push('/welcome');
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInAction({}, formData);
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push("/welcome");
      } else {
        setError('An unknown error occurred');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !message && !error && formRef.current === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8D5AFF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#101014] via-[#0A0A0C] to-[#030304] text-white flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-[70px] h-[70px] bg-gradient-to-br from-[#8D5AFF] to-[#5AFCC0] rounded-xl mb-6 shadow-md overflow-hidden">
            <Image
              src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png"
              alt="ClipsCommerce Logo"
              width={48}
              height={48}
              className="object-contain p-1 invert"
              priority
            />
          </div>
          <h1 className="text-[32px] font-bold tracking-tight text-white mb-1.5">Welcome back</h1>
          <p className="text-gray-400 text-base">Sign in to your ClipsCommerce account</p>
        </div>

        <form action={handleSubmit} ref={formRef} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-gray-300 font-medium text-sm">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              className="bg-[#1C1C22] border-none text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8D5AFF]/70 focus:border-transparent rounded-lg h-11 transition-all text-sm px-4 py-2.5"
              disabled={isLoading || pending}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-300 font-medium text-sm">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              className="bg-[#1C1C22] border-none text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8D5AFF]/70 focus:border-transparent rounded-lg h-11 transition-all text-sm px-4 py-2.5"
              disabled={isLoading || pending}
            />
          </div>
          
          <div className="pt-2">
            <SubmitButton loading={isLoading || pending}>
              Sign In To Your Account
            </SubmitButton>
          </div>
          
          {error && (
            <div className="bg-red-700/20 border border-red-600/30 rounded-lg p-3 mt-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          
          {message && type && (
            <div className={`border rounded-lg p-3 mt-4 ${
              type === 'error' 
                ? 'bg-red-700/20 border-red-600/30 text-red-400' 
                : 'bg-green-700/20 border-green-600/30 text-green-400'
            }`}>
              <p className="text-sm text-center">{message}</p>
            </div>
          )}
        </form>
        
        <div className="text-center space-y-3 pt-4">
          <div>
            <Link
              href="/forgot-password"
              className="text-sm text-[#BF9FFF] hover:text-[#A07EFF] transition-colors font-medium"
              tabIndex={(isLoading || pending) ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>
          <div>
            <p className="text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-[#BF9FFF] hover:text-[#A07EFF] hover:underline transition-colors"
                tabIndex={(isLoading || pending) ? -1 : 0}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
