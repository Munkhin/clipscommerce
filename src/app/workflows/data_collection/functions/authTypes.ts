export enum AuthStrategy {
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  // Add other strategies as needed
}

export interface BasePlatformCredentials {
  platformName: string; // e.g., 'instagram', 'tiktok'
  userId?: string; // Optional user identifier associated with these credentials
  strategy: AuthStrategy;
  lastRefreshed?: Date;
  metadata?: Record<string, any>; // For any other platform-specific details
}

export interface OAuth2Credentials extends BasePlatformCredentials {
  strategy: AuthStrategy.OAUTH2;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date; // Timestamp when the access token expires
  clientId?: string;
  clientSecret?: string; // Store securely, ideally not here directly. Consider environment variables or a secret manager.
  scopes?: string[];
}

export interface ApiKeyCredentials extends BasePlatformCredentials {
  strategy: AuthStrategy.API_KEY;
  apiKey: string;
}

export type PlatformCredentials = OAuth2Credentials | ApiKeyCredentials;

// Interface for a secure store for credentials
export interface ITokenStore {
  getCredentials(platformName: string, userId?: string): Promise<PlatformCredentials | null>;
  setCredentials(credentials: PlatformCredentials): Promise<void>;
  deleteCredentials(platformName: string, userId?: string): Promise<void>;
}

// Interface for managing authentication tokens, including refresh logic
export interface IAuthTokenManager {
  getValidCredentials(platformName: string, userId?: string): Promise<PlatformCredentials | null>;
  refreshCredentials(credentials: OAuth2Credentials): Promise<OAuth2Credentials>;
  // This might also include methods to initiate an OAuth flow for a platform/user
}

// Interface for platform-specific token refresh logic
export interface IPlatformTokenRefresher {
  /**
   * Refreshes an OAuth2 token.
   * @param credentials The current OAuth2 credentials containing the refresh token.
   * @param httpClient An Axios instance to make the refresh request.
   * @returns A Promise resolving to the new OAuth2Credentials.
   * @throws Error if refresh fails.
   */
  refresh(credentials: OAuth2Credentials, httpClient: import('axios').AxiosInstance): Promise<OAuth2Credentials>;
}
