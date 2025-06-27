import { OpenAI } from 'openai';
import { Cache } from '../utils/cache';

// Define sentiment types
export type SentimentScore = {
  score: number;       // Range from -1 (negative) to 1 (positive)
  magnitude: number;   // Strength of the sentiment (0 to +inf)
  confidence: number;  // Confidence level (0 to 1)
};

export type SentimentResult = {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: SentimentScore;
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    surprise?: number;
    fear?: number;
  };
  language?: string;
  source: 'local' | 'openai' | 'cached';
  processingTimeMs?: number;
  tokens?: number;  // For cost tracking
};

export interface SentimentAnalyzerConfig {
  useLocalModel: boolean;
  openaiApiKey?: string;
  confidenceThreshold: number;
  maxCacheSize: number;
  cacheTtlMs: number;
  costTrackingEnabled: boolean;
}

/**
 * SentimentAnalyzer - Cost-optimized sentiment analysis
 * 
 * Uses a tiered approach to optimize costs:
 * 1. Check cache first
 * 2. Try lightweight local model for basic sentiment
 * 3. Fall back to OpenAI API only when needed
 */
export class SentimentAnalyzer {
  private config: SentimentAnalyzerConfig;
  private openai?: OpenAI;
  private cache: Cache<string, SentimentResult>;
  private costTracking = {
    localAnalysisCount: 0,
    openaiAnalysisCount: 0,
    cacheHitCount: 0,
    totalTokensUsed: 0,
    estimatedCost: 0,  // In USD
  };

