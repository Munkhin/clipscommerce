import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { withIpThrottling, recordSuccessfulAuthAttempt } from '@/lib/usage-limits';
import logger from '@/utils/logger';
import { createAuthError, extractErrorMessage, logError, isError } from '@/lib/errors/errorHandling';

export async function POST(request: NextRequest) {
  // Apply IP throttling (3 attempts per 15 minutes for password reset)
  const throttleCheck = await withIpThrottling(3, 15);
  const throttleResult = await throttleCheck(request);
  
  if (throttleResult) {
    return throttleResult;
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      const authError = createAuthError(error, 'reset', undefined, email);
      logError(authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Record successful authentication attempt
    await recordSuccessfulAuthAttempt(request);

    return NextResponse.json({ 
      success: true,
      message: 'Password reset link sent to your email.'
    });

  } catch (error: unknown) {
    const authError = createAuthError(error, 'reset', undefined, undefined);
    logError(authError);
    logger.error('Forgot password API error', isError(error) ? error : new Error(extractErrorMessage(error)));
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}