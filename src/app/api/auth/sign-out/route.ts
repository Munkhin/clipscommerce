import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/utils/logger';
import { createAuthError, extractErrorMessage, logError, isError } from '@/lib/errors/errorHandling';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      const authError = createAuthError(error, 'signout');
      logError(authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Signed out successfully.'
    });

  } catch (error: unknown) {
    const authError = createAuthError(error, 'signout');
    logError(authError);
    logger.error('Sign-out API error', isError(error) ? error : new Error(extractErrorMessage(error)));
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}