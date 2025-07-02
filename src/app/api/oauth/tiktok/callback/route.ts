import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AuthTokenManagerService } from '../../../../workflows/data_collection/lib/auth-token-manager.service';
import { PlatformEnum } from '@/app/workflows/deliverables/types/deliverables_types';
import { PlatformClientIdentifier } from '../../../../workflows/data_collection/lib/auth.types';
import { extractErrorMessage } from '@/lib/errors/errorHandling';


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // For CSRF protection
  const cookieStore = await cookies();
  const storedState = cookieStore.get('tiktok_oauth_state')?.value;

  // Clear the state cookie immediately after retrieving it, regardless of validation outcome
  if (cookieStore.has('tiktok_oauth_state')) {
    cookieStore.delete('tiktok_oauth_state');
  }

  if (!state || !storedState || state !== storedState) {
    // Redirect to an error page or return an error response
    return NextResponse.redirect(new URL('/oauth-error?error=state_validation_failed', request.url));
  }

  // IMPORTANT: Validate the 'state' parameter to prevent CSRF attacks.
  // This typically involves:
  // 1. Generating a unique 'state' string before redirecting the user to TikTok's authorization URL.
  // 2. Storing this 'state' (e.g., in an HTTPOnly cookie or a short-lived server-side session).
  // 3. Comparing the stored 'state' with the 'state' parameter received in this callback.
  // If they don't match, the request must be rejected.
  // For now, this is a placeholder for actual state validation logic.
  // The actual validation logic is now above.

  if (!code) {
    return NextResponse.redirect(new URL('/oauth-error?error=code_missing', request.url));
  }

  const tiktokClientId = process.env.TIKTOK_CLIENT_ID;
  const tiktokClientSecret = process.env.TIKTOK_CLIENT_SECRET;
  // The TIKTOK_REDIRECT_URI must be the exact URL of this endpoint, as registered with TikTok.
  // Use environment variable if set, otherwise construct from request origin
  const tiktokRedirectUri = process.env.TIKTOK_REDIRECT_URI || `${request.nextUrl.origin}/api/oauth/tiktok/callback`;

  if (!tiktokClientId || !tiktokClientSecret) {
    // This is a server configuration issue, should not redirect with sensitive info.
    return new NextResponse('Server configuration error for TikTok OAuth.', { status: 500 });
  }
  if (!tiktokRedirectUri) {
    return new NextResponse('Server configuration error for TikTok OAuth Redirect URI.', { status: 500 });
  }

  const authTokenManager = new AuthTokenManagerService();
  const platformId: PlatformClientIdentifier = {
    platform: PlatformEnum.TIKTOK,
    // userId is not known at this point; AuthTokenManagerService will use open_id from TikTok's response
  };

  try {
    const credentials = await authTokenManager.exchangeAuthCodeForToken(
      platformId,
      code,
      tiktokClientId,
      tiktokClientSecret,
      tiktokRedirectUri
    );

    if (credentials && credentials.accessToken) {
      // Successful authentication - set up secure user session
      const supabase = createClient(cookies());
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('TikTok OAuth callback: No authenticated user found in session');
        return NextResponse.redirect(new URL('/oauth-error?error=session_required', request.url));
      }

      try {
        // Store social credentials in database for the authenticated user
        const { error: credentialsError } = await supabase
          .from('user_social_credentials')
          .upsert(
            {
              user_id: user.id,
              platform: 'tiktok',
              access_token: credentials.accessToken,
              refresh_token: credentials.refreshToken,
              expires_at: credentials.expiresAt ? new Date(credentials.expiresAt * 1000).toISOString() : null,
              platform_user_id: credentials.openId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform' }
          );

        if (credentialsError) {
          console.error('Error saving TikTok credentials to database:', credentialsError);
          return NextResponse.redirect(new URL('/oauth-error?error=credentials_save_failed', request.url));
        }

        // Set secure session cookie with OAuth success flag
        const cookieStore = await cookies();
        cookieStore.set('oauth_success', 'tiktok', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 300, // 5 minutes - just for UI feedback
        });

        console.log(`TikTok OAuth successful for user ${user.id}, openId: ${credentials.openId}`);
        
        // Redirect to dashboard with success status
        const successUrl = new URL('/dashboard?platform=tiktok&status=success', request.url);
        return NextResponse.redirect(successUrl);
      } catch (dbError: unknown) {
        console.error('Database error during TikTok OAuth callback:', extractErrorMessage(dbError));
        return NextResponse.redirect(new URL('/oauth-error?error=database_error', request.url));
      }
    } else {
      return NextResponse.redirect(new URL('/oauth-error?error=token_exchange_failed', request.url));
    } 
  } catch (error: unknown) {
    // Log the error for debugging (without exposing sensitive details)
    console.error('TikTok OAuth callback error:', {
      error: extractErrorMessage(error),
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing'
    });
    
    // Avoid redirecting with potentially sensitive error details from internal exceptions.
    return NextResponse.redirect(new URL('/oauth-error?error=internal_server_error', request.url));
  }
}
