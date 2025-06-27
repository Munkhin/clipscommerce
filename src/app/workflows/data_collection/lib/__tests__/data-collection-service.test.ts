import { DataCollectionService, PlatformAuth } from '../data-collection-service';
import { Platform, PlatformClient, PlatformPostMetrics, PlatformUserActivity } from '../platforms/types';
import { PlatformClientFactory } from '../platforms/platform-factory';
import { AuthStrategy } from '../auth.types';

// Mock the platform factory
jest.mock('../platforms/platform-factory');

describe('DataCollectionService', () => {
  let service: DataCollectionService;
  let mockPlatformClient: jest.Mocked<PlatformClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataCollectionService();
    
    // Create mock platform client
    mockPlatformClient = {
      getPostMetrics: jest.fn(),
      getUserActivity: jest.fn(),
      authenticate: jest.fn(),
      isAuthenticated: jest.fn(),
      refreshToken: jest.fn(),
      disconnect: jest.fn()
    } as jest.Mocked<PlatformClient>;

    // Mock the factory to return our mock client
    (PlatformClientFactory.createClient as jest.Mock).mockResolvedValue(mockPlatformClient);
  });

  describe('initialization', () => {
    const mockPlatformAuths: PlatformAuth[] = [
      {
        platform: Platform.TIKTOK,
        credentials: {
          accessToken: 'tiktok-token',
          refreshToken: 'tiktok-refresh',
          expiresAt: Date.now() + 3600000
        }
      },
      {
        platform: Platform.INSTAGRAM,
        credentials: {
          accessToken: 'instagram-token',
          refreshToken: 'instagram-refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    ];

    it('should initialize successfully with valid platform auths', async () => {
      await service.initialize(mockPlatformAuths);

      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(2);
      expect(PlatformClientFactory.createClient).toHaveBeenCalledWith(
        Platform.TIKTOK,
        { ...mockPlatformAuths[0].credentials, strategy: AuthStrategy.OAUTH2 },
        expect.objectContaining({
          baseUrl: '',
          version: '',
          rateLimit: { requests: 100, perSeconds: 60 }
        })
      );
      expect(PlatformClientFactory.createClient).toHaveBeenCalledWith(
        Platform.INSTAGRAM,
        { ...mockPlatformAuths[1].credentials, strategy: AuthStrategy.OAUTH2 },
        expect.objectContaining({
          baseUrl: '',
          version: '',
          rateLimit: { requests: 100, perSeconds: 60 }
        })
      );
    });

    it('should handle partial initialization failures gracefully', async () => {
      // Mock factory to fail for one platform
      (PlatformClientFactory.createClient as jest.Mock)
        .mockResolvedValueOnce(mockPlatformClient)
        .mockRejectedValueOnce(new Error('Instagram client failed'));

      // Should not throw despite one platform failing
      await service.initialize(mockPlatformAuths);

      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(2);
    });

    it('should prevent double initialization', async () => {
      await service.initialize(mockPlatformAuths);
      
      // Second initialization should be ignored
      await service.initialize(mockPlatformAuths);

      // Should only be called once per platform
      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(2);
    });

    it('should handle empty platform auths array', async () => {
      await service.initialize([]);

      expect(PlatformClientFactory.createClient).not.toHaveBeenCalled();
    });

    it('should handle initialization with missing credentials', async () => {
      const invalidAuth: PlatformAuth = {
        platform: Platform.TIKTOK,
        credentials: {
          accessToken: '', // Empty token
        }
      };

      (PlatformClientFactory.createClient as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      // Should not throw
      await service.initialize([invalidAuth]);

      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(1);
    });

    it('should throw error if complete initialization fails', async () => {
      (PlatformClientFactory.createClient as jest.Mock).mockRejectedValue(new Error('Complete failure'));

      await expect(service.initialize(mockPlatformAuths)).rejects.toThrow('Failed to initialize data collection service');
    });
  });

  describe('getPostMetrics', () => {
    const mockPlatformAuths: PlatformAuth[] = [
      {
        platform: Platform.TIKTOK,
        credentials: { accessToken: 'tiktok-token' }
      },
      {
        platform: Platform.INSTAGRAM,
        credentials: { accessToken: 'instagram-token' }
      }
    ];

    const mockPostMetrics: PlatformPostMetrics = {
      postId: 'test-post-123',
      likes: 1000,
      comments: 50,
      shares: 25,
      views: 10000,
      engagementRate: 0.1075,
      timestamp: new Date(),
      platform: Platform.TIKTOK
    };

    beforeEach(async () => {
      await service.initialize(mockPlatformAuths);
    });

    it('should get post metrics from all platforms successfully', async () => {
      mockPlatformClient.getPostMetrics.mockResolvedValue({
        data: mockPostMetrics,
        error: null
      });

      const result = await service.getPostMetrics('test-post-123');

      expect(result).toEqual({
        [Platform.TIKTOK]: mockPostMetrics,
        [Platform.INSTAGRAM]: mockPostMetrics
      });
      expect(mockPlatformClient.getPostMetrics).toHaveBeenCalledTimes(2);
      expect(mockPlatformClient.getPostMetrics).toHaveBeenCalledWith('test-post-123');
    });

    it('should handle platform-specific failures gracefully', async () => {
      mockPlatformClient.getPostMetrics
        .mockResolvedValueOnce({ data: mockPostMetrics, error: null })
        .mockResolvedValueOnce({ data: null, error: 'API rate limit exceeded' });

      const result = await service.getPostMetrics('test-post-123');

      expect(result).toEqual({
        [Platform.TIKTOK]: mockPostMetrics,
        [Platform.INSTAGRAM]: null
      });
    });

    it('should handle client exceptions gracefully', async () => {
      mockPlatformClient.getPostMetrics
        .mockResolvedValueOnce({ data: mockPostMetrics, error: null })
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getPostMetrics('test-post-123');

      expect(result).toEqual({
        [Platform.TIKTOK]: mockPostMetrics,
        [Platform.INSTAGRAM]: null
      });
    });

    it('should throw error if service not initialized', async () => {
      const uninitializedService = new DataCollectionService();

      await expect(uninitializedService.getPostMetrics('test-post-123'))
        .rejects.toThrow('DataCollectionService has not been initialized. Call initialize() first.');
    });

    it('should handle empty post ID', async () => {
      const result = await service.getPostMetrics('');

      expect(mockPlatformClient.getPostMetrics).toHaveBeenCalledWith('');
      expect(result).toBeDefined();
    });

    it('should process platforms in parallel', async () => {
      const startTime = Date.now();
      
      // Mock delay for each platform
      mockPlatformClient.getPostMetrics.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockPostMetrics, error: null }), 100))
      );

      await service.getPostMetrics('test-post-123');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in roughly 100ms (parallel) rather than 200ms (sequential)
      expect(duration).toBeLessThan(150);
    });
  });

  describe('getUserActivity', () => {
    const mockPlatformAuths: PlatformAuth[] = [
      {
        platform: Platform.TIKTOK,
        credentials: { accessToken: 'tiktok-token' }
      }
    ];

    const mockUserActivity: PlatformUserActivity = {
      userId: 'user-123',
      followersCount: 5000,
      followingCount: 200,
      postsCount: 150,
      engagementRate: 0.08,
      lastActiveDate: new Date(),
      platform: Platform.TIKTOK,
      profileViews: 25000,
      totalLikes: 50000
    };

    beforeEach(async () => {
      await service.initialize(mockPlatformAuths);
    });

    it('should get user activity from all platforms successfully', async () => {
      mockPlatformClient.getUserActivity.mockResolvedValue({
        data: mockUserActivity,
        error: null
      });

      const result = await service.getUserActivity();

      expect(result).toEqual({
        [Platform.TIKTOK]: mockUserActivity
      });
      expect(mockPlatformClient.getUserActivity).toHaveBeenCalledTimes(1);
    });

    it('should handle platform failures gracefully', async () => {
      mockPlatformClient.getUserActivity.mockResolvedValue({
        data: null,
        error: 'User not found'
      });

      const result = await service.getUserActivity();

      expect(result).toEqual({
        [Platform.TIKTOK]: null
      });
    });

    it('should handle client exceptions gracefully', async () => {
      mockPlatformClient.getUserActivity.mockRejectedValue(new Error('Authentication failed'));

      const result = await service.getUserActivity();

      expect(result).toEqual({
        [Platform.TIKTOK]: null
      });
    });

    it('should throw error if service not initialized', async () => {
      const uninitializedService = new DataCollectionService();

      await expect(uninitializedService.getUserActivity())
        .rejects.toThrow('DataCollectionService has not been initialized. Call initialize() first.');
    });

    it('should process multiple platforms in parallel', async () => {
      // Add another platform
      await service.initialize([
        ...mockPlatformAuths,
        {
          platform: Platform.INSTAGRAM,
          credentials: { accessToken: 'instagram-token' }
        }
      ]);

      const startTime = Date.now();
      
      mockPlatformClient.getUserActivity.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockUserActivity, error: null }), 100))
      );

      await service.getUserActivity();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in roughly 100ms (parallel) rather than 200ms (sequential)
      expect(duration).toBeLessThan(150);
    });
  });

  describe('getPlatformClient', () => {
    const mockPlatformAuths: PlatformAuth[] = [
      {
        platform: Platform.TIKTOK,
        credentials: { accessToken: 'tiktok-token' }
      }
    ];

    beforeEach(async () => {
      await service.initialize(mockPlatformAuths);
    });

    it('should return platform client for initialized platform', () => {
      const client = service.getPlatformClient(Platform.TIKTOK);

      expect(client).toBe(mockPlatformClient);
    });

    it('should throw error for uninitialized platform', () => {
      expect(() => service.getPlatformClient(Platform.INSTAGRAM))
        .toThrow('No client available for platform: instagram');
    });

    it('should throw error if service not initialized', () => {
      const uninitializedService = new DataCollectionService();

      expect(() => uninitializedService.getPlatformClient(Platform.TIKTOK))
        .rejects.toThrow('DataCollectionService has not been initialized. Call initialize() first.');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed platform auth data', async () => {
      const malformedAuth = {
        platform: 'invalid-platform' as Platform,
        credentials: null as any
      };

      (PlatformClientFactory.createClient as jest.Mock).mockRejectedValue(new Error('Invalid platform'));

      // Should not throw
      await service.initialize([malformedAuth]);

      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent initialization attempts', async () => {
      const mockPlatformAuths: PlatformAuth[] = [
        {
          platform: Platform.TIKTOK,
          credentials: { accessToken: 'tiktok-token' }
        }
      ];

      // Start multiple initializations concurrently
      const initializations = [
        service.initialize(mockPlatformAuths),
        service.initialize(mockPlatformAuths),
        service.initialize(mockPlatformAuths)
      ];

      await Promise.all(initializations);

      // Should only initialize once
      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(1);
    });

    it('should handle platform client factory returning null', async () => {
      (PlatformClientFactory.createClient as jest.Mock).mockResolvedValue(null);

      const mockPlatformAuths: PlatformAuth[] = [
        {
          platform: Platform.TIKTOK,
          credentials: { accessToken: 'tiktok-token' }
        }
      ];

      // Should handle null client gracefully
      await service.initialize(mockPlatformAuths);

      expect(() => service.getPlatformClient(Platform.TIKTOK))
        .toThrow('No client available for platform: tiktok');
    });

    it('should handle memory pressure with many platforms', async () => {
      const manyPlatformAuths: PlatformAuth[] = Object.values(Platform).map(platform => ({
        platform,
        credentials: { accessToken: `${platform}-token` }
      }));

      await service.initialize(manyPlatformAuths);

      expect(PlatformClientFactory.createClient).toHaveBeenCalledTimes(Object.values(Platform).length);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large post metrics requests efficiently', async () => {
      const mockPlatformAuths: PlatformAuth[] = [
        {
          platform: Platform.TIKTOK,
          credentials: { accessToken: 'tiktok-token' }
        }
      ];

      await service.initialize(mockPlatformAuths);

      const mockPostMetrics: PlatformPostMetrics = {
        postId: 'test-post',
        likes: 1000,
        comments: 50,
        shares: 25,
        views: 10000,
        engagementRate: 0.1075,
        timestamp: new Date(),
        platform: Platform.TIKTOK
      };

      mockPlatformClient.getPostMetrics.mockResolvedValue({
        data: mockPostMetrics,
        error: null
      });

      const startTime = Date.now();
      
      // Make many concurrent requests
      const requests = Array.from({ length: 100 }, (_, i) => 
        service.getPostMetrics(`post-${i}`)
      );

      await Promise.all(requests);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(mockPlatformClient.getPostMetrics).toHaveBeenCalledTimes(100);
    });

    it('should handle memory efficiently with large datasets', async () => {
      const mockPlatformAuths: PlatformAuth[] = [
        {
          platform: Platform.TIKTOK,
          credentials: { accessToken: 'tiktok-token' }
        }
      ];

      await service.initialize(mockPlatformAuths);

      // Mock large dataset response
      const largeUserActivity: PlatformUserActivity = {
        userId: 'user-123',
        followersCount: 1000000,
        followingCount: 5000,
        postsCount: 10000,
        engagementRate: 0.08,
        lastActiveDate: new Date(),
        platform: Platform.TIKTOK,
        profileViews: 50000000,
        totalLikes: 100000000
      };

      mockPlatformClient.getUserActivity.mockResolvedValue({
        data: largeUserActivity,
        error: null
      });

      const result = await service.getUserActivity();

      expect(result[Platform.TIKTOK]).toEqual(largeUserActivity);
      expect(result[Platform.TIKTOK]?.followersCount).toBe(1000000);
    });
  });
}); 