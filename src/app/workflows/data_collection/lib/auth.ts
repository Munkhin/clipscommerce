import { createClient } from '@supabase/supabase-js';
import { IAuthTokenManager, PlatformClientIdentifier, PlatformCredentials, AuthStrategy, OAuth2Credentials, ApiKeyCredentials } from './auth.types';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';

export class SupabaseAuthTokenManager implements IAuthTokenManager {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getToken(identifier?: PlatformClientIdentifier): Promise<string | null> {
    if (!identifier) {
      return null;
    }

    const credentials = await this.getValidCredentials(identifier);
    if (!credentials) {
      return null;
    }

    if (credentials.strategy === AuthStrategy.OAUTH2) {
      return credentials.accessToken;
    } else if (credentials.strategy === AuthStrategy.API_KEY) {
      return credentials.apiKey;
    }

    return null;
  }

  async getValidCredentials(identifier: PlatformClientIdentifier): Promise<PlatformCredentials | null> {
    const { data, error } = await this.supabase
      .from('user_social_credentials')
      .select('*')
      .eq('user_id', identifier.userId)
      .eq('platform', identifier.platform)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if token is expired and refresh if necessary
    const expiresAt = new Date(data.expires_at).getTime() / 1000;
    const now = Date.now() / 1000;
    const bufferTime = 300; // 5 minutes buffer

    if (expiresAt - now < bufferTime && data.refresh_token) {
      try {
        const refreshedCredentials = await this.refreshToken(identifier, data.refresh_token);
        if (refreshedCredentials) {
          return refreshedCredentials;
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Continue with existing token if refresh fails
      }
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      tokenType: 'bearer',
      strategy: AuthStrategy.OAUTH2,
    } as OAuth2Credentials;
  }

  async storeCredentials(identifier: PlatformClientIdentifier, credentials: PlatformCredentials): Promise<void> {
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let expiresAt: number | undefined;

    if (credentials.strategy === AuthStrategy.OAUTH2) {
      const oauth2Creds = credentials as OAuth2Credentials;
      accessToken = oauth2Creds.accessToken;
      refreshToken = oauth2Creds.refreshToken;
      expiresAt = oauth2Creds.expiresAt;
    } else if (credentials.strategy === AuthStrategy.API_KEY) {
      const apiKeyCreds = credentials as ApiKeyCredentials;
      accessToken = apiKeyCreds.apiKey;
    }

    const { error } = await this.supabase
      .from('user_social_credentials')
      .upsert({
        user_id: identifier.userId,
        platform: identifier.platform,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
      });

    if (error) {
      throw error;
    }
  }

  async clearCredentials(identifier: PlatformClientIdentifier): Promise<void> {
    const { error } = await this.supabase
      .from('user_social_credentials')
      .delete()
      .eq('user_id', identifier.userId)
      .eq('platform', identifier.platform);

    if (error) {
      throw error;
    }
  }

  private async refreshToken(identifier: PlatformClientIdentifier, refreshToken: string): Promise<PlatformCredentials | null> {
    try {
      // Platform-specific token refresh logic
      let refreshUrl: string;
      let clientId: string | undefined;
      let clientSecret: string | undefined;

      switch (identifier.platform) {
        case 'tiktok':
          refreshUrl = 'https://open-api.tiktok.com/oauth/refresh_token/';
          clientId = process.env.TIKTOK_CLIENT_ID;
          clientSecret = process.env.TIKTOK_CLIENT_SECRET;
          break;
        case 'instagram':
          refreshUrl = 'https://graph.instagram.com/refresh_access_token';
          clientId = process.env.INSTAGRAM_CLIENT_ID;
          clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
          break;
        case 'youtube':
          refreshUrl = 'https://oauth2.googleapis.com/token';
          clientId = process.env.YOUTUBE_CLIENT_ID;
          clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
          break;
        default:
          throw new Error(`Token refresh not supported for platform: ${identifier.platform}`);
      }

      if (!clientId || !clientSecret) {
        throw new Error(`Missing client credentials for platform: ${identifier.platform}`);
      }

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();
      
      const newCredentials: PlatformCredentials = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Some platforms don't return new refresh token
        expiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
        tokenType: tokenData.token_type || 'bearer',
        strategy: AuthStrategy.OAUTH2,
      };

      // Store the refreshed credentials
      await this.storeCredentials(identifier, newCredentials);
      
      return newCredentials;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  async getAuthUrl(platform: Platform): Promise<string> {
    let baseUrl: string;
    let clientId: string | undefined;
    let redirectUri: string;
    let scopes: string;

    const baseRedirectUri = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    switch (platform) {
      case 'tiktok':
        baseUrl = 'https://www.tiktok.com/auth/authorize/';
        clientId = process.env.TIKTOK_CLIENT_ID;
        redirectUri = `${baseRedirectUri}/api/oauth/tiktok/callback`;
        scopes = 'user.info.basic,video.list';
        break;
      case 'instagram':
        baseUrl = 'https://api.instagram.com/oauth/authorize';
        clientId = process.env.INSTAGRAM_CLIENT_ID;
        redirectUri = `${baseRedirectUri}/api/oauth/instagram/callback`;
        scopes = 'user_profile,user_media';
        break;
      case 'youtube':
        baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        clientId = process.env.YOUTUBE_CLIENT_ID;
        redirectUri = `${baseRedirectUri}/api/oauth/youtube/callback`;
        scopes = 'https://www.googleapis.com/auth/youtube.readonly';
        break;
      default:
        throw new Error(`OAuth not supported for platform: ${platform}`);
    }

    if (!clientId) {
      throw new Error(`Missing client ID for platform: ${platform}`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state: Math.random().toString(36).substring(2, 15), // Simple state for CSRF protection
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async handleCallback(platform: Platform, code: string): Promise<PlatformCredentials> {
    let tokenUrl: string;
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    let redirectUri: string;

    const baseRedirectUri = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    switch (platform) {
      case 'tiktok':
        tokenUrl = 'https://open-api.tiktok.com/oauth/access_token/';
        clientId = process.env.TIKTOK_CLIENT_ID;
        clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        redirectUri = `${baseRedirectUri}/api/oauth/tiktok/callback`;
        break;
      case 'instagram':
        tokenUrl = 'https://api.instagram.com/oauth/access_token';
        clientId = process.env.INSTAGRAM_CLIENT_ID;
        clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
        redirectUri = `${baseRedirectUri}/api/oauth/instagram/callback`;
        break;
      case 'youtube':
        tokenUrl = 'https://oauth2.googleapis.com/token';
        clientId = process.env.YOUTUBE_CLIENT_ID;
        clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
        redirectUri = `${baseRedirectUri}/api/oauth/youtube/callback`;
        break;
      default:
        throw new Error(`OAuth callback not supported for platform: ${platform}`);
    }

    if (!clientId || !clientSecret) {
      throw new Error(`Missing client credentials for platform: ${platform}`);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
      tokenType: tokenData.token_type || 'bearer',
      strategy: AuthStrategy.OAUTH2,
    };
  }
}
