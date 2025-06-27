// OptimizedVideoGenerator.ts
// Uses the output of VideoOptimizationAnalysisService and user preferences to generate
// actual captions (with product links), hashtags, and audio suggestions via GPT-4-turbo.
// Designed for cost efficiency and high-quality returns.

import { VideoOptimizationAnalysisData, TrendingHashtag, AudioVirality } from '../data_analysis/types/analysis_types';
import OpenAI from 'openai';
import { z } from 'zod';

export interface UserPreferences {
  tone?: 'casual' | 'professional' | 'friendly' | 'authoritative';
  language?: string;
  includeCTA?: boolean;
  maxCaptionLength?: number;
  userId: string;
  platform?: string;
  correlationId?: string; // Added for tracing
}

export interface ProductLink {
  name: string;
  url: string;
  description?: string;
}

const OptimizedVideoContentSchema = z.object({
  captions: z.object({
    main: z.string(),
    alternatives: z.array(z.string()),
  }),
  hashtags: z.array(z.string()),
  audio: z.object({
    suggestion: z.string(),
    reason: z.string(),
  }),
});

export type OptimizedVideoContent = z.infer<typeof OptimizedVideoContentSchema>;

interface CacheEntry {
  data: OptimizedVideoContent;
  timestamp: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Configuration for the OptimizedVideoGenerator.
 */
export interface OptimizedVideoGeneratorConfig {
  /** Cache Time-To-Live in milliseconds. Defaults to 6 hours. */
  cacheTTL?: number;
  /** Rate limit window in milliseconds. Defaults to 1 minute. */
  rateLimitWindow?: number;
  /** Maximum requests allowed per user within the rateLimitWindow. Defaults to 20. */
  maxRequestsPerMinute?: number;
  /** OpenAI model to use for content generation. Defaults to 'gpt-4-turbo-preview'. */
  openAIModel?: string;
}

export class OptimizedVideoGenerator {
  private openai: OpenAI;
  private cache = new Map<string, CacheEntry>();
  private rateLimits = new Map<string, RateLimitEntry>();
  private readonly cacheTTL: number;
  private readonly rateLimitWindow: number;
  private readonly maxRequestsPerMinute: number;
  private readonly openAIModel: string;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 1000;

  /**
   * Creates an instance of OptimizedVideoGenerator.
   * @param apiKey The OpenAI API key.
   * @param config Optional configuration for cache, rate limiting, and OpenAI model.
   * @throws Error if API key is not provided.
   */
  constructor(private apiKey: string, config?: OptimizedVideoGeneratorConfig) {
    this.cacheTTL = config?.cacheTTL ?? 6 * 60 * 60 * 1000; // Default 6 hours
    this.rateLimitWindow = config?.rateLimitWindow ?? 60 * 1000; // Default 1 minute
    this.maxRequestsPerMinute = config?.maxRequestsPerMinute ?? 20; // Default 20 RPM
    this.openAIModel = config?.openAIModel ?? 'gpt-4-turbo-preview'; // Default model
    if (!apiKey) {
      throw new Error('API key is required for OptimizedVideoGenerator');
    }
    this.openai = new OpenAI({ apiKey: this.apiKey });
  }

  private async _callOpenAIWithRetries(
    prompt: string,
    userId: string,
    correlationId?: string
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.openAIModel,
          messages: [
            { role: 'system', content: 'You are an expert social media content strategist. Generate engaging and optimized video content in JSON format based on the provided data and user preferences.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });
        return completion;
      } catch (error: unknown) {
        const status = (error as any)?.status;
        const isRetryable = error instanceof Error && 
          (status === 429 || (status && status >= 500 && status <= 504));
          
        if (isRetryable && attempt < this.MAX_RETRIES - 1) {
          const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(`[${correlationId}] User: ${userId} - OpenAI API error (status ${status}). Retrying attempt ${attempt + 1}/${this.MAX_RETRIES} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[${correlationId}] User: ${userId} - OpenAI API error (status ${status}). All retries failed or error is not retryable.`, errorMessage);
          throw error;
        }
      }
    }
    throw new Error('Exhausted all retries for OpenAI API call.');
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    let entry = this.rateLimits.get(userId);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + this.rateLimitWindow };
    }

