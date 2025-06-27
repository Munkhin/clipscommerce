import 'openai/shims/node';
import { VideoOptimizationAnalysisService } from './VideoOptimizationAnalysisService';
import { ContentInsightsEngine } from '../data_analysis/engines/ContentInsightsEngine';
import { ViralityEngine } from '../data_analysis/engines/ViralityEngine';
import { SentimentAnalysisEngine } from './engines/SentimentAnalysisEngine';
import { OptimizedVideoGenerator, ProductLink, OptimizedVideoContent, UserPreferences } from './OptimizedVideoGenerator';
import { 
  AnalysisResult, 
  VideoOptimizationAnalysisData, 
  BaseAnalysisRequest,
  TimeRange,
  Platform,
  AudioVirality,
  TopPerformingContent,
  DetailedPlatformMetrics,
  SentimentAnalysisResult
} from '../data_analysis/types/analysis_types';
import * as HashtagAnalysis from '../data_analysis/functions/hashtag_analysis'; // For spying

// Mocking the engines and generator
jest.mock('../data_analysis/engines/ContentInsightsEngine');
jest.mock('../data_analysis/engines/ViralityEngine');
jest.mock('./engines/SentimentAnalysisEngine');
jest.mock('./OptimizedVideoGenerator');
jest.mock('../data_analysis/functions/hashtag_analysis');


