"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token_hash || type !== "email_change") {
        setStatus("success");
        setMessage("Email verification link is invalid or expired.");
        return;
      }

      const supabase = createClient();

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "email_change",
        });

        if (error) {
          throw error;
        }

        setStatus("success");
        setMessage("Your email has been verified successfully!");
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/dashboard?message=${encodeURIComponent('Email verified successfully!')}&type=success`);
        }, 3000);
      } catch (error: any) {
        console.error("Error confirming email:", error);
        setStatus("error");
        setMessage(error.message || "An error occurred while verifying your email.");
      }
    };

    confirmEmail();
  }, [token_hash, type, router, next]);

  return (
    <div className="min-h-screen bg-dominator-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-dominator-dark/50 p-8 backdrop-blur-sm border border-dominator-dark/50 shadow-2xl text-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {status === "loading"
                ? "Verifying your email..."
                : status === "success"
                ? "Email Verified!"
                : "Verification Failed"}
            </h1>
            <p className="text-dominator-300">{message}</p>
          </div>

          {status === "success" && (
            <div className="pt-4">
              <Button asChild className="w-full">
                <Link href="/sign-in">Go to Sign In</Link>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="pt-4 space-y-4">
              <Button asChild className="w-full">
                <Link href="/sign-up">Back to Sign Up</Link>
              </Button>
              <p className="text-sm text-dominator-400">
                Need help? Contact our support team at{" "}
                <a
                  href="mailto:support@example.com"
                  className="text-dominator-blue hover:underline"
                >
                  support@example.com
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
