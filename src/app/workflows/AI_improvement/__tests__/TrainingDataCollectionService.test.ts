import { TrainingDataCollectionService, DataCollectionConfig } from '../training/DataCollectionService';
import { Platform } from '@/types/platform';
import { PostMetrics } from '../../data_analysis/types/analysis_types';
import { SupabaseClient } from '@supabase/supabase-js';
import { EnhancedScannerService } from '../../data_collection/functions/EnhancedScannerService';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
  insert: jest.fn().mockResolvedValue({ error: null }),
};

// Mock EnhancedScannerService
jest.mock('../../data_collection/functions/EnhancedScannerService', () => ({
  EnhancedScannerService: jest.fn().mockImplementation(() => ({
    initializePlatforms: jest.fn().mockResolvedValue(undefined),
    getUserPosts: jest.fn().mockResolvedValue([]),
  })),
}));

describe('TrainingDataCollectionService', () => {
  let service: TrainingDataCollectionService;
  let mockScannerService: jest.Mocked<EnhancedScannerService>;

  const defaultConfig: DataCollectionConfig = {
    platforms: ['TikTok'],
    lookbackDays: 30,
    minPostsPerPlatform: 10,
    minEngagementThreshold: 5,
    includeCompetitorData: false,
  };

  beforeEach(() => {
    service = new TrainingDataCollectionService(mockSupabase, defaultConfig);
    mockScannerService = new EnhancedScannerService(null as any) as jest.Mocked<EnhancedScannerService>;
    (service as any).scannerService = mockScannerService;
    jest.clearAllMocks();
  });

  describe('collectTrainingData', () => {
    it('should collect and process data successfully', async () => {
      const mockPosts: PostMetrics[] = [
        { id: '1', platform: 'TikTok', caption: 'Post 1', publishedAt: new Date().toISOString(), metrics: { views: 100, likes: 10, comments: 1, shares: 1, saves: 1, engagementRate: 0.1 } },
        { id: '2', platform: 'TikTok', caption: 'Post 2', publishedAt: new Date().toISOString(), metrics: { views: 200, likes: 20, comments: 2, shares: 2, saves: 2, engagementRate: 0.2 } },
      ];
      mockScannerService.getUserPosts.mockResolvedValue(mockPosts);

      const result = await service.collectTrainingData('test-user');

      expect(result.data).toHaveLength(2);
      expect(result.qualityReports).toHaveLength(1);
      expect(result.summary.totalPosts).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_posts');
      expect(mockSupabase.from().upsert).toHaveBeenCalled();
    });

    it('should use existing data if available', async () => {
        const mockDbPosts = [
            { platform_post_id: '1', platform: 'TikTok', caption: 'Post 1', posted_at: new Date().toISOString(), likes: 10, views: 100, engagement_rate: 0.1 },
            { platform_post_id: '2', platform: 'TikTok', caption: 'Post 2', posted_at: new Date().toISOString(), likes: 20, views: 200, engagement_rate: 0.2 },
            { platform_post_id: '3', platform: 'TikTok', caption: 'Post 3', posted_at: new Date().toISOString(), likes: 30, views: 300, engagement_rate: 0.3 },
            { platform_post_id: '4', platform: 'TikTok', caption: 'Post 4', posted_at: new Date().toISOString(), likes: 40, views: 400, engagement_rate: 0.4 },
            { platform_post_id: '5', platform: 'TikTok', caption: 'Post 5', posted_at: new Date().toISOString(), likes: 50, views: 500, engagement_rate: 0.5 },
            { platform_post_id: '6', platform: 'TikTok', caption: 'Post 6', posted_at: new Date().toISOString(), likes: 60, views: 600, engagement_rate: 0.6 },
            { platform_post_id: '7', platform: 'TikTok', caption: 'Post 7', posted_at: new Date().toISOString(), likes: 70, views: 700, engagement_rate: 0.7 },
            { platform_post_id: '8', platform: 'TikTok', caption: 'Post 8', posted_at: new Date().toISOString(), likes: 80, views: 800, engagement_rate: 0.8 },
            { platform_post_id: '9', platform: 'TikTok', caption: 'Post 9', posted_at: new Date().toISOString(), likes: 90, views: 900, engagement_rate: 0.9 },
            { platform_post_id: '10', platform: 'TikTok', caption: 'Post 10', posted_at: new Date().toISOString(), likes: 100, views: 1000, engagement_rate: 1.0 },
        ];

        mockSupabase.from.mockReturnValue({
            ...mockSupabase.from(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockDbPosts, error: null }),
        });

        const result = await service.collectTrainingData('test-user');

        expect(result.data).toHaveLength(10);
        expect(mockScannerService.getUserPosts).not.toHaveBeenCalled();
    });
  });

  describe('assessDataQuality', () => {
    it('should identify insufficient posts', async () => {
        const mockPosts: PostMetrics[] = [
            { id: '1', platform: 'TikTok', caption: 'Post 1', publishedAt: new Date().toISOString(), metrics: { views: 100, likes: 10, comments: 1, shares: 1, saves: 1, engagementRate: 0.1 } },
        ];
        const report = await (service as any).assessDataQuality('TikTok', mockPosts);
        expect(report.issues).toContain('Insufficient posts: 1 < 10 required');
    });

    it('should identify low average engagement', async () => {
        const mockPosts: PostMetrics[] = Array(10).fill(0).map((_, i) => ({
            id: `${i}`,
            platform: 'TikTok',
            caption: `Post ${i}`,
            publishedAt: new Date().toISOString(),
            metrics: { views: 100, likes: 1, comments: 0, shares: 0, saves: 0, engagementRate: 0.01 }
        }));
        const report = await (service as any).assessDataQuality('TikTok', mockPosts);
        expect(report.issues).toContain('Low average engagement: 1.00% < 5% required');
    });
  });
});