describe('VideoOptimizationAnalysisService', () => {
  let service: VideoOptimizationAnalysisService;
  let mockContentInsightsEngine: jest.Mocked<ContentInsightsEngine>;
  let mockViralityEngine: jest.Mocked<ViralityEngine>;
  let mockSentimentAnalysisEngine: jest.Mocked<SentimentAnalysisEngine>;
  let mockOptimizedVideoGenerator: jest.Mocked<OptimizedVideoGenerator>;
  let mockAnalyzeHashtags: jest.SpyInstance;

  const MOCK_API_KEY = 'test-key';

  beforeEach(() => {
    jest.clearAllMocks();

    mockContentInsightsEngine = new (ContentInsightsEngine as any)() as jest.Mocked<ContentInsightsEngine>;
    mockViralityEngine = new (ViralityEngine as any)() as jest.Mocked<ViralityEngine>;
    mockSentimentAnalysisEngine = new (SentimentAnalysisEngine as any)(MOCK_API_KEY) as jest.Mocked<SentimentAnalysisEngine>;
    
    mockOptimizedVideoGenerator = new (OptimizedVideoGenerator as any)(MOCK_API_KEY) as jest.Mocked<OptimizedVideoGenerator>;
    (OptimizedVideoGenerator as jest.MockedClass<typeof OptimizedVideoGenerator>).mockImplementation(() => mockOptimizedVideoGenerator);


    service = new VideoOptimizationAnalysisService(
      MOCK_API_KEY,
      mockContentInsightsEngine,
      mockViralityEngine,
      mockSentimentAnalysisEngine
    );
    
    mockAnalyzeHashtags = jest.spyOn(HashtagAnalysis, 'analyzeHashtags');

    // Setup default successful mock responses
    mockContentInsightsEngine.getTopPerformingContentInsights.mockResolvedValue({
      success: true, data: { topPerformingVideoCaptions: ['caption1', 'hashtag #cool'], trendingHashtags: [] },
      metadata: { generatedAt: new Date(), source: 'mock' }
    });
    mockContentInsightsEngine.getDetailedPlatformAnalytics.mockResolvedValue({
      success: true, data: { audienceDemographics: {} } as DetailedPlatformMetrics, // Provide minimal valid data
      metadata: { generatedAt: new Date(), source: 'mock' }
    });
    mockViralityEngine.analyzeAudioVirality.mockResolvedValue({
      success: true, data: [] as AudioVirality[],
      metadata: { generatedAt: new Date(), source: 'mock' }
    });
    mockSentimentAnalysisEngine.analyzeTextSentiment.mockResolvedValue({
      success: true, data: { overallSentiment: 'neutral' } as SentimentAnalysisResult,
      metadata: { generatedAt: new Date(), source: 'mock' }
    });
    mockOptimizedVideoGenerator.generateOptimizedContent.mockResolvedValue({
      captions: { main: 'Optimized Main Caption', alternatives: ['Alt 1', 'Alt 2'] },
      hashtags: ['#test'],
      audio: { suggestion: 'Test Audio', reason: 'It fits' }
    });
    mockAnalyzeHashtags.mockReturnValue(['#cool']);
  });

  describe('constructor', () => {
    it('should throw error if no API key is provided', () => {
      expect(() => new VideoOptimizationAnalysisService('', mockContentInsightsEngine, mockViralityEngine, mockSentimentAnalysisEngine)).toThrow('OpenAI API key is required');
    });
    it('should instantiate OptimizedVideoGenerator with the API key', () => {
        service = new VideoOptimizationAnalysisService(MOCK_API_KEY, mockContentInsightsEngine, mockViralityEngine, mockSentimentAnalysisEngine); // Re-instantiate to trigger constructor logic for this test
        expect(OptimizedVideoGenerator).toHaveBeenCalledWith(MOCK_API_KEY);
    });
  });

  describe('getVideoOptimizationInsights', () => {
    const baseRequest: BaseAnalysisRequest = {
      userId: 'testUser',
      platform: 'Instagram' as Platform,
      timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
      correlationId: 'test-corr-id'
    };

    it('should call all relevant engines and combine their data', async () => {
      const result = await service.getVideoOptimizationInsights(baseRequest);

      expect(mockContentInsightsEngine.getTopPerformingContentInsights).toHaveBeenCalledWith(expect.objectContaining({ userId: baseRequest.userId }));
      expect(mockContentInsightsEngine.getDetailedPlatformAnalytics).toHaveBeenCalledWith(baseRequest);
      expect(mockViralityEngine.analyzeAudioVirality).toHaveBeenCalledWith(expect.objectContaining({ userId: baseRequest.userId }), undefined); // No audioIds in baseRequest
      expect(mockSentimentAnalysisEngine.analyzeTextSentiment).toHaveBeenCalledWith('caption1 hashtag #cool', baseRequest.correlationId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.topPerformingVideoCaptions).toEqual(['caption1', 'hashtag #cool']);
      expect(result.data?.trendingHashtags).toEqual([{ tag: '#cool' }]);
      expect(result.data?.detailedPlatformAnalytics).toBeDefined();
      expect(result.data?.realTimeSentiment).toBeDefined();
    });

    it('should handle failure in ContentInsightsEngine gracefully', async () => {
      mockContentInsightsEngine.getTopPerformingContentInsights.mockResolvedValueOnce({
        success: false,
        error: { code: 'ENGINE_ERROR', message: 'Failed to fetch content insights' },
        data: { topPerformingVideoCaptions: [], trendingHashtags: [] },
        metadata: { generatedAt: new Date(), source: 'mock' }
      });
      const result = await service.getVideoOptimizationInsights({
        userId: 'testUser',
        platform: 'Instagram' as Platform,
        timeRange: { start: '', end: '' },
        correlationId: 'fail-content',
      });
      expect(result.success).toBe(true); // Should still succeed, but with missing data
      expect(result.data?.topPerformingVideoCaptions).toEqual([]);
    });

    it('should handle failure in ViralityEngine gracefully', async () => {
      mockViralityEngine.analyzeAudioVirality.mockResolvedValueOnce({
        success: false,
        error: { code: 'ENGINE_ERROR', message: 'Failed to fetch virality' },
        data: [],
        metadata: { generatedAt: new Date(), source: 'mock' }
      });
      const result = await service.getVideoOptimizationInsights({
        userId: 'testUser',
        platform: 'Instagram' as Platform,
        timeRange: { start: '', end: '' },
        correlationId: 'fail-virality',
      });
      expect(result.success).toBe(true);
      expect(result.data?.audioViralityAnalysis).toEqual([]);
    });

    it('should handle failure in SentimentAnalysisEngine gracefully', async () => {
      mockSentimentAnalysisEngine.analyzeTextSentiment.mockResolvedValueOnce({
        success: false,
        error: { code: 'ENGINE_ERROR', message: 'Failed to analyze sentiment' },
        data: undefined,
        metadata: { generatedAt: new Date(), source: 'mock' }
      });
      const result = await service.getVideoOptimizationInsights({
        userId: 'testUser',
        platform: 'Instagram' as Platform,
        timeRange: { start: '', end: '' },
        correlationId: 'fail-sentiment',
      });
      expect(result.success).toBe(true);
      expect(result.data?.realTimeSentiment).toBeUndefined();
    });

    it('should handle no captions found gracefully', async () => {
      mockContentInsightsEngine.getTopPerformingContentInsights.mockResolvedValueOnce({
        success: true, data: { topPerformingVideoCaptions: [], trendingHashtags: [] },
        metadata: { generatedAt: new Date(), source: 'mock' }
      });
      const result = await service.getVideoOptimizationInsights({
        userId: 'testUser',
        platform: 'Instagram' as Platform,
        timeRange: { start: '', end: '' },
        correlationId: 'no-captions',
      });
      expect(result.success).toBe(true);
      expect(result.data?.topPerformingVideoCaptions).toEqual([]);
      expect(result.data?.trendingHashtags).toEqual([]);
      expect(result.data?.realTimeSentiment).toBeUndefined();
    });

    it('should handle unexpected errors from engines', async () => {
      mockContentInsightsEngine.getTopPerformingContentInsights.mockImplementationOnce(() => { throw new Error('Unexpected'); });
      const result = await service.getVideoOptimizationInsights({
        userId: 'testUser',
        platform: 'Instagram' as Platform,
        timeRange: { start: '', end: '' },
        correlationId: 'unexpected',
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ANALYSIS_ERROR');
      expect(result.error?.message).toMatch(/Unexpected/);
    });
  });

  describe('generateOptimizedContent', () => {
    const mockAnalysisData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [], trendingHashtags: [], audioViralityAnalysis: []
    };
    const mockUserPreferences: UserPreferences = { userId: 'testUser' };

    it('should call OptimizedVideoGenerator with correct parameters', async () => {
      const result = await service.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(mockOptimizedVideoGenerator.generateOptimizedContent).toHaveBeenCalledWith(mockAnalysisData, mockUserPreferences, undefined);
      expect(result.success).toBe(true);
      expect(result.data?.captions.main).toBe('Optimized Main Caption');
    });
    
    it('should return error for missing analysis', async () => {
      const result = await service.generateOptimizedContent(undefined as any, { userId: 'testUser' });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
    it('should return error for missing userPreferences', async () => {
      const result = await service.generateOptimizedContent({ topPerformingVideoCaptions: [], trendingHashtags: [], audioViralityAnalysis: [] }, undefined as any);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
    it('should handle generator failure gracefully', async () => {
      mockOptimizedVideoGenerator.generateOptimizedContent.mockImplementationOnce(() => { throw new Error('Generator failed'); });
      const result = await service.generateOptimizedContent({ topPerformingVideoCaptions: [], trendingHashtags: [], audioViralityAnalysis: [] }, { userId: 'testUser' });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GENERATION_ERROR');
      expect(result.error?.message).toMatch(/Generator failed/);
    });
  });
});
