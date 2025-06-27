import { Platform } from '../functions/types'; // Using the Platform type from data_collection/functions/types
import {
  IAuthTokenManager,
  PlatformCredentials,
  OAuth2Credentials,
  AuthStrategy,
  PlatformClientIdentifier
} from './auth.types';
import axios from 'axios'; // For making HTTP requests in refreshOAuth2Token

// Placeholder for a more robust storage solution (e.g., database, secure store)
const credentialStore: Map<string, PlatformCredentials> = new Map();

export class AuthTokenManagerService implements IAuthTokenManager {
  private readonly TOKEN_EXPIRY_THRESHOLD_SECONDS = 300; // Refresh token if it expires within 5 minutes

  private generateStoreKey(id: PlatformClientIdentifier): string {
    return `${id.platform}:${id.userId || 'default'}`;
  }

  async getValidCredentials(id: PlatformClientIdentifier): Promise<PlatformCredentials | null> {
    const key = this.generateStoreKey(id);
    const credentials = credentialStore.get(key);

    if (!credentials) {
      console.warn(`[AuthTokenManager] No credentials found for ${key}`);
      return null;
    }

    if (credentials.strategy === AuthStrategy.OAUTH2) {
      const oauthCreds = credentials as OAuth2Credentials;
      const nowInSeconds = Date.now() / 1000;

      if (oauthCreds.expiresAt && oauthCreds.expiresAt < (nowInSeconds + this.TOKEN_EXPIRY_THRESHOLD_SECONDS)) {
        console.log(`[AuthTokenManager] OAuth2 token for ${key} is expired or nearing expiry. Attempting refresh.`);
        if (this.refreshOAuth2Token) {
          try {
            const refreshedCredentials = await this.refreshOAuth2Token(id, oauthCreds);
            if (refreshedCredentials) {
              await this.storeCredentials(id, refreshedCredentials);
              console.log(`[AuthTokenManager] OAuth2 token for ${key} refreshed successfully.`);
              return refreshedCredentials;
            }
            console.warn(`[AuthTokenManager] OAuth2 token refresh failed for ${key}. Returning stale token.`);
            return oauthCreds; // Return stale token if refresh failed but was attempted
          } catch (error) {
            console.error(`[AuthTokenManager] Error during token refresh for ${key}:`, error);
            return oauthCreds; // Return stale token on error
          }
        }
         console.warn(`[AuthTokenManager] refreshOAuth2Token method not available, but token for ${key} needs refresh.`);
         // If refresh mechanism isn't available but token is stale, behavior might depend on requirements
         // For now, return the stale token, assuming the caller or BasePlatformClient might handle it.
      }
      return oauthCreds;
    }
    return credentials;
  }

  async storeCredentials(id: PlatformClientIdentifier, credentials: PlatformCredentials): Promise<void> {
    const key = this.generateStoreKey(id);
    credentialStore.set(key, {
      ...credentials,
      lastRefreshedAt: new Date().toISOString(),
    });
    console.log(`[AuthTokenManager] Credentials stored/updated for ${key}`);
  }

  async clearCredentials(id: PlatformClientIdentifier): Promise<void> {
    const key = this.generateStoreKey(id);
    credentialStore.delete(key);
    console.log(`[AuthTokenManager] Credentials cleared for ${key}`);
  }

