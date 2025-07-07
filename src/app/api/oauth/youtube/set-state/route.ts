import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { authGuard } from '@/lib/security/auth-guard';

export async function POST(request: NextRequest) {
  // Apply security guard for authenticated users only
  const guardResult = await authGuard(request, {
    requireAuth: true,
    requireCsrf: true,
    rateLimit: {
      identifier: 'oauth-state-generation',
      requests: 10,
      window: '5m'
    }
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  try {
    const state = crypto.randomBytes(32).toString('hex');
    const cookieStore = await cookies();

    cookieStore.set('youtube_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
    });

    return NextResponse.json({ state });
  } catch (error) {
    console.error('Error generating or setting YouTube OAuth state:', error);
    return NextResponse.json(
      { error: 'Failed to prepare for YouTube authentication.' },
      { status: 500 }
    );
  }
}