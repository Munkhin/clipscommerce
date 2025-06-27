"use client";

import { signUpAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useEffect, useState, useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      className="w-full bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:from-[#8D5AFF]/90 hover:to-[#5afcc0]/90 text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#8D5AFF]/20 h-12"
      disabled={loading || pending}
    >
      {(loading || pending) ? 'Creating account...' : children}
    </Button>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState(signUpAction, null);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { pending } = useFormStatus();
  
  // Get message and type from URL search params
  const message = searchParams?.get('message');
  const type = searchParams?.get('type') as 'success' | 'error' | 'info' | 'warning' | null;

  useEffect(() => {
    if (state?.success) {
      router.push("/sign-in?message=Account created successfully! Please check your email to confirm your account.&type=success");
    } else if (state?.error) {
      setFormError(state.error);
    }
  }, [state, router]);

  const handleFormAction = async (formData: FormData) => {
    setIsLoading(true);
    setFormError(null);
    try {
      await formAction(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#8D5AFF]/20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#5afcc0]/10 rounded-full filter blur-3xl"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Logo/Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] rounded-2xl mb-4">
                <span className="text-2xl font-bold text-white">CC</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create an Account</h1>
              <p className="text-gray-300">
                Already have an account?{" "}
                <Link 
                  href="/sign-in" 
                  className="text-[#8D5AFF] hover:text-[#8D5AFF]/80 font-medium transition-colors"
                  tabIndex={isLoading ? -1 : 0}
                >
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
              <form action={handleFormAction} className="space-y-6">
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
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a strong password"
                    required
                    className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#8D5AFF] focus:border-transparent rounded-xl h-12 transition-all"
                    disabled={isLoading}
                  />
                </div>
                
                <SubmitButton loading={isLoading}>
                  Create Your Account
                </SubmitButton>
                
                {state?.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
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
                  }`}>
                    <div className="text-sm text-center">
                      {message}
                    </div>
                  </div>
                )}
              </form>
              
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <p className="text-xs text-gray-400 text-center">
                  By creating an account, you agree to our{" "}
                  <Link href="/terms" className="text-[#8D5AFF] hover:text-[#8D5AFF]/80 transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#8D5AFF] hover:text-[#8D5AFF]/80 transition-colors">
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
