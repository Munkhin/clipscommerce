"use client";

export const dynamic = 'force-dynamic';

import { signInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import Image from 'next/image';

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
      className="w-full bg-gradient-to-r from-[#00A67E] to-[#007567] hover:from-[#00A67E]/90 hover:to-[#007567]/90 text-white font-semibold py-3 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-[#00A67E]/30 h-12 text-base"
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const message = searchParams.get('message');
  const type = searchParams.get('type') as 'success' | 'error' | 'info' | 'warning' | null;
  
  // Get plan parameters for post-login redirect
  const plan = searchParams.get('plan');
  const billing = searchParams.get('billing');
  const priceId = searchParams.get('priceId');
  const price = searchParams.get('price');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          router.push('/dashboard');
        }
      } catch (err) {
        // Do nothing, allow user to sign in
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(event.currentTarget);
      const result = await signInAction({}, formData);
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        // If there are plan parameters, redirect to checkout
        if (plan && priceId) {
          window.location.href = priceId;
        } else if (plan && price) {
          // For fallback, redirect to dashboard
          router.push('/dashboard');
        } else {
          router.push("/welcome");
        }
      } else {
        setError('An unknown error occurred');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError('An error occurred during sign in');
      }
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <Image
            src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png"
            alt="ClipsCommerce Logo"
            width={48}
            height={48}
            className="object-contain invert mx-auto mb-6"
            priority
          />
          <h1 className="text-[32px] font-bold tracking-tight text-white mb-1.5">Welcome back</h1>
          <p className="text-gray-400 text-base">Sign in to your ClipsCommerce account</p>
        </div>

        <form onSubmit={handleSubmit} ref={formRef} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-gray-300 font-medium text-sm">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              className="bg-[#1C1C22] border-none text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8D5AFF]/70 focus:border-transparent rounded-lg h-11 transition-all text-sm px-4 py-2.5"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-300 font-medium text-sm">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                className="bg-[#1C1C22] border-none text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8D5AFF]/70 focus:border-transparent rounded-lg h-11 transition-all text-sm px-4 py-2.5 pr-12"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={isLoading ? -1 : 0}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div className="pt-2">
            <SubmitButton loading={isLoading}>
              Sign In To Your Account
            </SubmitButton>
          </div>
          
          {error && (
            <div className="bg-red-700/20 border border-red-600/30 rounded-lg p-3 mt-4" role="alert">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          
          {message && type && (
            <div className={`border rounded-lg p-3 mt-4 ${
              type === 'error' 
                ? 'bg-red-700/20 border-red-600/30 text-red-400' 
                : 'bg-green-700/20 border-green-600/30 text-green-400'
            }`} role="alert">
              <p className="text-sm text-center">{message}</p>
            </div>
          )}
        </form>
        
        <div className="text-center space-y-3 pt-4">
          <div>
            <Link
              href="/forgot-password"
              className="text-sm text-[#00A67E] hover:text-[#007567] transition-colors font-medium"
              tabIndex={isLoading ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>
          <div>
            <p className="text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-[#00A67E] hover:text-[#007567] hover:underline transition-colors"
                tabIndex={isLoading ? -1 : 0}
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
