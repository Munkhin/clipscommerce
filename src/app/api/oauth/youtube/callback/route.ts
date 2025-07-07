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
  const storedState = cookieStore.get('youtube_oauth_state')?.value;

  // Clear the state cookie immediately after retrieving it
  if (cookieStore.has('youtube_oauth_state')) {
    cookieStore.delete('youtube_oauth_state');
  }

  // Handle OAuth errors from Google
  if (error) {
    console.error('YouTube OAuth error:', error, errorDescription);
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

  const youtubeClientId = process.env.YOUTUBE_CLIENT_ID;
  const youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const youtubeRedirectUri = process.env.YOUTUBE_REDIRECT_URI || 
    `${request.nextUrl.origin}/api/oauth/youtube/callback`;

  if (!youtubeClientId || !youtubeClientSecret) {
    return new NextResponse('Server configuration error for YouTube OAuth.', { status: 500 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: youtubeClientId,
        client_secret: youtubeClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: youtubeRedirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('YouTube token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/oauth-error?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return NextResponse.redirect(
        new URL('/oauth-error?error=invalid_token_response', request.url)
      );
    }

    // Get YouTube channel info to get the channel ID
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    let channelId = null;
    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      if (channelData.items && channelData.items.length > 0) {
        channelId = channelData.items[0].id;
      }
    }

    // Calculate expiration time
    const expiresAt = expires_in ? 
      new Date(Date.now() + expires_in * 1000) : 
      new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Get authenticated user
    const supabase = await createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('YouTube OAuth callback: No authenticated user found in session');
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
          platform: 'youtube',
          access_token: access_token,
          refresh_token: refresh_token,
          expires_at: expiresAt.toISOString(),
          platform_user_id: channelId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );

    if (credentialsError) {
      console.error('Error saving YouTube credentials to database:', credentialsError);
      return NextResponse.redirect(
        new URL('/oauth-error?error=credentials_save_failed', request.url)
      );
    }

    // Set success cookie for UI feedback
    cookieStore.set('oauth_success', 'youtube', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    console.log(`YouTube OAuth successful for user ${user.id}, channel_id: ${channelId}`);
    
    // Redirect to connect page with success status
    const successUrl = new URL('/dashboard/connect?platform=youtube&status=success', request.url);
    return NextResponse.redirect(successUrl);

  } catch (error: unknown) {
    console.error('YouTube OAuth callback error:', {
      error: extractErrorMessage(error),
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing'
    });
    
    return NextResponse.redirect(
      new URL('/oauth-error?error=internal_server_error', request.url)
    );
  }
}