import { CompetitorAnalysisService } from '@/services/competitorAnalysisService';
import {
  createMockSupabaseClient,
  mockFetch,
  cleanupMocks,
  mockCompetitorData,
  MOCK_USER_ID
} from '../utils/test-helpers';

// Mock Supabase client
jest.mock('@/../supabase', () => ({
  createClient: jest.fn()
}));

import { createClient } from '@/../supabase';

describe('CompetitorAnalysisService', () => {
  let service: CompetitorAnalysisService;
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    service = new CompetitorAnalysisService();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('getTopCompetitors', () => {
    const mockApiResponse = {
      success: true,
      data: [mockCompetitorData],
      timestamp: '2024-01-01T12:00:00.000Z'
    };

    beforeEach(() => {
      // Mock user profile lookup for niche
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { niche: 'tech' },
            error: null
          }))
        }))
      });

      // Mock fetch for API call
      mockFetch(mockApiResponse);
    });

    it('should fetch competitors with default options', async () => {
      const result = await service.getTopCompetitors();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should fetch competitors with specific niche', async () => {
      const result = await service.getTopCompetitors({ niche: 'fashion' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('niche=fashion'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should fetch competitors with limit parameter', async () => {
      const result = await service.getTopCompetitors({ limit: 10 });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should fetch competitors with platform filter', async () => {
      const result = await service.getTopCompetitors({ platform: 'tiktok' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('platform=tiktok'),
        expect.any(Object)
      );
    });

    it('should fetch competitors with time range', async () => {
      const result = await service.getTopCompetitors({ timeRange: 'month' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=month'),
        expect.any(Object)
      );
    });

    it('should fetch competitors with all parameters', async () => {
      const options = {
        niche: 'fitness',
        limit: 8,
        platform: 'instagram' as const,
        timeRange: 'week' as const
      };

      const result = await service.getTopCompetitors(options);

      expect(result.success).toBe(true);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('niche=fitness');
      expect(fetchCall).toContain('limit=8');
      expect(fetchCall).toContain('platform=instagram');
      expect(fetchCall).toContain('timeRange=week');
    });

    it('should use user profile niche when not provided', async () => {
      await service.getTopCompetitors();

      // Verify user profile was queried
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('niche=tech'); // From mocked profile
    });

    it('should handle API errors gracefully', async () => {
      mockFetch({ success: false, error: 'API Error' }, 500);

      const result = await service.getTopCompetitors();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.getTopCompetitors();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle non-ok HTTP responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not found' })
      });

      const result = await service.getTopCompetitors();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not Found');
    });

    it('should exclude platform parameter when set to "all"', async () => {
      await service.getTopCompetitors({ platform: 'all' });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).not.toContain('platform=all');
    });

    it('should handle missing user profile gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: null,
            error: new Error('Profile not found')
          }))
        }))
      });

      const result = await service.getTopCompetitors();

      expect(result.success).toBe(true);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('niche=general'); // Should fall back to general
    });
  });

  describe('getCompetitorInsights', () => {
    const mockCompetitors = [
      {
        ...mockCompetitorData,
        id: 'comp-1',
        name: 'Competitor 1',
        engagement: '5.5%',
        tactics: ['Tactic A', 'Tactic B', 'Common Tactic'],
        hooks: ['Hook 1', 'Hook 2'],
        topContent: [
          { id: '1', title: 'Content 1', views: '100K', engagement: '8%', url: 'url1', platform: 'tiktok' as const }
        ]
      },
      {
        ...mockCompetitorData,
        id: 'comp-2',
        name: 'Competitor 2',
        engagement: '7.2%',
        tactics: ['Tactic C', 'Tactic D', 'Common Tactic'],
        hooks: ['Hook 3', 'Hook 4'],
        topContent: [
          { id: '2', title: 'Content 2', views: '200K', engagement: '10%', url: 'url2', platform: 'instagram' as const }
        ]
      }
    ];

    it('should analyze competitor insights successfully', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      expect(result).toHaveProperty('commonPatterns');
      expect(result).toHaveProperty('hookFormulas');
      expect(result).toHaveProperty('contentTypes');
      expect(result).toHaveProperty('averageEngagement');
      expect(result).toHaveProperty('topPlatforms');

      expect(Array.isArray(result.commonPatterns)).toBe(true);
      expect(Array.isArray(result.hookFormulas)).toBe(true);
      expect(Array.isArray(result.contentTypes)).toBe(true);
      expect(Array.isArray(result.topPlatforms)).toBe(true);
    });

    it('should identify common patterns across competitors', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      expect(result.commonPatterns).toContain('Common Tactic');
      expect(result.commonPatterns.length).toBeLessThanOrEqual(5);
    });

    it('should extract unique hook formulas', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      expect(result.hookFormulas.length).toBeGreaterThan(0);
      expect(result.hookFormulas.length).toBeLessThanOrEqual(6);
      
      // Should contain unique hooks from all competitors
      const allHooks = mockCompetitors.flatMap(c => c.hooks);
      result.hookFormulas.forEach(hook => {
        expect(allHooks).toContain(hook);
      });
    });

    it('should calculate average engagement correctly', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      // Expected average: (5.5 + 7.2) / 2 = 6.35, rounded to 6.4
      expect(result.averageEngagement).toBeCloseTo(6.4, 1);
    });

    it('should analyze platform distribution', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      expect(result.topPlatforms.length).toBeGreaterThan(0);
      
      // Should have TikTok and Instagram from mock data
      const platforms = result.topPlatforms.map(p => p.platform);
      expect(platforms).toContain('tiktok');
      expect(platforms).toContain('instagram');

      // Percentages should add up to 100 (or close due to rounding)
      const totalPercentage = result.topPlatforms.reduce((sum, p) => sum + p.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should sort platforms by percentage (highest first)', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      for (let i = 1; i < result.topPlatforms.length; i++) {
        expect(result.topPlatforms[i - 1].percentage).toBeGreaterThanOrEqual(
          result.topPlatforms[i].percentage
        );
      }
    });

    it('should sort common patterns by frequency', async () => {
      const competitorsWithRepeatedTactics = [
        { ...mockCompetitors[0], tactics: ['Popular Tactic', 'Rare Tactic'] },
        { ...mockCompetitors[1], tactics: ['Popular Tactic', 'Another Tactic'] }
      ];

      const result = await service.getCompetitorInsights(competitorsWithRepeatedTactics);

      expect(result.commonPatterns[0]).toBe('Popular Tactic');
    });

    it('should handle empty competitors array', async () => {
      const result = await service.getCompetitorInsights([]);

      expect(result.commonPatterns).toEqual([]);
      expect(result.hookFormulas).toEqual([]);
      expect(result.contentTypes).toEqual([]);
      expect(result.averageEngagement).toBe(0);
      expect(result.topPlatforms).toEqual([]);
    });

    it('should return predefined content types', async () => {
      const result = await service.getCompetitorInsights(mockCompetitors);

      expect(result.contentTypes).toContain('Tutorial/How-to content');
      expect(result.contentTypes).toContain('Behind-the-scenes content');
      expect(result.contentTypes).toContain('Before/after transformations');
      expect(result.contentTypes).toContain('Product reviews and comparisons');
      expect(result.contentTypes).toContain('Trending topic commentary');
      expect(result.contentTypes).toContain('Educational entertainment');
    });

    it('should handle competitors with no content', async () => {
      const competitorsWithNoContent = [{
        ...mockCompetitorData,
        topContent: [],
        tactics: [],
        hooks: []
      }];

      const result = await service.getCompetitorInsights(competitorsWithNoContent);

      expect(result.commonPatterns).toEqual([]);
      expect(result.hookFormulas).toEqual([]);
      expect(result.topPlatforms).toEqual([]);
    });

    it('should handle invalid engagement percentages gracefully', async () => {
      const competitorsWithInvalidEngagement = [{
        ...mockCompetitorData,
        engagement: 'invalid%'
      }];

      const result = await service.getCompetitorInsights(competitorsWithInvalidEngagement);

      expect(typeof result.averageEngagement).toBe('number');
      expect(isNaN(result.averageEngagement)).toBe(true);
    });
  });

  describe('saveCompetitorAnalysis', () => {
    const mockCompetitors = [mockCompetitorData];
    const mockInsights = {
      commonPatterns: ['Pattern 1'],
      hookFormulas: ['Hook 1'],
      contentTypes: ['Type 1'],
      averageEngagement: 6.5,
      topPlatforms: [{ platform: 'tiktok', percentage: 100 }]
    };

    it('should save analysis successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      });

      await service.saveCompetitorAnalysis(MOCK_USER_ID, mockCompetitors, mockInsights);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('competitor_analyses');
      
      const insertCall = mockSupabaseClient.from().insert;
      expect(insertCall).toHaveBeenCalledWith({
        user_id: MOCK_USER_ID,
        analysis_data: {
          competitors: mockCompetitors,
          insights: mockInsights,
          analyzed_at: expect.any(String)
        }
      });
    });

    it('should handle save errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({
          error: new Error('Database error')
        }))
      });

      // Should not throw even if save fails
      await expect(
        service.saveCompetitorAnalysis(MOCK_USER_ID, mockCompetitors, mockInsights)
      ).resolves.toBeUndefined();
    });

    it('should include timestamp in saved data', async () => {
      const beforeTime = new Date().toISOString();
      
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      });

      await service.saveCompetitorAnalysis(MOCK_USER_ID, mockCompetitors, mockInsights);

      const insertCall = mockSupabaseClient.from().insert;
      const insertedData = insertCall.mock.calls[0][0];
      
      expect(insertedData.analysis_data.analyzed_at).toBeDefined();
      expect(new Date(insertedData.analysis_data.analyzed_at).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });
  });

  describe('Integration Tests', () => {
    it('should complete full analysis workflow', async () => {
      // Mock successful API response
      const mockApiResponse = {
        success: true,
        data: [mockCompetitorData],
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      mockFetch(mockApiResponse);

      // Mock user profile
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { niche: 'tech' },
            error: null
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ error: null }))
      });

      // Step 1: Fetch competitors
      const competitorsResult = await service.getTopCompetitors({ niche: 'tech', limit: 5 });
      expect(competitorsResult.success).toBe(true);
      expect(competitorsResult.data).toBeDefined();

      // Step 2: Analyze insights
      const insights = await service.getCompetitorInsights(competitorsResult.data!);
      expect(insights).toBeDefined();
      expect(insights.commonPatterns).toBeDefined();

      // Step 3: Save analysis
      await service.saveCompetitorAnalysis(MOCK_USER_ID, competitorsResult.data!, insights);

      // Verify all steps completed without errors
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('competitor_analyses');
    });

    it('should handle partial failures in workflow', async () => {
      // Mock API failure
      mockFetch({ success: false, error: 'API Error' }, 500);

      // Should handle gracefully
      const result = await service.getTopCompetitors();
      expect(result.success).toBe(false);

      // Analysis with empty data should still work
      const insights = await service.getCompetitorInsights([]);
      expect(insights).toBeDefined();
      expect(insights.commonPatterns).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large competitor datasets efficiently', async () => {
      const largeCompetitorSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockCompetitorData,
        id: `competitor-${i}`,
        name: `Competitor ${i}`,
        tactics: [`Tactic ${i}`, 'Common Tactic'],
        hooks: [`Hook ${i}`],
        topContent: [{
          id: `content-${i}`,
          title: `Content ${i}`,
          views: '100K',
          engagement: '5%',
          url: `https://example.com/${i}`,
          platform: 'tiktok' as const
        }]
      }));

      const startTime = Date.now();
      const result = await service.getCompetitorInsights(largeCompetitorSet);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent analysis requests', async () => {
      mockFetch({ success: true, data: [mockCompetitorData] });

      const requests = Array.from({ length: 5 }, () => 
        service.getTopCompetitors({ niche: 'tech' })
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});