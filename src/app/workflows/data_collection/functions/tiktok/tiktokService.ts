import TikTokApiClient from './tiktokClient';
import { TikTokVideoRepository, TikTokUserRepository } from '../../lib/storage/repositories/tiktokRepository';
import {
  TikTokApiVideoNode,
  TikTokApiUserNode,
  RawTikTokVideo,
  CreateRawTikTokVideoDto,
  UpdateRawTikTokVideoDto,
  RawTikTokUser,
  CreateRawTikTokUserDto,
  UpdateRawTikTokUserDto,
} from '../../types/tiktokTypes';
import { isValidTikTokApiVideoNode, isValidTikTokApiUserNode } from './validators/tiktokValidators';
import { limitTikTokApiCall } from './rateLimiter';

// Helper to transform API video node to CreateRawTikTokVideoDto
function transformApiVideoToCreateDto(videoNode: TikTokApiVideoNode, systemUserId: string): CreateRawTikTokVideoDto {
  return {
    video_id: videoNode.id,
    user_id: systemUserId, // The system user who initiated this fetch
    platform_user_id: videoNode.author.id,
    description: videoNode.desc || null,
    video_url: videoNode.video.play_addr?.url_list?.[0] || null,
    cover_image_url: videoNode.video.cover?.url_list?.[0] || null,
    // share_url: videoNode.share_url, // Depends on API providing this
    timestamp: typeof videoNode.create_time === 'number' ? new Date(videoNode.create_time * 1000).toISOString() : '', // Safe conversion
    likes_count: videoNode.stats.digg_count || 0,
    comments_count: videoNode.stats.comment_count || 0,
    shares_count: videoNode.stats.share_count || 0,
    views_count: videoNode.stats.play_count || 0,
    duration_seconds: videoNode.video.duration || null,
    music_info: videoNode.music ? { id: videoNode.music.id, title: videoNode.music.title, author: videoNode.music.authorName } : null,
    hashtags: videoNode.challenges?.map((c: any) => c.title) || null,
    raw_data: videoNode,
  };
}

// Helper to transform API video node to UpdateRawTikTokVideoDto
function transformApiVideoToUpdateDto(videoNode: TikTokApiVideoNode): UpdateRawTikTokVideoDto {
  return {
    description: videoNode.desc || null,
    video_url: videoNode.video.play_addr?.url_list?.[0] || null,
    cover_image_url: videoNode.video.cover?.url_list?.[0] || null,
    timestamp: typeof videoNode.create_time === 'number' ? new Date(videoNode.create_time * 1000).toISOString() : '',
    likes_count: videoNode.stats.digg_count || 0,
    comments_count: videoNode.stats.comment_count || 0,
    shares_count: videoNode.stats.share_count || 0,
    views_count: videoNode.stats.play_count || 0,
    duration_seconds: videoNode.video.duration || null,
    music_info: videoNode.music ? { id: videoNode.music.id, title: videoNode.music.title, author: videoNode.music.authorName } : null,
    hashtags: videoNode.challenges?.map((c: any) => c.title) || null,
    raw_data: videoNode,
  };
}

// Helper to transform API user node to CreateRawTikTokUserDto
function transformApiUserToCreateDto(userNode: TikTokApiUserNode): CreateRawTikTokUserDto {
  return {
    platform_user_id: userNode.user.id,
    unique_id: userNode.user.unique_id,
    nickname: userNode.user.nickname || null,
    avatar_url: userNode.user.avatar_thumb?.url_list?.[0] || null,
    signature: userNode.user.signature || null,
    verified: userNode.user.verified || false,
    followers_count: userNode.stats.follower_count || 0,
    following_count: userNode.stats.following_count || 0,
    heart_count: userNode.stats.heart_count || 0,
    video_count: userNode.stats.video_count || 0,
    raw_data: userNode,
    last_fetched_at: new Date().toISOString(),
  };
}

