// c:\SocialSchedule\src\app\data_collection\functions\YouTubeTokenRefresher.ts
import { IPlatformTokenRefresher } from './AuthTokenManagerService';
import { OAuth2Credentials } from './authTypes';
import { AxiosInstance, AxiosError } from 'axios';

export class YouTubeTokenRefresher implements IPlatformTokenRefresher {
  // Google's OAuth2 token endpoint
  private static readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

  async refresh(credentials: OAuth2Credentials, httpClient: AxiosInstance): Promise<OAuth2Credentials> {
    console.log(`[YouTubeTokenRefresher] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);

    if (!credentials.refreshToken) {
      throw new Error('YouTube: No refresh token provided.');
    }
    if (!credentials.clientId) {
      throw new Error('YouTube: Client ID not found in credentials.');
    }
    // Google often requires client_secret for server-side refresh flows.
    if (!credentials.clientSecret) {
        console.warn('[YouTubeTokenRefresher] Client Secret is typically required for YouTube/Google token refresh. Proceeding without it, but refresh may fail.');
        // Depending on the OAuth client type (e.g., public vs. confidential), client_secret might not be used.
        // However, for server-to-server communication, it's standard.
    }

    const params = new URLSearchParams();
    params.append('client_id', credentials.clientId);
    if (credentials.clientSecret) { // Only include if available
        params.append('client_secret', credentials.clientSecret);
    }
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', credentials.refreshToken);

    try {
      const response = await httpClient.post(
        YouTubeTokenRefresher.GOOGLE_TOKEN_URL,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      // Expected fields: access_token, expires_in, scope.
      // Google might not return a new refresh_token unless specifically configured or for certain flows.
      if (!data.access_token || typeof data.expires_in === 'undefined') {
        console.error('[YouTubeTokenRefresher] Invalid response from Google refresh API:', data);
        throw new Error('YouTube: Invalid refresh response from API. Missing access_token or expires_in.');
      }

      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      console.log(`[YouTubeTokenRefresher] Token refreshed. New expiry: ${newExpiresAt.toISOString()}`);

      return {
        ...credentials,
        accessToken: data.access_token,
        // Google usually doesn't return a new refresh token on every refresh.
        // Keep the existing one unless a new one is explicitly provided.
        refreshToken: data.refresh_token || credentials.refreshToken,
        expiresAt: newExpiresAt,
        lastRefreshed: new Date(),
        scopes: data.scope ? data.scope.split(' ') : credentials.scopes, // Scopes are space-separated for Google
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const errorData = axiosError.response?.data;
      const errorMessage = errorData?.error_description || errorData?.error || axiosError.message;
      console.error(`[YouTubeTokenRefresher] Token refresh failed for ${credentials.platformName}:`, errorMessage, errorData);
      throw new Error(`YouTube token refresh failed: ${errorMessage}`);
    }
  }
}
