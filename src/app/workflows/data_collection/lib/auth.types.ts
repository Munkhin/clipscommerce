import { Platform } from '../functions/types'; // Using the Platform type from data_collection/functions/types

// Defines the strategy used for authentication
export enum AuthStrategy {
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
}

export interface BaseCredentials {
  strategy: AuthStrategy;
  lastRefreshedAt?: string; // ISO string
}

export interface ApiKeyCredentials extends BaseCredentials {
  strategy: AuthStrategy.API_KEY;
  apiKey: string;
}

export interface OAuth2Credentials extends BaseCredentials {
  strategy: AuthStrategy.OAUTH2;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Timestamp (seconds since epoch)
  scope?: string;
  clientId?: string;
  clientSecret?: string;
  openId?: string; // Platform-specific user identifier (e.g., for TikTok)
}

export type PlatformCredentials = ApiKeyCredentials | OAuth2Credentials;

export interface PlatformClientIdentifier {
  platform: Platform;
  userId?: string;
}

export interface IAuthTokenManager {
  getValidCredentials(id: PlatformClientIdentifier): Promise<PlatformCredentials | null>;
  storeCredentials(id: PlatformClientIdentifier, credentials: PlatformCredentials): Promise<void>;
  clearCredentials(id: PlatformClientIdentifier): Promise<void>;
  refreshOAuth2Token?(id: PlatformClientIdentifier, currentCredentials: OAuth2Credentials): Promise<OAuth2Credentials | null>;
  exchangeAuthCodeForToken?(
    id: PlatformClientIdentifier,
    authCode: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuth2Credentials | null>;
}