// Helper to transform API user node to UpdateRawTikTokUserDto
function transformApiUserToUpdateDto(userNode: TikTokApiUserNode): UpdateRawTikTokUserDto {
  return {
    nickname: userNode.user.nickname || null,
    avatar_url: userNode.user.avatar_thumb?.url_list?.[0] || null,
    signature: userNode.user.signature || null,
    verified: userNode.user.verified || false,
    followers_count: userNode.stats.follower_count || 0,
    following_count: userNode.stats.following_count || 0,
    heart_count: userNode.stats.heart_count || 0,
    video_count: userNode.stats.video_count || 0,
    raw_data: userNode,
    last_fetched_at: new Date().toISOString(),
  };
}

export class TikTokService {
  private apiClient: TikTokApiClient;
  private videoRepository: TikTokVideoRepository;
  private userRepository: TikTokUserRepository;

  private limitedGetUserInfo: (userIdentifier: string, fields?: string) => Promise<TikTokApiUserNode | null>;
  private limitedGetUserVideos: (userIdentifier: string, fields?: string, limit?: number, cursor?: string | number) => Promise<{ data: TikTokApiVideoNode[]; next_cursor?: string | number; has_more?: boolean } | null>;
  // private limitedGetVideoDetails: (videoId: string, fields?: string) => Promise<TikTokApiVideoNode | null>; // If needed

  constructor(accessToken?: string) {
    this.apiClient = new TikTokApiClient(accessToken);
    this.videoRepository = new TikTokVideoRepository();
    this.userRepository = new TikTokUserRepository();

    this.limitedGetUserInfo = limitTikTokApiCall(this.apiClient.getUserInfo.bind(this.apiClient));
    this.limitedGetUserVideos = limitTikTokApiCall(this.apiClient.getUserVideos.bind(this.apiClient));
    // this.limitedGetVideoDetails = limitTikTokApiCall(this.apiClient.getVideoDetails.bind(this.apiClient));
  }

  /**
   * Fetches TikTok user profile data, validates, and stores/updates it.
   * Note: API client methods are placeholders and need actual implementation.
   */
  async fetchAndStoreUserProfile(
    userIdentifier: string, // e.g., platform_user_id or unique_id (@username)
    systemUserId: string
  ): Promise<RawTikTokUser | null> {
    const endpoint = `/user/info/ (placeholder for ${userIdentifier})`; // Adjust based on actual endpoint
    let userNode: TikTokApiUserNode | null = null;
    try {
      userNode = await this.limitedGetUserInfo(userIdentifier);
      if (!userNode || !isValidTikTokApiUserNode(userNode)) {
        console.warn(`Invalid or no data received for TikTok user ${userIdentifier}.`);
        await this.userRepository.logApiCall('TikTok', endpoint, { userIdentifier }, userNode ? undefined : 500, userNode || undefined, 'Invalid user data');
        return null;
      }

      let existingUser = await this.userRepository.findByPlatformUserId(userNode.user.id);
      if (!existingUser) {
        existingUser = await this.userRepository.findByUniqueId(userNode.user.unique_id);
      }

      if (existingUser) {
        const updateDto = transformApiUserToUpdateDto(userNode);
        const updatedUser = await this.userRepository.update(existingUser.id, updateDto);
        await this.userRepository.logApiCall('TikTok', endpoint, { userIdentifier }, 200, userNode, 'User profile updated');
        return updatedUser;
      } else {
        const createDto = transformApiUserToCreateDto(userNode);
        const newUser = await this.userRepository.create(createDto);
        await this.userRepository.logApiCall('TikTok', endpoint, { userIdentifier }, 201, userNode, 'User profile created');
        return newUser;
      }
    } catch (error: any) {
      console.error(`Error fetching/storing TikTok user profile for ${userIdentifier}:`, error.message);
      await this.userRepository.logApiCall('TikTok', endpoint, { userIdentifier }, undefined, undefined, error.message);
      return null;
    }
  }

