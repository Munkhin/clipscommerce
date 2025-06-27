export type Platform = 'instagram' | 'twitter' | 'tiktok' | 'facebook' | 'linkedin' | 'youtube';

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  credentials: Record<string, any>;
  settings: {
    autoPost: boolean;
    optimalTimes: boolean;
    autoRespond: boolean;
  };
}

export interface PlatformMetrics {
  followers: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgReach: number;
  lastUpdated: Date;
}

export interface PlatformAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}
