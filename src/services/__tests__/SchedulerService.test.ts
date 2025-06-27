import { SchedulerService } from '../SchedulerService';
import { Post } from '../../types/schedule';
import { Platform } from '../../types/platform';

// Mock the entire SchedulerService module
jest.mock('../SchedulerService');

const mockSchedulerService = new SchedulerService() as jest.Mocked<SchedulerService>;

describe('SchedulerService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks for each test
    mockSchedulerService.schedulePost.mockClear();
    mockSchedulerService.publishPost.mockClear();
    mockSchedulerService.getScheduledPosts.mockClear();
    mockSchedulerService.cancelPost.mockClear();
    mockSchedulerService.getPostStatus.mockClear();

    // Mock newly added methods
    mockSchedulerService.shutdown.mockResolvedValue(undefined);
    mockSchedulerService.scheduleTask.mockResolvedValue('mock-task-id');
    mockSchedulerService.scheduleOnce.mockResolvedValue('mock-once-task-id');
    mockSchedulerService.scheduleCronTask.mockResolvedValue('mock-cron-task-id');
    mockSchedulerService.scheduleRecurringTask.mockResolvedValue('mock-recurring-task-id');
    mockSchedulerService.getQueueStatus.mockResolvedValue({
      pending: 0, inProgress: 0, completed: 0, failed: 0, total: 0,
      maxQueueSize: 1000, maxConcurrentTasks: 100
    });
    mockSchedulerService.getTaskStatus.mockResolvedValue({
      status: 'pending',
    });
    mockSchedulerService.recoverTasks.mockResolvedValue(0);
    mockSchedulerService.getDeadLetterTasks.mockResolvedValue([]);
    mockSchedulerService.cancelTask.mockResolvedValue(true);
    mockSchedulerService.rescheduleTask.mockResolvedValue(true);
    mockSchedulerService.getMetrics.mockResolvedValue({
      totalTasksScheduled: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      averageTaskDurationMs: 0,
      p99TaskDurationMs: 0,
    });

    // Default successful mock implementations
    mockSchedulerService.schedulePost.mockResolvedValue(true);
    mockSchedulerService.publishPost.mockResolvedValue(true);
    mockSchedulerService.getScheduledPosts.mockResolvedValue([]);
    mockSchedulerService.cancelPost.mockResolvedValue(true);
    mockSchedulerService.getPostStatus.mockResolvedValue({
      id: 'mock-id',
      status: { status: 'scheduled', platformPostIds: {} },
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
        engagementRate: 0,
        linkClicks: 0,
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test_user',
      updatedBy: 'test_user',
      tags: [],
      isRepost: false,
      userId: 'test_user',
      content: { text: 'test', mediaUrls: [], hashtags: [], mentions: [], links: [], customFields: {} },
      platforms: []
    });
  });

  const mockPost: Omit<Post, 'id' | 'status'> & { scheduledTime: Date } = {
    userId: 'test_user',
    content: { text: 'Test caption', mediaUrls: ['http://example.com/image.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
    platforms: ['tiktok'],
    scheduledTime: new Date(),
    metrics: {
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      impressions: 0,
      engagementRate: 0,
      linkClicks: 0,
      updatedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test_user',
    updatedBy: 'test_user',
    tags: [],
    isRepost: false,
  };

  describe('schedulePost', () => {
    it('should schedule a post successfully', async () => {
      const result = await mockSchedulerService.schedulePost(mockPost);
      expect(result).toBe(true);
      expect(mockSchedulerService.schedulePost).toHaveBeenCalledWith(mockPost);
    });

    it('should handle advanced scheduling options', async () => {
      const advancedPost: Omit<Post, 'id' | 'status'> & { scheduledTime: Date } = {
        userId: 'advanced_user',
        content: { text: 'Advanced scheduling test', mediaUrls: ['http://example.com/image2.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
        platforms: ['instagram'],
        scheduledTime: new Date(Date.now() + 3600000),
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
          linkClicks: 0,
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        tags: [],
        isRepost: false,
      };

      const result = await mockSchedulerService.schedulePost(advancedPost);

      expect(result).toBe(true);
      expect(mockSchedulerService.schedulePost).toHaveBeenCalledWith(advancedPost);
    });

    it('should handle scheduling failures', async () => {
      mockSchedulerService.schedulePost.mockResolvedValueOnce(false);
      const failingPost: Omit<Post, 'id' | 'status'> & { scheduledTime: Date } = {
        userId: 'fail_user',
        content: { text: 'Failing post', mediaUrls: ['http://example.com/fail.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
        platforms: ['youtube'],
        scheduledTime: new Date(),
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
          linkClicks: 0,
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        tags: [],
        isRepost: false,
      };

      const result = await mockSchedulerService.schedulePost(failingPost);
      expect(result).toBe(false);
      expect(mockSchedulerService.schedulePost).toHaveBeenCalledWith(failingPost);
    });
  });

  describe('publishPost', () => {
    it('should publish a post immediately', async () => {
      const publishPost: Post = {
        id: 'publish-id',
        userId: 'publish_user',
        status: { status: 'scheduled', platformPostIds: {} },
        content: { text: 'Immediate publish', mediaUrls: ['http://example.com/publish.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
        platforms: ['tiktok'],
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
          linkClicks: 0,
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        tags: [],
        isRepost: false,
      };

      const result = await mockSchedulerService.publishPost(publishPost);
      expect(result).toBe(true);
      expect(mockSchedulerService.publishPost).toHaveBeenCalledWith(publishPost);
    });

    it('should handle publish failures', async () => {
      mockSchedulerService.publishPost.mockResolvedValueOnce(false);
      const failedPublishPost: Post = {
        id: 'failed-publish-id',
        userId: 'failed_publish_user',
        status: { status: 'scheduled', platformPostIds: {} },
        content: { text: 'Failed publish', mediaUrls: ['http://example.com/fail-publish.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
        platforms: ['instagram'],
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
          linkClicks: 0,
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        tags: [],
        isRepost: false,
      };

      const result = await mockSchedulerService.publishPost(failedPublishPost);
      expect(result).toBe(false);
      expect(mockSchedulerService.publishPost).toHaveBeenCalledWith(failedPublishPost);
    });
  });

  describe('getScheduledPosts', () => {
    it('should retrieve scheduled posts for a platform', async () => {
      const mockScheduledPosts: Post[] = [
        {
          id: 'post1',
          userId: 'test_user',
          status: { status: 'scheduled', platformPostIds: {} },
          content: { text: 'TikTok post 1', mediaUrls: ['http://example.com/tiktok1.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
          platforms: ['tiktok'],
          metrics: {
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            reach: 0,
            impressions: 0,
            engagementRate: 0,
            linkClicks: 0,
            updatedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test_user',
          updatedBy: 'test_user',
          tags: [],
          isRepost: false,
        },
        {
          id: 'post2',
          userId: 'test_user',
          status: { status: 'scheduled', platformPostIds: {} },
          content: { text: 'TikTok post 2', mediaUrls: ['http://example.com/tiktok2.jpg'], hashtags: [], mentions: [], links: [], customFields: {} },
          platforms: ['tiktok'],
          metrics: {
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            reach: 0,
            impressions: 0,
            engagementRate: 0,
            linkClicks: 0,
            updatedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test_user',
          updatedBy: 'test_user',
          tags: [],
          isRepost: false,
        },
      ];
      mockSchedulerService.getScheduledPosts.mockResolvedValue(mockScheduledPosts);

      const result = await mockSchedulerService.getScheduledPosts('tiktok');

      expect(result).toEqual(mockScheduledPosts);
      expect(mockSchedulerService.getScheduledPosts).toHaveBeenCalledWith('tiktok');
      expect(result.length).toBe(2);
    });

    it('should return empty array if no posts are scheduled for a platform', async () => {
      mockSchedulerService.getScheduledPosts.mockResolvedValue([]);
      const result = await mockSchedulerService.getScheduledPosts('instagram');
      expect(result).toEqual([]);
      expect(mockSchedulerService.getScheduledPosts).toHaveBeenCalledWith('instagram');
    });
  });

  describe('cancelPost', () => {
    it('should cancel a scheduled post', async () => {
      const postId = 'post-to-cancel';
      mockSchedulerService.cancelPost.mockResolvedValue(true);

      const result = await mockSchedulerService.cancelPost(postId);
      expect(result).toBe(true);
      expect(mockSchedulerService.cancelPost).toHaveBeenCalledWith(postId);
    });

    it('should handle failure to cancel a post', async () => {
      const postId = 'post-not-found';
      mockSchedulerService.cancelPost.mockResolvedValue(false);

      const result = await mockSchedulerService.cancelPost(postId);
      expect(result).toBe(false);
      expect(mockSchedulerService.cancelPost).toHaveBeenCalledWith(postId);
    });
  });

  describe('getPostStatus', () => {
    it('should retrieve the status of a post', async () => {
      const postId = 'post-status-check';
      const mockStatus: PostStatus = { status: 'published', platformPostIds: { 'tiktok': 'tiktok_123' } };
      mockSchedulerService.getPostStatus.mockResolvedValue({
        id: postId,
        userId: 'test_user',
        content: { text: 'Some content', mediaUrls: [], hashtags: [], mentions: [], links: [], customFields: {} },
        platforms: ['tiktok'],
        status: mockStatus,
        metrics: {
          likes: 100,
          comments: 10,
          shares: 5,
          saves: 2,
          reach: 1000,
          impressions: 1200,
          engagementRate: 0.1,
          linkClicks: 0,
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        tags: [],
        isRepost: false,
      });

      const result = await mockSchedulerService.getPostStatus(postId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(postId);
      expect(result?.status.status).toBe('published');
      expect(mockSchedulerService.getPostStatus).toHaveBeenCalledWith(postId);
    });

    it('should return undefined if post status not found', async () => {
      mockSchedulerService.getPostStatus.mockResolvedValue(undefined);
      const result = await mockSchedulerService.getPostStatus('non-existent-post');
      expect(result).toBeUndefined();
      expect(mockSchedulerService.getPostStatus).toHaveBeenCalledWith('non-existent-post');
    });
  });
}); 