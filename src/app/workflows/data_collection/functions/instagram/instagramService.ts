import InstagramApiClient from './instagramClient';
import { InstagramPostRepository, InstagramUserRepository } from '../../lib/storage/repositories/instagramRepository';
import {
  InstagramApiMediaNode,
  InstagramApiUserNode,
  RawInstagramPost,
  CreateRawInstagramPostDto,
  UpdateRawInstagramPostDto,
  RawInstagramUser,
  CreateRawInstagramUserDto,
  UpdateRawInstagramUserDto,
} from '../../types/instagramTypes';
import { isValidInstagramApiMediaNode, isValidInstagramApiUserNode } from './validators/instagramValidators';
import { limitInstagramApiCall } from './rateLimiter';

// Helper to transform API media node to CreateRawInstagramPostDto
function transformApiMediaToCreateDto(mediaNode: InstagramApiMediaNode, systemUserId: string): CreateRawInstagramPostDto {
  return {
    post_id: mediaNode.id,
    user_id: systemUserId, // The system user who initiated this fetch
    platform_user_id: mediaNode.owner?.id || mediaNode.username, // Prefer owner.id if available
    caption: mediaNode.caption || null,
    media_type: mediaNode.media_type,
    media_url: mediaNode.media_url || null,
    permalink: mediaNode.permalink || null,
    thumbnail_url: mediaNode.thumbnail_url || null,
    timestamp: mediaNode.timestamp || '',
    likes_count: mediaNode.like_count || 0,
    comments_count: mediaNode.comments_count || 0,
    raw_data: mediaNode,
  };
}

// Helper to transform API media node to UpdateRawInstagramPostDto
function transformApiMediaToUpdateDto(mediaNode: InstagramApiMediaNode): UpdateRawInstagramPostDto {
  return {
    caption: mediaNode.caption || null,
    media_type: mediaNode.media_type,
    media_url: mediaNode.media_url || null,
    permalink: mediaNode.permalink || null,
    thumbnail_url: mediaNode.thumbnail_url || null,
    timestamp: mediaNode.timestamp || '',
    likes_count: mediaNode.like_count || 0,
    comments_count: mediaNode.comments_count || 0,
    raw_data: mediaNode,
  };
}

// Helper to transform API user node to CreateRawInstagramUserDto
function transformApiUserToCreateDto(userNode: InstagramApiUserNode): CreateRawInstagramUserDto {
  return {
    platform_user_id: userNode.id,
    username: userNode.username,
    full_name: userNode.name || null,
    profile_picture_url: userNode.profile_picture_url || null,
    bio: userNode.biography || null,
    website: userNode.website || null,
    followers_count: userNode.followers_count || 0,
    following_count: userNode.follows_count || 0,
    media_count: userNode.media_count || 0,
    raw_data: userNode,
    last_fetched_at: new Date().toISOString(),
  };
}

// Helper to transform API user node to UpdateRawInstagramUserDto
function transformApiUserToUpdateDto(userNode: InstagramApiUserNode): UpdateRawInstagramUserDto {
  return {
    full_name: userNode.name || null,
    profile_picture_url: userNode.profile_picture_url || null,
    bio: userNode.biography || null,
    website: userNode.website || null,
    followers_count: userNode.followers_count || 0,
    following_count: userNode.follows_count || 0,
    media_count: userNode.media_count || 0,
    raw_data: userNode,
    last_fetched_at: new Date().toISOString(),
  };
}

export class InstagramService {
  private apiClient: InstagramApiClient;
  private postRepository: InstagramPostRepository;
  private userRepository: InstagramUserRepository;

  // Rate-limited API methods
  private limitedGetUserInfo: (userId?: string, fields?: string) => Promise<InstagramApiUserNode | null>; 
  private limitedGetUserMedia: (userId?: string, fields?: string, limit?: number) => Promise<{ data: InstagramApiMediaNode[]; paging?: any; } | null>;
  private limitedGetMediaDetails: (mediaId: string, fields?: string) => Promise<InstagramApiMediaNode | null>;
  private limitedGetPaginatedData: <T>(paginationUrl: string) => Promise<T | null>;

