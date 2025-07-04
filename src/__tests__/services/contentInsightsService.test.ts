import { ContentInsightsService } from '@/services/contentInsightsService';
import {
  createMockSupabaseClient,
  cleanupMocks,
  mockVideoData,
  MOCK_USER_ID
} from '../utils/test-helpers';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

describe('ContentInsightsService', () => {
  let service: ContentInsightsService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    const { createClient } = require('@/lib/supabase/client');
    createClient.mockReturnValue(mockSupabaseClient);
    
    service = new ContentInsightsService();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('analyzeUserContent', () => {
    const timeRange = {
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-31T23:59:59.999Z'
    };

    const mockUserContent = [
      {
        id: '1',
        caption: 'Amazing tech tutorial! #tech #coding #programming',
        view_count: 10000,
        like_count: 800,
        comment_count: 120,
        share_count: 50,
        video_processing_results: [{
          caption_analysis: { sentiment: 'positive' },
          hashtag_analysis: { tags: ['#tech', '#coding'] },
          engagement_metrics: { rate: 0.08 }
        }]
      },
      {
        id: '2',
        caption: 'How to build amazing apps? Step by step guide!',
        view_count: 8000,
        like_count: 640,
        comment_count: 95,
        share_count: 40,
        video_processing_results: [{
          caption_analysis: { sentiment: 'positive' },
          hashtag_analysis: { tags: ['#tutorial', '#apps'] },
          engagement_metrics: { rate: 0.09 }
        }]
      }
    ];

    beforeEach(() => {
      // Mock successful database query
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockUserContent,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });
    });

    it('should analyze user content successfully', async () => {
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result).toHaveProperty('topCaptions');
      expect(result).toHaveProperty('hashtagPerformance');
      expect(result).toHaveProperty('contentPatterns');
      expect(result).toHaveProperty('engagementMetrics');

      expect(Array.isArray(result.topCaptions)).toBe(true);
      expect(Array.isArray(result.hashtagPerformance)).toBe(true);
      expect(Array.isArray(result.contentPatterns)).toBe(true);
      expect(typeof result.engagementMetrics).toBe('object');
    });

    it('should extract top performing captions', async () => {
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result.topCaptions.length).toBeGreaterThan(0);
      expect(result.topCaptions[0]).toContain('Amazing tech tutorial!');
    });

    it('should analyze hashtag performance', async () => {
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result.hashtagPerformance.length).toBeGreaterThan(0);
      
      const hashtag = result.hashtagPerformance[0];
      expect(hashtag).toHaveProperty('hashtag');
      expect(hashtag).toHaveProperty('usageCount');
      expect(hashtag).toHaveProperty('averageViews');
      expect(hashtag).toHaveProperty('averageLikes');
      expect(hashtag).toHaveProperty('averageEngagement');
      expect(hashtag).toHaveProperty('estimatedReach');
      expect(hashtag).toHaveProperty('rank');

      expect(hashtag.usageCount).toBeGreaterThan(0);
      expect(hashtag.averageViews).toBeGreaterThan(0);
      expect(hashtag.rank).toBeGreaterThan(0);
    });

    it('should identify content patterns', async () => {
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result.contentPatterns.length).toBeGreaterThan(0);
      
      const pattern = result.contentPatterns[0];
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('frequency');
      expect(pattern).toHaveProperty('averagePerformance');
      expect(pattern).toHaveProperty('examples');

      expect(pattern.frequency).toBeGreaterThan(0);
      expect(pattern.averagePerformance).toBeGreaterThan(0);
      expect(Array.isArray(pattern.examples)).toBe(true);
    });

    it('should calculate engagement metrics', async () => {
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      const metrics = result.engagementMetrics;
      expect(metrics).toHaveProperty('averageViews');
      expect(metrics).toHaveProperty('averageLikes');
      expect(metrics).toHaveProperty('averageComments');
      expect(metrics).toHaveProperty('averageShares');
      expect(metrics).toHaveProperty('engagementRate');
      expect(metrics).toHaveProperty('topPerformingFormats');

      expect(metrics.averageViews).toBeGreaterThan(0);
      expect(metrics.averageLikes).toBeGreaterThan(0);
      expect(metrics.engagementRate).toBeGreaterThan(0);
      expect(Array.isArray(metrics.topPerformingFormats)).toBe(true);
    });

    it('should handle empty content gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: [],
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result).toBeDefined();
      expect(result.topCaptions.length).toBeGreaterThan(0); // Should return default data
      expect(result.hashtagPerformance.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: null,
                    error: new Error('Database error')
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result).toBeDefined();
      // Should return default analysis on error
      expect(result.topCaptions).toBeDefined();
      expect(result.hashtagPerformance).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      const limit = 10;
      await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', timeRange, limit);

      // Verify that limit was passed to the database query
      const mockQuery = mockSupabaseClient.from().select().eq().gte().lte().order().limit;
      expect(mockQuery).toHaveBeenCalledWith(limit);
    });
  });

  describe('getTrendingHashtags', () => {
    it('should return trending hashtags for platform', async () => {
      const result = await service.getTrendingHashtags('tiktok', 'tech', 10);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);

      if (result.length > 0) {
        const hashtag = result[0];
        expect(hashtag).toHaveProperty('tag');
        expect(hashtag).toHaveProperty('rank');
        expect(hashtag).toHaveProperty('estimatedReach');

        expect(hashtag.tag).toMatch(/^#\w+/);
        expect(hashtag.rank).toBeGreaterThan(0);
        expect(hashtag.estimatedReach).toBeGreaterThan(0);
      }
    });

    it('should handle different niches', async () => {
      const niches = ['tech', 'fashion', 'fitness', 'food', 'beauty'];

      for (const niche of niches) {
        const result = await service.getTrendingHashtags('instagram', niche, 5);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);
      }
    });

    it('should return tags ordered by rank', async () => {
      const result = await service.getTrendingHashtags('tiktok', undefined, 20);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].rank).toBeGreaterThan(result[i - 1].rank);
      }
    });

    it('should handle service errors and return defaults', async () => {
      // Mock the internal method to throw an error
      jest.spyOn(service as any, 'fetchTrendingHashtagsFromAPI').mockRejectedValue(
        new Error('Service error')
      );

      const result = await service.getTrendingHashtags('tiktok');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0); // Should return default hashtags
    });

    it('should use default limit when not specified', async () => {
      const result = await service.getTrendingHashtags('tiktok');

      expect(result.length).toBeLessThanOrEqual(20); // Default limit
    });
  });

  describe('getDetailedPlatformAnalytics', () => {
    const timeRange = {
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-31T23:59:59.999Z'
    };

    it('should return detailed platform analytics', async () => {
      const result = await service.getDetailedPlatformAnalytics(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result).toHaveProperty('audienceDemographics');
      expect(result).toHaveProperty('peakEngagementTimes');
      expect(result).toHaveProperty('contentFormatPerformance');

      // Audience demographics structure
      const demographics = result.audienceDemographics;
      expect(demographics).toHaveProperty('ageGroups');
      expect(demographics).toHaveProperty('genderDistribution');
      expect(demographics).toHaveProperty('topCountries');
      expect(demographics).toHaveProperty('topCities');

      expect(typeof demographics.ageGroups).toBe('object');
      expect(typeof demographics.genderDistribution).toBe('object');
      expect(typeof demographics.topCountries).toBe('object');
      expect(typeof demographics.topCities).toBe('object');
    });

    it('should return valid peak engagement times', async () => {
      const result = await service.getDetailedPlatformAnalytics(MOCK_USER_ID, 'instagram', timeRange);

      expect(Array.isArray(result.peakEngagementTimes)).toBe(true);
      
      if (result.peakEngagementTimes.length > 0) {
        const peakTime = result.peakEngagementTimes[0];
        expect(peakTime).toHaveProperty('dayOfWeek');
        expect(peakTime).toHaveProperty('hourOfDay');
        expect(peakTime).toHaveProperty('engagementScore');

        expect(typeof peakTime.dayOfWeek).toBe('string');
        expect(peakTime.hourOfDay).toBeGreaterThanOrEqual(0);
        expect(peakTime.hourOfDay).toBeLessThanOrEqual(23);
        expect(peakTime.engagementScore).toBeGreaterThan(0);
      }
    });

    it('should return content format performance data', async () => {
      const result = await service.getDetailedPlatformAnalytics(MOCK_USER_ID, 'youtube', timeRange);

      expect(Array.isArray(result.contentFormatPerformance)).toBe(true);
      
      if (result.contentFormatPerformance.length > 0) {
        const format = result.contentFormatPerformance[0];
        expect(format).toHaveProperty('formatName');
        expect(format).toHaveProperty('averageViews');
        expect(format).toHaveProperty('averageLikes');
        expect(format).toHaveProperty('averageComments');
        expect(format).toHaveProperty('averageShares');
        expect(format).toHaveProperty('averageEngagementRate');
        expect(format).toHaveProperty('totalPosts');

        expect(typeof format.formatName).toBe('string');
        expect(format.averageViews).toBeGreaterThanOrEqual(0);
        expect(format.averageLikes).toBeGreaterThanOrEqual(0);
        expect(format.averageEngagementRate).toBeGreaterThanOrEqual(0);
        expect(format.totalPosts).toBeGreaterThan(0);
      }
    });

    it('should validate demographic percentages sum to approximately 1', async () => {
      const result = await service.getDetailedPlatformAnalytics(MOCK_USER_ID, 'tiktok', timeRange);

      const ageGroupSum = Object.values(result.audienceDemographics.ageGroups)
        .reduce((sum: number, value: any) => sum + value, 0);
      
      const genderSum = Object.values(result.audienceDemographics.genderDistribution)
        .reduce((sum: number, value: any) => sum + value, 0);

      expect(ageGroupSum).toBeCloseTo(1, 1); // Within 0.1 of 1.0
      expect(genderSum).toBeCloseTo(1, 1);
    });

    it('should handle service errors and return defaults', async () => {
      // Mock the internal method to throw an error
      jest.spyOn(service as any, 'fetchPlatformAnalytics').mockRejectedValue(
        new Error('Analytics service error')
      );

      const result = await service.getDetailedPlatformAnalytics(MOCK_USER_ID, 'tiktok', timeRange);

      expect(result).toBeDefined();
      expect(result.audienceDemographics).toBeDefined();
      expect(result.peakEngagementTimes).toBeDefined();
      expect(result.contentFormatPerformance).toBeDefined();
    });
  });

  describe('Pattern Detection', () => {
    it('should detect question format patterns', async () => {
      const mockContentWithQuestions = [{
        id: '1',
        caption: 'What do you think about this new tech?',
        view_count: 5000,
        like_count: 400,
        comment_count: 60
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockContentWithQuestions,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      const questionPattern = result.contentPatterns.find(p => p.pattern === 'Question format');
      expect(questionPattern).toBeDefined();
      expect(questionPattern?.frequency).toBeGreaterThan(0);
    });

    it('should detect how-to tutorial patterns', async () => {
      const mockTutorialContent = [{
        id: '1',
        caption: 'How to build amazing apps in 5 minutes!',
        view_count: 8000,
        like_count: 640,
        comment_count: 95
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockTutorialContent,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      const tutorialPattern = result.contentPatterns.find(p => p.pattern === 'How-to tutorial');
      expect(tutorialPattern).toBeDefined();
    });

    it('should detect emoji usage patterns', async () => {
      const mockEmojiContent = [{
        id: '1',
        caption: 'Amazing content! 🚀✨ Check it out! 💯',
        view_count: 6000,
        like_count: 480,
        comment_count: 72
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockEmojiContent,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      const emojiPattern = result.contentPatterns.find(p => p.pattern === 'Contains emojis');
      expect(emojiPattern).toBeDefined();
    });
  });

  describe('Hashtag Extraction and Analysis', () => {
    it('should extract hashtags from captions correctly', async () => {
      const mockHashtagContent = [{
        id: '1',
        caption: 'Amazing tutorial! #coding #programming #javascript #webdev',
        view_count: 10000,
        like_count: 800,
        comment_count: 120
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockHashtagContent,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      expect(result.hashtagPerformance.length).toBeGreaterThan(0);
      
      const hashtags = result.hashtagPerformance.map(h => h.hashtag);
      expect(hashtags).toContain('#coding');
      expect(hashtags).toContain('#programming');
      expect(hashtags).toContain('#javascript');
      expect(hashtags).toContain('#webdev');
    });

    it('should calculate hashtag performance metrics correctly', async () => {
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      if (result.hashtagPerformance.length > 0) {
        const topHashtag = result.hashtagPerformance[0];
        
        expect(topHashtag.averageViews).toBeGreaterThan(0);
        expect(topHashtag.averageLikes).toBeGreaterThan(0);
        expect(topHashtag.estimatedReach).toBeGreaterThan(topHashtag.averageViews);
        expect(topHashtag.averageEngagement).toBeGreaterThanOrEqual(0);
        expect(topHashtag.usageCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        caption: `Test content ${i} #test #content`,
        view_count: Math.floor(Math.random() * 10000),
        like_count: Math.floor(Math.random() * 800),
        comment_count: Math.floor(Math.random() * 100)
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: largeDataset,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const startTime = Date.now();
      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle content with no captions', async () => {
      const noCaptionContent = [{
        id: '1',
        caption: null,
        view_count: 1000,
        like_count: 80,
        comment_count: 10
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: noCaptionContent,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      expect(result).toBeDefined();
      expect(result.topCaptions.length).toBe(0);
      expect(result.hashtagPerformance.length).toBe(0);
    });

    it('should handle content with zero engagement', async () => {
      const zeroEngagementContent = [{
        id: '1',
        caption: 'Test content',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: zeroEngagementContent,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.analyzeUserContent(MOCK_USER_ID, 'tiktok', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      expect(result).toBeDefined();
      expect(result.engagementMetrics.averageViews).toBe(0);
      expect(result.engagementMetrics.averageLikes).toBe(0);
      expect(result.engagementMetrics.engagementRate).toBe(0);
    });
  });
});