// c:\SocialSchedule\src\app\data_collection\functions\TokenStoreService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ITokenStore,
  PlatformCredentials,
  AuthStrategy,
  OAuth2Credentials,
  ApiKeyCredentials,
  BasePlatformCredentials,
} from './authTypes';

const TABLE_NAME = 'platform_auth_credentials';

// Helper type for database row structure
interface PlatformCredentialsRow extends Omit<BasePlatformCredentials, 'strategy' | 'metadata' | 'scopes'> {
  id?: string; // UUID from Supabase
  strategy: string; // AuthStrategy enum stored as string
  access_token?: string;
  refresh_token?: string;
  api_key?: string;
  expires_at?: string; // ISO string
  client_id?: string;
  client_secret?: string; // Should be managed via env vars / secrets manager
  scopes?: string[]; // Stored as JSONB or text[] in DB
  metadata?: Record<string, any>; // Stored as JSONB
  created_at?: string;
  updated_at?: string;
}

export class TokenStoreService implements ITokenStore {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  private mapRowToCredentials(row: PlatformCredentialsRow): PlatformCredentials {
    const base = {
      platformName: row.platformName,
      userId: row.userId,
      strategy: row.strategy as AuthStrategy,
      lastRefreshed: row.lastRefreshed ? new Date(row.lastRefreshed) : undefined,
      metadata: row.metadata,
    };

    if (row.strategy === AuthStrategy.OAUTH2) {
      return {
        ...base,
        strategy: AuthStrategy.OAUTH2,
        accessToken: row.access_token || '', // Should be decrypted here
        refreshToken: row.refresh_token, // Should be decrypted here
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        clientId: row.client_id,
        clientSecret: row.client_secret, // Avoid storing/retrieving directly if possible
        scopes: row.scopes,
      } as OAuth2Credentials;
    } else if (row.strategy === AuthStrategy.API_KEY) {
      return {
        ...base,
        strategy: AuthStrategy.API_KEY,
        apiKey: row.api_key || '', // Should be decrypted here
      } as ApiKeyCredentials;
    }
    throw new Error(`Unknown auth strategy in database: ${row.strategy}`);
  }

  private mapCredentialsToRow(credentials: PlatformCredentials): Omit<PlatformCredentialsRow, 'id' | 'created_at' | 'updated_at'> {
    const row: Partial<PlatformCredentialsRow> = {
      platformName: credentials.platformName,
      userId: credentials.userId,
      strategy: credentials.strategy,
      lastRefreshed: credentials.lastRefreshed ? new Date(credentials.lastRefreshed) : undefined,
      metadata: credentials.metadata,
    };

    if (credentials.strategy === AuthStrategy.OAUTH2) {
      const oauthCreds = credentials as OAuth2Credentials;
      // IMPORTANT: Encrypt accessToken and refreshToken before storing
      row.access_token = oauthCreds.accessToken; // Encrypt here
      row.refresh_token = oauthCreds.refreshToken; // Encrypt here
      row.expires_at = oauthCreds.expiresAt?.toISOString();
      row.client_id = oauthCreds.clientId;
      // row.client_secret = oauthCreds.clientSecret; // Avoid storing if possible
      row.scopes = oauthCreds.scopes;
    } else if (credentials.strategy === AuthStrategy.API_KEY) {
      const apiKeyCreds = credentials as ApiKeyCredentials;
      // IMPORTANT: Encrypt apiKey before storing
      row.api_key = apiKeyCreds.apiKey; // Encrypt here
    }
    return row as Omit<PlatformCredentialsRow, 'id' | 'created_at' | 'updated_at'>;
  }

  async getCredentials(platformName: string, userId?: string): Promise<PlatformCredentials | null> {
    let query = this.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('platformName', platformName);

    if (userId) {
      query = query.eq('userId', userId);
    } else {
      query = query.is('userId', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching credentials:', error);
      throw new Error(`Failed to fetch credentials: ${error.message}`);
    }

    return data ? this.mapRowToCredentials(data as PlatformCredentialsRow) : null;
  }

  async setCredentials(credentials: PlatformCredentials): Promise<void> {
    const rowData = this.mapCredentialsToRow(credentials);
    
    // Upsert logic: update if exists, insert if not.
    // Supabase upsert needs a conflict target.
    // Assuming you have unique constraints like: 
    // 1. UNIQUE(platformName, userId) where userId IS NOT NULL
    // 2. UNIQUE(platformName) where userId IS NULL
    // This might require two separate upsert calls or careful constraint naming.
    // For simplicity, using a common case, adjust based on your DB schema.
    const { error } = await this.supabase
      .from(TABLE_NAME)
      .upsert(rowData, { 
        onConflict: 'platformName,userId', // This assumes userId is part of a composite key or you have a way to handle nulls in constraints.
                                         // If userId can be null, a single onConflict like this might not work as expected for all cases.
                                         // You might need to query first then insert/update, or use specific constraint names.
      });

    if (error) {
      console.error('Error setting credentials:', error);
      throw new Error(`Failed to set credentials: ${error.message}`);
    }
  }

  async deleteCredentials(platformName: string, userId?: string): Promise<void> {
    let query = this.supabase
      .from(TABLE_NAME)
      .delete()
      .eq('platformName', platformName);

    if (userId) {
      query = query.eq('userId', userId);
    } else {
      query = query.is('userId', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting credentials:', error);
      throw new Error(`Failed to delete credentials: ${error.message}`);
    }
  }
}

// Example of how you might instantiate it (if Supabase client is globally available)
// export const tokenStoreService = new TokenStoreService(supabase);

// Stub for getSupabaseClient if not exported elsewhere
function getSupabaseClient() { return undefined as any; }
