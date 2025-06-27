import { BaseRepository } from './baseRepository';
import {
  RawInstagramPost,
  CreateRawInstagramPostDto,
  UpdateRawInstagramPostDto,
  RawInstagramUser,
  CreateRawInstagramUserDto,
  UpdateRawInstagramUserDto,
  InstagramApiMediaNode,
  InstagramApiUserNode,
} from '../../../types/instagramTypes';

export class InstagramPostRepository extends BaseRepository<
  RawInstagramPost,
  CreateRawInstagramPostDto,
  UpdateRawInstagramPostDto
> {
  constructor() {
    super('raw_instagram_posts');
  }

  // Add any Instagram post-specific methods here, for example:
  async findByPlatformPostId(platformPostId: string): Promise<RawInstagramPost | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('post_id', platformPostId) // 'post_id' is the Instagram platform's post ID
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error(
        `Error finding Instagram post by platform ID ${platformPostId} in ${this.tableName}:`,
        error.message
      );
      return null;
    }
    return data as RawInstagramPost;
  }

  async findPostsByPlatformUserId(platformUserId: string): Promise<RawInstagramPost[]> {
    return this.findByColumn('platform_user_id', platformUserId, { sortBy: 'timestamp', sortOrder: 'desc' });
  }
}

export class InstagramUserRepository extends BaseRepository<
  RawInstagramUser,
  CreateRawInstagramUserDto,
  UpdateRawInstagramUserDto
> {
  constructor() {
    super('raw_instagram_users');
  }

  // Add any Instagram user-specific methods here, for example:
  async findByPlatformUserId(platformUserId: string): Promise<RawInstagramUser | null> {
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
        `Error finding Instagram user by platform ID ${platformUserId} in ${this.tableName}:`,
        error.message
      );
      return null;
    }
    return data as RawInstagramUser;
  }

  async findByUsername(username: string): Promise<RawInstagramUser | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error(
        `Error finding Instagram user by username ${username} in ${this.tableName}:`,
        error.message
      );
      return null;
    }
    return data as RawInstagramUser;
  }
}
