// difficult: This service coordinates between multiple platform clients
// Ensure proper error handling and fallback mechanisms are in place

import { Platform, PlatformClient, PlatformPostMetrics, PlatformUserActivity } from './platforms/types';
import { PlatformClientFactory } from './platforms/platform-factory';
import { AuthStrategy } from './auth.types';

export interface PlatformAuth {
  platform: Platform;
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  };
}

export class DataCollectionService {
  private platformClients: Map<Platform, PlatformClient>;
  private isInitialized: boolean = false;

  constructor() {
    this.platformClients = new Map();
  }

  /**
   * Initialize the service with platform authentications
   * @param platformAuths Array of platform authentication details
   */
  async initialize(platformAuths: PlatformAuth[]): Promise<void> {
    if (this.isInitialized) {
      console.warn('DataCollectionService is already initialized');
      return;
    }

    try {
      for (const { platform, credentials } of platformAuths) {
        try {
          const client = await PlatformClientFactory.createClient(platform, { ...credentials, strategy: AuthStrategy.OAUTH2 }, {
            baseUrl: '',
            version: '',
            rateLimit: { requests: 100, perSeconds: 60 },
          });
          this.platformClients.set(platform, client);
          console.log(`Initialized ${platform} client successfully`);
        } catch (error) {
          console.error(`Failed to initialize ${platform} client:`, error);
          // Continue initializing other platforms even if one fails
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize DataCollectionService:', error);
      throw new Error('Failed to initialize data collection service');
    }
  }

  /**
   * Get post metrics from all available platforms
   * @param postId The post ID to get metrics for
   * @returns Record of platform to metrics mappings
   */
  async getPostMetrics(postId: string): Promise<Record<Platform, PlatformPostMetrics | null>> {
    this.ensureInitialized();
    
    const results: Record<Platform, PlatformPostMetrics | null> = {} as any;
    
    // Process platforms in parallel
    await Promise.all(
      Array.from(this.platformClients.entries()).map(async ([platform, client]) => {
        try {
          const response = await client.getPostMetrics(postId);
          if (response.data) {
            results[platform] = response.data;
          } else {
            console.warn(`Failed to get metrics for ${platform}:`, response.error);
            results[platform] = null;
          }
        } catch (error) {
          console.error(`Error getting metrics from ${platform}:`, error);
          results[platform] = null;
        }
      })
    );
    
    return results;
  }

  /**
   * Get user activity from all available platforms
   * @returns Record of platform to user activity mappings
   */
  async getUserActivity(): Promise<Record<Platform, PlatformUserActivity | null>> {
    this.ensureInitialized();
    
    const results: Record<Platform, PlatformUserActivity | null> = {} as any;
    
    // Process platforms in parallel
    await Promise.all(
      Array.from(this.platformClients.entries()).map(async ([platform, client]) => {
        try {
          const response = await client.getUserActivity();
          if (response.data) {
            results[platform] = response.data;
          } else {
            console.warn(`Failed to get user activity for ${platform}:`, response.error);
            results[platform] = null;
          }
        } catch (error) {
          console.error(`Error getting user activity from ${platform}:`, error);
          results[platform] = null;
        }
      })
    );
    
    return results;
  }

  /**
   * Get a specific platform client
   * @param platform The platform to get the client for
   * @returns The platform client instance
   */
  getPlatformClient(platform: Platform): PlatformClient {
    this.ensureInitialized();
    
    const client = this.platformClients.get(platform);
    if (!client) {
      throw new Error(`No client available for platform: ${platform}`);
    }
    
    return client;
  }

  /**
   * Ensure the service is initialized before performing operations
   * @private
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DataCollectionService has not been initialized. Call initialize() first.');
    }
  }
}
