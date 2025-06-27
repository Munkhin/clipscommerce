import axios, { AxiosInstance, AxiosError } from 'axios';
import { OAuth2Credentials, IPlatformTokenRefresher } from '../authTypes';

const INSTAGRAM_REFRESH_TOKEN_ENDPOINT = 'https://graph.instagram.com/refresh_access_token';

interface InstagramTokenRefreshResponse {
  access_token: string;
  token_type: string; // Should be 'bearer'
  expires_in: number; // TTL in seconds for the new token
  error?: { // Standard Graph API error response
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export class InstagramTokenRefresher implements IPlatformTokenRefresher {
  async refresh(credentials: OAuth2Credentials, httpClient: AxiosInstance): Promise<OAuth2Credentials> {
    if (!credentials.accessToken) {
      throw new Error('[InstagramTokenRefresher] No access token provided in credentials to refresh.');
    }

    // Instagram's long-lived token refresh uses a POST request with grant_type and the current access_token
    // as per the tracker.md. Client ID/Secret are not typically used for this specific Instagram refresh call.
    const params = new URLSearchParams();
    params.append('grant_type', 'ig_refresh_token');
    params.append('access_token', credentials.accessToken);

    try {
      console.log(`[InstagramTokenRefresher] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
      const response = await httpClient.post<InstagramTokenRefreshResponse>(
        INSTAGRAM_REFRESH_TOKEN_ENDPOINT,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } 
        // Note: Some docs show GET, but tracker.md specifies POST. If issues arise, this might need re-evaluation.
      );

      const tokenData = response.data;

      if (tokenData.error) {
        console.error(`[InstagramTokenRefresher] Instagram API error during token refresh: ${tokenData.error.message} (Code: ${tokenData.error.code})`);
        // Propagate as an AxiosError-like structure if possible for consistent handling in AuthTokenManagerService
        const errorDetail = {
            response: { data: tokenData.error, status: response.status || 400 }
        } as Partial<AxiosError>; 
        throw new AxiosError(
            `Instagram token refresh failed: ${tokenData.error.message}`,
            String(tokenData.error.code),
            undefined,
            undefined,
            errorDetail.response
        );
      }
      
      if (!tokenData.access_token || !tokenData.expires_in) {
        console.error('[InstagramTokenRefresher] Invalid response received from Instagram token refresh endpoint.', tokenData);
        throw new Error('Invalid response from Instagram token refresh: missing access_token or expires_in.');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

      const newCredentials: OAuth2Credentials = {
        ...credentials,
        accessToken: tokenData.access_token,
        // Instagram long-lived token refresh doesn't typically return a new refresh_token.
        // The existing 'refreshToken' field in OAuth2Credentials might be unused or re-purposed if needed.
        refreshToken: credentials.refreshToken, // Keep existing if any, though not used in this refresh call
        expiresAt: expiresAt,
        lastRefreshed: now,
        // Scopes are generally not returned on refresh, retain existing scopes
      };

      console.log(`[InstagramTokenRefresher] Successfully refreshed Instagram token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
      return newCredentials;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>; 
        console.error(
          `[InstagramTokenRefresher] Axios error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`,
          axiosError.message,
          axiosError.response?.data
        );
        throw axiosError; 
      } else {
        let errorMessage = 'An unknown error occurred during Instagram token refresh.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        console.error(
            `[InstagramTokenRefresher] Generic error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`,
            errorMessage,
            error // Log the original error object for more details
        );
        // Re-throw a generic error to ensure the refresh operation is marked as failed.
        // Specific error handling for non-Axios errors should ideally be more granular if needed.
        throw new Error(`Generic error during Instagram token refresh: ${errorMessage}`);
      }
    }
  }
}
