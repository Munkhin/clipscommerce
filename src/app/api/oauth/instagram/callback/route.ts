import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { extractErrorMessage } from '@/lib/errors/errorHandling';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  const cookieStore = await cookies();
  const storedState = cookieStore.get('instagram_oauth_state')?.value;

  // Clear the state cookie immediately after retrieving it
  if (cookieStore.has('instagram_oauth_state')) {
    cookieStore.delete('instagram_oauth_state');
  }

  // Handle OAuth errors from Instagram
  if (error) {
    console.error('Instagram OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/oauth-error?error=${error}&description=${errorDescription}`, request.url)
    );
  }

  // Validate state parameter for CSRF protection
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL('/oauth-error?error=state_validation_failed', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/oauth-error?error=code_missing', request.url)
    );
  }

  const instagramClientId = process.env.INSTAGRAM_CLIENT_ID;
  const instagramClientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const instagramRedirectUri = process.env.INSTAGRAM_REDIRECT_URI || 
    `${request.nextUrl.origin}/api/oauth/instagram/callback`;

  if (!instagramClientId || !instagramClientSecret) {
    return new NextResponse('Server configuration error for Instagram OAuth.', { status: 500 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: instagramClientId,
        client_secret: instagramClientSecret,
        grant_type: 'authorization_code',
        redirect_uri: instagramRedirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Instagram token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/oauth-error?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, user_id } = tokenData;

    if (!access_token || !user_id) {
      return NextResponse.redirect(
        new URL('/oauth-error?error=invalid_token_response', request.url)
      );
    }

    // Exchange short-lived token for long-lived token
    const longLivedTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${instagramClientSecret}&` +
      `access_token=${access_token}`,
      { method: 'GET' }
    );

    let finalAccessToken = access_token;
    let expiresAt = null;

    if (longLivedTokenResponse.ok) {
      const longLivedData = await longLivedTokenResponse.json();
      if (longLivedData.access_token) {
        finalAccessToken = longLivedData.access_token;
        // Long-lived tokens expire in 60 days
        expiresAt = new Date(Date.now() + (longLivedData.expires_in || 60 * 24 * 60 * 60) * 1000);
      }
    }

    // Get authenticated user
    const supabase = await createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Instagram OAuth callback: No authenticated user found in session');
      return NextResponse.redirect(
        new URL('/oauth-error?error=session_required', request.url)
      );
    }

    // Store credentials in database
    const { error: credentialsError } = await supabase
      .from('user_social_credentials')
      .upsert(
        {
          user_id: user.id,
          platform: 'instagram',
          access_token: finalAccessToken,
          refresh_token: null, // Instagram doesn't provide refresh tokens
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          platform_user_id: user_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );

    if (credentialsError) {
      console.error('Error saving Instagram credentials to database:', credentialsError);
      return NextResponse.redirect(
        new URL('/oauth-error?error=credentials_save_failed', request.url)
      );
    }

    // Set success cookie for UI feedback
    cookieStore.set('oauth_success', 'instagram', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    console.log(`Instagram OAuth successful for user ${user.id}, instagram_user_id: ${user_id}`);
    
    // Redirect to connect page with success status
    const successUrl = new URL('/dashboard/connect?platform=instagram&status=success', request.url);
    return NextResponse.redirect(successUrl);

  } catch (error: unknown) {
    console.error('Instagram OAuth callback error:', {
      error: extractErrorMessage(error),
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing'
    });
    
    return NextResponse.redirect(
      new URL('/oauth-error?error=internal_server_error', request.url)
    );
  }
}