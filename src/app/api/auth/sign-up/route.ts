import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { withIpThrottling, recordSuccessfulAuthAttempt } from '@/lib/usage-limits';
import logger from '@/utils/logger';
import { createAuthError, extractErrorMessage, logError, isError } from '@/lib/errors/errorHandling';

export async function POST(request: NextRequest) {
  // Apply IP throttling (3 attempts per 15 minutes for sign-up)
  const throttleCheck = await withIpThrottling(3, 15);
  const throttleResult = await throttleCheck(request);
  
  if (throttleResult) {
    return throttleResult;
  }

  try {
    const { email, password, fullName } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    
    // Sign up the user with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          email,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    });

    if (signUpError) {
      const authError = createAuthError(signUpError, 'signup', undefined, email);
      logError(authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // If we have a user, ensure their profile is created
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: fullName || '',
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

    // Record successful authentication attempt
    await recordSuccessfulAuthAttempt(request);

    return NextResponse.json({ 
      success: true,
      message: 'Check your email for the confirmation link.',
      user: authData.user 
    });

  } catch (error: unknown) {
    const authError = createAuthError(error, 'signup', undefined, undefined);
    logError(authError);
    logger.error('Sign-up API error', isError(error) ? error : new Error(extractErrorMessage(error)));
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}