    entry.count++;
    this.rateLimits.set(userId, entry);

    return entry.count <= this.maxRequestsPerMinute;
  }

  private generatePrompt(
    analysisData: VideoOptimizationAnalysisData,
    preferences: UserPreferences,
    productLinks?: ProductLink[],
    mode: 'fast' | 'thorough' = 'thorough'
  ): string {
    let prompt = '';
    prompt += `Platform: ${preferences.platform || 'Not specified'}\n`;
    prompt += `User ID: ${preferences.userId}\n`;
    prompt += `Tone: ${preferences.tone || 'casual'}\n`;
    prompt += `Language: ${preferences.language || 'English'}\n`;
    if (preferences.includeCTA) {
      prompt += `Include a Call to Action.\n`;
    }
    if (preferences.maxCaptionLength) {
      prompt += `Max Caption Length: ${preferences.maxCaptionLength}\n`;
    }
    if (productLinks && productLinks.length > 0) {
      prompt += '--- Product Links to Incorporate ---\n';
      for (const link of productLinks) {
        prompt += `Product: ${link.name} (${link.url})\n`;
      }
    }
    prompt += '\n--- Analysis Data ---\n';
    prompt += JSON.stringify(analysisData, null, 2);
    return prompt;
  }

  async generateOptimizedContent(
    analysisData: VideoOptimizationAnalysisData,
    userPreferences: UserPreferences,
    productLinks?: ProductLink[],
    mode: 'fast' | 'thorough' = 'thorough'
  ): Promise<OptimizedVideoContent> {
    try {
      if (!analysisData) {
        throw new Error('Invalid input: analysisData is required.');
      }
      if (!userPreferences) {
        throw new Error('Invalid input: userPreferences are required.');
      }
      const { userId, correlationId } = userPreferences; 
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid input: userPreferences.userId is required and must be a non-empty string.');
      }

      const cacheKey = JSON.stringify({ analysisData, userPreferences, productLinks, mode });
      const cached = this.cache.get(cacheKey);
      if (cached && cached.timestamp + this.cacheTTL > Date.now()) {
        return cached.data;
      }

      if (!this.checkRateLimit(userId)) {
        throw new Error(`Rate limit exceeded for user ${userId}. Please try again later.`);
      }

      const prompt = this.generatePrompt(analysisData, userPreferences, productLinks, mode);
      try {
        const completion = await this._callOpenAIWithRetries(prompt, userId, correlationId);

        if (!completion.choices || completion.choices.length === 0) {
          throw new Error('No content generated by OpenAI.');
        }
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content generated by OpenAI.');
        }
        if (typeof content !== 'string') {
          throw new Error('OpenAI API response content is not a string.');
        }

        let parsedContentJson;
        try {
          parsedContentJson = JSON.parse(content);
        } catch (jsonError) {
          let errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
          if (errorMessage.includes('not valid JSON')) {
            errorMessage = 'This is not JSON';
          }
          throw new Error(`Failed to parse OpenAI response: ${errorMessage}`);
        }

        try {
          const validatedContent = OptimizedVideoContentSchema.parse(parsedContentJson);
          this.cache.set(cacheKey, { data: validatedContent, timestamp: Date.now() });
          return validatedContent;
        } catch (zodError) {
          this.handleZodValidationError(zodError);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`An unexpected error occurred: ${String(error)}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private handleZodValidationError(zodError: unknown): never {
    if (zodError && 
        typeof zodError === 'object' && 
        'errors' in zodError && 
        Array.isArray((zodError as any).errors)) {
      const errorDetails = (zodError as any).errors
        .map((e: any) => `${e.path?.join?.('.') || 'unknown'}: ${e.message || 'Unknown error'}`)
        .join(' - ');
      throw new Error(`OpenAI response validation failed: ${errorDetails}`);
    }
    throw new Error('Failed to validate OpenAI response JSON due to an unknown Zod error.');
  }
}