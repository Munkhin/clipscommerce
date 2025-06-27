import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { URL } from "url";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const redirectTo = requestUrl.searchParams.get("redirect_to") || "/dashboard";

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent(errorDescription || 'Authentication failed')}&type=error`,
        requestUrl.origin
      )
    );
  }

  // Handle email confirmation
  if (code) {
    const supabase = await createClient();
    
    try {
      const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (authError) {
        return NextResponse.redirect(
          new URL(
            `/sign-in?error=${encodeURIComponent('Failed to authenticate. Please try signing in again.')}&type=error`,
            requestUrl.origin
          )
        );
      }

      // Check if this is an email confirmation
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        return NextResponse.redirect(
          new URL(
            `/dashboard?message=${encodeURIComponent('Email confirmed successfully!')}&type=success`,
            requestUrl.origin
          )
        );
      }
    } catch (e) {
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeURIComponent('An unexpected error occurred. Please try again.')}&type=error`,
          requestUrl.origin
        )
      );
    }
  }

  // Default redirect
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}