  constructor(config: Partial<SentimentAnalyzerConfig> = {}) {
    // Default configuration
    this.config = {
      useLocalModel: true,
      confidenceThreshold: 0.7,
      maxCacheSize: 1000,
      cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours
      costTrackingEnabled: true,
      ...config
    };

    // Initialize cache
    this.cache = new Cache<string, SentimentResult>({
      maxSize: this.config.maxCacheSize,
      ttl: this.config.cacheTtlMs,
    });

    // Initialize OpenAI if API key is provided
    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
        dangerouslyAllowBrowser: true, // Required for browser-like environments like Jest JSDOM
      });
    }
  }

  /**
   * Analyze sentiment of text with cost optimization
   * @param text The text to analyze
   * @param forceAI Force using AI even if local model is sufficient
   */
  public async analyzeSentiment(text: string, forceAI: boolean = false): Promise<SentimentResult> {
    const startTime = performance.now();

    // Normalize input text (remove excessive spaces, normalize casing for cache hits)
    const normalizedText = this.normalizeText(text);
    
    // Compute cache key
    const cacheKey = this.generateCacheKey(normalizedText);
    
    // Check cache
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      if (this.config.costTrackingEnabled) {
        this.costTracking.cacheHitCount++;
      }
      return {
        ...cachedResult,
        source: 'cached',
        processingTimeMs: 0
      };
    }

    // First try local model if enabled and not forced to use AI
    let result: SentimentResult | null = null;
    if (this.config.useLocalModel && !forceAI) {
      result = await this.analyzeWithLocalModel(normalizedText);
      if (result.sentimentScore.confidence >= this.config.confidenceThreshold) {
        if (this.config.costTrackingEnabled) {
          this.costTracking.localAnalysisCount++;
        }
        this.cache.set(cacheKey, result);
        return {
          ...result,
          source: 'local',
          processingTimeMs: 0
        };
      }
    }

    // Fall back to OpenAI for complex sentiment or if local model isn't available
    if (this.openai) {
      try {
        result = await this.analyzeWithOpenAI(normalizedText, result);
        if (this.config.costTrackingEnabled) {
          this.costTracking.openaiAnalysisCount++;
        }
        this.cache.set(cacheKey, result);
        return {
          ...result,
          source: 'openai',
          processingTimeMs: 0
        };
      } catch (error) {
        console.error('Error using OpenAI for sentiment:', error);
        if (result) {
          if (this.config.costTrackingEnabled) {
            this.costTracking.localAnalysisCount++;
          }
          return {
            ...result,
            source: 'local',
            processingTimeMs: 0
          };
        }
        throw error;
      }
    } else if (result) {
      if (this.config.costTrackingEnabled) {
        this.costTracking.localAnalysisCount++;
      }
      return {
        ...result,
        source: 'local',
        processingTimeMs: 0
      };
    } else {
      throw new Error('No sentiment analysis model available');
    }
  }

  /**
   * Analyze sentiment using a lightweight local model
   * This is much more cost-effective than API calls
   */
  private async analyzeWithLocalModel(text: string): Promise<SentimentResult> {
    if (this.config.costTrackingEnabled) {
      this.costTracking.localAnalysisCount++;
    }

    // Simple algorithm for demo - would be replaced with actual local model
    const words = text.toLowerCase().split(/\s+/);
    
    // Very simple positive/negative word lists
    const positiveWords = new Set([
      'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'like', 
      'happy', 'best', 'perfect', 'fantastic', 'wonderful', 'enjoy', 'thanks'
    ]);
    
    const negativeWords = new Set([
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst',
      'poor', 'disappointed', 'disappointing', 'annoying', 'unfortunately'
    ]);

    // Count positive/negative words
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (positiveWords.has(cleanWord)) positiveCount++;
      if (negativeWords.has(cleanWord)) negativeCount++;
    }
    
    // Calculate score (-1 to 1)
    const total = words.length || 1; // Avoid division by zero
    const score = (positiveCount - negativeCount) / Math.min(total, 20); // Normalize
    
    // Calculate confidence based on word count and score strength
    const matchRatio = (positiveCount + negativeCount) / total;
    const confidence = Math.min(matchRatio * 2, 0.8); // Max confidence of 0.8 for local model
    
    // Determine sentiment category
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (score > 0.2) sentiment = 'positive';
    else if (score < -0.2) sentiment = 'negative';
    else sentiment = 'neutral';

    return {
      sentiment,
      sentimentScore: {
        score,
        magnitude: Math.abs(score) * 2,
        confidence
      },
      source: 'local'
    };
  }

  /**
   * Analyze sentiment using OpenAI API
   * More accurate but costs money
   */
  private async analyzeWithOpenAI(text: string, localResult: SentimentResult | null): Promise<SentimentResult> {
    if (!this.openai) {
      throw new Error('OpenAI API not configured');
    }

    if (this.config.costTrackingEnabled) {
      this.costTracking.openaiAnalysisCount++;
    }

    // To save costs, truncate very long texts
    const truncatedText = text.length > 1000 ? text.substring(0, 1000) + '...' : text;

    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis system. Analyze the sentiment of the following text and respond with a JSON object including: sentiment (positive, negative, or neutral), score (-1 to 1), magnitude (0 to infinity), and confidence (0 to 1). Also include basic emotion detection if possible.'
          },
          {
            role: 'user',
            content: truncatedText
          }
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });

      // Track token usage for cost estimation
      if (this.config.costTrackingEnabled && response.usage) {
        this.costTracking.totalTokensUsed += response.usage.total_tokens;
        // Approximate cost at $0.002 per 1000 tokens
        this.costTracking.estimatedCost += (response.usage.total_tokens / 1000) * 0.002;
      }

      // Parse response
      const result = response.choices[0]?.message?.content;
      if (result) {
        try {
          const parsed = JSON.parse(result);
          return {
            sentiment: parsed.sentiment,
            sentimentScore: {
              score: parsed.score,
              magnitude: parsed.magnitude || Math.abs(parsed.score),
              confidence: parsed.confidence || 0.9
            },
            emotions: parsed.emotions,
            source: 'openai',
            tokens: response.usage?.total_tokens
          };
        } catch (e) {
          console.error('Error parsing OpenAI response:', e);
          // Fall back to local result if JSON parsing fails
          if (localResult) return localResult;
        }
      }

      // If we couldn't get a proper result from OpenAI but have a local result, use that
      if (localResult) return localResult;

      // Generic fallback
      return {
        sentiment: 'neutral',
        sentimentScore: {
          score: 0,
          magnitude: 0,
          confidence: 0.5
        },
        source: 'openai',
        tokens: response.usage?.total_tokens
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Fall back to local result if API call fails
      if (localResult) return localResult;
      
      throw error;
    }
  }

  /**
   * Normalize text for consistent caching
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Generate cache key from text
   */
  private generateCacheKey(text: string): string {
    // For very long texts, use a hash of the content
    if (text.length > 100) {
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return `sentiment_${hash}`;
    }
    
    return `sentiment_${text}`;
  }

  /**
   * Get cost tracking statistics
   */
  public getCostStatistics() {
    if (!this.config.costTrackingEnabled) {
      return {
        trackingDisabled: true
      };
    }
    
    return {
      ...this.costTracking,
      cacheHitRate: this.costTracking.localAnalysisCount + this.costTracking.openaiAnalysisCount > 0 
        ? this.costTracking.cacheHitCount / (this.costTracking.cacheHitCount + this.costTracking.localAnalysisCount + this.costTracking.openaiAnalysisCount)
        : 0,
      apiUsageRate: this.costTracking.localAnalysisCount + this.costTracking.openaiAnalysisCount > 0
        ? this.costTracking.openaiAnalysisCount / (this.costTracking.localAnalysisCount + this.costTracking.openaiAnalysisCount)
        : 0,
    };
  }

  /**
   * Reset cost tracking statistics
   */
  public resetCostTracking() {
    this.costTracking = {
      localAnalysisCount: 0,
      openaiAnalysisCount: 0,
      cacheHitCount: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
    };
  }
}
