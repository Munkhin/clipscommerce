import OpenAI, { APIError } from 'openai';
import { OptimizedVideoGenerator, UserPreferences, ProductLink, OptimizedVideoContent } from './OptimizedVideoGenerator';
import { VideoOptimizationAnalysisData, TrendingHashtag, AudioVirality, SentimentAnalysisResult, DetailedPlatformMetrics, Platform } from '../data_analysis/types/analysis_types';

// Mock OpenAI
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

const MOCK_API_KEY = 'test-openai-api-key';
const MOCK_USER_ID = 'test-user-123';

// Helper to get the mock create function
const mockOpenAICreate = new OpenAI({ apiKey: MOCK_API_KEY }).chat.completions.create as jest.Mock;


describe('OptimizedVideoGenerator', () => {
  // Mocks and setup from previous steps will be leveraged here

  let generator: OptimizedVideoGenerator;
  let mockAnalysisData: VideoOptimizationAnalysisData;
  let mockUserPreferences: UserPreferences;

  const mockOptimizedContentResponse: OptimizedVideoContent = {
    captions: {
      main: 'This is the main caption.',
      alternatives: ['Alternative caption 1.', 'Alternative caption 2.'],
    },
    hashtags: ['#generated', '#test', '#success'],
    audio: {
      suggestion: 'Upbeat trending audio.',
      reason: 'Matches content vibe and is popular.',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // For testing cache TTL and rate limits

    generator = new OptimizedVideoGenerator(MOCK_API_KEY);

    mockUserPreferences = {
      userId: MOCK_USER_ID,
      platform: 'TikTok' as Platform,
      tone: 'friendly',
      language: 'en',
      includeCTA: true,
      maxCaptionLength: 150,
      correlationId: 'test-correlation-id'
    };

    mockAnalysisData = {
      topPerformingVideoCaptions: ['Caption 1 #awesome', 'Caption 2 #epic'],
      trendingHashtags: [{ tag: 'trending' }, { tag: 'viral' }],
      audioViralityAnalysis: [{ audioId: 'audio1', viralityScore: 0.9, suitabilityScore: 0.8 }],
      realTimeSentiment: {
        overallSentiment: 'positive',
        overallScores: { positive: 0.8, neutral: 0.1, negative: 0.1 },
        dominantEmotion: 'joy',
      } as SentimentAnalysisResult,
      detailedPlatformAnalytics: {
        audienceDemographics: {
          ageGroups: { '18-24': 0.6 },
          genderDistribution: { male: 0.5, female: 0.5 },
          topCountries: { US: 0.8, UK: 0.2 },
          topCities: { 'New York': 0.3, 'Los Angeles': 0.2 }
        },
      } as DetailedPlatformMetrics,
    };

    // Default mock for successful OpenAI response
    mockOpenAICreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockOptimizedContentResponse)
        }
      }],
      usage: { total_tokens: 100 }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should throw an error if API key is not provided', () => {
      expect(() => new OptimizedVideoGenerator('')).toThrow('API key is required for OptimizedVideoGenerator');
    });

    it('should initialize OpenAI client with the provided API key', () => {
      // Constructor is called in beforeEach
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: MOCK_API_KEY });
    });
  });

  describe('generateOptimizedContent - Prompt Generation', () => {
    it('should generate a comprehensive prompt including all provided data', async () => {
      await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      const calledWith = mockOpenAICreate.mock.calls[0][0] as any;
      const prompt = calledWith.messages[0].content;

      expect(prompt).toContain('Platform: TikTok');
      expect(prompt).toContain(`User ID: ${MOCK_USER_ID}`);
      expect(prompt).toContain('Tone: friendly');
      expect(prompt).toContain('Include a Call to Action.');
      expect(prompt).toContain('Maximum caption length: 150 characters.');
      expect(prompt).toContain('Caption 1 #awesome');
      expect(prompt).toContain('#trending');
      expect(prompt).toContain('Audio ID: audio1');
      expect(prompt).toContain('Overall Sentiment: positive');
      expect(prompt).toContain('Dominant Emotion: joy');
      expect(prompt).toContain('Title: Cool Beat');
      expect(prompt).toContain('Age Groups: [{"range":"18-24","percentage":0.6}]');
      expect(prompt).toContain('--- Output Format (JSON) ---');
    });

    it('should include product links in the prompt if provided', async () => {
      const productLinks: ProductLink[] = [{ name: 'My Product', url: 'https://example.com/product' }];
      await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences, productLinks);
      
      const calledWith = mockOpenAICreate.mock.calls[0][0] as any;
      const prompt = calledWith.messages[0].content;
      expect(prompt).toContain('--- Product Links to Incorporate ---');
      expect(prompt).toContain('Product: My Product (https://example.com/product)');
    });
    
    it('should handle missing optional analysis data gracefully in prompt', async () => {
      const minimalAnalysisData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: []
      };
      await generator.generateOptimizedContent(minimalAnalysisData, mockUserPreferences);
      const calledWith = mockOpenAICreate.mock.calls[0][0] as any;
      const prompt = calledWith.messages[0].content;

      expect(prompt).not.toContain('--- Real-time Sentiment Analysis ---');
      expect(prompt).not.toContain('--- ML-based Audio Recommendations ---');
      expect(prompt).not.toContain('--- Detailed Platform Analytics ---');
    });
  });

  describe('generateOptimizedContent - OpenAI API Interaction', () => {
    it('should call OpenAI API with the correct model and parse the JSON response', async () => {
      const result = await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      
      expect(mockOpenAICreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4-turbo-preview', // Default model
        messages: expect.any(Array),
        response_format: { type: 'json_object' },
      }));
      expect(result).toEqual(mockOptimizedContentResponse);
    });

    it('should use a custom OpenAI model if provided in config', async () => {
      const customModel = 'gpt-4-custom-test-model';
      const generatorWithCustomModel = new OptimizedVideoGenerator(MOCK_API_KEY, { openAIModel: customModel });
      await generatorWithCustomModel.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      
      expect(mockOpenAICreate).toHaveBeenCalledWith(expect.objectContaining({
        model: customModel,
      }));
    });

    it('should throw an error if OpenAI API returns non-JSON content', async () => {
      mockOpenAICreate.mockResolvedValueOnce({ choices: [{ message: { content: 'This is not JSON' } }] });
      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow('Failed to parse OpenAI response: This is not JSON');
    });
    
    it('should throw an error if OpenAI API returns malformed JSON', async () => {
      mockOpenAICreate.mockResolvedValueOnce({ choices: [{ message: { content: '{"bad": json' } }] });
      // Checking for a generic error message part as specific parsing errors can vary.
      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow(/Failed to parse OpenAI response/); 
    });

    it('should throw an error if OpenAI API returns no choices', async () => {
      mockOpenAICreate.mockResolvedValueOnce({ choices: [] });
      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow('No content generated by OpenAI.');
    });
     it('should throw an error if OpenAI API response content is null', async () => {
      mockOpenAICreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });
      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow('No content generated by OpenAI.');
    });
    
    it('should throw an error if OpenAI API call fails', async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error('API Error'));
      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow('API Error');
    });

    it('should throw an error if OpenAI API returns JSON that fails Zod validation', async () => {
      const malformedData = {
        captions: { main: 'Test Caption' }, // Missing 'alternatives'
        hashtags: ['#test'],
        audio: { suggestion: 'Test Audio', reason: 'It fits' }
      };
      mockOpenAICreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(malformedData) } }] });
      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow(/^OpenAI response validation failed: captions.alternatives - Required/);
    });

    it('should successfully generate content after a few transient API errors (e.g., 500)', async () => {
      const retryableError = new APIError(500, undefined, 'Internal Server Error', undefined);
      mockOpenAICreate
        .mockRejectedValueOnce(retryableError) // First attempt fails
        .mockRejectedValueOnce(retryableError) // Second attempt fails
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(mockOptimizedContentResponse) } }] }); // Third attempt succeeds

      const result = await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(result).toEqual(mockOptimizedContentResponse);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3);
    });

    it('should throw an error after exhausting retries on persistent transient API errors', async () => {
      const persistentRetryableError = new APIError(503, undefined, 'Service Unavailable', undefined);
      mockOpenAICreate.mockRejectedValue(persistentRetryableError); // All attempts fail

      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow(persistentRetryableError);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3); // Default MAX_RETRIES is 3
    });

    it('should throw an error immediately for non-retryable API errors (e.g., 401)', async () => {
      const nonRetryableError = new APIError(401, undefined, 'Unauthorized', undefined);
      mockOpenAICreate.mockRejectedValueOnce(nonRetryableError); // Single attempt fails

      await expect(generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences))
        .rejects.toThrow(nonRetryableError);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Input Validation', () => {
    it('should throw an error if analysisData is null', async () => {
      await expect(generator.generateOptimizedContent(null as any, mockUserPreferences))
        .rejects.toThrow('Invalid input: analysisData is required.');
    });

    it('should throw an error if userPreferences is null', async () => {
      await expect(generator.generateOptimizedContent(mockAnalysisData, null as any))
        .rejects.toThrow('Invalid input: userPreferences are required.');
    });

    it('should throw an error if userPreferences.userId is null', async () => {
      const prefs = { ...mockUserPreferences, userId: null as any };
      await expect(generator.generateOptimizedContent(mockAnalysisData, prefs))
        .rejects.toThrow('Invalid input: userPreferences.userId is required and must be a non-empty string.');
    });

    it('should throw an error if userPreferences.userId is undefined', async () => {
      const prefs = { ...mockUserPreferences, userId: undefined as any };
      await expect(generator.generateOptimizedContent(mockAnalysisData, prefs))
        .rejects.toThrow('Invalid input: userPreferences.userId is required and must be a non-empty string.');
    });

    it('should throw an error if userPreferences.userId is an empty string', async () => {
      const prefs = { ...mockUserPreferences, userId: '   ' }; // Empty or whitespace
      await expect(generator.generateOptimizedContent(mockAnalysisData, prefs))
        .rejects.toThrow('Invalid input: userPreferences.userId is required and must be a non-empty string.');
    });
  });

  describe('generateOptimizedContent - Caching', () => {
    it('should cache a successful response and return it on subsequent identical calls', async () => {
      const result1 = await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      
      const result2 = await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1); // Should not call OpenAI again
      expect(result2).toEqual(result1); // Should return the cached result
    });

    it('should not use cache for different parameters', async () => {
      await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);

      const differentPreferences = { ...mockUserPreferences, tone: 'professional' as const };
      await generator.generateOptimizedContent(mockAnalysisData, differentPreferences);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2); // Should call OpenAI again
    });
    
    it('should invalidate and fetch new data if cache expires', async () => {
      await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);

      // Advance time beyond CACHE_TTL (6 hours in generator)
      jest.advanceTimersByTime((6 * 60 * 60 * 1000) + 1);

      await generator.generateOptimizedContent(mockAnalysisData, mockUserPreferences);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2); // Should call OpenAI again
    });
  });

  describe('generateOptimizedContent - Rate Limiting', () => {
    // MAX_REQUESTS_PER_MINUTE is 20 in the generator
    it('should allow up to MAX_REQUESTS_PER_MINUTE requests within the window', async () => {
      for (let i = 0; i < 20; i++) {
        // Vary parameters slightly to avoid caching for this specific rate limit test
        await generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 150 + i });
      }
      expect(mockOpenAICreate).toHaveBeenCalledTimes(20);
    });

    it('should throw error when rate limit is exceeded (21st request)', async () => {
      for (let i = 0; i < 20; i++) {
         await generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 100 + i });
      }
      // 21st request
      await expect(generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 200 }))
        .rejects.toThrow(`Rate limit exceeded for user ${MOCK_USER_ID}. Please try again later.`);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(20); // Still 20, as the 21st should be blocked before API call
    });

    it('should reset rate limit after the window expires', async () => {
      for (let i = 0; i < 20; i++) {
        await generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 50 + i });
      }
      await expect(generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 70 }))
        .rejects.toThrow('Rate limit exceeded');
      
      // Advance time beyond RATE_LIMIT_WINDOW (1 minute in generator)
      jest.advanceTimersByTime((60 * 1000) + 1);

      await generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 71 });
      expect(mockOpenAICreate).toHaveBeenCalledTimes(21); // Should allow the call (20 previous + 1 new)
    });

    it('should apply rate limits independently for different users', async () => {
      const MOCK_USER_ID_2 = 'test-user-456';
      const userPreferences2 = { ...mockUserPreferences, userId: MOCK_USER_ID_2 };
      const MAX_REQUESTS = 20; // Assuming MAX_REQUESTS_PER_MINUTE is 20 from generator

      // User 1 hits the rate limit
      for (let i = 0; i < MAX_REQUESTS; i++) {
        await generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 300 + i });
      }
      await expect(generator.generateOptimizedContent(mockAnalysisData, { ...mockUserPreferences, maxCaptionLength: 300 + MAX_REQUESTS }))
        .rejects.toThrow(`Rate limit exceeded for user ${MOCK_USER_ID}. Please try again later.`);

      // User 2 makes a request - should succeed
      await generator.generateOptimizedContent(mockAnalysisData, { ...userPreferences2, maxCaptionLength: 400 });

      expect(mockOpenAICreate).toHaveBeenCalledTimes(MAX_REQUESTS + 1); // 20 for user1, 1 for user2
    });
  });
});