"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import logger from '@/utils/logger';
import { createAuthError, extractErrorMessage, logError, isError } from '@/lib/errors/errorHandling';

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

  const supabase = createClient(cookies());
  
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
      const authError = createAuthError(signUpError, 'signup', undefined, email);
      logError(authError);
      return { error: authError.message };
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
        const authError = createAuthError(profileError, 'signup', authData.user.id, authData.user.email);
        logError(authError);
        logger.error('Error creating user profile', isError(profileError) ? profileError : new Error(extractErrorMessage(profileError)), {
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
    const authError = createAuthError(error, 'signup', undefined, email, {
      hasFullName: Boolean(fullName)
    });
    logError(authError);
    logger.error('Signup error', isError(error) ? error : new Error(extractErrorMessage(error)), {
      email,
      hasFullName: Boolean(fullName),
    });
    return { error: authError.message };
  }
};

export const signInAction = async (prevState: unknown, formData: FormData): Promise<ActionResult> => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = createClient(cookies());
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const authError = createAuthError(error, 'signin', undefined, email);
      logError(authError);
      return { error: authError.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const authError = createAuthError(error, 'signin', undefined, email);
    logError(authError);
    return { error: authError.message };
  }
};

export const forgotPasswordAction = async (prevState: unknown, formData: FormData): Promise<ActionResult> => {
  const email = formData.get("email")?.toString();

  if (!email) {
    return { error: "Email is required" };
  }

  const supabase = createClient(cookies());
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      const authError = createAuthError(error, 'reset', undefined, email);
      logError(authError);
      return { error: authError.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const authError = createAuthError(error, 'reset', undefined, email);
    logError(authError);
    return { error: authError.message };
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

  const supabase = createClient(cookies());
  
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
    const authError = createAuthError(error, 'reset', undefined, undefined, { token: Boolean(token) });
    logError(authError);
    console.error("Error resetting password:", authError);
    return { 
      error: authError.message || "An error occurred while resetting your password. Please try again."
    };
  }
};

export const signOutAction = async (): Promise<ActionResult> => {
  const supabase = createClient(cookies());
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      const authError = createAuthError(error, 'signout');
      logError(authError);
      return { error: authError.message };
    }
    return { success: true };
  } catch (error: unknown) {
    const authError = createAuthError(error, 'signout');
    logError(authError);
    return { error: authError.message };
  }
};

export const checkUserSubscription = async (userId: string): Promise<boolean> => {
  // Placeholder implementation - replace with actual subscription check logic
  const supabase = createClient(cookies());
  
  try {
    // Check if user has an active subscription
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', userId)
      .single();
    
    if (error) {
      const authError = createAuthError(error, 'verify', userId);
      logError(authError);
      logger.error('Error checking subscription status', isError(error) ? error : new Error(extractErrorMessage(error)), { userId });
      return false;
    }
    
    return data?.subscription_status === 'active';
  } catch (error: unknown) {
    const authError = createAuthError(error, 'verify', userId);
    logError(authError);
    logger.error('Error checking user subscription', isError(error) ? error : new Error(extractErrorMessage(error)), { userId });
    return false;
  }
};
