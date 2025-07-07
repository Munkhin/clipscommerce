"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", email);
    
    try {
      const result = await forgotPasswordAction(null, formData);
      if (result?.success) {
        router.push(
          `/sign-in?message=${encodeURIComponent('Password reset link sent! Please check your email.')}&type=success`
        );
      } else if (result?.error?.includes('401')) {
        setError('Authentication failed. Please check your email and try again.');
      } else {
        setError(result?.error || "An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 p-8 shadow-2xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-gray-400">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#8D5AFF] focus:border-transparent rounded-xl h-12 transition-all"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#00A67E] to-[#007567] hover:from-[#00A67E]/90 hover:to-[#007567]/90 text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#00A67E]/20 h-12"
              disabled={isLoading}
            >
              {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400">
            Remember your password?{" "}
            <Link
              href="/sign-in"
              className="text-[#00A67E] hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