  constructor(accessToken?: string) {
    this.apiClient = new InstagramApiClient(accessToken);
    this.postRepository = new InstagramPostRepository();
    this.userRepository = new InstagramUserRepository();

    // Bind 'this' context for apiClient methods before wrapping with rate limiter
    const boundGetUserInfo: (userId?: string, fields?: string) => Promise<InstagramApiUserNode | null> = this.apiClient.getUserInfo.bind(this.apiClient);
    this.limitedGetUserInfo = limitInstagramApiCall(boundGetUserInfo);

    const boundGetUserMedia: (userId?: string, fields?: string, limit?: number) => Promise<{ data: InstagramApiMediaNode[]; paging?: any; } | null> = this.apiClient.getUserMedia.bind(this.apiClient);
    this.limitedGetUserMedia = limitInstagramApiCall(boundGetUserMedia);

    const boundGetMediaDetails: (mediaId: string, fields?: string) => Promise<InstagramApiMediaNode | null> = this.apiClient.getMediaDetails.bind(this.apiClient);
    this.limitedGetMediaDetails = limitInstagramApiCall(boundGetMediaDetails);

    const boundGetPaginatedData: <T>(paginationUrl: string) => Promise<T | null> = this.apiClient.getPaginatedData.bind(this.apiClient);
    this.limitedGetPaginatedData = limitInstagramApiCall(boundGetPaginatedData);
  }

  /**
   * Fetches Instagram user profile data, validates, and stores/updates it in the database.
   * @param platformUserId The Instagram User ID (platform ID) to fetch. Defaults to 'me'.
   * @param systemUserId The ID of the internal system user initiating this action (for logging/attribution).
   * @returns The stored or updated RawInstagramUser, or null if an error occurred.
   */
  async fetchAndStoreUserProfile(
    platformUserId: string = 'me',
    systemUserId: string // Required for logging/attribution
  ): Promise<RawInstagramUser | null> {
    const endpoint = `/${platformUserId}`;
    let userNode: InstagramApiUserNode | null = null;
    try {
      userNode = await this.limitedGetUserInfo(platformUserId);
      if (!userNode || !isValidInstagramApiUserNode(userNode)) {
        console.warn(`Invalid or no data received for user ${platformUserId}.`);
        await this.userRepository.logApiCall('Instagram', endpoint, { platformUserId }, userNode ? undefined : 500, userNode || undefined, 'Invalid user data');
        return null;
      }

      let existingUser = await this.userRepository.findByPlatformUserId(userNode.id);
      if (existingUser) {
        const updateDto = transformApiUserToUpdateDto(userNode);
        const updatedUser = await this.userRepository.update(existingUser.id, updateDto);
        await this.userRepository.logApiCall('Instagram', endpoint, { platformUserId }, 200, userNode, 'User profile updated');
        return updatedUser;
      } else {
        const createDto = transformApiUserToCreateDto(userNode);
        const newUser = await this.userRepository.create(createDto);
        await this.userRepository.logApiCall('Instagram', endpoint, { platformUserId }, 201, userNode, 'User profile created');
        return newUser;
      }
    } catch (error: any) {
      console.error(`Error fetching/storing user profile for ${platformUserId}:`, error.message);
      await this.userRepository.logApiCall('Instagram', endpoint, { platformUserId }, undefined, undefined, error.message);
      return null;
    }
  }

