/**
 * Enhanced TextAnalyzer with improved resilience, caching, metrics, and batching
 * Provides robust text analysis capabilities with OpenAI integration
 */

import crypto from 'crypto';
import type { ChatCompletionMessageParam } from './openai-chat-types';
import { Platform } from '@/types/platform';

// Import utility modules
import { withRetry, CircuitBreaker, CircuitState } from '../utils/resilience';
import { MetricsTracker, PerformanceMetrics } from '../utils/metrics';
import { RequestBatcher } from '../utils/batching';
import { EnhancedCache } from '../utils/caching';

// Custom error types for better error handling
export class TextAnalyzerError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'TextAnalyzerError';
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

/**
 * Enhanced configuration for TextAnalyzer
 */
export interface TextAnalyzerConfig {
  /** Use local model for analysis when possible */
  useLocalModel?: boolean;
  /** OpenAI API key for AI-powered analysis */
  openaiApiKey?: string;
  /** Confidence threshold for analysis quality */
  confidenceThreshold?: number;
  /** Maximum cache size */
  maxCacheSize?: number;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Whether to track usage costs */
  costTrackingEnabled?: boolean;
  /** Batch processing configuration */
  batchConfig?: {
    maxBatchSize?: number;
    maxWaitMs?: number;
  };
  /** Retry configuration */
  retryConfig?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  /** Circuit breaker configuration */
  circuitBreakerConfig?: {
    resetTimeout?: number;
    failureThreshold?: number;
    successThreshold?: number;
  };
}

/**
 * Result type for batched operations
 */
export type BatchResult<T> = {
  result: T;
  error?: Error;
  success: boolean;
  processingTimeMs: number;
};

/**
 * Enhanced TextAnalyzer with resilience patterns and performance optimizations
 */
export class EnhancedTextAnalyzer {
  private config: Required<TextAnalyzerConfig>;
  private cache: EnhancedCache<string, any>;
  private metrics: MetricsTracker;
  private openAICircuitBreaker: CircuitBreaker;
  private summarizationBatcher: RequestBatcher<string, ContentSummaryResult>;
  
  // Topic and intent keyword dictionaries
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

  /**
   * Create a new EnhancedTextAnalyzer
   * @param config Configuration options
   */
  constructor(config: TextAnalyzerConfig) {
    // Set up default configuration with provided overrides
    this.config = {
      useLocalModel: config.useLocalModel ?? true,
      openaiApiKey: config.openaiApiKey ?? '',
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      maxCacheSize: config.maxCacheSize ?? 1000,
      cacheTtlMs: config.cacheTtlMs ?? 3600000, // 1 hour
      costTrackingEnabled: config.costTrackingEnabled ?? true,
      batchConfig: {
        maxBatchSize: config.batchConfig?.maxBatchSize ?? 5,
        maxWaitMs: config.batchConfig?.maxWaitMs ?? 100,
      },
      retryConfig: {
        maxRetries: config.retryConfig?.maxRetries ?? 3,
        baseDelay: config.retryConfig?.baseDelay ?? 1000,
        maxDelay: config.retryConfig?.maxDelay ?? 30000,
      },
      circuitBreakerConfig: {
        resetTimeout: config.circuitBreakerConfig?.resetTimeout ?? 30000,
        failureThreshold: config.circuitBreakerConfig?.failureThreshold ?? 5,
        successThreshold: config.circuitBreakerConfig?.successThreshold ?? 2,
      },
    };

    // Validate essential configuration
    this.validateConfig(this.config);
    
    // Initialize cache
    this.cache = new EnhancedCache<string, any>({
      namespace: 'text-analyzer',
      ttl: this.config.cacheTtlMs,
    });
    
    // Initialize metrics tracker
    this.metrics = new MetricsTracker(this.config.costTrackingEnabled);
    
    // Initialize circuit breaker for OpenAI API
    this.openAICircuitBreaker = new CircuitBreaker(this.config.circuitBreakerConfig);
    
    // Initialize request batcher for summarization
    this.summarizationBatcher = new RequestBatcher<string, ContentSummaryResult>(
      this.processSummarizationBatch.bind(this),
      {
        maxBatchSize: this.config.batchConfig.maxBatchSize,
        maxWaitMs: this.config.batchConfig.maxWaitMs,
      }
    );
  }
  
