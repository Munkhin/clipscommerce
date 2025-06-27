import axios, { AxiosInstance, AxiosError } from 'axios'; // Added default import for axios
import { OAuth2Credentials, IPlatformTokenRefresher } from '../authTypes'; // Adjusted import path

// TODO: Verify and update this with the actual TikTok OAuth2 token endpoint URL
const TIKTOK_TOKEN_ENDPOINT = 'https://open-api.tiktok.com/oauth/token/';

interface TikTokTokenRefreshResponse {
  access_token: string;
  refresh_token?: string; // TikTok might or might not issue a new refresh token
  expires_in: number; // Typically in seconds
  scope?: string;
  open_id?: string;
  error?: string;
  error_description?: string;
}

export class TikTokTokenRefresher implements IPlatformTokenRefresher {
  async refresh(credentials: OAuth2Credentials, httpClient: AxiosInstance): Promise<OAuth2Credentials> {
    if (!credentials.refreshToken) {
      throw new Error('[TikTokTokenRefresher] No refresh token provided.');
    }
    if (!credentials.clientId) {
      throw new Error('[TikTokTokenRefresher] No client ID provided in credentials.');
    }
    if (!credentials.clientSecret) {
      throw new Error('[TikTokTokenRefresher] No client secret provided in credentials.');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', credentials.refreshToken);
    params.append('client_id', credentials.clientId);
    params.append('client_secret', credentials.clientSecret);

    try {
      console.log(`[TikTokTokenRefresher] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
      const response = await httpClient.post<TikTokTokenRefreshResponse>(
        TIKTOK_TOKEN_ENDPOINT,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const tokenData = response.data;

      if (tokenData.error) {
        console.error(`[TikTokTokenRefresher] TikTok API error during token refresh: ${tokenData.error} - ${tokenData.error_description}`);
        // Specific handling for 'invalid_grant' which often means the refresh token itself is bad.
        if (tokenData.error === 'invalid_grant') {
            // The AuthTokenManagerService will handle deleting credentials if an AxiosError with 'invalid_grant' is thrown.
            // Here, we ensure the error is propagated correctly.
            const errorDetail = {
                response: { data: { error: tokenData.error, error_description: tokenData.error_description }, status: 400 }
            } as Partial<AxiosError>; // Simulate parts of AxiosError for consistent handling upstream
            throw new AxiosError(
                `TikTok token refresh failed: ${tokenData.error_description || tokenData.error}`,
                'TIKTOK_INVALID_GRANT',
                undefined,
                undefined,
                errorDetail.response
            );
        }
        throw new Error(`TikTok token refresh failed: ${tokenData.error_description || tokenData.error}`);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

      const newCredentials: OAuth2Credentials = {
        ...credentials, // Preserve platformName, userId, strategy, metadata, etc.
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || credentials.refreshToken, // Use new refresh token if provided, else keep old
        expiresAt: expiresAt,
        lastRefreshed: now,
        scopes: tokenData.scope ? tokenData.scope.split(',') : credentials.scopes,
      };

      console.log(`[TikTokTokenRefresher] Successfully refreshed token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
      return newCredentials;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>; // Keep 'any' for generic Axios error data
        console.error(
          `[TikTokTokenRefresher] Axios error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`,
          axiosError.message,
          axiosError.response?.data
        );
        // Re-throw to allow AuthTokenManagerService to handle (e.g., delete credentials on invalid_grant)
        throw axiosError; 
      } else {
        console.error(
            `[TikTokTokenRefresher] Generic error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`,
            (error as Error).message
        );
        throw new Error(`Generic error during TikTok token refresh: ${(error as Error).message}`);
      }
    }
  }
}
