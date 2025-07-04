import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { withIpThrottling, recordSuccessfulAuthAttempt } from '@/lib/usage-limits';
import logger from '@/utils/logger';
import { createAuthError, extractErrorMessage, logError, isError } from '@/lib/errors/errorHandling';

export async function POST(request: NextRequest) {
  // Apply IP throttling (5 attempts per 15 minutes)
  const throttleCheck = await withIpThrottling(5, 15);
  const throttleResult = await throttleCheck(request);
  
  if (throttleResult) {
    return throttleResult;
  }

  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const authError = createAuthError(error, 'signin', undefined, email);
      logError(authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      );
    }

    // Record successful authentication attempt
    await recordSuccessfulAuthAttempt(request);

    return NextResponse.json({ 
      success: true,
      user: data.user,
      session: data.session 
    });

  } catch (error: unknown) {
    const authError = createAuthError(error, 'signin', undefined, undefined);
    logError(authError);
    logger.error('Sign-in API error', isError(error) ? error : new Error(extractErrorMessage(error)));
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}