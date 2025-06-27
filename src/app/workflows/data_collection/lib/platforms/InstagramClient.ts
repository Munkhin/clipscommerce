import { BasePlatformClient } from './base-platform';
import { ApiConfig, PlatformComment, ApiResponse } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';

export class InstagramClient extends BasePlatformClient {
  protected readonly platform: Platform = Platform.INSTAGRAM;

  constructor(
    platformConfigFromFactory: ApiConfig,
    authTokenManager: IAuthTokenManager,
    userId?: string
  ) {
    super(platformConfigFromFactory, authTokenManager, userId);
  }

  async getUserInfo(): Promise<any> {
    // Placeholder for fetching user info from Instagram
    return Promise.resolve({
      id: 'instagram-user-id',
      username: 'instagram_user',
      name: 'Instagram User',
    });
  }

  async listUserVideos(): Promise<any> {
    // Placeholder for fetching user videos from Instagram
    return Promise.resolve([]);
  }

  async postVideo(params: any): Promise<any> {
    // Placeholder for posting a video to Instagram
    console.log('Posting video to Instagram:', params);
    return Promise.resolve({
      id: 'instagram-post-id',
    });
  }

  async getVideoComments(
    postId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    this.log('warn', 'getVideoComments is not yet implemented for InstagramClient. Returning stubbed response.', { postId, options });
    return Promise.resolve({
      data: {
        comments: [],
        nextPageCursor: undefined,
        hasMore: false,
      },
      rateLimit: this.rateLimit === null ? undefined : this.rateLimit,
    });
  }
}