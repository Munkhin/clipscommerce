// Re-export all types and interfaces
export * from './platforms/types';

// Re-export the platform factory
export * from './platforms/platform-factory';

// Export platform-specific clients
export { TikTokClient } from './platforms/tiktok-client';
export { InstagramClient } from './platforms/instagram-client';
export { YouTubeClient } from './platforms/youtube-client';

// Export the main service
export { DataCollectionService } from './data-collection-service';

// Re-export types from data collection service
export type { PlatformAuth } from './data-collection-service';
