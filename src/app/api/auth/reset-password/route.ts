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
    const { password, confirmPassword, token } = await request.json();
    
    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    
    // First verify the token
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError) {
      const authError = createAuthError(verifyError, 'reset', undefined, undefined, { token: Boolean(token) });
      logError(authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Then update the password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      const authError = createAuthError(error, 'reset', undefined, undefined, { token: Boolean(token) });
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
      message: 'Password reset successfully.'
    });

  } catch (error: unknown) {
    const authError = createAuthError(error, 'reset', undefined, undefined);
    logError(authError);
    logger.error('Reset password API error', isError(error) ? error : new Error(extractErrorMessage(error)));
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}