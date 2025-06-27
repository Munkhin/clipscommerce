// c:\SocialSchedule\src\app\data_collection\functions\AuthTokenManagerService.ts
import {
  IAuthTokenManager,
  ITokenStore,
  PlatformCredentials,
  OAuth2Credentials,
  AuthStrategy,
  IPlatformTokenRefresher, // Added IPlatformTokenRefresher
} from './authTypes';
import axios, { AxiosInstance, AxiosError } from 'axios'; // For making HTTP requests
import { TikTokTokenRefresher } from './platforms/TikTokTokenRefresher'; // Import TikTok refresher
import { InstagramTokenRefresher } from './platforms/InstagramTokenRefresher'; // Import Instagram refresher
import { YouTubeTokenRefresher } from './platforms/YouTubeTokenRefresher'; // Import YouTube refresher

export class AuthTokenManagerService implements IAuthTokenManager {
  private tokenStore: ITokenStore;
  private httpClient: AxiosInstance;
  private platformRefreshers: Map<string, IPlatformTokenRefresher>; // Maps platformName to its refresher

  constructor(
    tokenStore: ITokenStore,
    httpClient?: AxiosInstance, // Optional: allows injecting a pre-configured Axios instance
    platformRefreshers?: Map<string, IPlatformTokenRefresher>
  ) {
    this.tokenStore = tokenStore;
    this.httpClient = httpClient || axios.create(); // Default Axios instance if not provided
    this.platformRefreshers = platformRefreshers || new Map();

    // Register known platform refreshers
    this.platformRefreshers.set('tiktok', new TikTokTokenRefresher());
    this.platformRefreshers.set('instagram', new InstagramTokenRefresher());
    this.platformRefreshers.set('youtube', new YouTubeTokenRefresher());
  }

  /**
   * Registers a token refresher for a specific platform.
   */
  public registerPlatformRefresher(platformName: string, refresher: IPlatformTokenRefresher): void {
    this.platformRefreshers.set(platformName, refresher);
  }

  async getValidCredentials(platformName: string, userId?: string): Promise<PlatformCredentials | null> {
    const credentials = await this.tokenStore.getCredentials(platformName, userId);

    if (!credentials) {
      console.warn(`[AuthTokenManager] No credentials found for platform: ${platformName}, user: ${userId || 'default'}`);
      return null;
    }

    if (credentials.strategy === AuthStrategy.OAUTH2) {
      const oauthCreds = credentials as OAuth2Credentials;
      const now = new Date();
      // Consider token expired if it's past expiry or within a short buffer (e.g., 5 minutes)
      const bufferMilliseconds = 5 * 60 * 1000; 
      const effectiveExpiryTime = oauthCreds.expiresAt ? new Date(oauthCreds.expiresAt.getTime() - bufferMilliseconds) : null;

      if (effectiveExpiryTime && effectiveExpiryTime <= now) {
        if (oauthCreds.refreshToken) {
          console.info(`[AuthTokenManager] Token for ${platformName} (user: ${userId || 'default'}) requires refresh. Attempting...`);
          try {
            const refreshedCredentials = await this.refreshCredentials(oauthCreds);
            return refreshedCredentials;
          } catch (error) {
            console.error(`[AuthTokenManager] Failed to refresh token for ${platformName} (user: ${userId || 'default'}):`, error);
            // If refresh fails (e.g., invalid_grant), the old credentials might be useless.
            // Depending on policy, you might delete them or return null.
            // For now, returning null to indicate no valid credentials.
            return null; 
          }
        } else {
          console.warn(`[AuthTokenManager] Token for ${platformName} (user: ${userId || 'default'}) is expired, but no refresh token is available.`);
          return null; // No way to refresh
        }
      }
    }
    // For API_KEY strategy or valid (non-expired) OAuth2 tokens, return as is.
    return credentials;
  }

  async refreshCredentials(credentials: OAuth2Credentials): Promise<OAuth2Credentials> {
    if (!credentials.refreshToken) {
      throw new Error('[AuthTokenManager] Cannot refresh: No refresh token available.');
    }

    const refresher = this.platformRefreshers.get(credentials.platformName);
    if (!refresher) {
      throw new Error(`[AuthTokenManager] No token refresher registered for platform: ${credentials.platformName}`);
    }

    console.log(`[AuthTokenManager] Attempting to refresh token for platform: ${credentials.platformName}, user: ${credentials.userId || 'default'}`);
    try {
      // Delegate to the platform-specific refresh logic
      const newCredentials = await refresher.refresh(credentials, this.httpClient);
      
      // Update the token store with the new credentials
      newCredentials.lastRefreshed = new Date(); // Update lastRefreshed timestamp
      await this.tokenStore.setCredentials(newCredentials);
      console.info(`[AuthTokenManager] Successfully refreshed and stored token for ${credentials.platformName} (user: ${credentials.userId || 'default'})`);
      return newCredentials;
    } catch (error) {
      console.error(`[AuthTokenManager] Error during token refresh for ${credentials.platformName} (user: ${credentials.userId || 'default'}):`, error);
      
      // Specific handling for 'invalid_grant' which often means the refresh token itself is bad.
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error === 'invalid_grant') {
          console.warn(`[AuthTokenManager] Refresh token for ${credentials.platformName} (user: ${credentials.userId || 'default'}) is invalid. Deleting credentials from store.`);
          await this.tokenStore.deleteCredentials(credentials.platformName, credentials.userId);
        }
      }
      throw error; // Re-throw to allow caller to handle
    }
  }
}

export type { IPlatformTokenRefresher };
