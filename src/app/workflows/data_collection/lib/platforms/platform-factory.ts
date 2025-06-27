import { Platform } from '../../../deliverables/types/deliverables_types';
import { PlatformClient, ApiConfig as PlatformSpecificApiConfig } from './types'; // Renamed ApiConfig
import { TikTokClient } from './tiktok-client';
import { InstagramClient } from './instagram-client';
import { YouTubeClient } from './youtube-client';
import { AuthTokenManagerService } from '../auth-token-manager.service';
import { IAuthTokenManager, PlatformCredentials } from '../auth.types';

/**
 * Factory class to create platform-specific clients
 */
export class PlatformClientFactory {
  /**
   * Creates a platform client based on the specified platform.
   * @param platform The social media platform.
   * @param initialCredentials The initial credentials for the platform.
   * @param platformSpecificConfig Configuration specific to the platform (baseUrl, version, rateLimit).
   * @param userId Optional user identifier for multi-user scenarios.
   * @returns A Promise resolving to a PlatformClient instance.
   */
  static async createClient(
    platform: Platform,
    initialCredentials: PlatformCredentials,
    platformSpecificConfig: PlatformSpecificApiConfig, // This is the ApiConfig from ./types
    userId?: string
  ): Promise<PlatformClient> {
    const authTokenManager = new AuthTokenManagerService();
    await authTokenManager.storeCredentials({ platform, userId }, initialCredentials);

    // Concrete clients (TikTokClient, etc.) will be responsible for constructing the
    // full ApiConfig required by BasePlatformClient's super() call, using platformSpecificConfig.
    // Their constructors will need to be updated to accept: (platformSpecificConfig, authTokenManager, userId)
    switch (platform) {
      case Platform.TIKTOK:
        return new TikTokClient(platformSpecificConfig, authTokenManager, userId);
      case Platform.INSTAGRAM:
        return new InstagramClient(platformSpecificConfig, authTokenManager, userId);
      case Platform.YOUTUBE:
        return new YouTubeClient(
          platformSpecificConfig as PlatformSpecificApiConfig,
          authTokenManager as IAuthTokenManager,
          userId as (string | undefined)
        );
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Creates multiple platform clients at once.
   * @param clientSetupConfigs Array of configurations for each client.
   * @returns A Promise resolving to a Record of platform to client mappings.
   */
  static async createClients(
    clientSetupConfigs: Array<{
      platform: Platform;
      initialCredentials: PlatformCredentials;
      platformSpecificConfig: PlatformSpecificApiConfig;
      userId?: string;
    }>
  ): Promise<Record<Platform, PlatformClient>> {
    const clients: Record<Platform, PlatformClient> = {} as Record<Platform, PlatformClient>;
    for (const { platform, initialCredentials, platformSpecificConfig, userId } of clientSetupConfigs) {
      clients[platform] = await this.createClient(platform, initialCredentials, platformSpecificConfig, userId);
    }
    return clients;
  }
}
