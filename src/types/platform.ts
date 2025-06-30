export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
  };
}

export interface Analytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export type Platform = 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'linkedin' | 'youtube';

export interface PlatformAuth {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  userId?: string;
  username?: string;
  scopes?: string[];
}