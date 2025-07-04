// Re-export the standardized platform types
export type { Platform, PlatformDisplay } from '../../../types/platform';
export { PlatformEnum } from '../../../types/platform';

// Legacy enum for backward compatibility - this will be deprecated
export enum LegacyPlatform {
  TIKTOK = "TikTok",
  INSTAGRAM = "Instagram", 
  FACEBOOK = "Facebook",
  YOUTUBE = "YouTube",
}

// Other shared deliverable types can be added here in the future. 