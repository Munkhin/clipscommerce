// Re-export the standardized platform types
export type { Platform, PlatformDisplay } from '../../../../types/platform';
export { PlatformEnum } from '../../../../types/platform';

// Legacy enum for backward compatibility - this will be deprecated
export enum LegacyPlatform {
  TIKTOK = "TikTok",
  INSTAGRAM = "Instagram", 
  FACEBOOK = "Facebook",
  YOUTUBE = "YouTube",
}

// Add other stubs as needed