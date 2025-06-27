import { generateContent, GenerateContentRequest, GenerateContentResponse } from '../contentGeneration';
import { Platform } from '../../app/workflows/deliverables/types/deliverables_types';
import * as nlpModule from '../../app/workflows/AI_improvement/functions/nlp';

// Mock the NLP module
jest.mock('../../app/workflows/AI_improvement/functions/nlp', () => ({
  suggestCaptionsAndHashtags: jest.fn(),
}));

const mockSuggestCaptionsAndHashtags = nlpModule.suggestCaptionsAndHashtags as jest.MockedFunction<typeof nlpModule.suggestCaptionsAndHashtags>;

describe('contentGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateContent', () => {
    const mockNLPResponse = {
      captions: [
        {
          variation: 'Original caption optimized for engagement',
          type: 'emoji_enhanced',
          expectedPerformance: 7.2,
          targetAudience: 'general',
        },
        {
          variation: 'Alternative caption with trending keywords',
          type: 'tone_adjusted',
          expectedPerformance: 6.8,
          targetAudience: 'general',
        },
      ],
      hashtags: [
        {
          hashtag: '#trending',
          relevanceScore: 0.92,
          popularityScore: 0.88,
          competitionLevel: 'low',
          estimatedReach: 100000,
        },
        {
          hashtag: '#viral',
          relevanceScore: 0.87,
          popularityScore: 0.95,
          competitionLevel: 'medium',
          estimatedReach: 200000,
        },
      ],
      optimization: {
        originalText: 'Test caption for content generation',
        optimizedText: 'Optimized Test caption for content generation',
        improvements: [
          'Add more emotional triggers',
          'Include call-to-action',
        ],
        expectedEngagementIncrease: 0.15,
        platform: Platform.TIKTOK,
      },
    };

    beforeEach(() => {
      mockSuggestCaptionsAndHashtags.mockReturnValue(mockNLPResponse);
    });

    it('should generate content successfully with all parameters', async () => {
      const request: GenerateContentRequest = {
        caption: 'Test caption for content generation',
        hashtags: ['#test', '#content'],
        platform: Platform.TIKTOK,
        targetAudience: 'young adults',
      };

      const result = await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: request.caption,
        hashtags: request.hashtags,
        platform: request.platform,
        targetAudience: request.targetAudience,
      });

      expect(result).toEqual({
        captions: mockNLPResponse.captions,
        hashtags: mockNLPResponse.hashtags,
        optimization: mockNLPResponse.optimization,
      });
    });

    it('should generate content with minimal parameters', async () => {
      const request: GenerateContentRequest = {
        caption: 'Minimal test caption',
        platform: Platform.INSTAGRAM,
      };

      const result = await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: request.caption,
        hashtags: [],
        platform: request.platform,
        targetAudience: undefined,
      });

      expect(result).toEqual({
        captions: mockNLPResponse.captions,
        hashtags: mockNLPResponse.hashtags,
        optimization: mockNLPResponse.optimization,
      });
    });

    it('should handle different platforms correctly', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.LINKEDIN];

      for (const platform of platforms) {
        const request: GenerateContentRequest = {
          caption: `Test caption for ${platform}`,
          platform,
        };

        await generateContent(request);

        expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith(
          expect.objectContaining({
            platform,
          })
        );
      }
    });

    it('should handle empty caption gracefully', async () => {
      const request: GenerateContentRequest = {
        caption: '',
        platform: Platform.TIKTOK,
      };

      const result = await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: '',
        hashtags: [],
        platform: Platform.TIKTOK,
        targetAudience: undefined,
      });

      expect(result).toBeDefined();
    });

    it('should handle long captions', async () => {
      const longCaption = 'A'.repeat(2000); // Very long caption
      const request: GenerateContentRequest = {
        caption: longCaption,
        platform: Platform.YOUTUBE,
        hashtags: ['#long', '#content'],
      };

      const result = await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: longCaption,
        hashtags: ['#long', '#content'],
        platform: Platform.YOUTUBE,
        targetAudience: undefined,
      });

      expect(result).toBeDefined();
    });

    it('should handle special characters in caption', async () => {
      const specialCaption = 'Test with émojis 🚀 and spëcial chars @#$%';
      const request: GenerateContentRequest = {
        caption: specialCaption,
        platform: Platform.INSTAGRAM,
      };

      const result = await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: specialCaption,
        hashtags: [],
        platform: Platform.INSTAGRAM,
        targetAudience: undefined,
      });

      expect(result).toBeDefined();
    });

    it('should handle large number of hashtags', async () => {
      const manyHashtags = Array.from({ length: 50 }, (_, i) => `#tag${i}`);
      const request: GenerateContentRequest = {
        caption: 'Test with many hashtags',
        hashtags: manyHashtags,
        platform: Platform.TIKTOK,
      };

      const result = await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: request.caption,
        hashtags: manyHashtags,
        platform: Platform.TIKTOK,
        targetAudience: undefined,
      });

      expect(result).toBeDefined();
    });

    it('should handle different target audiences', async () => {
      const audiences = [
        'teenagers',
        'young adults',
        'professionals',
        'parents',
        'seniors',
        'gamers',
        'fitness enthusiasts',
      ];

      for (const audience of audiences) {
        const request: GenerateContentRequest = {
          caption: `Content for ${audience}`,
          platform: Platform.INSTAGRAM,
          targetAudience: audience,
        };

        await generateContent(request);

        expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith(
          expect.objectContaining({
            targetAudience: audience,
          })
        );
      }
    });

    it('should handle NLP service errors gracefully', async () => {
      mockSuggestCaptionsAndHashtags.mockImplementation(() => {
        throw new Error('NLP service unavailable');
      });

      const request: GenerateContentRequest = {
        caption: 'Test caption',
        platform: Platform.TIKTOK,
      };

      await expect(generateContent(request)).rejects.toThrow('NLP service unavailable');
    });

    it('should handle malformed NLP response', async () => {
      mockSuggestCaptionsAndHashtags.mockReturnValue({
        captions: null as any,
        hashtags: undefined as any,
        optimization: {} as any,
      });

      const request: GenerateContentRequest = {
        caption: 'Test caption',
        platform: Platform.INSTAGRAM,
      };

      const result = await generateContent(request);

      expect(result.captions).toBeNull();
      expect(result.hashtags).toBeUndefined();
      expect(result.optimization).toEqual({});
    });

    it('should preserve request parameters in NLP call', async () => {
      const request: GenerateContentRequest = {
        caption: 'Preserve parameters test',
        hashtags: ['#preserve', '#test'],
        platform: Platform.LINKEDIN,
        targetAudience: 'business professionals',
      };

      await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: 'Preserve parameters test',
        hashtags: ['#preserve', '#test'],
        platform: Platform.LINKEDIN,
        targetAudience: 'business professionals',
      });
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        caption: `Concurrent test ${i}`,
        platform: Platform.TIKTOK,
      }));

      const promises = requests.map(request => generateContent(request));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result).toEqual({
          captions: mockNLPResponse.captions,
          hashtags: mockNLPResponse.hashtags,
          optimization: mockNLPResponse.optimization,
        });
      });
    });

    it('should handle undefined hashtags array', async () => {
      const request: GenerateContentRequest = {
        caption: 'Test without hashtags',
        platform: Platform.YOUTUBE,
        hashtags: undefined,
      };

      await generateContent(request);

      expect(mockSuggestCaptionsAndHashtags).toHaveBeenCalledWith({
        caption: 'Test without hashtags',
        hashtags: [],
        platform: Platform.YOUTUBE,
        targetAudience: undefined,
      });
    });

    it('should handle performance with large optimization data', async () => {
      const largeOptimization = {
        readabilityScore: 8.5,
        sentimentScore: 0.7,
        keywordDensity: 0.15,
        recommendations: Array.from({ length: 100 }, (_, i) => `Recommendation ${i}`),
      };

      mockSuggestCaptionsAndHashtags.mockReturnValue({
        ...mockNLPResponse,
        optimization: largeOptimization,
      });

      const request: GenerateContentRequest = {
        caption: 'Performance test',
        platform: Platform.TIKTOK,
      };

      const startTime = Date.now();
      const result = await generateContent(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.optimization.recommendations).toHaveLength(100);
    });
  });
}); 