import { TikTokClient } from '../../data_collection/functions/platforms/TikTokClient';
import { InstagramClient } from '../../data_collection/functions/platforms/InstagramClient';
import { YouTubeClient } from '../../data_collection/functions/platforms/YouTubeClient';
import type { PostMetrics, PaginatedResponse } from '../../data_collection/functions/types';
import { Platform } from '../../data_collection/lib/platforms/types';

interface CompetitorApiConfig {
  tiktokToken: string;
  instagramToken: string;
  youtubeToken: string;
}

export class CompetitorApiIntegrator {
  private tiktok: TikTokClient;
  private instagram: InstagramClient;
  private youtube: YouTubeClient;

  constructor(config: CompetitorApiConfig) {
    this.tiktok = new TikTokClient(config.tiktokToken);
    this.instagram = new InstagramClient(config.instagramToken);
    this.youtube = new YouTubeClient(config.youtubeToken);
  }

  async fetchCompetitorPosts(platform: Platform, usernameOrId: string, lookbackDays = 30): Promise<PaginatedResponse<PostMetrics> | PostMetrics[]> {
    switch (platform) {
      case 'tiktok':
        return this.tiktok.getCompetitorPosts(usernameOrId, lookbackDays);
      case 'instagram':
        return this.instagram.getCompetitorPosts(usernameOrId, lookbackDays);
      case 'youtube':
        return this.youtube.getCompetitorPosts(usernameOrId, lookbackDays);
      default:
        throw new Error('Unsupported platform');
    }
  }

  async dailyBatchSync(competitors: { platform: Platform; usernameOrId: string }[]): Promise<Record<string, PaginatedResponse<PostMetrics> | PostMetrics[]>> {
    const results: Record<string, PaginatedResponse<PostMetrics> | PostMetrics[]> = {};
    for (const c of competitors) {
      results[`${c.platform}:${c.usernameOrId}`] = await this.fetchCompetitorPosts(c.platform, c.usernameOrId);
    }
    return results;
  }
} 