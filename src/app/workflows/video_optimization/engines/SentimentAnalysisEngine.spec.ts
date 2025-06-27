import { SentimentAnalysisEngine } from './SentimentAnalysisEngine';
import { AnalysisResult, SentimentAnalysisResult, SentimentLabelSchema, SentimentScoreSchema, AnalyzedTextSegmentSchema } from '../../data_analysis/types/analysis_types';
import { z } from 'zod';

// Local Zod schema for validating the structure of SentimentAnalysisResult data in tests
const LocalSentimentAnalysisResultSchema = z.object({
  overallSentiment: SentimentLabelSchema,
  overallScores: SentimentScoreSchema,
  segments: z.array(AnalyzedTextSegmentSchema).optional(),
  dominantEmotion: z.string().optional(),
});
import OpenAI from 'openai';
import { ZodError } from 'zod';

// Mock OpenAI module
jest.mock('openai', () => {
  // Mock the specific method used by the engine
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

describe('SentimentAnalysisEngine', () => {
  const MOCK_API_KEY = 'test-openai-api-key';
  let engine: SentimentAnalysisEngine;
  let mockOpenAICreate: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Get a fresh instance of the mocked OpenAI client and its create method
    const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
    // Pass options object to constructor
    const mockedOpenAIInstance = new MockedOpenAI({ apiKey: MOCK_API_KEY }); 
    mockOpenAICreate = mockedOpenAIInstance.chat.completions.create as jest.Mock;
    
    engine = new SentimentAnalysisEngine(MOCK_API_KEY);
  });

  describe('constructor', () => {
    it('should throw an error if API key is not provided', () => {
      expect(() => new SentimentAnalysisEngine('')).toThrow('API key is required for SentimentAnalysisEngine');
    });

    it('should initialize OpenAI client with the provided API key', () => {
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: MOCK_API_KEY });
    });
  });

  describe('analyzeTextSentiment', () => {
    const sampleText = 'This is a great product!';
    const correlationId = 'test-correlation-id';

    it('should return successful sentiment analysis result on valid API response', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                overallSentiment: 'positive',
                overallScores: { positive: 0.9, negative: 0.05, neutral: 0.05 },
                dominantEmotion: 'joy',
              }),
            },
          },
        ],
      };
      mockOpenAICreate.mockResolvedValue(mockApiResponse);

      const result = await engine.analyzeTextSentiment(sampleText, correlationId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      
      // Validate schema
      expect(() => LocalSentimentAnalysisResultSchema.parse(result.data)).not.toThrow();
      
      expect(result.data?.overallSentiment).toBe('positive');
      expect(result.data?.dominantEmotion).toBe('joy');
      expect(result.metadata?.source).toBe('SentimentAnalysisEngine.analyzeTextSentiment');
      expect(result.metadata?.correlationId).toBe(correlationId);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(mockOpenAICreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' },
      }));
    });

    it('should return failure on API error', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API Error'));

      const result = await engine.analyzeTextSentiment(sampleText, correlationId);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('API_ERROR');
      expect(result.error?.message).toBe('Failed to analyze sentiment due to API error: OpenAI API Error');
      expect(result.metadata?.source).toBe('SentimentAnalysisEngine.analyzeTextSentiment');
      expect(result.metadata?.correlationId).toBe(correlationId);
    });

    it('should return failure on invalid JSON response', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: 'This is not JSON',
            },
          },
        ],
      };
      mockOpenAICreate.mockResolvedValue(mockApiResponse);

      const result = await engine.analyzeTextSentiment(sampleText, correlationId);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(result.error?.message).toMatch(/Failed to parse sentiment analysis response: Unexpected token 'T'/); // Error message might vary slightly
      expect(result.metadata?.source).toBe('SentimentAnalysisEngine.analyzeTextSentiment');
    });
    
    it('should return failure if API response content is null', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: null, // Simulate null content
            },
          },
        ],
      };
      mockOpenAICreate.mockResolvedValue(mockApiResponse);

      const result = await engine.analyzeTextSentiment(sampleText, correlationId);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(result.error?.message).toBe('Failed to parse sentiment analysis response: API response content is null or empty.');
    });

    it('should return failure if API response choices are empty', async () => {
      const mockApiResponse = {
        choices: [], // Simulate empty choices
      };
      mockOpenAICreate.mockResolvedValue(mockApiResponse);
      const result = await engine.analyzeTextSentiment(sampleText, correlationId);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(result.error?.message).toBe('Failed to parse sentiment analysis response: No choices returned from API.');
    });
  });
});
