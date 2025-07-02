// Centralized platform type definitions
export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'twitter' | 'linkedin';

// Enum version for compatibility
export enum PlatformEnum {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram', 
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin'
}

// Capitalized versions for API responses and display
export type PlatformDisplay = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Twitter' | 'LinkedIn';

// Mapping between lowercase and display versions
export const PLATFORM_DISPLAY_MAP: Record<Platform, PlatformDisplay> = {
  tiktok: 'TikTok',
  instagram: 'Instagram', 
  youtube: 'YouTube',
  facebook: 'Facebook',
  twitter: 'Twitter',
  linkedin: 'LinkedIn'
};

// Reverse mapping
export const DISPLAY_PLATFORM_MAP: Record<PlatformDisplay, Platform> = {
  TikTok: 'tiktok',
  Instagram: 'instagram',
  YouTube: 'youtube', 
  Facebook: 'facebook',
  Twitter: 'twitter',
  LinkedIn: 'linkedin'
};

// Auth-related types
export interface PlatformAuth {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}