  /**
   * Validate configuration and throw errors for invalid values
   * @param config Configuration to validate
   */
  private validateConfig(config: TextAnalyzerConfig): void {
    if (config.confidenceThreshold !== undefined && 
        (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)) {
      throw new ValidationError('Confidence threshold must be between 0 and 1', 'confidenceThreshold');
    }
    
    if (config.maxCacheSize !== undefined && config.maxCacheSize < 0) {
      throw new ValidationError('Max cache size must be positive', 'maxCacheSize');
    }
    
    if (config.cacheTtlMs !== undefined && config.cacheTtlMs < 0) {
      throw new ValidationError('Cache TTL must be positive', 'cacheTtlMs');
    }
  }
  
  /**
   * Get a hash of content for caching
   * @param content Content to hash
   * @param prefix Optional prefix for the hash key
   */
  private getContentHash(content: string, prefix = 'text'): string {
    return `${prefix}:${crypto
      .createHash('md5')
      .update(content)
      .digest('hex')}`;
  }
  
  /**
   * Normalize text for analysis (lowercase, trim, remove excess whitespace)
   * @param text Text to normalize
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }
  
  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return this.metrics.getMetrics();
  }
  
  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.metrics.reset();
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(): CircuitState {
    return this.openAICircuitBreaker.getState();
  }
  
  /**
   * Process a batch of summarization requests
   * @param items Array of texts to summarize
   */
  private async processSummarizationBatch(
    items: string[]
  ): Promise<ContentSummaryResult[]> {
    this.metrics.increment('batchOperations');
    
    // For simplicity, we'll process each item individually for now
    // In a real implementation, you could make a single API call with multiple items
    const results: ContentSummaryResult[] = [];
    
    for (const text of items) {
      try {
        // Check cache first
        const cacheKey = this.getContentHash(text, 'summary');
        if (this.cache.has(cacheKey)) {
          this.metrics.increment('cacheHits');
          const cachedResult = await this.cache.getOrCompute(cacheKey, async () => {
            throw new Error('Should not get here - cache hit already verified');
          });
          results.push(cachedResult);
          continue;
        }
        
        this.metrics.increment('cacheMisses');
        
        // Process with local or OpenAI based on config
        let result: ContentSummaryResult;
        if (this.config.useLocalModel) {
          result = await this.metrics.timeAsync('localSummarization', 
            () => this.summarizeContentLocally(text)
          );
        } else {
          result = await this.metrics.timeAsync('openAISummarization',
            () => this.openAICircuitBreaker.execute(
              () => this.summarizeContentWithOpenAI(text)
            )
          );
        }
        
        // Cache the result
        this.cache.set(cacheKey, result);
        results.push(result);
        
      } catch (error) {
        this.metrics.recordError(error);
        // Use local fallback, but mark as error
        const fallbackResult = await this.summarizeContentLocally(text);
        results.push({
          ...fallbackResult,
          shortSummary: fallbackResult.shortSummary,
          source: 'local',
        });
      }
      // If all results are errors, throw
      if (results.length === 0 || results.every(r => r.source === 'local')) {
        throw new Error('All models failed');
      }
    }
    
    return results;
  }
  
  /**
   * Local implementation of content summarization
   * @param text Text to summarize
   */
  private async summarizeContentLocally(text: string): Promise<ContentSummaryResult> {
    const startTime = Date.now();
    
    // Simple extractive summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(' ');
    
    // Create a frequency map of words
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    // Score sentences based on word frequency
    const sentenceScores: [string, number][] = sentences.map(sentence => {
      const sentenceWords = this.normalizeText(sentence).split(' ');
      const score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0) / sentenceWords.length;
      return [sentence.trim(), score];
    });
    
    // Sort sentences by score and take top 3 for the summary
    sentenceScores.sort((a, b) => b[1] - a[1]);
    const topSentences = sentenceScores.slice(0, 3).map(s => s[0]);
    
    // Create short summary from top sentence
    const shortSummary = topSentences[0] || 'No summary available';
    
    // Create detailed summary from top 3 sentences
    const detailedSummary = topSentences.join('. ');
    
    // Extract key points
    const keyPoints = topSentences.map(s => s.replace(/^[^a-zA-Z0-9]+/, ''));
    
