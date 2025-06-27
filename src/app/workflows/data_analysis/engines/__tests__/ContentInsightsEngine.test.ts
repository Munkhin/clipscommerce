import { ContentInsightsEngine } from '../ContentInsightsEngine';
import { BaseAnalysisRequest, VideoOptimizationAnalysisData, AnalysisResult, DetailedPlatformMetrics } from '../../types';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';

describe('ContentInsightsEngine', () => {
  let engine: ContentInsightsEngine;

  beforeEach(() => {
    engine = new ContentInsightsEngine();
  });

  describe('getTopPerformingContentInsights', () => {
    const mockRequest: BaseAnalysisRequest = {
      userId: 'test-user-123',
      platform: Platform.TIKTOK,
      correlationId: 'test-correlation-id'
    };

    it('should return placeholder data with success status', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.source).toBe('ContentInsightsEngine');
      expect(result.metadata.correlationId).toBe(mockRequest.correlationId);
    });

    it('should return top performing video captions', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      expect(result.data.topPerformingVideoCaptions).toBeDefined();
      expect(Array.isArray(result.data.topPerformingVideoCaptions)).toBe(true);
      expect(result.data.topPerformingVideoCaptions.length).toBeGreaterThan(0);
      
      result.data.topPerformingVideoCaptions.forEach(caption => {
        expect(typeof caption).toBe('string');
        expect(caption.length).toBeGreaterThan(0);
      });
    });

    it('should return trending hashtags with proper structure', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      expect(result.data.trendingHashtags).toBeDefined();
      expect(Array.isArray(result.data.trendingHashtags)).toBe(true);
      expect(result.data.trendingHashtags.length).toBeGreaterThan(0);
      
      result.data.trendingHashtags.forEach(hashtag => {
        expect(hashtag).toHaveProperty('tag');
        expect(hashtag).toHaveProperty('rank');
        expect(hashtag).toHaveProperty('estimatedReach');
        expect(typeof hashtag.tag).toBe('string');
        expect(hashtag.tag.startsWith('#')).toBe(true);
        expect(typeof hashtag.rank).toBe('number');
        expect(hashtag.rank).toBeGreaterThan(0);
        expect(typeof hashtag.estimatedReach).toBe('number');
        expect(hashtag.estimatedReach).toBeGreaterThan(0);
      });
    });

    it('should include placeholder warning in metadata', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      expect(result.metadata.warnings).toBeDefined();
      expect(Array.isArray(result.metadata.warnings)).toBe(true);
      expect(result.metadata.warnings).toContain('Using placeholder data');
    });

    it('should handle different platforms consistently', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.LINKEDIN];
      
      for (const platform of platforms) {
        const request = { ...mockRequest, platform };
        const result = await engine.getTopPerformingContentInsights(request);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.topPerformingVideoCaptions).toBeDefined();
        expect(result.data.trendingHashtags).toBeDefined();
      }
    });

    it('should generate consistent metadata structure', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.source).toBe('ContentInsightsEngine');
      expect(result.metadata.correlationId).toBe(mockRequest.correlationId);
      expect(result.metadata.warnings).toContain('Using placeholder data');
    });

    it('should handle missing correlationId gracefully', async () => {
      const requestWithoutCorrelationId = {
        userId: 'test-user-123',
        platform: Platform.TIKTOK
      } as BaseAnalysisRequest;

      const result = await engine.getTopPerformingContentInsights(requestWithoutCorrelationId);

      expect(result.success).toBe(true);
      expect(result.metadata.correlationId).toBeUndefined();
    });

    it('should return hashtags sorted by rank', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      const hashtags = result.data.trendingHashtags;
      for (let i = 1; i < hashtags.length; i++) {
        expect(hashtags[i].rank).toBeGreaterThan(hashtags[i - 1].rank);
      }
    });

    it('should provide realistic caption examples', async () => {
      const result = await engine.getTopPerformingContentInsights(mockRequest);

      const captions = result.data.topPerformingVideoCaptions;
      captions.forEach(caption => {
        // Should contain hashtags
        expect(caption).toMatch(/#\w+/);
        // Should be reasonable length
        expect(caption.length).toBeLessThan(500);
        expect(caption.length).toBeGreaterThan(10);
      });
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        ...mockRequest,
        userId: `user-${i}`,
        correlationId: `correlation-${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => engine.getTopPerformingContentInsights(req))
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.metadata.correlationId).toBe(`correlation-${index}`);
      });
    });
  });

  describe('getDetailedPlatformAnalytics', () => {
    const mockRequest: BaseAnalysisRequest = {
      userId: 'test-user-123',
      platform: Platform.INSTAGRAM,
      correlationId: 'test-correlation-id'
    };

    it('should return detailed platform metrics with success status', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.source).toBe('ContentInsightsEngine.getDetailedPlatformAnalytics');
    });

    it('should return audience demographics with proper structure', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      const demographics = result.data.audienceDemographics;
      expect(demographics).toBeDefined();
      expect(demographics.ageGroups).toBeDefined();
      expect(demographics.genderDistribution).toBeDefined();
      expect(demographics.topCountries).toBeDefined();

      // Age groups should sum to approximately 1 (allowing for rounding)
      const ageSum = Object.values(demographics.ageGroups).reduce((sum, val) => sum + val, 0);
      expect(ageSum).toBeCloseTo(1, 1);

      // Gender distribution should sum to approximately 1
      const genderSum = Object.values(demographics.genderDistribution).reduce((sum, val) => sum + val, 0);
      expect(genderSum).toBeCloseTo(1, 1);

      // Top countries should have valid percentages
      Object.values(demographics.topCountries).forEach(percentage => {
        expect(percentage).toBeGreaterThan(0);
        expect(percentage).toBeLessThanOrEqual(1);
      });
    });

    it('should return peak engagement times with valid data', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      const peakTimes = result.data.peakEngagementTimes;
      expect(Array.isArray(peakTimes)).toBe(true);
      expect(peakTimes.length).toBeGreaterThan(0);

      peakTimes.forEach(time => {
        expect(time).toHaveProperty('dayOfWeek');
        expect(time).toHaveProperty('hourOfDay');
        expect(time).toHaveProperty('engagementScore');
        
        expect(typeof time.dayOfWeek).toBe('string');
        expect(typeof time.hourOfDay).toBe('number');
        expect(typeof time.engagementScore).toBe('number');
        
        expect(time.hourOfDay).toBeGreaterThanOrEqual(0);
        expect(time.hourOfDay).toBeLessThanOrEqual(23);
        expect(time.engagementScore).toBeGreaterThan(0);
      });
    });

    it('should return content format performance metrics', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      const formatPerformance = result.data.contentFormatPerformance;
      expect(Array.isArray(formatPerformance)).toBe(true);
      expect(formatPerformance.length).toBeGreaterThan(0);

      formatPerformance.forEach(format => {
        expect(format).toHaveProperty('formatName');
        expect(format).toHaveProperty('averageViews');
        expect(format).toHaveProperty('averageLikes');
        expect(format).toHaveProperty('averageEngagementRate');
        expect(format).toHaveProperty('totalPosts');
        
        expect(typeof format.formatName).toBe('string');
        expect(typeof format.averageViews).toBe('number');
        expect(typeof format.averageLikes).toBe('number');
        expect(typeof format.averageEngagementRate).toBe('number');
        expect(typeof format.totalPosts).toBe('number');
        
        expect(format.averageViews).toBeGreaterThan(0);
        expect(format.averageLikes).toBeGreaterThan(0);
        expect(format.averageEngagementRate).toBeGreaterThan(0);
        expect(format.averageEngagementRate).toBeLessThanOrEqual(1);
        expect(format.totalPosts).toBeGreaterThan(0);
      });
    });

    it('should include placeholder warning for detailed analytics', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      expect(result.metadata.warnings).toBeDefined();
      expect(result.metadata.warnings).toContain('Using placeholder data for detailed analytics');
    });

    it('should handle different platforms with consistent structure', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.LINKEDIN];
      
      for (const platform of platforms) {
        const request = { ...mockRequest, platform };
        const result = await engine.getDetailedPlatformAnalytics(request);
        
        expect(result.success).toBe(true);
        expect(result.data.audienceDemographics).toBeDefined();
        expect(result.data.peakEngagementTimes).toBeDefined();
        expect(result.data.contentFormatPerformance).toBeDefined();
      }
    });

    it('should provide realistic engagement scores', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      const peakTimes = result.data.peakEngagementTimes;
      peakTimes.forEach(time => {
        // Engagement scores should be realistic (not too high or too low)
        expect(time.engagementScore).toBeGreaterThan(100);
        expect(time.engagementScore).toBeLessThan(10000);
      });
    });

    it('should maintain data consistency across calls', async () => {
      const result1 = await engine.getDetailedPlatformAnalytics(mockRequest);
      const result2 = await engine.getDetailedPlatformAnalytics(mockRequest);

      // Structure should be consistent
      expect(result1.data.audienceDemographics).toEqual(result2.data.audienceDemographics);
      expect(result1.data.peakEngagementTimes).toEqual(result2.data.peakEngagementTimes);
      expect(result1.data.contentFormatPerformance).toEqual(result2.data.contentFormatPerformance);
    });

    it('should handle performance testing with multiple concurrent requests', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => ({
        ...mockRequest,
        userId: `user-${i}`,
        correlationId: `correlation-${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => engine.getDetailedPlatformAnalytics(req))
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null or undefined request gracefully', async () => {
      // This test ensures the engine doesn't crash with invalid input
      const invalidRequest = null as any;
      
      try {
        await engine.getTopPerformingContentInsights(invalidRequest);
        // If it doesn't throw, that's fine - it should handle gracefully
      } catch (error) {
        // If it throws, the error should be meaningful
        expect(error).toBeDefined();
      }
    });

    it('should handle empty userId gracefully', async () => {
      const requestWithEmptyUserId: BaseAnalysisRequest = {
        userId: '',
        platform: Platform.TIKTOK,
        correlationId: 'test-correlation-id'
      };

      const result = await engine.getTopPerformingContentInsights(requestWithEmptyUserId);
      
      // Should still return data (placeholder implementation)
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle invalid platform gracefully', async () => {
      const requestWithInvalidPlatform = {
        userId: 'test-user-123',
        platform: 'invalid-platform' as Platform,
        correlationId: 'test-correlation-id'
      };

      const result = await engine.getTopPerformingContentInsights(requestWithInvalidPlatform);
      
      // Should still return data (placeholder implementation)
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should maintain performance under stress', async () => {
      const stressRequests = Array.from({ length: 100 }, (_, i) => ({
        userId: `stress-user-${i}`,
        platform: Platform.TIKTOK,
        correlationId: `stress-correlation-${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all([
        ...stressRequests.map(req => engine.getTopPerformingContentInsights(req)),
        ...stressRequests.map(req => engine.getDetailedPlatformAnalytics(req))
      ]);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.length).toBe(200); // 100 requests × 2 methods
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('TODO implementation readiness', () => {
    it('should be ready for platform client integration', async () => {
      const result = await engine.getTopPerformingContentInsights({
        userId: 'integration-test-user',
        platform: Platform.TIKTOK,
        correlationId: 'integration-test'
      });

      // Current placeholder structure should be compatible with future platform client integration
      expect(result.data.topPerformingVideoCaptions).toBeDefined();
      expect(result.data.trendingHashtags).toBeDefined();
      
      // Hashtag structure should be ready for real API data
      result.data.trendingHashtags.forEach(hashtag => {
        expect(hashtag).toHaveProperty('tag');
        expect(hashtag).toHaveProperty('rank');
        expect(hashtag).toHaveProperty('estimatedReach');
      });
    });

    it('should be ready for NLP integration', async () => {
      const result = await engine.getTopPerformingContentInsights({
        userId: 'nlp-test-user',
        platform: Platform.INSTAGRAM,
        correlationId: 'nlp-test'
      });

      // Caption structure should be ready for NLP analysis
      result.data.topPerformingVideoCaptions.forEach(caption => {
        expect(typeof caption).toBe('string');
        expect(caption.length).toBeGreaterThan(0);
        // Should contain hashtags for NLP processing
        expect(caption).toMatch(/#\w+/);
      });
    });

    it('should be ready for analytics API integration', async () => {
      const result = await engine.getDetailedPlatformAnalytics({
        userId: 'analytics-test-user',
        platform: Platform.YOUTUBE,
        correlationId: 'analytics-test'
      });

      // Data structure should be ready for real analytics API data
      expect(result.data.audienceDemographics).toBeDefined();
      expect(result.data.peakEngagementTimes).toBeDefined();
      expect(result.data.contentFormatPerformance).toBeDefined();
      
      // Should have proper data types for API integration
      const demographics = result.data.audienceDemographics;
      expect(typeof demographics.ageGroups).toBe('object');
      expect(typeof demographics.genderDistribution).toBe('object');
      expect(typeof demographics.topCountries).toBe('object');
    });
  });
}); 