  /**
   * Refreshes an OAuth2 token.
   * This is a placeholder and needs to be adapted for specific platform OAuth2 refresh token flows.
   */
  async refreshOAuth2Token(
    id: PlatformClientIdentifier,
    currentCredentials: OAuth2Credentials
  ): Promise<OAuth2Credentials | null> {
    if (!currentCredentials.refreshToken) {
      console.warn(`[AuthTokenManager] No refresh token available for ${this.generateStoreKey(id)}. Cannot refresh.`);
      return null;
    }

    // --- PLATFORM-SPECIFIC REFRESH LOGIC --- 

    if (id.platform === 'instagram') {
      console.log(`[AuthTokenManager] Attempting to refresh Instagram OAuth2 token.`);
      // Instagram uses the long-lived access token itself to refresh.
      // The grant_type is 'ig_refresh_token'.
      // Endpoint: GET https://graph.instagram.com/refresh_access_token
      const instagramTokenEndpoint = 'https://graph.instagram.com/refresh_access_token';
      try {
        const response = await axios.get<
          { access_token: string; token_type: string; expires_in: number; }
        >(
          instagramTokenEndpoint,
          {
            params: {
              grant_type: 'ig_refresh_token',
              access_token: currentCredentials.accessToken,
            },
          }
        );

        const newCreds: OAuth2Credentials = {
          ...currentCredentials, // Keep clientId, clientSecret, original scope, etc.
          accessToken: response.data.access_token,
          // Instagram does not return a new refresh_token when refreshing a long-lived token.
          // The existing long-lived token's expiry is extended.
          refreshToken: currentCredentials.refreshToken, // Retain original if any was ever stored
          expiresAt: (Date.now() / 1000) + response.data.expires_in,
          lastRefreshedAt: new Date().toISOString(),
        };
        console.log('[AuthTokenManager] Instagram token refreshed successfully.');
        return newCreds;
      } catch (error) {
        let errorMessage = 'An unknown error occurred during Instagram token refresh';
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.error?.message || error.response?.data?.error_description || error.response?.data?.error || error.message;
          console.error(`[AuthTokenManager] Axios error refreshing Instagram token:`, errorMessage, error.response?.data);
          // Instagram might return specific error codes if the token is invalid or expired beyond refresh.
          // e.g., error.type === 'OAuthException' and error.code === 190
          if (error.response?.data?.error?.code === 190) { // Common code for invalid/expired token
            console.warn(`[AuthTokenManager] Instagram token is invalid or expired (OAuthException code 190). Clearing token.`);
            // Mark as expired to prevent further refresh attempts with this token
            await this.storeCredentials(id, { ...currentCredentials, accessToken: '', expiresAt: 0, refreshToken: undefined });
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          console.error(`[AuthTokenManager] Generic error refreshing Instagram token:`, errorMessage);
        } else {
          console.error(`[AuthTokenManager] Unknown error type refreshing Instagram token:`, error);
        }
        return null; // Indicate refresh failure
      }
    } else if (id.platform === 'tiktok') {
      console.log(`[AuthTokenManager] Attempting to refresh TikTok OAuth2 token.`);
      if (!currentCredentials.clientId || !currentCredentials.clientSecret) {
        console.error(`[AuthTokenManager] TikTok client_key (clientId) or client_secret not found in current credentials for ${this.generateStoreKey(id)}. Cannot refresh.`);
        return null;
      }
      const tiktokTokenEndpoint = 'https://open-api.tiktok.com/oauth/token/';
      try {
        const response = await axios.post<
          {
            access_token: string;
            expires_in: number;
            open_id?: string; // Optional, but good to capture if present
            refresh_expires_in?: number;
            refresh_token?: string;
            scope?: string;
            token_type?: string;
            // TikTok specific error structure
            data?: { description?: string; error_code?: number };
            error?: string; // For simpler error messages like 'invalid_grant'
            error_description?: string;
          }
        >(
          tiktokTokenEndpoint,
          new URLSearchParams({
            client_key: currentCredentials.clientId,
            client_secret: currentCredentials.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: currentCredentials.refreshToken,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        // Check for TikTok specific API errors in the response body
        if (response.data.error || (response.data.data && response.data.data.error_code !== 0 && response.data.data.error_code !== undefined)) {
          const errorCode = response.data.data?.error_code || response.data.error;
          const errorMessage = response.data.data?.description || response.data.error_description || 'TikTok API error during token refresh';
          console.error(`[AuthTokenManager] TikTok API error refreshing token: ${errorCode} - ${errorMessage}`, response.data);
          if (errorCode === 10010 || response.data.error === 'invalid_grant') { // 10010 is 'Invalid refresh token'
            console.warn(`[AuthTokenManager] TikTok refresh token is invalid or expired. Clearing token.`);
            await this.storeCredentials(id, { ...currentCredentials, accessToken: '', refreshToken: undefined, expiresAt: 0 });
          }
          return null;
        }

        const newCreds: OAuth2Credentials = {
          ...currentCredentials,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || currentCredentials.refreshToken, // TikTok usually provides a new refresh token
          expiresAt: (Date.now() / 1000) + response.data.expires_in,
          scope: response.data.scope || currentCredentials.scope,
          lastRefreshedAt: new Date().toISOString(),
          // Store open_id if available, might be useful for some TikTok APIs
          ...(response.data.open_id && { openId: response.data.open_id }),
        };
        console.log('[AuthTokenManager] TikTok token refreshed successfully.');
        return newCreds;
      } catch (error) {
        let errorMessage = 'An unknown error occurred during TikTok token refresh';
        if (axios.isAxiosError(error)) {
          // Error might be in error.response.data or error.response.data.data for TikTok
          const tiktokErrorData = error.response?.data?.data || error.response?.data;
          errorMessage = tiktokErrorData?.description || tiktokErrorData?.error_description || tiktokErrorData?.error || error.message;
          const errorCode = tiktokErrorData?.error_code || tiktokErrorData?.error;

          console.error(`[AuthTokenManager] Axios error refreshing TikTok token: ${errorCode} - ${errorMessage}`, error.response?.data);
          if (errorCode === 10010 || tiktokErrorData?.error === 'invalid_grant') { // 10010: Invalid refresh token
            console.warn(`[AuthTokenManager] TikTok refresh token rejected by API. Clearing token.`);
            await this.storeCredentials(id, { ...currentCredentials, accessToken: '', refreshToken: undefined, expiresAt: 0 });
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          console.error(`[AuthTokenManager] Generic error refreshing TikTok token:`, errorMessage);
        } else {
          console.error(`[AuthTokenManager] Unknown error type refreshing TikTok token:`, error);
        }
        return null; // Indicate refresh failure
      }
    } else {
      // Generic placeholder for other platforms or if platform is not Instagram
      console.log(`[AuthTokenManager] Attempting to refresh OAuth2 token for ${id.platform} using generic refresh token flow.`);
      if (!currentCredentials.refreshToken) {
        console.warn(`[AuthTokenManager] No refresh token available for ${this.generateStoreKey(id)} using generic flow. Cannot refresh.`);
        return null;
      }
      const tokenEndpoint = `https://auth.example-platform.com/oauth/token`; // Placeholder!
      const clientId = currentCredentials.clientId || 'YOUR_PLATFORM_CLIENT_ID'; // Placeholder!
      const clientSecret = currentCredentials.clientSecret || 'YOUR_PLATFORM_CLIENT_SECRET'; // Placeholder!

      try {
        const response = await axios.post<
          { access_token: string; refresh_token?: string; expires_in: number; scope?: string }
        >(
          tokenEndpoint,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: currentCredentials.refreshToken,
            client_id: clientId,
            client_secret: clientSecret, // Some platforms require client secret for refresh
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        const newCreds: OAuth2Credentials = {
          ...currentCredentials,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || currentCredentials.refreshToken, // Keep old if new one not provided
          expiresAt: (Date.now() / 1000) + response.data.expires_in,
          scope: response.data.scope || currentCredentials.scope,
          lastRefreshedAt: new Date().toISOString(),
        };
        console.log(`[AuthTokenManager] Token refreshed successfully for ${id.platform} (generic flow).`);
        return newCreds;
      } catch (error) { // Keep the original generic error handling for non-Instagram platforms

      let errorMessage = 'An unknown error occurred during token refresh';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error_description || error.response?.data?.error || error.message;
        console.error(`[AuthTokenManager] Axios error refreshing token for ${id.platform}:`, errorMessage, error.response?.data);
        // Optionally, if refresh token is rejected (e.g., invalid_grant), clear it to prevent retry loops.
        if (error.response?.data?.error === 'invalid_grant') {
          console.warn(`[AuthTokenManager] Refresh token for ${id.platform} was rejected (invalid_grant). Clearing it.`);
          await this.storeCredentials(id, { ...currentCredentials, refreshToken: undefined, expiresAt: 0 });
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`[AuthTokenManager] Generic error refreshing token for ${id.platform}:`, errorMessage);
      } else {
        console.error(`[AuthTokenManager] Unknown error type refreshing token for ${id.platform}:`, error);
      }
      return null;
      } // Closes catch for generic platform refresh
    }
    // --- END PLATFORM-SPECIFIC REFRESH LOGIC ---
  }

  async exchangeAuthCodeForToken(
    id: PlatformClientIdentifier,
    authCode: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuth2Credentials | null> {
    // --- PLATFORM-SPECIFIC AUTH CODE EXCHANGE LOGIC --- 
    if (id.platform === 'tiktok') {
      console.log(`[AuthTokenManager] Attempting to exchange auth code for TikTok token for user: ${id.userId || 'unknown'}.`);
      const tiktokTokenEndpoint = 'https://open-api.tiktok.com/oauth/token/';
      try {
        const response = await axios.post<
          {
            access_token: string;
            expires_in: number;
            open_id: string; 
            refresh_expires_in?: number;
            refresh_token: string;
            scope?: string;
            token_type?: string;
            data?: { description?: string; error_code?: number };
            error?: string; 
            error_description?: string;
          }
        >(
          tiktokTokenEndpoint,
          new URLSearchParams({
            client_key: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: redirectUri,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        if (response.data.error || (response.data.data && response.data.data.error_code !== 0 && response.data.data.error_code !== undefined)) {
          const errorCode = response.data.data?.error_code || response.data.error;
          const errorMessage = response.data.data?.description || response.data.error_description || 'TikTok API error during auth code exchange';
          console.error(`[AuthTokenManager] TikTok API error exchanging auth code: ${errorCode} - ${errorMessage}`, response.data);
          return null;
        }

        const newCreds: OAuth2Credentials = {
          strategy: AuthStrategy.OAUTH2,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt: (Date.now() / 1000) + response.data.expires_in,
          scope: response.data.scope,
          clientId: clientId, 
          clientSecret: clientSecret, 
          openId: response.data.open_id, 
          lastRefreshedAt: new Date().toISOString(),
        };
        
        // Use the open_id from TikTok as the userId for storing credentials
        const storeId: PlatformClientIdentifier = { platform: id.platform, userId: response.data.open_id };
        await this.storeCredentials(storeId, newCreds);
        console.log(`[AuthTokenManager] TikTok auth code exchanged and token stored successfully for open_id: ${response.data.open_id}.`);
        return newCreds;
      } catch (error) {
        let errorMessage = 'An unknown error occurred during TikTok auth code exchange';
        if (axios.isAxiosError(error)) {
          const tiktokErrorData = error.response?.data?.data || error.response?.data;
          errorMessage = tiktokErrorData?.description || tiktokErrorData?.error_description || tiktokErrorData?.error || error.message;
          const errorCode = tiktokErrorData?.error_code || tiktokErrorData?.error;
          console.error(`[AuthTokenManager] Axios error exchanging TikTok auth code: ${errorCode} - ${errorMessage}`, error.response?.data);
        } else if (error instanceof Error) {
          errorMessage = error.message;
          console.error(`[AuthTokenManager] Generic error exchanging TikTok auth code:`, errorMessage);
        } else {
          console.error(`[AuthTokenManager] Unknown error type exchanging TikTok auth code:`, error);
        }
        return null; 
      }
    } else {
      console.warn(`[AuthTokenManager] Auth code exchange not implemented for platform: ${id.platform}`);
      return null;
    }
  }
}