  /**
   * Fetches recent videos for a TikTok user, validates, and stores/updates them.
   * Note: API client methods are placeholders and need actual implementation.
   */
  async fetchAndStoreUserVideos(
    userIdentifier: string, // e.g., platform_user_id or unique_id
    systemUserId: string,
    limit: number = 20
  ): Promise<RawTikTokVideo[]> {
    const endpoint = `/video/list/ (placeholder for ${userIdentifier})`; // Adjust based on actual endpoint
    const storedVideos: RawTikTokVideo[] = [];
    let apiCallCount = 0;
    let currentCursor: string | number | undefined = undefined;
    let hasMore = true;

    try {
      while (hasMore && apiCallCount < 5) { // Safety break: max 5 pages
        const videoResponse = await this.limitedGetUserVideos(userIdentifier, undefined, limit, currentCursor);
        apiCallCount++;

        if (!videoResponse || !videoResponse.data || videoResponse.data.length === 0) {
          if (apiCallCount === 1 && !videoResponse) { // Initial call failed entirely
             await this.videoRepository.logApiCall('TikTok', endpoint, { userIdentifier, limit, cursor: currentCursor }, 500, videoResponse || undefined, 'No video data or error');
          }
          break; // No more videos or error
        }

        for (const videoNode of videoResponse.data) {
          if (!isValidTikTokApiVideoNode(videoNode)) {
            const videoIdForLog = (videoNode as any)?.id || 'unknown_or_invalid';
            const logEndpoint = (videoNode as any)?.id ? `/video/detail/${(videoNode as any).id}` : '/video/detail/unknown_or_invalid';
            console.warn(`Invalid TikTok video data received for video ${videoIdForLog}. Skipping.`);
            await this.videoRepository.logApiCall('TikTok', logEndpoint, { videoId: videoIdForLog }, undefined, videoNode || undefined, 'Invalid video data');
            continue;
          }

          const createDto = transformApiVideoToCreateDto(videoNode, systemUserId);
          const existingVideo = await this.videoRepository.findByPlatformVideoId(videoNode.id);
          let currentVideo: RawTikTokVideo | null = null;

          if (existingVideo) {
            const updateDto = transformApiVideoToUpdateDto(videoNode);
            currentVideo = await this.videoRepository.update(existingVideo.id, updateDto);
            if (currentVideo) storedVideos.push(currentVideo);
            await this.videoRepository.logApiCall('TikTok', `/video/detail/${videoNode.id}`, { videoId: videoNode.id }, 200, videoNode, 'Video updated');
          } else {
            currentVideo = await this.videoRepository.create(createDto);
            if (currentVideo) storedVideos.push(currentVideo);
            // Log with videoNode.id for consistency, as currentVideo might be null if creation failed
            await this.videoRepository.logApiCall('TikTok', `/video/detail/${videoNode.id}`, { videoId: videoNode.id }, currentVideo ? 201 : undefined, videoNode, currentVideo ? 'Video created' : 'Video creation attempted');
          }
        }

        currentCursor = videoResponse.next_cursor;
        hasMore = videoResponse.has_more ?? false;
        if (!currentCursor) hasMore = false; // If no cursor, assume no more pages
      }
      return storedVideos;
    } catch (error: any) {
      console.error(`Error fetching/storing TikTok videos for user ${userIdentifier}:`, error.message);
      await this.videoRepository.logApiCall('TikTok', endpoint, { userIdentifier, limit }, undefined, undefined, error.message);
      return storedVideos; // Return any videos processed before error
    }
  }
}

// Example Usage (conceptual - requires actual TikTok API client implementation):
// async function main() {
//   const tikTokService = new TikTokService(process.env.TIKTOK_ACCESS_TOKEN);
//   const systemUserId = 'system-default';

//   // const targetUser = 'TARGET_TIKTOK_UNIQUE_ID_OR_USER_ID';
//   // const userProfile = await tikTokService.fetchAndStoreUserProfile(targetUser, systemUserId);
//   // if (userProfile) {
//   //   console.log('TikTok User Profile:', userProfile.unique_id);
//   //   const userVideos = await tikTokService.fetchAndStoreUserVideos(targetUser, systemUserId, 10);
//   //   console.log(`Fetched ${userVideos.length} videos for ${userProfile.unique_id}.`);
//   // }
// }

// // main().catch(console.error);