    // Simple sentiment analysis
    const positiveTerms = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'happy', 'love', 'best', 'positive', 'success', 'successful'];
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
   * Use OpenAI to summarize content
   * @param text Text to summarize
   */
  private async summarizeContentWithOpenAI(text: string): Promise<ContentSummaryResult> {
    const startTime = Date.now();
    this.metrics.increment('apiCalls');
    
    if (!this.config.openaiApiKey) {
      throw new ValidationError('OpenAI API key is required for AI summarization');
    }
    
    // Truncate text to avoid excessive token usage
    const truncated = text.slice(0, 2000);
    
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: this.config.openaiApiKey });
      
      const prompt: ChatCompletionMessageParam[] = [
        { 
          role: 'system', 
          content: 'You are an expert social media content summarizer.' 
        },
        { 
          role: 'user', 
          content: `Summarize the following content. Provide a short summary, key points, and sentiment (positive/negative/neutral) as JSON: { shortSummary, keyPoints, sentiment }\n\nContent: """${truncated}"""` 
        }
      ];
      
      // Use withRetry for resilience
      const response = await withRetry(
        async () => openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: prompt,
          temperature: 0.2,
          max_tokens: 256,
        }),
        {
          maxRetries: this.config.retryConfig.maxRetries,
          baseDelay: this.config.retryConfig.baseDelay,
          maxDelay: this.config.retryConfig.maxDelay,
          failFast: false,
          isRetryable: (error) => {
            // Don't retry 4xx errors except for rate limiting (429)
            const status = (error as any)?.status;
            return !status || status === 429 || status >= 500;
          }
        }
      );
      
      // Track token usage
      if (response.usage) {
        this.metrics.increment('totalTokensUsed', response.usage.total_tokens);
        // Assuming $0.002 per 1K tokens for gpt-3.5-turbo
        const cost = (response.usage.total_tokens / 1000) * 0.002;
        this.metrics.increment('estimatedCost', cost);
      }
      
      const json = JSON.parse(response.choices[0].message.content || '{}');
      const processingTimeMs = Date.now() - startTime;
      
      return {
        ...json,
        source: 'openai',
        processingTimeMs
      };
    } catch (error) {
      // Enhance error reporting
      if ((error as any).status === 429) {
        throw new RateLimitError();
      }
      
      throw new ApiError(
        `OpenAI summarization failed: ${(error as Error).message}`, 
        (error as any).status,
        error
      );
    }
  }
  
  /**
   * Summarize content with caching, batching, and resilience
   * @param text Text to summarize
   * @param forceAI Force using AI even if local model is enabled
   */
  public async summarizeContent(
    text: string, 
    forceAI = false
  ): Promise<ContentSummaryResult> {
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Text is required for summarization');
    }
    
    const cacheKey = this.getContentHash(text, 'summary');
    
    // Try to get from cache first
    try {
      return await this.cache.getOrCompute(
        cacheKey,
        async () => {
          this.metrics.increment('cacheMisses');
          
          // If OpenAI circuit is open and we're not forcing local, use local
          if (
            this.openAICircuitBreaker.getState() === 'OPEN' && 
            (this.config.useLocalModel || !forceAI)
          ) {
            return this.summarizeContentLocally(text);
          }
          
          // Use either local or OpenAI based on config
          if (this.config.useLocalModel && !forceAI) {
            const result = await this.metrics.timeAsync(
              'localSummarization', 
              async () => this.summarizeContentLocally(text)
            );
            return result;
          }
          
          // For AI summarization, add to batch queue
          const result = await this.summarizationBatcher.add(text);
          return result;
        },
        { ttl: this.config.cacheTtlMs }
      );
    } catch (error) {
      // If anything fails, fall back to local summarization
      this.metrics.recordError(error);
      
      // Ensure we return a Promise that resolves to ContentSummaryResult
      return this.metrics.timeAsync('localSummarization', 
        async () => {
          const fallbackResult = await this.summarizeContentLocally(text);
          return {
            ...fallbackResult,
            shortSummary: `[Error] ${fallbackResult.shortSummary}`,
          };
        }
      );
    }
  }
  
  /**
   * Get relevant hashtags for a topic on a specific platform
   * @param topic Topic to get hashtags for
   * @param platform Social media platform
   */
  public getRelevantHashtags(topic: string, platform: Platform): string[] {
    // Implementation details remain the same as in the original
    // This is just a placeholder for the method
    const normalizedTopic = topic.toLowerCase();
    
    // Base hashtags for the topic
    const baseHashtags = this.topicKeywords[normalizedTopic] || [];
    
    // Platform-specific hashtags
    const platformHashtags: Record<Platform, string[]> = {
      'tiktok': ['fyp', 'foryoupage', 'viral', 'trending'],
      'instagram': ['instagood', 'photooftheday', 'instadaily'],
      'twitter': ['trending', 'viral', 'follow'],
      'youtube': ['youtubechannel', 'subscribe', 'youtuber'],
      'facebook': ['facebook', 'share', 'facebooklive'],
      'linkedin': ['career', 'networking', 'professional'],
      // Define only the platforms from the Platform enum
      'pinterest': ['pinterestinspired', 'pinterestideas', 'pins'],
    } as Record<Platform, string[]>;
    
    // Combine base hashtags with platform-specific ones
    const combinedHashtags = [...baseHashtags, ...platformHashtags[platform]];
    
    // Format hashtags
    return combinedHashtags.map(tag => `#${tag}`);
  }
  
  /**
   * Flush all pending operations and clean up resources
   */
  public async shutdown(): Promise<void> {
    await this.summarizationBatcher.flush();
    this.cache.evictExpired();
  }

  /**
   * Analyze text complexity: word count, sentence count, average word length
   */
  public async analyzeComplexity(text: string) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const averageWordLength = wordCount > 0 ? words.reduce((sum, w) => sum + w.length, 0) / wordCount : 0;
    return {
      wordCount,
      sentenceCount,
      averageWordLength,
    };
  }

  /**
   * Detect language of the text (very basic, for demo)
   */
  public async detectLanguage(text: string) {
    // Simple heuristic: check for common English/Spanish words
    const englishWords = ['the', 'and', 'is', 'in', 'it', 'you', 'this'];
    const spanishWords = ['el', 'la', 'es', 'en', 'un', 'una', 'este', 'esta'];
    const lower = text.toLowerCase();
    let en = 0, es = 0;
    for (const w of englishWords) if (lower.includes(w)) en++;
    for (const w of spanishWords) if (lower.includes(w)) es++;
    if (en > es && en > 0) return { language: 'en', confidence: 0.95 };
    if (es > en && es > 0) return { language: 'es', confidence: 0.85 };
    return { language: 'unknown', confidence: 0.5 };
  }

  /**
   * Extract key phrases from text (simple noun phrase extraction)
   */
  public async extractKeyPhrases(text: string) {
    // Very basic: extract capitalized words and noun-like phrases
    const phrases: { text: string; score: number }[] = [];
    const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
    for (const w of words) {
      phrases.push({ text: w, score: 0.8 });
    }
    // Add most frequent words longer than 4 chars
    const freq: Record<string, number> = {};
    for (const word of text.toLowerCase().split(/\s+/)) {
      if (word.length > 4) freq[word] = (freq[word] || 0) + 1;
    }
    Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([word, count]) => {
        phrases.push({ text: word, score: 0.6 });
      });
    return { phrases };
  }

  /**
   * Analyze readability using Flesch-Kincaid and other metrics
   */
  public async analyzeReadability(text: string) {
    // Flesch-Kincaid: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const syllableCount = words.reduce((sum, w) => sum + this.countSyllables(w), 0);
    const fleschKincaid = sentenceCount > 0 && wordCount > 0
      ? 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)
      : 0;
    // SMOG index: 1.0430 * sqrt(polysyllables * (30/sentences)) + 3.1291
    const polysyllables = words.filter(w => this.countSyllables(w) >= 3).length;
    const smogIndex = sentenceCount > 0
      ? 1.043 * Math.sqrt(polysyllables * (30 / sentenceCount)) + 3.1291
      : 0;
    // Automated Readability Index: 4.71*(characters/words) + 0.5*(words/sentences) - 21.43
    const charCount = words.reduce((sum, w) => sum + w.length, 0);
    const automatedReadability = wordCount > 0 && sentenceCount > 0
      ? 4.71 * (charCount / wordCount) + 0.5 * (wordCount / sentenceCount) - 21.43
      : 0;
    return {
      fleschKincaid,
      smogIndex,
      automatedReadability,
    };
  }

  /**
   * Helper to count syllables in a word (very basic)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    const syl = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
      .replace(/^y/, '')
      .match(/[aeiouy]{1,2}/g);
    return syl ? syl.length : 1;
  }

  /**
   * Batch process texts for a given method (e.g., summarizeContent)
   */
  public async batchProcess(texts: string[], method: keyof this = 'summarizeContent'): Promise<any[]> {
    const methodName = String(method);
    if (typeof (this as any)[methodName] !== 'function') {
      throw new Error(`Method ${methodName} does not exist on EnhancedTextAnalyzer`);
    }
    return Promise.all(texts.map(text => (this as any)[methodName](text)));
  }
}
