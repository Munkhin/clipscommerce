import crypto from 'crypto';
import type { ChatCompletionMessageParam } from './openai-chat-types';
import { Platform } from '@/types/platform';

// Import new utility modules
import { withRetry as resilienceWithRetry, CircuitBreaker } from '../utils/resilience';
import { MetricsTracker } from '../utils/metrics';
import { RequestBatcher } from '../utils/batching';
import { EnhancedCache } from '../utils/caching';

// Custom error types for better error handling
export class TextAnalyzerError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'TextAnalyzerError';
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TextAnalyzerError);
    }
  }
}

export class ApiError extends TextAnalyzerError {
  constructor(message: string, public readonly statusCode?: number, details?: any) {
    super(message, 'API_ERROR', details);
    this.name = 'ApiError';
  }
}

export class ValidationError extends TextAnalyzerError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

// Import utility types from our implementation
import type {
  RetryConfig as ResilienceRetryConfig,
  CircuitBreakerConfig
} from '../utils/resilience';

// Extended retry configuration with additional properties
interface ExtendedRetryConfig extends Omit<ResilienceRetryConfig, 'baseDelay' | 'failFast'> {
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
  baseDelay: number;
  failFast: boolean;
}

// Configuration for retry logic
const DEFAULT_RETRY_CONFIG: ExtendedRetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  factor: 2,
  maxDelay: 10000, // Added for compatibility with ResilienceRetryConfig
  baseDelay: 1000, // Base delay for exponential backoff
  failFast: false // Don't fail fast by default
};

type RetryConfig = typeof DEFAULT_RETRY_CONFIG;

// Helper function for exponential backoff
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to determine if error is retryable
const isRetryableError = (error: any): boolean => {
  // Network errors, timeouts, and rate limits are retryable
  if (error.code === 'ECONNABORTED' || 
      error.code === 'ETIMEDOUT' || 
      error instanceof RateLimitError) {
    return true;
  }
  
  // 5xx errors are retryable
  if (error.statusCode && error.statusCode >= 500) {
    return true;
  }
  
  return false;
};

