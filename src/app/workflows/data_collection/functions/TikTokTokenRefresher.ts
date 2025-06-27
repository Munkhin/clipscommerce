// c:\SocialSchedule\src\app\data_collection\functions\TikTokTokenRefresher.ts
import { IPlatformTokenRefresher } from './AuthTokenManagerService';
import { OAuth2Credentials } from './authTypes';
import { AxiosInstance, AxiosError } from 'axios';

export class TikTokTokenRefresher implements IPlatformTokenRefresher {
  // Example: Verify actual endpoint from TikTok's documentation
  private static readonly TIKTOK_REFRESH_URL = 'https://open-api.tiktok.com/oauth/refresh_token/'; 
  // Or it might be something like: https://open.tiktokapis.com/v2/oauth/token/

  async refresh(credentials: OAuth2Credentials, httpClient: AxiosInstance): Promise<OAuth2Credentials> {
    console.log(`[TikTokTokenRefresher] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);

    if (!credentials.refreshToken) {
      throw new Error('TikTok: No refresh token provided.');
    }
    if (!credentials.clientId) { // TikTok usually requires client_key (client_id)
        throw new Error('TikTok: Client ID (client_key) not found in credentials.');
    }

    // TikTok's refresh token grant typically requires client_key and refresh_token
    // The grant_type is 'refresh_token'.
    // The exact parameter names (e.g., client_key vs client_id) must be verified.
    const params = new URLSearchParams();
    params.append('client_key', credentials.clientId); // Or 'client_id'
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', credentials.refreshToken);
    // params.append('client_secret', credentials.clientSecret); // If required by TikTok

    try {
      const response = await httpClient.post(
        TikTokTokenRefresher.TIKTOK_REFRESH_URL,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      // Verify response structure based on TikTok's API documentation
      // Expected fields: access_token, expires_in, refresh_token (possibly a new one), open_id, scope etc.
      if (!data.access_token || typeof data.expires_in === 'undefined' || !data.open_id) {
        console.error('[TikTokTokenRefresher] Invalid response from TikTok refresh API:', data);
        throw new Error('TikTok: Invalid refresh response from API. Missing required fields.');
      }

      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      console.log(`[TikTokTokenRefresher] Token refreshed. New expiry: ${newExpiresAt.toISOString()}`);

      return {
        ...credentials,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || credentials.refreshToken, // Use new refresh token if provided
        expiresAt: newExpiresAt,
        lastRefreshed: new Date(),
        metadata: {
          ...credentials.metadata,
          open_id: data.open_id, // Store open_id if returned
          scopes: data.scope ? data.scope.split(',') : credentials.scopes, // Update scopes
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const errorMessage = axiosError.response?.data?.error_description || axiosError.response?.data?.error?.message || axiosError.response?.data?.message || axiosError.message;
      console.error(`[TikTokTokenRefresher] Token refresh failed for ${credentials.platformName}:`, errorMessage, axiosError.response?.data);
      throw new Error(`TikTok token refresh failed: ${errorMessage}`);
    }
  }
}
