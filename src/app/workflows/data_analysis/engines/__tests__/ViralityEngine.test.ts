import { ViralityEngine } from '../ViralityEngine';
import { AudioAnalysisService } from '@/services/audioAnalysisService';
import { createClient } from '@/../supabase';
import { BaseAnalysisRequest, Platform } from '../../types/analysis_types';

// Mock dependencies
jest.mock('@/services/audioAnalysisService');
jest.mock('@/../supabase');

const MockedAudioAnalysisService = AudioAnalysisService as jest.MockedClass<typeof AudioAnalysisService>;
const mockSupabaseClient = createClient as jest.MockedFunction<typeof createClient>;

describe('ViralityEngine', () => {
  let viralityEngine: ViralityEngine;
  let mockAudioService: jest.Mocked<AudioAnalysisService>;
  let mockSupabase: any;

  const mockBaseRequest: BaseAnalysisRequest = {
    userId: 'test-user-id',
    platform: 'TikTok' as Platform,
    timeRange: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-07T23:59:59Z'
    },
    correlationId: 'test-correlation-id'
  };

  const mockAudioViralityData = [
    {
      audioId: 'audio-1',
      title: 'Trending Beat 2024',
      viralityScore: 0.9,
      suitabilityScore: 0.8,
      trendingRank: 1
    },
    {
      audioId: 'audio-2',
      title: 'Viral Dance Sound',
      viralityScore: 0.85,
      suitabilityScore: 0.75,
      trendingRank: 2
    },
    {
      audioId: 'audio-3',
      title: 'Chill Background Music',
      viralityScore: 0.7,
      suitabilityScore: 0.6,
      trendingRank: 5
    }
  ];

  beforeEach(() => {
    // Mock AudioAnalysisService
    mockAudioService = {
      analyzeAudioVirality: jest.fn(),
      discoverTrendingAudiosWithVirality: jest.fn(),
      getTrendingAudios: jest.fn()
    } as Partial<AudioAnalysisService> as jest.Mocked<AudioAnalysisService>;

    MockedAudioAnalysisService.mockImplementation(() => mockAudioService);

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };

    mockSupabaseClient.mockReturnValue(mockSupabase);

    viralityEngine = new ViralityEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeAudioVirality', () => {
    it('should analyze specific audio IDs when provided', async () => {
      const audioIds = ['audio-1', 'audio-2'];
      
      // Mock user niche lookup
      mockSupabase.single.mockResolvedValue({
        data: { niche: 'tech' },
        error: null
      });

      // Mock audio analysis
      mockAudioService.analyzeAudioVirality.mockResolvedValue(
        mockAudioViralityData.slice(0, 2)
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.analyzeAudioVirality(mockBaseRequest, audioIds);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].audioId).toBe('audio-1');
      expect(result.metadata.source).toBe('ViralityEngine');
      expect(result.metadata.cacheStatus).toBe('miss');
      expect(typeof result.metadata.processingTime).toBe('number');

      expect(mockAudioService.analyzeAudioVirality).toHaveBeenCalledWith(
        audioIds,
        'TikTok',
        'tech'
      );
    });

    it('should discover trending audios when no audio IDs provided', async () => {
      // Mock user niche lookup
      mockSupabase.single.mockResolvedValue({
        data: { niche: 'fashion' },
        error: null
      });

      // Mock trending audio discovery
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        mockAudioViralityData
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.analyzeAudioVirality(mockBaseRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.metadata.source).toBe('ViralityEngine');

      expect(mockAudioService.discoverTrendingAudiosWithVirality).toHaveBeenCalledWith(
        'TikTok',
        'fashion',
        20
      );
    });

    it('should handle missing user niche gracefully', async () => {
      // Mock user niche lookup failure
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('User not found')
      });

      // Mock trending audio discovery
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        mockAudioViralityData
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.analyzeAudioVirality(mockBaseRequest);

      expect(result.success).toBe(true);
      expect(mockAudioService.discoverTrendingAudiosWithVirality).toHaveBeenCalledWith(
        'TikTok',
        undefined, // niche should be undefined
        20
      );
    });

    it('should handle audio analysis service errors', async () => {
      // Mock user niche lookup
      mockSupabase.single.mockResolvedValue({
        data: { niche: 'tech' },
        error: null
      });

      // Mock audio analysis error
      mockAudioService.discoverTrendingAudiosWithVirality.mockRejectedValue(
        new Error('Platform API unavailable')
      );

      const result = await viralityEngine.analyzeAudioVirality(mockBaseRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Audio virality analysis failed');
      expect(result.error?.code).toBe('VIRALITY_ANALYSIS_ERROR');
      expect(result.error?.details).toBe('Platform API unavailable');
      expect(result.metadata.warnings).toContain('Analysis failed - check platform API connectivity');
    });

    it('should store analysis results after successful analysis', async () => {
      // Mock user niche lookup
      mockSupabase.single.mockResolvedValue({
        data: { niche: 'tech' },
        error: null
      });

      // Mock audio analysis
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        mockAudioViralityData
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      await viralityEngine.analyzeAudioVirality(mockBaseRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        platform: 'TikTok',
        analysis_data: mockAudioViralityData,
        analyzed_at: expect.any(String),
        result_count: 3
      });
    });

    it('should continue successfully even if storage fails', async () => {
      // Mock user niche lookup
      mockSupabase.single.mockResolvedValue({
        data: { niche: 'tech' },
        error: null
      });

      // Mock audio analysis
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        mockAudioViralityData
      );

      // Mock storage error
      mockSupabase.insert.mockRejectedValue(new Error('Database error'));

      const result = await viralityEngine.analyzeAudioVirality(mockBaseRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should include warning when no audio data found', async () => {
      // Mock user niche lookup
      mockSupabase.single.mockResolvedValue({
        data: { niche: 'tech' },
        error: null
      });

      // Mock empty audio analysis
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue([]);

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.analyzeAudioVirality(mockBaseRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.metadata.warnings).toContain('No audio data found for analysis');
    });
  });

  describe('getCachedAnalysis', () => {
    it('should return cached analysis when available and recent', async () => {
      const cachedData = {
        analysis_data: mockAudioViralityData,
        analyzed_at: new Date().toISOString()
      };

      mockSupabase.single.mockResolvedValue({
        data: cachedData,
        error: null
      });

      const result = await viralityEngine.getCachedAnalysis('test-user-id', 'TikTok', 30);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.data).toEqual(mockAudioViralityData);
      expect(result!.metadata.cacheStatus).toBe('hit');
    });

    it('should return null when no cached data available', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('No data found')
      });

      const result = await viralityEngine.getCachedAnalysis('test-user-id', 'TikTok', 30);

      expect(result).toBeNull();
    });

    it('should query with correct time cutoff', async () => {
      const maxAgeMinutes = 45;

      await viralityEngine.getCachedAnalysis('test-user-id', 'TikTok', maxAgeMinutes);

      expect(mockSupabase.gte).toHaveBeenCalledWith('analyzed_at', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/));
    });
  });

  describe('getAudioRecommendations', () => {
    it('should return cached recommendations when available', async () => {
      // Mock cached analysis
      const cachedData = {
        analysis_data: mockAudioViralityData,
        analyzed_at: new Date().toISOString()
      };

      mockSupabase.single.mockResolvedValue({
        data: cachedData,
        error: null
      });

      const result = await viralityEngine.getAudioRecommendations('test-user-id', 'TikTok', 'video', 5);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // All mock data meets threshold
      expect(result.metadata.warnings).toContain('Using cached recommendations');
    });

    it('should generate fresh recommendations when cache is empty', async () => {
      // Mock no cached data
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('No cache')
      });

      // Mock user niche lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { niche: 'tech' },
        error: null
      });

      // Mock fresh analysis
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        mockAudioViralityData
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.getAudioRecommendations('test-user-id', 'TikTok', 'video', 5);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(mockAudioService.discoverTrendingAudiosWithVirality).toHaveBeenCalled();
    });

    it('should filter recommendations by quality thresholds', async () => {
      const mixedQualityData = [
        {
          audioId: 'high-quality',
          title: 'High Quality Audio',
          viralityScore: 0.8,
          suitabilityScore: 0.7,
          trendingRank: 1
        },
        {
          audioId: 'low-virality',
          title: 'Low Virality Audio',
          viralityScore: 0.4, // Below 0.6 threshold
          suitabilityScore: 0.8,
          trendingRank: 10
        },
        {
          audioId: 'low-suitability',
          title: 'Low Suitability Audio',
          viralityScore: 0.8,
          suitabilityScore: 0.3, // Below 0.5 threshold
          trendingRank: 3
        }
      ];

      // Mock no cached data
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('No cache')
      });

      // Mock user niche lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { niche: 'tech' },
        error: null
      });

      // Mock fresh analysis with mixed quality
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        mixedQualityData
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.getAudioRecommendations('test-user-id', 'TikTok', 'video', 5);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only high-quality audio should pass filters
      expect(result.data![0].audioId).toBe('high-quality');
    });

    it('should sort recommendations by combined score', async () => {
      const unsortedData = [
        {
          audioId: 'medium-combined',
          title: 'Medium Combined Score',
          viralityScore: 0.7,
          suitabilityScore: 0.6, // Combined: 0.65
          trendingRank: 5
        },
        {
          audioId: 'high-combined',
          title: 'High Combined Score',
          viralityScore: 0.9,
          suitabilityScore: 0.8, // Combined: 0.85
          trendingRank: 1
        },
        {
          audioId: 'low-combined',
          title: 'Low Combined Score',
          viralityScore: 0.6,
          suitabilityScore: 0.5, // Combined: 0.55
          trendingRank: 8
        }
      ];

      // Mock no cached data
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('No cache')
      });

      // Mock user niche lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { niche: 'tech' },
        error: null
      });

      // Mock fresh analysis
      mockAudioService.discoverTrendingAudiosWithVirality.mockResolvedValue(
        unsortedData
      );

      // Mock storage
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await viralityEngine.getAudioRecommendations('test-user-id', 'TikTok', 'video', 5);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data![0].audioId).toBe('high-combined');
      expect(result.data![1].audioId).toBe('medium-combined');
      expect(result.data![2].audioId).toBe('low-combined');
    });

    it('should handle errors gracefully', async () => {
      // Mock cached analysis failure
      mockSupabase.single.mockRejectedValue(new Error('Database error'));

      const result = await viralityEngine.getAudioRecommendations('test-user-id', 'TikTok');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to get audio recommendations');
      expect(result.error?.code).toBe('RECOMMENDATION_ERROR');
    });

    it('should limit recommendations to requested amount', async () => {
      const largeDataSet = Array.from({ length: 15 }, (_, i) => ({
        audioId: `audio-${i}`,
        title: `Audio ${i}`,
        viralityScore: 0.8,
        suitabilityScore: 0.7,
        trendingRank: i + 1
      }));

      // Mock cached analysis
      const cachedData = {
        analysis_data: largeDataSet,
        analyzed_at: new Date().toISOString()
      };

      mockSupabase.single.mockResolvedValue({
        data: cachedData,
        error: null
      });

      const limit = 5;
      const result = await viralityEngine.getAudioRecommendations('test-user-id', 'TikTok', 'video', limit);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(limit);
    });
  });
});