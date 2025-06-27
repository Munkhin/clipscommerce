import { jest } from '@jest/globals';
import { YouTubeClient } from '../platforms/youtube-client';
import { TikTokClient } from '../platforms/tiktok-client';
import { InstagramClient } from '../platforms/instagram-client';
import { BasePlatformClient } from '../platforms/base-platform';
import { ApiConfig } from '../platforms/types';
import { IAuthTokenManager, AuthStrategy, OAuth2Credentials } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { PlatformError, RateLimitError, ApiError } from '../utils/errors';

// Mock the retryWithBackoff function
jest.mock('../../../../shared_infra', () => ({
  retryWithBackoff: jest.fn((fn) => fn())
}));

// Mock auth token manager
const mockAuthTokenManager: IAuthTokenManager = {
  getValidCredentials: jest.fn(),
  refreshCredentials: jest.fn(),
  storeCredentials: jest.fn(),
  clearCredentials: jest.fn()
};

// Mock OAuth2 credentials
const mockCredentials: OAuth2Credentials = {
  strategy: AuthStrategy.OAUTH2,
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000 // 1 hour from now
};

describe('Platform Clients Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockAuthTokenManager.getValidCredentials as jest.Mock).mockResolvedValue(mockCredentials);
  });

  describe('BasePlatformClient', () => {
    class TestPlatformClient extends BasePlatformClient {
      protected readonly platform = Platform.YOUTUBE;
      
      protected handleRateLimit(headers: Record<string, any>): void {
        // Test implementation
      }

      public async fetchPosts() {
        return { data: { posts: [], nextPageCursor: undefined, hasMore: false } };
      }

      public async uploadContent() {
        return { data: { id: 'test', status: 'uploaded' } };
      }

      public async getAnalytics() {
        return { data: { overview: { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, engagementRate: 0 } } };
      }
    }

    const config: ApiConfig = {
      baseUrl: 'https://api.test.com',
      version: 'v1',
      rateLimit: { requests: 100, perSeconds: 60 }
    };

    it('should initialize with proper configuration', () => {
      const client = new TestPlatformClient(config, mockAuthTokenManager, 'test-user');
      expect(client).toBeInstanceOf(BasePlatformClient);
    });

    it('should handle authentication correctly', async () => {
      const client = new TestPlatformClient(config, mockAuthTokenManager, 'test-user');
      
      // Access protected method for testing
      const authHeaders = await (client as any).getAuthHeaders();
      expect(authHeaders).toEqual({
        'Authorization': 'Bearer mock-access-token'
      });
      expect(mockAuthTokenManager.getValidCredentials).toHaveBeenCalledWith({
        platform: Platform.YOUTUBE,
        userId: 'test-user'
      });
    });

    it('should throw error when no credentials are available', async () => {
      (mockAuthTokenManager.getValidCredentials as jest.Mock).mockResolvedValue(null);
      const client = new TestPlatformClient(config, mockAuthTokenManager, 'test-user');
      
      await expect((client as any).getAuthHeaders()).rejects.toThrow(PlatformError);
    });
  });

  describe('YouTubeClient', () => {
    const config: ApiConfig = {
      baseUrl: 'https://www.googleapis.com/youtube/v3',
      version: 'v3',
      rateLimit: { requests: 10000, perSeconds: 60 }
    };

    let client: YouTubeClient;

    beforeEach(() => {
      client = new YouTubeClient(config, mockAuthTokenManager, 'test-user');
      // Mock axios instance
      (client as any).client = {
        request: jest.fn(),
        get: jest.fn(),
        post: jest.fn()
      };
    });

    it('should create YouTube client instance', () => {
      expect(client).toBeInstanceOf(YouTubeClient);
      expect(client).toBeInstanceOf(BasePlatformClient);
    });

    it('should handle rate limiting correctly', () => {
      const headers = {
        'x-goog-quota-user': 'test-user',
        'x-ratelimit-remaining': '50'
      };
      
      // Access protected method for testing
      (client as any).handleRateLimit(headers);
      // Should not throw error
    });

    it('should implement fetchPosts method', async () => {
      const mockResponse = {
        data: {
          posts: [{ id: 'video1', title: 'Test Video' }],
          nextPageCursor: 'cursor123',
          hasMore: true
        }
      };

      // Mock getUserVideos method
      jest.spyOn(client, 'getUserVideos').mockResolvedValue(mockResponse);

      const result = await client.fetchPosts({ limit: 10 });
      expect(result).toEqual(mockResponse);
    });

    it('should implement uploadContent method', async () => {
      const mockAxiosResponse = {
        data: {
          id: 'uploaded-video-id',
          status: { uploadStatus: 'uploaded' }
        }
      };

      ((client as any).client.request as jest.Mock).mockResolvedValue(mockAxiosResponse);
      (client as any).rateLimit = null;

      const content = {
        title: 'Test Video',
        description: 'Test Description',
        mediaUrl: 'https://example.com/video.mp4'
      };

      const result = await client.uploadContent(content);
      expect(result.data).toEqual({
        id: 'uploaded-video-id',
        url: 'https://www.youtube.com/watch?v=uploaded-video-id',
        status: 'uploaded'
      });
    });

    it('should handle upload errors', async () => {
      const content = {
        title: 'Test Video'
        // Missing mediaFile and mediaUrl
      };

      const result = await client.uploadContent(content);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MISSING_MEDIA');
    });
  });

  describe('TikTokClient', () => {
    const config: ApiConfig = {
      baseUrl: 'https://open-api.tiktok.com',
      version: 'v1.3',
      rateLimit: { requests: 100, perSeconds: 60 }
    };

    let client: TikTokClient;

    beforeEach(() => {
      client = new TikTokClient(config, mockAuthTokenManager, 'test-user');
      // Mock axios instance
      (client as any).client = {
        request: jest.fn(),
        get: jest.fn(),
        post: jest.fn()
      };
    });

    it('should create TikTok client instance', () => {
      expect(client).toBeInstanceOf(TikTokClient);
      expect(client).toBeInstanceOf(BasePlatformClient);
    });

    it('should handle rate limiting with TikTok headers', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': '1640995200'
      };

      (client as any).handleRateLimit(headers);
      expect((client as any).rateLimit).toEqual({
        limit: 100,
        remaining: 50,
        reset: 1640995200
      });
    });

    it('should implement getVideoComments method', async () => {
      const mockResponse = {
        data: {
          comments: [
            {
              id: 'comment1',
              text: 'Great video!',
              user: { display_name: 'Test User' }
            }
          ],
          cursor: 'next-cursor',
          has_more: true
        }
      };

      ((client as any).client.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.getVideoComments('video123');
      expect(result.data?.comments).toHaveLength(1);
      expect(result.data?.comments[0].text).toBe('Great video!');
    });

    it('should implement uploadContent method', async () => {
      const mockResponse = {
        data: {
          publish_id: 'tiktok-video-id',
          share_url: 'https://www.tiktok.com/@user/video/tiktok-video-id',
          status: 'uploaded'
        }
      };

      ((client as any).client.request as jest.Mock).mockResolvedValue(mockResponse);
      (client as any).rateLimit = null;

      const content = {
        description: 'Test TikTok Video',
        mediaFile: Buffer.from('fake-video-data')
      };

      const result = await client.uploadContent(content);
      expect(result.data).toEqual({
        id: 'tiktok-video-id',
        url: 'https://www.tiktok.com/@user/video/tiktok-video-id',
        status: 'uploaded'
      });
    });
  });

  describe('InstagramClient', () => {
    const config: ApiConfig = {
      baseUrl: 'https://graph.instagram.com',
      version: 'v12.0',
      rateLimit: { requests: 200, perSeconds: 60 }
    };

    let client: InstagramClient;

    beforeEach(() => {
      client = new InstagramClient(config, mockAuthTokenManager, 'test-user');
      // Mock axios instance
      (client as any).client = {
        request: jest.fn(),
        get: jest.fn(),
        post: jest.fn()
      };
    });

    it('should create Instagram client instance', () => {
      expect(client).toBeInstanceOf(InstagramClient);
      expect(client).toBeInstanceOf(BasePlatformClient);
    });

    it('should handle Instagram rate limiting', () => {
      const headers = {
        'x-app-usage': JSON.stringify({
          call_count: 50,
          total_cputime: 25,
          total_time: 30
        })
      };

      // Mock requestQueue
      (client as any).requestQueue = [];

      (client as any).handleRateLimit(headers);
      // Should not add delay since usage is below threshold
      expect((client as any).requestQueue).toHaveLength(0);
    });

    it('should add delay when rate limit threshold is exceeded', () => {
      const headers = {
        'x-app-usage': JSON.stringify({
          call_count: 85, // Above 80% threshold
          total_cputime: 25,
          total_time: 30
        })
      };

      (client as any).requestQueue = [];

      (client as any).handleRateLimit(headers);
      // Should add delay function to queue
      expect((client as any).requestQueue).toHaveLength(1);
    });

    it('should implement uploadContent with container creation', async () => {
      const mockContainerResponse = {
        status: 200,
        data: { id: 'container-id' }
      };

      const mockPublishResponse = {
        status: 200,
        data: { id: 'published-media-id' }
      };

      // Mock ensureUserId
      jest.spyOn(client as any, 'ensureUserId').mockResolvedValue('instagram-user-id');

      // Mock request calls
      ((client as any).client.request as jest.Mock)
        .mockResolvedValueOnce(mockContainerResponse) // Container creation
        .mockResolvedValueOnce(mockPublishResponse);  // Publish

      (client as any).rateLimit = null;

      const content = {
        title: 'Test Instagram Video',
        description: 'Test Description',
        mediaUrl: 'https://example.com/video.mp4'
      };

      const result = await client.uploadContent(content);
      expect(result.data).toEqual({
        id: 'published-media-id',
        url: 'https://www.instagram.com/p/published-media-id/',
        status: 'published'
      });
    });
  });

  describe('Error Handling', () => {
    const config: ApiConfig = {
      baseUrl: 'https://api.test.com',
      version: 'v1',
      rateLimit: { requests: 100, perSeconds: 60 }
    };

    it('should handle rate limit errors correctly', async () => {
      const client = new YouTubeClient(config, mockAuthTokenManager, 'test-user');
      
      const rateLimitError = new RateLimitError(Platform.YOUTUBE, 5000, 'Rate limit exceeded');
      ((client as any).client.request as jest.Mock).mockRejectedValue(rateLimitError);

      const result = await client.getPostMetrics('video123');
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle API errors correctly', async () => {
      const client = new TikTokClient(config, mockAuthTokenManager, 'test-user');
      
      const apiError = new ApiError(Platform.TIKTOK, 'INVALID_REQUEST', 'Invalid request', 400);
      ((client as any).client.request as jest.Mock).mockRejectedValue(apiError);

      const result = await client.getPostMetrics('video123');
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });

    it('should handle network errors gracefully', async () => {
      const client = new InstagramClient(config, mockAuthTokenManager, 'test-user');
      
      const networkError = new Error('Network timeout');
      ((client as any).client.request as jest.Mock).mockRejectedValue(networkError);

      const result = await client.getPostMetrics('post123');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Network timeout');
    });
  });

  describe('Abstract Method Implementation Verification', () => {
    it('should ensure all platform clients implement required abstract methods', () => {
      const youtubeClient = new YouTubeClient({} as ApiConfig, mockAuthTokenManager);
      const tiktokClient = new TikTokClient({} as ApiConfig, mockAuthTokenManager);
      const instagramClient = new InstagramClient({} as ApiConfig, mockAuthTokenManager);

      // Verify all clients have the required methods
      expect(typeof youtubeClient.fetchPosts).toBe('function');
      expect(typeof youtubeClient.uploadContent).toBe('function');
      expect(typeof youtubeClient.getAnalytics).toBe('function');

      expect(typeof tiktokClient.fetchPosts).toBe('function');
      expect(typeof tiktokClient.uploadContent).toBe('function');
      expect(typeof tiktokClient.getAnalytics).toBe('function');

      expect(typeof instagramClient.fetchPosts).toBe('function');
      expect(typeof instagramClient.uploadContent).toBe('function');
      expect(typeof instagramClient.getAnalytics).toBe('function');
    });
  });
});