// Helper function to implement retry logic
const withRetry = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> => {
  let lastError: Error = new Error('Unknown error occurred during retry');
  let attempt = 0;
  
  while (attempt <= config.maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.factor, attempt) * (0.5 + Math.random() * 0.5),
        config.maxDelayMs
      );
      
      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`, error);
      await sleep(delay);
      
      attempt++;
    }
  }
  
  throw lastError;
};

// Interfaces for text analysis results
export interface TopicModelingResult {
  topics: Array<{
    name: string;
    keywords: string[];
    score: number;  // 0-1 relevance score
  }>;
  dominantTopic: string;
  confidence: number;
  source: 'local' | 'openai' | 'cached';
  processingTimeMs?: number;
}

export interface IntentDetectionResult {
  primaryIntent: string;
  intents: Array<{
    intent: string;
    score: number;  // 0-1 confidence score
  }>;
  confidence: number;
  source: 'local' | 'openai' | 'cached';
  processingTimeMs?: number;
}

export interface ContentSummaryResult {
  shortSummary: string;
  detailedSummary?: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  source: 'local' | 'openai' | 'cached';
  processingTimeMs?: number;
}

export interface TextAnalyzerConfig {
  useLocalModel: boolean;
  openaiApiKey?: string;
  confidenceThreshold: number;
  maxCacheSize: number;
  cacheTtlMs: number;
  costTrackingEnabled: boolean;
}

/**
 * TextAnalyzer: Hybrid local/OpenAI text analysis with caching and metrics.
 */
export class TextAnalyzer {
  private config: TextAnalyzerConfig;
  private cache: EnhancedCache<string, TopicModelingResult | IntentDetectionResult | ContentSummaryResult>;
  private costTracking = {
    localAnalysisCount: 0,
    openaiAnalysisCount: 0,
    cacheHitCount: 0,
    totalTokensUsed: 0,
    estimatedCost: 0,  // In USD
  };
  private topicKeywords: Record<string, string[]> = {
    technology: ['tech', 'software', 'app', 'digital', 'ai', 'code', 'programming', 'computer', 'device', 'smartphone', 'innovation'],
    lifestyle: ['life', 'living', 'style', 'fashion', 'trends', 'home', 'decor', 'design', 'wellness', 'self-care'],
    business: ['business', 'startup', 'entrepreneur', 'market', 'finance', 'investment', 'money', 'economy', 'profit', 'revenue'],
    health: ['health', 'fitness', 'exercise', 'diet', 'workout', 'nutrition', 'wellness', 'medical', 'body', 'mental'],
    entertainment: ['entertainment', 'movie', 'music', 'show', 'celebrity', 'film', 'tv', 'streaming', 'series', 'artist', 'actor'],
    food: ['food', 'recipe', 'cooking', 'baking', 'meal', 'restaurant', 'cuisine', 'dish', 'chef', 'ingredient', 'delicious'],
    travel: ['travel', 'destination', 'trip', 'vacation', 'hotel', 'flight', 'tourism', 'adventure', 'explore', 'journey'],
    education: ['education', 'learning', 'school', 'student', 'college', 'university', 'study', 'academic', 'knowledge', 'teacher'],
    gaming: ['game', 'gaming', 'player', 'esports', 'console', 'pc', 'mobile', 'multiplayer', 'character', 'level', 'play'],
    sports: ['sports', 'team', 'player', 'match', 'game', 'league', 'championship', 'tournament', 'athlete', 'coach', 'fan'],
  };
  private intentKeywords: Record<string, string[]> = {
    question: ['what', 'how', 'why', 'when', 'where', 'who', 'which', '?'],
    promotion: ['buy', 'sale', 'discount', 'offer', 'deal', 'shop', 'order', 'free', 'save', 'now'],
    engagement: ['like', 'comment', 'share', 'follow', 'subscribe', 'tag', 'mention', 'retweet'],
    informative: ['news', 'update', 'report', 'announce', 'inform', 'learn', 'discover', 'insight'],
    feedback: ['feedback', 'opinion', 'review', 'suggestion', 'rate', 'experience'],
  };

  private retryConfig: RetryConfig;

  constructor(config: TextAnalyzerConfig) {
    // Validate configuration
    this.validateConfig(config);
    
    this.config = {
      useLocalModel: config.useLocalModel ?? true,
      openaiApiKey: config.openaiApiKey,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      maxCacheSize: config.maxCacheSize ?? 100,
      cacheTtlMs: config.cacheTtlMs ?? 3600000, // 1 hour
      costTrackingEnabled: config.costTrackingEnabled ?? true,
    };
    
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...(config as any).retryConfig,
    };
    
    try {
      this.cache = new EnhancedCache<string, TopicModelingResult | IntentDetectionResult | ContentSummaryResult>({
        max: this.config.maxCacheSize, // Using 'max' instead of 'maxSize' to match CacheOptions
        ttl: this.config.cacheTtlMs,
      });
    } catch (error) {
      throw new TextAnalyzerError(
        'Failed to initialize cache', 
        'CACHE_INIT_ERROR', 
        { originalError: error }
      );
    }
  }

  // --- Utility Methods ---

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private updateMetrics(type: 'local' | 'openai' | 'cache', tokensUsed = 0, cost = 0) {
    if (!this.config.costTrackingEnabled) return;
    if (type === 'local') this.costTracking.localAnalysisCount++;
    if (type === 'openai') {
      this.costTracking.openaiAnalysisCount++;
      this.costTracking.totalTokensUsed += tokensUsed;
      this.costTracking.estimatedCost += cost;
    }
    if (type === 'cache') this.costTracking.cacheHitCount++;
  }

  public getMetrics() {
    return { ...this.costTracking };
  }
  public resetMetrics() {
    this.costTracking = {
      localAnalysisCount: 0,
      openaiAnalysisCount: 0,
      cacheHitCount: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
    };
  }

  // --- Topic Modeling ---

  private modelTopicsLocally(text: string): TopicModelingResult {
    this.updateMetrics('local');
    const scores: Record<string, number> = {};
    const normalized = this.normalizeText(text);
    Object.entries(this.topicKeywords).forEach(([topic, keywords]) => {
      scores[topic] = keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);
    });
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const dominantTopic = sorted[0]?.[0] || 'other';
    const total = sorted.reduce((acc, [, v]) => acc + v, 0) || 1;
    const topics = sorted.map(([name, score]) => ({
      name,
      keywords: this.topicKeywords[name] || [],
      score: score / total,
    }));
    return {
      topics,
      dominantTopic,
      confidence: Math.min(1, sorted[0]?.[1] / (total || 1)),
      source: 'local',
    };
  }

  private validateConfig(config: Partial<TextAnalyzerConfig>): void {
    if (config.confidenceThreshold !== undefined && (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)) {
      throw new ValidationError('Confidence threshold must be between 0 and 1', 'confidenceThreshold');
    }
    
    if (config.maxCacheSize !== undefined && config.maxCacheSize < 1) {
      throw new ValidationError('Max cache size must be at least 1', 'maxCacheSize');
    }
    
    if (config.cacheTtlMs !== undefined && config.cacheTtlMs < 0) {
      throw new ValidationError('Cache TTL must be a positive number', 'cacheTtlMs');
    }
  }

  private async withApiErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    try {
      return await withRetry(fn, this.retryConfig);
    } catch (error: any) {
      // Handle rate limits specifically
      if (error.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'];
        throw new RateLimitError(Number(retryAfter));
      }
      
      // Handle API errors
      if (error.status) {
        throw new ApiError(
          `API error during ${operation}: ${error.message}`,
          error.status,
          { 
            code: error.code,
            details: error.response?.data 
          }
        );
      }
      
      // If we have a fallback, use it
      if (fallback) {
        console.warn(`Falling back to alternative implementation after error: ${error.message}`);
        return fallback();
      }
      
      // Otherwise, rethrow with more context
      throw new TextAnalyzerError(
        `Error during ${operation}: ${error.message}`,
        'ANALYSIS_ERROR',
        { originalError: error }
      );
    }
  }

  private async modelTopicsWithOpenAI(text: string): Promise<TopicModelingResult> {
    if (!this.config.openaiApiKey) {
      throw new ValidationError('OpenAI API key is required for AI analysis');
    }

    return this.withApiErrorHandling<TopicModelingResult>(
      'topic modeling',
      async () => {
        this.updateMetrics('openai');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ 
          apiKey: this.config.openaiApiKey,
          timeout: 10000, // 10 second timeout
        });
        
        const truncated = text.slice(0, 2000);
        const prompt: ChatCompletionMessageParam[] = [
          { 
            role: 'system', 
            content: 'You are an expert social media content analyst.' 
          },
          { 
            role: 'user', 
            content: `Analyze the following content and extract up to 3 main topics, keywords, and a confidence score (0-1). Respond as JSON: { topics: [{ name, keywords, score }], dominantTopic, confidence }\n\nContent: """${truncated}"""`
          }
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: prompt,
          temperature: 0.2,
          max_tokens: 256,
        });

        if (!response.choices?.[0]?.message?.content) {
          throw new Error('No content in OpenAI response');
        }

        try {
          const json = JSON.parse(response.choices[0].message.content);
          return {
            ...json,
            source: 'openai',
          };
        } catch (parseError) {
          throw new TextAnalyzerError(
            'Failed to parse OpenAI response',
            'PARSE_ERROR',
            { response: response.choices[0].message.content }
          );
        }
      },
      // Fallback to local processing if OpenAI fails
      () => this.modelTopicsLocally(text)
    );
  }

  public async modelTopics(text: string, forceAI = false): Promise<TopicModelingResult> {
    const normalized = this.normalizeText(text);
    const cacheKey = `topics_${this.hashContent(normalized)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.updateMetrics('cache');
      return { ...cached as TopicModelingResult, source: 'cached' };
    }
    let result = this.config.useLocalModel && !forceAI
      ? this.modelTopicsLocally(normalized)
      : undefined;
    if (!result || result.confidence < this.config.confidenceThreshold || forceAI) {
      try {
        result = await this.modelTopicsWithOpenAI(text);
      } catch (e) {
        if (!result) throw e;
      }
    }
    this.cache.set(cacheKey, result);
    return result;
  }

  // --- Intent Detection ---

  private detectIntentLocally(text: string): IntentDetectionResult {
    this.updateMetrics('local');
    const normalized = this.normalizeText(text);
    const scores: Record<string, number> = {};
    Object.entries(this.intentKeywords).forEach(([intent, keywords]) => {
      scores[intent] = keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);
    });
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primaryIntent = sorted[0]?.[0] || 'other';
    const total = sorted.reduce((acc, [, v]) => acc + v, 0) || 1;
    const intents = sorted.map(([intent, score]) => ({ intent, score: score / total }));
    return {
      primaryIntent,
      intents,
      confidence: Math.min(1, sorted[0]?.[1] / (total || 1)),
      source: 'local',
    };
  }

  private async detectIntentWithOpenAI(text: string): Promise<IntentDetectionResult> {
    this.updateMetrics('openai');
    if (!this.config.openaiApiKey) throw new Error('OpenAI API key required');
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: this.config.openaiApiKey });
    const truncated = text.slice(0, 2000);
    const prompt: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are an expert at social media intent detection.' },
      { role: 'user', content: `Identify the primary intent and all possible intents in the following content, with confidence scores (0-1). Respond as JSON: { primaryIntent, intents: [{ intent, score }], confidence }\n\nContent: """${truncated}"""` }
    ];
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: prompt,
      temperature: 0.2,
      max_tokens: 256,
    });
    const json = JSON.parse(response.choices[0].message.content || '{}');
    return {
      ...json,
      source: 'openai',
    };
  }

  public async detectIntent(text: string, forceAI = false): Promise<IntentDetectionResult> {
    const normalized = this.normalizeText(text);
    const cacheKey = `intent_${this.hashContent(normalized)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.updateMetrics('cache');
      return { ...cached as IntentDetectionResult, source: 'cached' };
    }
    let result = this.config.useLocalModel && !forceAI
      ? this.detectIntentLocally(normalized)
      : undefined;
    if (!result || result.confidence < this.config.confidenceThreshold || forceAI) {
      try {
        result = await this.detectIntentWithOpenAI(text);
      } catch (e) {
        if (!result) throw e;
      }
    }
    this.cache.set(cacheKey, result);
    return result;
  }

  // --- Content Summarization ---

  /**
   * Enhanced local content summarization using NLP techniques
   * Provides a more sophisticated summary without requiring API calls
   */
  private summarizeContentLocally(text: string): ContentSummaryResult {
    this.updateMetrics('local');
    const startTime = Date.now();
    const normalized = this.normalizeText(text);
    
    // 1. Extract sentences for better summarization
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
    
    // 2. Calculate sentence importance scores
    const wordFrequency: Record<string, number> = {};
    const words = normalized.split(/\s+/);
    
    // Count word frequencies (excluding common stop words)
    const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'of', 'to', 'for', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    // Score each sentence based on word importance
    const sentenceScores = sentences.map(sentence => {
      const sentenceWords = this.normalizeText(sentence).split(/\s+/);
      let score = 0;
      
      // Position bias - earlier sentences are often more important
      const positionIndex = sentences.indexOf(sentence);
      const positionScore = Math.max(0, 1 - (positionIndex / sentences.length));
      
      // Word importance score
      sentenceWords.forEach(word => {
        if (wordFrequency[word]) {
          score += wordFrequency[word];
        }
      });
      
      // Length normalization (avoid bias toward longer sentences)
      score = score / Math.max(1, sentenceWords.length);
      
      // Combine with position score
      score = (score * 0.7) + (positionScore * 0.3);
      
      return { sentence, score };
    });
    
    // 3. Select top sentences for summary
    const topSentences = [...sentenceScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, Math.ceil(sentences.length / 3)));
    
    // Sort by original position to maintain flow
    topSentences.sort((a, b) => 
      sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );
    
    // 4. Create short summary
    const shortSummary = topSentences.length > 0 
      ? topSentences[0].sentence 
      : (sentences[0] || text.slice(0, 100));
    
    // 5. Create detailed summary if there are enough sentences
    const detailedSummary = topSentences.length > 1
      ? topSentences.map(s => s.sentence).join('. ')
      : shortSummary;
    
    // 6. Extract key points based on highest frequency words
    const keyPoints = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => {
        // Find a sentence containing this key word for context
        const relevantSentence = sentences.find(s => 
          this.normalizeText(s).includes(word)
        ) || '';
        
        // Extract a phrase around the keyword
        const keywordIndex = this.normalizeText(relevantSentence).indexOf(word);
        if (keywordIndex >= 0) {
          const start = Math.max(0, relevantSentence.lastIndexOf(' ', keywordIndex) - 5);
          const end = Math.min(relevantSentence.length, 
                             relevantSentence.indexOf(' ', keywordIndex + word.length + 5) || 
                             relevantSentence.length);
          return relevantSentence.substring(start, end).trim();
        }
        return word;
      });
    
    // 7. Improved sentiment analysis with weighted term matching
    const positiveTerms = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'success', 'best', 'positive', 'win', 'wonderful', 'fantastic', 'perfect', 'awesome'];
    const negativeTerms = ['bad', 'poor', 'hate', 'fail', 'sad', 'problem', 'issue', 'terrible', 'worst', 'negative', 'difficult', 'disappointing', 'awful', 'horrible'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveTerms.includes(word)) positiveScore++;
      if (negativeTerms.includes(word)) negativeScore++;
    });
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveScore > negativeScore * 1.5) sentiment = 'positive';
    if (negativeScore > positiveScore * 1.5) sentiment = 'negative';
    
    const processingTimeMs = Date.now() - startTime;
    
    return {
      shortSummary,
      detailedSummary,
      keyPoints,
      sentiment,
      source: 'local',
      processingTimeMs
    };
  }

  /**
   * Enhanced OpenAI-powered content summarization with optimizations for:
   * - Cost efficiency (token usage optimization)
   * - Error handling and fallbacks
   * - Structured output with detailed summaries
   * - Performance tracking
   */
  /**
   * Executes a function with retry logic and exponential backoff
   * @param fn The function to execute
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param baseDelay Base delay between retries in ms (default: 1000)
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors (except 429 - Too Many Requests)
        const status = (error as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
          break;
        }
        
        if (attempt < maxRetries) {
          // Calculate delay with exponential backoff and jitter
          const backoffTime = Math.min(
            baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
            30000 // Max 30 seconds
          );
          
          // Simple synchronous delay for retry logic
          const start = Date.now();
          while (Date.now() - start < backoffTime) {
            // Busy wait - not ideal but avoids TypeScript issues with setTimeout
          }
        }
      }
    }
    
    throw lastError || new Error('Unknown error in withRetry');
  }

  private async summarizeContentWithOpenAI(text: string): Promise<ContentSummaryResult> {
    const startTime = Date.now();
    
    // Validate API key
    if (!this.config.openaiApiKey) {
      throw new ValidationError('OpenAI API key required for AI-powered summarization');
    }
    
    try {
      // Import OpenAI dynamically to reduce initial load time
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: this.config.openaiApiKey });
      
      // Preprocess text to reduce token usage
      const preprocessedText = this.preprocessTextForSummarization(text);
      
      // Estimate token count for tracking
      const estimatedTokens = Math.ceil(preprocessedText.length / 4); // Rough estimate
      
      // Create optimized prompt
      const prompt: ChatCompletionMessageParam[] = [
        { 
          role: 'system', 
          content: 'You are an expert content analyzer specializing in social media content summarization. Provide concise, accurate summaries with key insights.'
        },
        { 
          role: 'user', 
          content: `Analyze and summarize the following content. Return ONLY a JSON object with these fields:
{
  "shortSummary": "A 1-2 sentence summary",
  "detailedSummary": "A 3-5 sentence detailed summary",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "sentiment": "positive|negative|neutral"
}

Content: """${preprocessedText}"""`
        }
      ];
      
      // Make API call with optimized parameters
      const response = await this.withRetry(() => openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // More cost-effective than GPT-4
        messages: prompt,
        temperature: 0.1,       // Lower temperature for more consistent results
        max_tokens: 350,        // Limit token usage
        response_format: { type: "json_object" }, // Ensure JSON response
        top_p: 0.9,             // Slightly reduce diversity for more focused output
      }));
      
      // Extract and validate response
      let parsedResponse: any = {};
      try {
        parsedResponse = JSON.parse(response.choices[0].message.content || '{}');
      } catch (e) {
        // Fallback if JSON parsing fails
        const content = response.choices[0].message.content || '';
        parsedResponse = {
          shortSummary: content.slice(0, 100),
          keyPoints: [content.slice(0, 50)],
          sentiment: 'neutral'
        };
      }
      
      // Track metrics
      const tokensUsed = response.usage?.total_tokens || estimatedTokens;
      const cost = tokensUsed * 0.000002; // Approximate cost per token
      this.updateMetrics('openai', tokensUsed, cost);
      
      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      
      // Return structured result
      return {
        shortSummary: parsedResponse.shortSummary || '',
        detailedSummary: parsedResponse.detailedSummary || '',
        keyPoints: Array.isArray(parsedResponse.keyPoints) ? 
          parsedResponse.keyPoints.slice(0, 5) : 
          [],
        sentiment: ['positive', 'negative', 'neutral'].includes(parsedResponse.sentiment) ?
          parsedResponse.sentiment as 'positive' | 'negative' | 'neutral' :
          'neutral',
        source: 'openai',
        processingTimeMs
      };
    } catch (error) {
      // Enhanced error handling
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('rate limit')) {
          throw new RateLimitError();
        } else if (message.includes('invalid api key')) {
          throw new ValidationError('Invalid OpenAI API key');
        } else if (message.includes('context length')) {
          // Fallback to local summarization for context length errors
          console.warn('Context length exceeded, falling back to local summarization');
          return this.summarizeContentLocally(text);
        }
      }
      
      // Rethrow with better context
      throw new ApiError(
        `OpenAI summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof ApiError ? error.statusCode : undefined,
        { originalError: error }
      );
    }
  }
  
  /**
   * Preprocess text to optimize for token usage in API calls
   */
  private preprocessTextForSummarization(text: string): string {
    // Limit overall length
    let processed = text.slice(0, 2800); // Safe limit for context window
    
    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Remove URLs to save tokens
    processed = processed.replace(/https?:\/\/[^\s]+/g, '[URL]');
    
    // Replace repeated punctuation
    processed = processed.replace(/([!?.]){2,}/g, '$1');
    
    // Remove hashtags and mentions for cleaner text
    processed = processed.replace(/[@#][\w]+/g, '');
    
    // Trim and clean up
    return processed.trim();
  }

  public async summarizeContent(text: string, forceAI = false): Promise<ContentSummaryResult> {
    const normalized = this.normalizeText(text);
    const cacheKey = `summary_${this.hashContent(normalized)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.updateMetrics('cache');
      return { ...cached as ContentSummaryResult, source: 'cached' };
    }
    let result = this.config.useLocalModel && !forceAI
      ? this.summarizeContentLocally(text)
      : undefined;
    if (!result || forceAI) {
      try {
        result = await this.summarizeContentWithOpenAI(text);
      } catch (e) {
        if (!result) throw e;
      }
    }
    this.cache.set(cacheKey, result);
    return result;
  }

  // --- Hashtag Recommendation ---

  public getRelevantHashtags(topic: string, platform: Platform): string[] {
    const hashtags: Record<string, Record<string, string[]>> = {
      instagram: {
        technology: ['#tech', '#innovation', '#digital'],
        lifestyle: ['#lifestyle', '#fashion', '#wellness'],
        business: ['#business', '#startup', '#entrepreneur'],
        // ...
      },
      twitter: {
        technology: ['#tech', '#AI', '#programming'],
        lifestyle: ['#lifestyle', '#trending', '#health'],
        business: ['#business', '#finance', '#startups'],
        // ...
      },
    };
    return hashtags[platform]?.[topic] || ['#social', '#trending'];
  }
}