  /**
   * Fetches recent media for an Instagram user, validates, and stores/updates them in the database.
   * @param platformUserId The Instagram User ID (platform ID) whose media to fetch. Defaults to 'me'.
   * @param systemUserId The ID of the internal system user initiating this action.
   * @param limit The maximum number of media items to attempt to fetch (before pagination).
   * @returns An array of stored or updated RawInstagramPost objects.
   */
  async fetchAndStoreUserMedia(
    platformUserId: string = 'me',
    systemUserId: string,
    limit: number = 25
  ): Promise<RawInstagramPost[]> {
    const endpoint = `/${platformUserId}/media`;
    const storedPosts: RawInstagramPost[] = [];
    let apiCallCount = 0;

    try {
      let mediaResponse = await this.limitedGetUserMedia(platformUserId, undefined, limit);
      apiCallCount++;

      while (mediaResponse?.data && mediaResponse.data.length > 0) {
        for (const mediaNodeRaw of mediaResponse.data) {
          if (isValidInstagramApiMediaNode(mediaNodeRaw)) {
            const mediaNode = mediaNodeRaw;
            // Ensure owner ID is present, critical for platform_user_id in posts table
            if (!mediaNode.owner?.id && platformUserId === 'me') {
              // If fetching 'me' and owner is missing, we might need to fetch user profile first to get the ID
              // Or assume the 'username' from mediaNode can be used if owner.id is consistently missing for 'me' posts
              console.warn(`Media node ${mediaNode.id} for user 'me' is missing owner.id. Using username as fallback for platform_user_id.`);
              // This might require adjustment based on API behavior for 'me' endpoint if owner.id is not always present.
            }
            const effectivePlatformUserId = mediaNode.owner?.id || (platformUserId !== 'me' ? platformUserId : mediaNode.username);
            if (!effectivePlatformUserId) {
              console.error(`Could not determine platform_user_id for media ${mediaNode.id}. Skipping.`);
              continue;
            }
            const createDto = transformApiMediaToCreateDto({ ...mediaNode, owner: { id: effectivePlatformUserId } }, systemUserId);
            const existingPost = await this.postRepository.findByPlatformPostId(mediaNode.id);
            let currentPost: RawInstagramPost | null = null;
            if (existingPost) {
              const updateDto = transformApiMediaToUpdateDto(mediaNode);
              currentPost = await this.postRepository.update(existingPost.id, updateDto);
              if (currentPost) storedPosts.push(currentPost);
              await this.postRepository.logApiCall('Instagram', `/media/${mediaNode.id}`, { platformUserId, mediaId: mediaNode.id }, 200, mediaNode, 'Post updated');
            } else {
              currentPost = await this.postRepository.create(createDto);
              if (currentPost) storedPosts.push(currentPost);
              // Log with mediaNode.id for consistency, as currentPost might be null if creation failed
              await this.postRepository.logApiCall('Instagram', `/media/${mediaNode.id}`, { platformUserId, mediaId: mediaNode.id }, currentPost ? 201 : undefined, mediaNode, currentPost ? 'Post created' : 'Post creation attempted');
            }
          } else {
            const mediaIdForLog = (mediaNodeRaw as any)?.id || 'unknown_or_invalid';
            const logEndpoint = (mediaNodeRaw as any)?.id ? `/media/${(mediaNodeRaw as any).id}` : '/media/unknown_or_invalid';
            console.warn(`Invalid media data received for post ${mediaIdForLog}. Skipping.`);
            await this.postRepository.logApiCall('Instagram', logEndpoint, { platformUserId, mediaId: mediaIdForLog }, undefined, mediaNodeRaw || undefined, 'Invalid media data');
            continue;
          }
        }

        // Handle pagination
        if (mediaResponse.paging?.next) {
          // Be mindful of total API calls and data limits
          // Add a safety break for now, e.g., max 5 pages or 10 API calls total
          if (apiCallCount >= 5) { 
            console.warn('Reached pagination limit (5 pages). Stopping further media fetching.');
            break;
          }
          mediaResponse = await this.limitedGetPaginatedData(mediaResponse.paging.next);
          apiCallCount++;
        } else {
          mediaResponse = null; // No more pages
        }
      }
      return storedPosts;
    } catch (error: any) {
      console.error(`Error fetching/storing media for user ${platformUserId}:`, error.message);
      await this.postRepository.logApiCall('Instagram', endpoint, { platformUserId, limit }, undefined, undefined, error.message);
      return storedPosts; // Return any posts successfully processed before the error
    }
  }
}

// Example Usage (conceptual - would be called from an API route or a script):
// async function main() {
//   const instagramService = new InstagramService(process.env.INSTAGRAM_ACCESS_TOKEN);
//   const systemUserId = 'system-default'; // Or an actual user ID from your app

//   // Fetch and store your own profile (assuming 'me' uses the provided access token's user)
//   const myProfile = await instagramService.fetchAndStoreUserProfile('me', systemUserId);
//   if (myProfile) {
//     console.log('My Profile:', myProfile.username, myProfile.platform_user_id);

//     // Fetch and store your own media
//     const myMedia = await instagramService.fetchAndStoreUserMedia(myProfile.platform_user_id, systemUserId, 10);
//     console.log(`Fetched ${myMedia.length} media items for ${myProfile.username}.`);
//     myMedia.forEach(post => console.log(`  Post ID: ${post.post_id}, Caption: ${post.caption?.substring(0,30)}...`));
//   }

//   // Example: Fetch another user's profile and media (requires appropriate permissions)
//   // const otherUserId = 'TARGET_INSTAGRAM_USER_ID'; 
//   // const otherProfile = await instagramService.fetchAndStoreUserProfile(otherUserId, systemUserId);
//   // if (otherProfile) {
//   //   const otherMedia = await instagramService.fetchAndStoreUserMedia(otherUserId, systemUserId, 5);
//   //   console.log(`Fetched ${otherMedia.length} media items for ${otherProfile.username}.`);
//   // }
// }

// // main().catch(console.error);
