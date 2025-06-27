"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!token) {
      setError("Invalid or expired reset link");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);
      formData.append("token", token);
      
      const result = await resetPasswordAction(null, formData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(true);
      
      // Redirect to sign-in after a short delay
      setTimeout(() => {
        router.push(
          `/sign-in?message=${encodeURIComponent('Password reset successfully! Please sign in with your new password.')}&type=success`
        );
      }, 3000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      setError(error.message || "An error occurred while resetting your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dominator-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-dominator-dark/50 p-8 backdrop-blur-sm border border-dominator-dark/50 shadow-2xl text-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Password Reset Successful!</h1>
              <p className="text-dominator-300">
                Your password has been updated successfully. Redirecting to sign in...
              </p>
            </div>
            <Button asChild className="w-full">
              <a href="/sign-in">Go to Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dominator-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-dominator-dark/50 p-8 backdrop-blur-sm border border-dominator-dark/50 shadow-2xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Reset Your Password</h1>
            <p className="text-dominator-300">
              Enter your new password below.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={6}
                className="bg-dominator-dark/50 border-dominator-dark/50 text-white placeholder-dominator-400"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={6}
                className="bg-dominator-dark/50 border-dominator-dark/50 text-white placeholder-dominator-400"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-dominator-blue to-dominator-magenta hover:from-dominator-blue/90 hover:to-dominator-magenta/90 text-white font-semibold py-2.5 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(0,245,255,0.5)]"
              disabled={isLoading}
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </Button>
          </form>

          <p className="text-center text-sm text-dominator-400">
            Remember your password?{" "}
            <a
              href="/sign-in"
              className="text-dominator-100 hover:text-white font-medium transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
