import { Platform, PlatformAuth } from "@/types/platform";
import { InstagramApiClient } from "./instagram";
import { PlatformApiClient } from "./base";

type PlatformClientMap = {
  [K in Platform]?: new (auth: PlatformAuth) => PlatformApiClient;
};

// Map of platform types to their respective API client implementations
const platformClients: PlatformClientMap = {
  instagram: InstagramApiClient,
  // Add other platform clients here as they're implemented
  // twitter: TwitterApiClient,
  // tiktok: TiktokApiClient,
  // facebook: FacebookApiClient,
  // linkedin: LinkedInApiClient,
  // youtube: YouTubeApiClient,
};

/**
 * Factory class for creating platform-specific API clients
 */
export class PlatformApiFactory {
  /**
   * Create a platform API client instance
   */
  static createClient(platform: Platform, auth: PlatformAuth): PlatformApiClient {
    const ClientClass = platformClients[platform];
    
    if (!ClientClass) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    return new ClientClass(auth);
  }
  
  /**
   * Get a list of supported platforms
   */
  static getSupportedPlatforms(): Platform[] {
    return Object.keys(platformClients) as Platform[];
  }
  
  /**
   * Check if a platform is supported
   */
  static isPlatformSupported(platform: string): platform is Platform {
    return platform in platformClients;
  }
}

/**
 * Helper function to get a platform API client with error handling
 */
export async function getPlatformClient(platform: Platform, auth: PlatformAuth): Promise<PlatformApiClient> {
  try {
    const client = PlatformApiFactory.createClient(platform, auth);
    
    // Validate credentials
    const isValid = await client.validateCredentials();
    if (!isValid) {
      throw new Error(`Invalid credentials for ${platform}`);
    }
    
    return client;
  } catch (error) {
    console.error(`Error initializing ${platform} client:`, error);
    throw new Error(`Failed to initialize ${platform} client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to get multiple platform clients
 */
export async function getPlatformClients(
  platforms: Platform[],
  authProvider: (platform: Platform) => Promise<PlatformAuth | null>
): Promise<Map<Platform, PlatformApiClient>> {
  const clients = new Map<Platform, PlatformApiClient>();
  
  await Promise.all(
    platforms.map(async (platform) => {
      try {
        const auth = await authProvider(platform);
        if (auth) {
          const client = await getPlatformClient(platform, auth);
          clients.set(platform, client);
        }
      } catch (error) {
        console.error(`Skipping ${platform}:`, error);
      }
    })
  );
  
  return clients;
}
