// Platform type - using string literals to match src/types/platform.ts
export type Platform = 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'linkedin' | 'youtube';

// For backward compatibility, keep enum available
export enum PlatformEnum {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
}
// Add other stubs as needed 