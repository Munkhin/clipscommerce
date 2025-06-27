import { BaseRepository } from './baseRepository';
import {
  RawTikTokVideo,
  CreateRawTikTokVideoDto,
  UpdateRawTikTokVideoDto,
  RawTikTokUser,
  CreateRawTikTokUserDto,
  UpdateRawTikTokUserDto,
  TikTokApiVideoNode,
  TikTokApiUserNode,
} from '../../../types/tiktokTypes';

export class TikTokVideoRepository extends BaseRepository<
  RawTikTokVideo,
  CreateRawTikTokVideoDto,
  UpdateRawTikTokVideoDto
> {
  constructor() {
    super('raw_tiktok_videos');
  }

  async findByPlatformVideoId(platformVideoId: string): Promise<RawTikTokVideo | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('video_id', platformVideoId) // 'video_id' is the TikTok platform's video ID
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error(
        `Error finding TikTok video by platform ID ${platformVideoId} in ${this.tableName}:`,
        error.message
      );
      return null;
    }
    return data as RawTikTokVideo;
  }

  async findVideosByPlatformUserId(platformUserId: string): Promise<RawTikTokVideo[]> {
    return this.findByColumn('platform_user_id', platformUserId, { sortBy: 'timestamp', sortOrder: 'desc' });
  }
}

export class TikTokUserRepository extends BaseRepository<
  RawTikTokUser,
  CreateRawTikTokUserDto,
  UpdateRawTikTokUserDto
> {
  constructor() {
    super('raw_tiktok_users');
  }

  async findByPlatformUserId(platformUserId: string): Promise<RawTikTokUser | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('platform_user_id', platformUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error(
        `Error finding TikTok user by platform ID ${platformUserId} in ${this.tableName}:`,
        error.message
      );
      return null;
    }
    return data as RawTikTokUser;
  }

  async findByUniqueId(uniqueId: string): Promise<RawTikTokUser | null> {
    // 'unique_id' is the TikTok username, e.g., @username
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('unique_id', uniqueId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error(
        `Error finding TikTok user by unique_id ${uniqueId} in ${this.tableName}:`,
        error.message
      );
      return null;
    }
    return data as RawTikTokUser;
  }
}
