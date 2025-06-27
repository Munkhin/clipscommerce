import { EnhancedContentOptimizationAgent } from './EnhancedContentOptimizationAgent';
import { 
  EnhancedContentOptimizationTask,
  ContentOptimizationResponse,
  ContentRecommendations,
  PostingTimeOptimization,
  ABTestingParameters,
} from './enhanced_content_optimization_types';
import { VideoOptimizationAnalysisService } from './VideoOptimizationAnalysisService';
import { Platform, AnalysisResult, VideoOptimizationAnalysisData } from '../data_analysis/types/analysis_types';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('./VideoOptimizationAnalysisService');
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

const MockedVideoOptimizationAnalysisService = VideoOptimizationAnalysisService as jest.MockedClass<typeof VideoOptimizationAnalysisService>;
const mockOpenAICreate = new (require('openai'))({apiKey: 'test'}).chat.completions.create;


describe('EnhancedContentOptimizationAgent', () => {
  let agent: EnhancedContentOptimizationAgent;
  let mockVideoOptimizationService: jest.Mocked<VideoOptimizationAnalysisService>;

  const MOCK_API_KEY = 'test-openai-api-key';
  const MOCK_USER_ID = 'test-user-123';

  const mockAnalysisData: VideoOptimizationAnalysisData = {
    topPerformingVideoCaptions: ['Caption 1', 'Caption 2'],
    trendingHashtags: [{ tag: '#trending' }, { tag: '#viral' }],
    audioViralityAnalysis: [{ audioId: 'audio1', viralityScore: 0.9, suitabilityScore: 0.8, title: 'Test Audio' }],
    detailedPlatformAnalytics: {} as any, // Add minimal required fields if needed
    realTimeSentiment: {} as any,
  };

  const mockContentRecommendations: ContentRecommendations = {
    captionVariations: [{ id: uuidv4(), text: 'Test Caption', style: 'casual', tone: 'neutral', length: 100, callToAction: false }],
    hashtagStrategies: [{ id: uuidv4(), name: 'Trending Strategy', hashtags: ['#trending', '#test'], strategy: 'trending', platform: 'TikTok' }],
    visualContentSuggestions: [{ id: uuidv4(), type: 'color-palette', suggestion: 'Use vibrant colors', description: 'Vibrant colors attract attention', priority: 'high', platform: 'TikTok' }],
  };

  const mockPostingTimeOptimization: PostingTimeOptimization = {
    optimalTimes: [{ timeSlot: '10:00-11:00', dayOfWeek: 'monday', timezone: 'UTC', estimatedEngagement: 0.8, confidence: 0.9, platform: 'TikTok' }],
    audienceEngagementPatterns: [],
    timeZoneConsiderations: [],
  };

  const mockABTestingParameters: ABTestingParameters = {
    experiments: [],
    testDuration: 14,
    successMetrics: ['engagement_rate'],
    statisticalSignificance: 0.95,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Instantiate the mocked service
    mockVideoOptimizationService = new MockedVideoOptimizationAnalysisService(MOCK_API_KEY) as jest.Mocked<VideoOptimizationAnalysisService>;
    
    // Mock service methods
    mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue({
      success: true,
      data: mockAnalysisData,
      metadata: { generatedAt: new Date(), source: 'mock' },
    });
    
    // Mock OpenAI create method
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockContentRecommendations) } }],
    });

    // Create agent with mocked service
    agent = new EnhancedContentOptimizationAgent({ 
        openAIApiKey: MOCK_API_KEY 
    });
    // Manually inject the mocked service
    (agent as any).videoOptimizationService = mockVideoOptimizationService;
    await agent.start(); // Ensure the main agent instance is started here
  });

  it('should instantiate correctly', () => {
    expect(agent).toBeInstanceOf(EnhancedContentOptimizationAgent);
  });

  it('should start and stop correctly', async () => {
    expect(await agent.getStatus()).toBe('idle');
    await agent.stop();
    expect(await agent.getStatus()).toBe('idle');
  });

  describe('executeTask - generate_content_recommendations', () => {
    it('should successfully generate content recommendations', async () => {
      const task: EnhancedContentOptimizationTask = {
        id: uuidv4(),
        type: 'generate_content_recommendations',
        platform: 'TikTok',
        userId: MOCK_USER_ID,
      };

      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockContentRecommendations) } }],
      });

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.contentRecommendations).toEqual(mockContentRecommendations);
      expect(mockVideoOptimizationService.getVideoOptimizationInsights).toHaveBeenCalled();
      expect(mockOpenAICreate).toHaveBeenCalled();
    });
  });

  describe('executeTask - optimize_posting_times', () => {
    it('should successfully optimize posting times', async () => {
      const task: EnhancedContentOptimizationTask = {
        id: uuidv4(),
        type: 'optimize_posting_times',
        platform: 'Instagram',
        userId: MOCK_USER_ID,
      };

      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPostingTimeOptimization) } }],
      });

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.postingTimeOptimization).toEqual(mockPostingTimeOptimization);
      expect(mockVideoOptimizationService.getVideoOptimizationInsights).toHaveBeenCalled();
      expect(mockOpenAICreate).toHaveBeenCalled();
    });
  });

  describe('executeTask - design_ab_tests', () => {
    it('should successfully design A/B tests', async () => {
      const task: EnhancedContentOptimizationTask = {
        id: uuidv4(),
        type: 'design_ab_tests',
        platform: 'YouTube',
        userId: MOCK_USER_ID,
      };

      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockABTestingParameters) } }],
      });

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.abTestingParameters).toEqual(mockABTestingParameters);
      expect(mockVideoOptimizationService.getVideoOptimizationInsights).toHaveBeenCalled();
      expect(mockOpenAICreate).toHaveBeenCalled();
    });
  });

  it('should handle unknown task type', async () => {
    const task = { id: uuidv4(), type: 'unknown_task', platform: 'TikTok', userId: MOCK_USER_ID } as any;
    await expect(agent.executeTask(task)).resolves.toMatchObject({
      success: false,
      error: { code: 'TASK_EXECUTION_FAILED', message: 'Unknown task type: unknown_task' },
    });
  });

  it('should handle rate limiting', async () => {
    const agentWithRateLimit = new EnhancedContentOptimizationAgent({ 
        openAIApiKey: MOCK_API_KEY,
        rateLimitPerMinute: 1 
    });
    await agentWithRateLimit.start();
    expect(await agentWithRateLimit.getStatus()).toBe('idle');
    (agentWithRateLimit as any).videoOptimizationService = mockVideoOptimizationService;
    
    const task: EnhancedContentOptimizationTask = {
        id: uuidv4(),
        type: 'generate_content_recommendations',
        platform: 'TikTok',
        userId: MOCK_USER_ID,
    };

    // First call should succeed
    await agentWithRateLimit.executeTask(task);
    
    // Second call should be rate limited
    const result = await agentWithRateLimit.executeTask(task);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Rate limit exceeded');
  });

  it('should use cache for identical tasks', async () => {
    const task: EnhancedContentOptimizationTask = {
      id: uuidv4(),
      type: 'generate_content_recommendations',
      platform: 'TikTok',
      userId: MOCK_USER_ID,
      niche: 'gaming',
    };

    // First call - should be a cache miss
    const result1 = await agent.executeTask(task);
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
    expect(result1.metadata.cacheStatus).toBe('miss'); // Check the correct metadata object
    expect(result1.data?.metadata.cacheStatus).toBe('miss'); // The data itself was a miss when cached


    // Second call (should hit cache for the overall operation)
    const result2 = await agent.executeTask(task);
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1); // Not called again
    expect(result2.metadata.cacheStatus).toBe('hit'); // Check the correct metadata object for the hit
    // The data retrieved from cache will still have its original 'miss' status in its own metadata
    expect(result2.data?.metadata.cacheStatus).toBe('miss'); 
  });

  it('should track performance metrics', async () => {
    const agentWithTracking = new EnhancedContentOptimizationAgent({ 
        openAIApiKey: MOCK_API_KEY,
        enablePerformanceTracking: true 
    });
    await agentWithTracking.start();
    expect(await agentWithTracking.getStatus()).toBe('idle');
    (agentWithTracking as any).videoOptimizationService = mockVideoOptimizationService;
    
    const task: EnhancedContentOptimizationTask = {
        id: uuidv4(),
        type: 'generate_content_recommendations',
        platform: 'TikTok',
        userId: MOCK_USER_ID,
    };
    
    await agentWithTracking.executeTask(task);
    const performanceMetrics = agentWithTracking.getPerformanceMetrics();
    expect(performanceMetrics.length).toBe(1);
    expect(performanceMetrics[0].success).toBe(true);
    expect(performanceMetrics[0].taskType).toBe('generate_content_recommendations');
  });

}); 