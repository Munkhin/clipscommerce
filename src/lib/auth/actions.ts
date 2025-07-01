"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import logger from '@/utils/logger';

type ActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  data?: unknown;
};

export const signUpAction = async (prevState: unknown, formData: FormData): Promise<ActionResult> => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || '';
  
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long" };
  }

  const supabase = createClient();
  
  try {
    // First, sign up the user with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          email,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    // If we have a user, ensure their profile is created
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        logger.error('Error creating user profile', profileError as Error, {
          userId: authData.user.id,
          email: authData.user.email,
        });
        // Don't fail the signup if profile creation fails, just log it
      }
    }

    return { 
      success: true, 
      message: 'Check your email for the confirmation link.',
      data: authData 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign up";
    logger.error('Signup error', error as Error, {
      email,
      hasFullName: Boolean(fullName),
    });
    return { error: errorMessage };
  }
};

export const signInAction = async (prevState: unknown, formData: FormData): Promise<ActionResult> => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = createClient();
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign in";
    return { error: errorMessage };
  }
};

export const forgotPasswordAction = async (prevState: unknown, formData: FormData): Promise<ActionResult> => {
  const email = formData.get("email")?.toString();

  if (!email) {
    return { error: "Email is required" };
  }

  const supabase = createClient();
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return { error: errorMessage };
  }
};

export const resetPasswordAction = async (prevState: unknown, formData: FormData): Promise<ActionResult> => {
  const password = formData.get("password")?.toString() || '';
  const confirmPassword = formData.get("confirmPassword")?.toString() || '';
  const token = formData.get("token")?.toString();

  if (!password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long" };
  }

  if (!token) {
    return { error: "Invalid or expired reset token" };
  }

  const supabase = createClient();
  
  try {
    // First verify the token
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError) {
      throw verifyError;
    }

    // Then update the password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error resetting password:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred while resetting your password. Please try again.";
    return { 
      error: errorMessage
    };
  }
};

export const signOutAction = async (): Promise<ActionResult> => {
  const supabase = createClient();
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign out";
    return { error: errorMessage };
  }
};

export const checkUserSubscription = async (userId: string): Promise<boolean> => {
  // Placeholder implementation - replace with actual subscription check logic
  const supabase = createClient();
  
  try {
    // Check if user has an active subscription
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error('Error checking subscription status', error as Error, { userId });
      return false;
    }
    
    return data?.subscription_status === 'active';
  } catch (error: unknown) {
    logger.error('Error checking user subscription', error as Error, { userId });
    return false;
  }
};
