// c:\SocialSchedule\src\app\data_collection\functions\InstagramTokenRefresher.ts
import { IPlatformTokenRefresher } from './AuthTokenManagerService';
import { OAuth2Credentials } from './authTypes';
import { AxiosInstance, AxiosError } from 'axios';

export class InstagramTokenRefresher implements IPlatformTokenRefresher {
  // Typically, the refresh URL is constant for a platform
  private static readonly INSTAGRAM_REFRESH_URL = 'https://graph.instagram.com/refresh_access_token'; // Example, verify actual endpoint

  async refresh(credentials: OAuth2Credentials, httpClient: AxiosInstance): Promise<OAuth2Credentials> {
    console.log(`[InstagramTokenRefresher] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);

    if (!credentials.accessToken) { 
      throw new Error('Instagram: No access token provided for refresh. Instagram long-lived token refresh requires current access token.');
    }

    // Instagram's refresh for long-lived tokens uses 'ig_refresh_token' grant type
    // and the current valid long-lived access token.
    
    try {
      const response = await httpClient.get(InstagramTokenRefresher.INSTAGRAM_REFRESH_URL, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: credentials.accessToken, // Key for Instagram long-lived token refresh
        },
      });

      const data = response.data;

      if (!data.access_token || !data.expires_in) {
        console.error('[InstagramTokenRefresher] Invalid response from Instagram refresh API:', data);
        throw new Error('Instagram: Invalid refresh response from API. Missing access_token or expires_in.');
      }

      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      console.log(`[InstagramTokenRefresher] Token refreshed. New expiry: ${newExpiresAt.toISOString()}`);

      return {
        ...credentials,
        accessToken: data.access_token,
        expiresAt: newExpiresAt,
        lastRefreshed: new Date(),
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.message;
      console.error(`[InstagramTokenRefresher] Token refresh failed for ${credentials.platformName}:`, errorMessage, axiosError.response?.data);
      
      throw new Error(`Instagram token refresh failed: ${errorMessage}`);
    }
  }
}
