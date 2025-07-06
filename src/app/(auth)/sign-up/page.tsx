"use client";

export const dynamic = 'force-dynamic';

import { signUpAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

function SubmitButton({ 
  children, 
  loading = false 
}: { 
  children: React.ReactNode; 
  loading?: boolean 
}) {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      className="w-full bg-gradient-to-r from-[#00A67E] to-[#007567] hover:from-[#00A67E]/90 hover:to-[#007567]/90 text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#00A67E]/20 h-12"
      disabled={loading || pending}
    >
      {(loading || pending) ? 'Creating account...' : children}
    </Button>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Get message and type from URL search params
  const message = searchParams?.get('message');
  const type = searchParams?.get('type') as 'success' | 'error' | 'info' | 'warning' | null;
  
  // Get plan parameters from URL
  const plan = searchParams?.get('plan');
  const billing = searchParams?.get('billing');
  const priceId = searchParams?.get('priceId');
  const price = searchParams?.get('price');

  useEffect(() => {
    if (state?.success) {
      // If coming from pricing page, redirect to sign-in with plan parameters
      if (plan && (priceId || price)) {
        const signInParams = new URLSearchParams({
          message: 'Account created successfully! Please check your email to confirm your account.',
          type: 'success',
          plan: plan,
          billing: billing || 'monthly',
          ...(priceId ? { priceId } : {}),
          ...(price ? { price } : {})
        });
        router.push(`/sign-in?${signInParams.toString()}`);
      } else {
        router.push("/sign-in?message=Account created successfully! Please check your email to confirm your account.&type=success");
      }
    }
  }, [state, router, plan, billing, priceId, price]);

  const handleFormAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await signUpAction(null, formData);
      setState(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        setState({ error: 'Authentication failed. Please check your credentials and try again.' });
      } else {
        setState({ error: 'An error occurred during sign up' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00A67E] to-[#007567] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#8D5AFF]/20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#5afcc0]/10 rounded-full filter blur-3xl"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Logo/Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#00A67E] to-[#007567] rounded-2xl mb-4">
              <Image
                src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png"
                alt="ClipsCommerce Logo"
                width={48}
                height={48}
                className="object-contain p-1 invert"
                priority
              />
            </div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create an Account</h1>
              <p className="text-gray-300">
                Already have an account?{" "}
                <Link 
                  href={plan && (priceId || price) 
                    ? `/sign-in?plan=${plan}&billing=${billing || 'monthly'}${priceId ? `&priceId=${encodeURIComponent(priceId)}` : ''}${price ? `&price=${price}` : ''}` 
                    : "/sign-in"
                  } 
                  className="text-[#00A67E] hover:text-[#007567]/80 font-medium transition-colors"
                  tabIndex={isLoading ? -1 : 0}
                >
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
              <form onSubmit={handleFormAction} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300 font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#8D5AFF] focus:border-transparent rounded-xl h-12 transition-all"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300 font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      required
                      className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#8D5AFF] focus:border-transparent rounded-xl h-12 transition-all pr-12"
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
                
                <SubmitButton loading={isLoading}>
                  Create Your Account
                </SubmitButton>
                
                {state?.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4" role="alert">
                    <div className="text-red-400 text-sm text-center">
                      {state.error}
                    </div>
                  </div>
                )}
                
                {message && (
                  <div className={`border rounded-xl p-4 ${
                    type === 'error' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                      : 'bg-green-500/10 border-green-500/20 text-green-400'
                  }`} role="alert">
                    <div className="text-sm text-center">
                      {message}
                    </div>
                  </div>
                )}
              </form>
              
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <p className="text-xs text-gray-400 text-center">
                  By creating an account, you agree to our{" "}
                  <Link href="/terms" className="text-[#00A67E] hover:text-[#007567]/80 transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#00A67E] hover:text-[#007567]/80 transition-colors">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
