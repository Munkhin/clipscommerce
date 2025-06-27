import axios, { AxiosInstance, AxiosError } from 'axios';
import { OAuth2Credentials, IPlatformTokenRefresher } from '../authTypes';

const YOUTUBE_REFRESH_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface YouTubeTokenRefreshResponse {
  access_token: string;
  expires_in: number; // TTL in seconds
  refresh_token?: string; // Google might issue a new refresh token
  scope?: string; // Space-separated list of scopes
  token_type: string; // Should be 'Bearer'
  error?: string; // e.g., 'invalid_grant'
  error_description?: string;
}

export class YouTubeTokenRefresher implements IPlatformTokenRefresher {
  async refresh(credentials: OAuth2Credentials, httpClient: AxiosInstance): Promise<OAuth2Credentials> {
    if (!credentials.refreshToken) {
      throw new Error('[YouTubeTokenRefresher] No refresh token provided.');
    }
    if (!credentials.clientId) {
      throw new Error('[YouTubeTokenRefresher] No client ID provided in credentials.');
    }
    if (!credentials.clientSecret) {
      throw new Error('[YouTubeTokenRefresher] No client secret provided in credentials.');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', credentials.refreshToken);
    params.append('client_id', credentials.clientId);
    params.append('client_secret', credentials.clientSecret);

    try {
      console.log(`[YouTubeTokenRefresher] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
      const response = await httpClient.post<YouTubeTokenRefreshResponse>(
        YOUTUBE_REFRESH_TOKEN_ENDPOINT,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const tokenData = response.data;

      if (tokenData.error) {
        console.error(`[YouTubeTokenRefresher] YouTube API error during token refresh: ${tokenData.error} - ${tokenData.error_description}`);
        const errorDetail = {
            response: { data: { error: tokenData.error, error_description: tokenData.error_description }, status: response.status || 400 }
        } as Partial<AxiosError>; 
        throw new AxiosError(
            `YouTube token refresh failed: ${tokenData.error_description || tokenData.error}`,
            tokenData.error.toUpperCase(), // Use error string as code, e.g., INVALID_GRANT
            undefined,
            undefined,
            errorDetail.response
        );
      }

      if (!tokenData.access_token || typeof tokenData.expires_in === 'undefined') {
        console.error('[YouTubeTokenRefresher] Invalid response received from YouTube token refresh endpoint.', tokenData);
        throw new Error('Invalid response from YouTube token refresh: missing access_token or expires_in.');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

      const newCredentials: OAuth2Credentials = {
        ...credentials,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || credentials.refreshToken, // Use new refresh token if provided
        expiresAt: expiresAt,
        lastRefreshed: now,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : credentials.scopes,
      };

      console.log(`[YouTubeTokenRefresher] Successfully refreshed YouTube token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
      return newCredentials;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>; 
        console.error(
          `[YouTubeTokenRefresher] Axios error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`,
          axiosError.message,
          axiosError.response?.data
        );
        throw axiosError; 
      } else {
        let errorMessage = 'An unknown error occurred during YouTube token refresh.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        console.error(
            `[YouTubeTokenRefresher] Generic error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`,
            errorMessage,
            error 
        );
        throw new Error(`Generic error during YouTube token refresh: ${errorMessage}`);
      }
    }
  }
}
