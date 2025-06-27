import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthTokenManagerService } from '../../../../workflows/data_collection/lib/auth-token-manager.service';
import { Platform } from '../../../../workflows/deliverables/types/deliverables_types';
import { PlatformClientIdentifier } from '../../../../workflows/data_collection/lib/auth.types';

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
    console.error('TikTok OAuth callback error: State validation failed. State from query:', state, 'Stored state from cookie:', storedState);
    // Redirect to an error page or return an error response
    return NextResponse.redirect(new URL('/oauth-error?error=state_validation_failed', request.url));
  }
  console.log('TikTok OAuth callback: State validation successful.');

  // IMPORTANT: Validate the 'state' parameter to prevent CSRF attacks.
  // This typically involves:
  // 1. Generating a unique 'state' string before redirecting the user to TikTok's authorization URL.
  // 2. Storing this 'state' (e.g., in an HTTPOnly cookie or a short-lived server-side session).
  // 3. Comparing the stored 'state' with the 'state' parameter received in this callback.
  // If they don't match, the request must be rejected.
  // For now, this is a placeholder for actual state validation logic.
  // The actual validation logic is now above.

  if (!code) {
    console.error('TikTok OAuth callback error: Authorization code parameter missing.');
    return NextResponse.redirect(new URL('/oauth-error?error=code_missing', request.url));
  }

  const tiktokClientId = process.env.TIKTOK_CLIENT_ID;
  const tiktokClientSecret = process.env.TIKTOK_CLIENT_SECRET;
  // The TIKTOK_REDIRECT_URI must be the exact URL of this endpoint, as registered with TikTok.
  // Use environment variable if set, otherwise construct from request origin
  const tiktokRedirectUri = process.env.TIKTOK_REDIRECT_URI || `${request.nextUrl.origin}/api/oauth/tiktok/callback`;

  if (!tiktokClientId || !tiktokClientSecret) {
    console.error('TikTok OAuth callback critical error: Missing TIKTOK_CLIENT_ID or TIKTOK_CLIENT_SECRET in environment variables.');
    // This is a server configuration issue, should not redirect with sensitive info.
    return new NextResponse('Server configuration error for TikTok OAuth.', { status: 500 });
  }
  if (!tiktokRedirectUri) {
    console.error('TikTok OAuth callback critical error: Missing TIKTOK_REDIRECT_URI in environment variables or could not determine from request.');
    return new NextResponse('Server configuration error for TikTok OAuth Redirect URI.', { status: 500 });
  }

  const authTokenManager = new AuthTokenManagerService();
  const platformId: PlatformClientIdentifier = {
    platform: Platform.TIKTOK,
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
      console.log(`TikTok OAuth successful for open_id: ${credentials.openId}. Access token obtained.`);
      // Successful authentication.
      // TODO: Set up a user session (e.g., using cookies or a session store).
      // Redirect to a success page, like a user dashboard.
      const successUrl = new URL('/dashboard?platform=tiktok&status=success', request.url);
      if (credentials.openId) {
        successUrl.searchParams.set('tiktok_user_id', credentials.openId);
      }
      return NextResponse.redirect(successUrl);
    } else {
      console.error('TikTok OAuth callback error: Failed to exchange authorization code for token.');
      return NextResponse.redirect(new URL('/oauth-error?error=token_exchange_failed', request.url));
    }
  } catch (error) {
    console.error('TikTok OAuth callback critical error: Exception during token exchange process.', error);
    // Avoid redirecting with potentially sensitive error details from internal exceptions.
    return NextResponse.redirect(new URL('/oauth-error?error=internal_server_error', request.url));
  }
}
