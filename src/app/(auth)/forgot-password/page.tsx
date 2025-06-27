"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [state, formAction] = useFormState(forgotPasswordAction, null);
  const { pending } = useFormStatus();

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
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dominator-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-dominator-dark/50 p-8 backdrop-blur-sm border border-dominator-dark/50 shadow-2xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-dominator-300">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-dominator-dark/50 border-dominator-dark/50 text-white placeholder-dominator-400"
                disabled={isLoading || pending}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-dominator-blue to-dominator-magenta hover:from-dominator-blue/90 hover:to-dominator-magenta/90 text-white font-semibold py-2.5 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(0,245,255,0.5)]"
              disabled={isLoading || pending}
            >
              {isLoading || pending ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>
          </form>

          <p className="text-center text-sm text-dominator-400">
            Remember your password?{" "}
            <Link
              href="/sign-in"
              className="text-dominator-100 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
