import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST() {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const cookieStore = await cookies();

    cookieStore.set('tiktok_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/', // Cookie accessible for all paths
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
    });

    return NextResponse.json({ state });
  } catch (error) {
    console.error('Error generating or setting TikTok OAuth state:', error);
    return NextResponse.json(
      { error: 'Failed to prepare for TikTok authentication.' },
      { status: 500 }
    );
  }
}
