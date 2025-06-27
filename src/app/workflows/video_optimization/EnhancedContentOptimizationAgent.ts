import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { 
  EnhancedContentOptimizationTask,
  ContentOptimizationRequest,
  ContentOptimizationResponse,
  ContentRecommendations,
  PostingTimeOptimization,
  ABTestingParameters,
  CaptionVariation,
  HashtagStrategy,
  VisualContentSuggestion,
  OptimalPostingTime,
  EngagementPattern,
  TimeZoneRecommendation,
  ExperimentDesign,
  OptimizationCacheEntry,
  OptimizationPerformanceMetrics,
  ContentOptimizationError,
  ContentRecommendationsSchema,
  PostingTimeOptimizationSchema,
  ABTestingParametersSchema
} from './enhanced_content_optimization_types';
import { VideoOptimizationAnalysisService } from './VideoOptimizationAnalysisService';
import { Platform, AnalysisResult, VideoOptimizationAnalysisData } from '../data_analysis/types/analysis_types';

interface EnhancedAgentConfig {
  openAIApiKey: string;
  cacheTTL?: number; // milliseconds
  maxCacheSize?: number;
  rateLimitPerMinute?: number;
  enablePerformanceTracking?: boolean;
}

@Injectable()
export class EnhancedContentOptimizationAgent {
  private openai: OpenAI;
  private videoOptimizationService: VideoOptimizationAnalysisService;
  private isActive: boolean = false;
  private currentTask: EnhancedContentOptimizationTask | null = null;
  private performanceScore: number = 0.8;
  
  // Caching and performance
  private cache = new Map<string, OptimizationCacheEntry>();
  private performanceMetrics: OptimizationPerformanceMetrics[] = [];
  private rateLimitTracker = new Map<string, { count: number; resetAt: number }>();
  
  // Configuration
  private readonly cacheTTL: number;
  private readonly maxCacheSize: number;
  private readonly rateLimitPerMinute: number;
  private readonly enablePerformanceTracking: boolean;

  constructor(private config: EnhancedAgentConfig) {
    if (!config.openAIApiKey) {
      throw new Error('OpenAI API key is required for EnhancedContentOptimizationAgent');
    }
    
    this.openai = new OpenAI({ apiKey: config.openAIApiKey });
    this.videoOptimizationService = new VideoOptimizationAnalysisService(config.openAIApiKey);
    
    // Configuration with defaults
    this.cacheTTL = config.cacheTTL ?? 6 * 60 * 60 * 1000; // 6 hours
    this.maxCacheSize = config.maxCacheSize ?? 1000;
    this.rateLimitPerMinute = config.rateLimitPerMinute ?? 30;
    this.enablePerformanceTracking = config.enablePerformanceTracking ?? true;
    
    console.log('🚀 Enhanced Content Optimization Agent initialized');
  }

  /**
   * Start the enhanced content optimization agent
   */
  async start(): Promise<void> {
    this.isActive = true;
    console.log('🚀 Enhanced Content Optimization Agent started');
  }

  /**
   * Stop the enhanced content optimization agent
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.currentTask = null;
    console.log('🛑 Enhanced Content Optimization Agent stopped');
  }

  /**
   * Execute an enhanced content optimization task
   */
  async executeTask(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    if (!this.isActive) {
      throw new Error('Enhanced Content Optimization Agent is not active');
    }

    const startTime = Date.now();
    this.currentTask = task;
    
    console.log(`📊 Executing enhanced content optimization task: ${task.type} for user: ${task.userId}`);

    try {
      // Check rate limits
      if (!this.checkRateLimit(task.userId)) {
        throw new Error(`Rate limit exceeded for user ${task.userId}. Please try again later.`);
      }

      let result: AnalysisResult<ContentOptimizationResponse>;

      switch (task.type) {
        case 'generate_content_recommendations':
          result = await this.generateContentRecommendations(task);
          break;
        case 'optimize_posting_times':
          result = await this.optimizePostingTimes(task);
          break;
        case 'design_ab_tests':
          result = await this.designABTests(task);
          break;
        case 'optimize_content':
          result = await this.optimizeContent(task);
          break;
        case 'update_optimization_models':
          result = await this.updateOptimizationModels(task);
          break;
        case 'generate_variations':
          result = await this.generateVariations(task);
          break;
        default:
          const exhaustiveCheck: never = task.type;
          throw new Error(`Unknown task type: ${exhaustiveCheck}`);
      }

      // Track performance
      if (this.enablePerformanceTracking) {
        this.trackPerformance({
          taskId: task.id,
          taskType: task.type,
          executionTime: Date.now() - startTime,
          success: result.success,
          qualityScore: this.calculateQualityScore(result),
          timestamp: new Date(),
        });
      }

      // Update performance score
      if (result.success) {
        this.performanceScore = Math.min(1, this.performanceScore + 0.05);
      } else {
        this.performanceScore = Math.max(0.1, this.performanceScore - 0.1);
      }

      console.log(`✅ Task ${task.type} completed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Task ${task.type} failed:`, error);
      
      // Track failed performance
      if (this.enablePerformanceTracking) {
        this.trackPerformance({
          taskId: task.id,
          taskType: task.type,
          executionTime: Date.now() - startTime,
          success: false,
          timestamp: new Date(),
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }

      this.performanceScore = Math.max(0.1, this.performanceScore - 0.1);
      
      return {
        success: false,
        error: {
          code: 'TASK_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          details: error,
        },
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.executeTask',
          correlationId: task.correlationId,
          processingTime: Date.now() - startTime,
        },
      };
    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Generate comprehensive content recommendations
   */
  private async generateContentRecommendations(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    const cacheKey = this.generateCacheKey('content_recommendations', task);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.generateContentRecommendations',
          correlationId: task.correlationId,
          cacheStatus: 'hit',
        },
      };
    }

    try {
      // Get video optimization analysis data
      const analysisResult = await this.videoOptimizationService.getVideoOptimizationInsights({
        userId: task.userId,
        platform: task.platform,
        timeRange: task.timeRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        correlationId: task.correlationId,
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('Failed to get video optimization insights');
      }

      // Generate enhanced content recommendations using OpenAI
      const contentRecommendations = await this.generateEnhancedContentWithAI(
        analysisResult.data,
        task
      );

      const response: ContentOptimizationResponse = {
        contentRecommendations,
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.generateContentRecommendations',
          correlationId: task.correlationId,
          cacheStatus: 'miss',
        },
      };

      // Cache the result
      this.setCache(cacheKey, response);

      return {
        success: true,
        data: response,
        metadata: response.metadata,
      };

    } catch (error) {
      throw new Error(`Failed to generate content recommendations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize posting times based on audience engagement patterns
   */
  private async optimizePostingTimes(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    const cacheKey = this.generateCacheKey('posting_times', task);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.optimizePostingTimes',
          correlationId: task.correlationId,
          cacheStatus: 'hit',
        },
      };
    }

    try {
      // Get detailed platform analytics for timing optimization
      const analysisResult = await this.videoOptimizationService.getVideoOptimizationInsights({
        userId: task.userId,
        platform: task.platform,
        timeRange: task.timeRange || {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days for better timing analysis
          end: new Date().toISOString(),
        },
        correlationId: task.correlationId,
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('Failed to get platform analytics for timing optimization');
      }

      // Generate posting time optimization using AI analysis
      const postingTimeOptimization = await this.generatePostingTimeOptimizationWithAI(
        analysisResult.data,
        task
      );

      const response: ContentOptimizationResponse = {
        postingTimeOptimization,
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.optimizePostingTimes',
          correlationId: task.correlationId,
          cacheStatus: 'miss',
        },
      };

      // Cache the result
      this.setCache(cacheKey, response);

      return {
        success: true,
        data: response,
        metadata: response.metadata,
      };

    } catch (error) {
      throw new Error(`Failed to optimize posting times: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Design A/B testing parameters for content and timing experiments
   */
  private async designABTests(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    const cacheKey = this.generateCacheKey('ab_tests', task);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.designABTests',
          correlationId: task.correlationId,
          cacheStatus: 'hit',
        },
      };
    }

    try {
      // Get comprehensive analysis data for A/B test design
      const analysisResult = await this.videoOptimizationService.getVideoOptimizationInsights({
        userId: task.userId,
        platform: task.platform,
        timeRange: task.timeRange || {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days for A/B test baseline
          end: new Date().toISOString(),
        },
        correlationId: task.correlationId,
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('Failed to get analysis data for A/B test design');
      }

      // Generate A/B testing parameters using AI
      const abTestingParameters = await this.generateABTestingParametersWithAI(
        analysisResult.data,
        task
      );

      const response: ContentOptimizationResponse = {
        abTestingParameters,
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.designABTests',
          correlationId: task.correlationId,
          cacheStatus: 'miss',
        },
      };

      // Cache the result
      this.setCache(cacheKey, response);

      return {
        success: true,
        data: response,
        metadata: response.metadata,
      };

    } catch (error) {
      throw new Error(`Failed to design A/B tests: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Legacy optimize content method for backward compatibility
   */
  private async optimizeContent(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    // Delegate to content recommendations for now
    return this.generateContentRecommendations(task);
  }

  /**
   * Update optimization models and patterns
   */
  private async updateOptimizationModels(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    try {
      // This would typically update ML models or pattern recognition systems
      // For now, we'll simulate the update process
      console.log('Updating optimization models and patterns...');
      
      // Simulate model update delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response: ContentOptimizationResponse = {
        metadata: {
          generatedAt: new Date(),
          source: 'EnhancedContentOptimizationAgent.updateOptimizationModels',
          correlationId: task.correlationId,
        },
      };

      return {
        success: true,
        data: response,
        metadata: response.metadata,
      };

    } catch (error) {
      throw new Error(`Failed to update optimization models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate content variations for testing
   */
  private async generateVariations(task: EnhancedContentOptimizationTask): Promise<AnalysisResult<ContentOptimizationResponse>> {
    // Delegate to content recommendations with variation focus
    return this.generateContentRecommendations(task);
  }

  /**
   * Generate enhanced content recommendations using OpenAI
   */
  private async generateEnhancedContentWithAI(
    analysisData: VideoOptimizationAnalysisData,
    task: EnhancedContentOptimizationTask
  ): Promise<ContentRecommendations> {
    const prompt = this.buildContentRecommendationPrompt(analysisData, task);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert social media content strategist specializing in creating engaging, platform-optimized content that drives maximum engagement and virality.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated by OpenAI');
      }

      const parsedContent = JSON.parse(content);
      
      // Validate the response using Zod schema
      const validatedContent = ContentRecommendationsSchema.parse(parsedContent);
      
      return validatedContent;

    } catch (error) {
      throw new Error(`Failed to generate content with AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate posting time optimization using AI analysis
   */
  private async generatePostingTimeOptimizationWithAI(
    analysisData: VideoOptimizationAnalysisData,
    task: EnhancedContentOptimizationTask
  ): Promise<PostingTimeOptimization> {
    const prompt = this.buildPostingTimeOptimizationPrompt(analysisData, task);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert social media timing strategist who analyzes audience engagement patterns to determine optimal posting times for maximum reach and engagement.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent timing analysis
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated by OpenAI');
      }

      const parsedContent = JSON.parse(content);
      
      // Validate the response using Zod schema
      const validatedContent = PostingTimeOptimizationSchema.parse(parsedContent);
      
      return validatedContent;

    } catch (error) {
      throw new Error(`Failed to generate posting time optimization with AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate A/B testing parameters using AI
   */
  private async generateABTestingParametersWithAI(
    analysisData: VideoOptimizationAnalysisData,
    task: EnhancedContentOptimizationTask
  ): Promise<ABTestingParameters> {
    const prompt = this.buildABTestingParametersPrompt(analysisData, task);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert A/B testing strategist who designs statistically valid experiments for social media content optimization, focusing on engagement rate improvements and viral content production.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated by OpenAI');
      }

      const parsedContent = JSON.parse(content);
      
      // Validate the response using Zod schema
      const validatedContent = ABTestingParametersSchema.parse(parsedContent);
      
      return validatedContent;

    } catch (error) {
      throw new Error(`Failed to generate A/B testing parameters with AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper methods for prompt building
  private buildContentRecommendationPrompt(analysisData: VideoOptimizationAnalysisData, task: EnhancedContentOptimizationTask): string {
    return `
Generate comprehensive content recommendations based on the following analysis data and task requirements.

Platform: ${task.platform}
Niche: ${task.niche || 'General'}
Target Audience: ${task.targetAudience || 'General'}
Include Visual Suggestions: ${task.includeVisualSuggestions || false}

Analysis Data:
${JSON.stringify(analysisData, null, 2)}

Base Content:
${task.baseContent ? JSON.stringify(task.baseContent, null, 2) : 'None provided'}

Generate recommendations in the following JSON format:
{
  "captionVariations": [
    {
      "id": "unique_id",
      "text": "caption text",
      "style": "casual|professional|humorous|authoritative|friendly|emotional",
      "tone": "positive|neutral|negative|mixed",
      "length": number,
      "callToAction": boolean,
      "targetAudience": "audience description",
      "estimatedEngagement": 0.0-1.0
    }
  ],
  "hashtagStrategies": [
    {
      "id": "unique_id",
      "name": "strategy name",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "strategy": "trending|niche-specific|engagement-focused|brand-building|viral-potential",
      "estimatedReach": number,
      "competitionLevel": "low|medium|high",
      "platform": "${task.platform}",
      "reasoning": "explanation"
    }
  ],
  "visualContentSuggestions": [
    {
      "id": "unique_id",
      "type": "color-palette|layout|text-overlay|visual-element|thumbnail|background",
      "suggestion": "specific suggestion",
      "description": "detailed description",
      "priority": "high|medium|low",
      "platform": "${task.platform}",
      "reasoning": "explanation",
      "examples": ["example1", "example2"]
    }
  ],
  "overallScore": 0.0-1.0,
  "confidence": 0.0-1.0
}

Focus on creating diverse, high-quality recommendations that are tailored to the platform and niche.
`;
  }

  private buildPostingTimeOptimizationPrompt(analysisData: VideoOptimizationAnalysisData, task: EnhancedContentOptimizationTask): string {
    return `
Analyze audience engagement patterns and generate optimal posting time recommendations.

Platform: ${task.platform}
User ID: ${task.userId}
Time Zone Targeting: ${task.timeZoneTargeting?.join(', ') || 'Not specified'}

Analysis Data:
${JSON.stringify(analysisData, null, 2)}

Audience Data:
${task.audienceData ? JSON.stringify(task.audienceData, null, 2) : 'Not provided'}

Generate posting time optimization in the following JSON format:
{
  "optimalTimes": [
    {
      "timeSlot": "HH:MM-HH:MM",
      "dayOfWeek": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
      "timezone": "timezone string",
      "estimatedEngagement": 0.0-1.0,
      "confidence": 0.0-1.0,
      "audienceSize": number,
      "platform": "${task.platform}",
      "reasoning": "explanation"
    }
  ],
  "audienceEngagementPatterns": [
    {
      "pattern": "pattern name",
      "description": "pattern description",
      "strength": 0.0-1.0,
      "frequency": "daily|weekly|monthly|seasonal",
      "platforms": ["${task.platform}"],
      "demographics": {}
    }
  ],
  "timeZoneConsiderations": [
    {
      "timezone": "timezone string",
      "audiencePercentage": 0.0-1.0,
      "optimalTimes": ["HH:MM", "HH:MM"],
      "priority": "high|medium|low",
      "reasoning": "explanation"
    }
  ],
  "overallScore": 0.0-1.0,
  "confidence": 0.0-1.0
}

Focus on data-driven recommendations that maximize engagement based on audience behavior patterns.
`;
  }

  private buildABTestingParametersPrompt(analysisData: VideoOptimizationAnalysisData, task: EnhancedContentOptimizationTask): string {
    return `
Design comprehensive A/B testing parameters for content optimization experiments.

Platform: ${task.platform}
Experiment Objectives: ${task.experimentObjectives?.join(', ') || 'Engagement improvement, viral content production'}
Test Types: ${task.testTypes?.join(', ') || 'Content variation, posting time, hashtag strategy'}
Minimum Confidence: ${task.minimumConfidence || 0.95}
Max Test Duration: ${task.maxTestDuration || 14} days

Analysis Data:
${JSON.stringify(analysisData, null, 2)}

Generate A/B testing parameters in the following JSON format:
{
  "experiments": [
    {
      "id": "unique_id",
      "name": "experiment name",
      "type": "content-variation|posting-time|hashtag-strategy|visual-elements|caption-style",
      "hypothesis": "testable hypothesis",
      "variants": [
        {
          "id": "variant_id",
          "name": "variant name",
          "description": "variant description",
          "parameters": {}
        }
      ],
      "targetMetric": "engagement_rate|likes|comments|shares|views",
      "minimumSampleSize": number,
      "estimatedDuration": number,
      "statisticalPower": 0.0-1.0,
      "significanceLevel": 0.0-1.0,
      "platform": "${task.platform}",
      "reasoning": "explanation"
    }
  ],
  "testDuration": number,
  "successMetrics": ["metric1", "metric2"],
  "statisticalSignificance": 0.0-1.0,
  "recommendedSequence": ["experiment_id1", "experiment_id2"],
  "overallScore": 0.0-1.0
}

Focus on statistically valid experiments that can provide actionable insights for content optimization.
`;
  }

  // Utility methods
  private generateCacheKey(operation: string, task: EnhancedContentOptimizationTask): string {
    const keyData = {
      operation,
      userId: task.userId,
      platform: task.platform,
      niche: task.niche,
      type: task.type,
      // baseContent: task.baseContent, // Temporarily removed for debugging cache issues
    };
    // console.log('Generating cache key with data:', JSON.stringify(keyData)); // Log key data
    const key = Buffer.from(JSON.stringify(keyData)).toString('base64');
    // console.log('Generated cache key:', key); // Log generated key
    return key;
  }

  private getFromCache(key: string): ContentOptimizationResponse | null {
    // console.log('Attempting to get from cache with key:', key); // Log key on get
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp.getTime() > this.cacheTTL) {
      // console.log('Cache entry expired for key:', key);
      this.cache.delete(key);
      return null;
    }
    
    entry.accessCount++;
    entry.lastAccessed = new Date();
    // console.log('Cache hit for key:', key);
    return entry.data;
  }

  private setCache(key: string, data: ContentOptimizationResponse): void {
    // console.log('Setting cache with key:', key); // Log key on set
    // Clean cache if it's getting too large
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime())[0][0];
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      key,
      data,
      timestamp: new Date(),
      ttl: this.cacheTTL,
      accessCount: 1,
      lastAccessed: new Date(),
    });
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    let entry = this.rateLimitTracker.get(userId);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + 60000 };
    }
    
    entry.count++;
    this.rateLimitTracker.set(userId, entry);
    
    return entry.count <= this.rateLimitPerMinute;
  }

  private trackPerformance(metrics: OptimizationPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  private calculateQualityScore(result: AnalysisResult<ContentOptimizationResponse>): number {
    if (!result.success || !result.data) return 0;
    
    let score = 0.5; // Base score
    
    // Add points for different types of recommendations
    if (result.data.contentRecommendations) {
      score += 0.2;
      if (result.data.contentRecommendations.captionVariations.length > 0) score += 0.1;
      if (result.data.contentRecommendations.hashtagStrategies.length > 0) score += 0.1;
      if (result.data.contentRecommendations.visualContentSuggestions.length > 0) score += 0.1;
    }
    
    if (result.data.postingTimeOptimization) {
      score += 0.2;
      if (result.data.postingTimeOptimization.optimalTimes.length > 0) score += 0.1;
    }
    
    if (result.data.abTestingParameters) {
      score += 0.2;
      if (result.data.abTestingParameters.experiments.length > 0) score += 0.1;
    }
    
    return Math.min(1, score);
  }

  // Agent status methods
  async getStatus(): Promise<'active' | 'idle' | 'error'> {
    if (!this.isActive) return 'idle';
    if (this.performanceScore < 0.3) return 'error';
    return this.currentTask ? 'active' : 'idle';
  }

  async getPerformance(): Promise<number> {
    return this.performanceScore;
  }

  async getResourceUtilization(): Promise<number> {
    const cacheUtilization = this.cache.size / this.maxCacheSize;
    const taskLoad = this.currentTask ? 0.5 : 0.1;
    return Math.min(1, cacheUtilization * 0.3 + taskLoad * 0.7);
  }

  async getCurrentTask(): Promise<string | undefined> {
    return this.currentTask ? `${this.currentTask.type} for user: ${this.currentTask.userId}` : undefined;
  }

  // Performance analytics
  getPerformanceMetrics(): OptimizationPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  getCacheStats(): { size: number; hitRate: number; maxSize: number } {
    const totalAccess = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = totalAccess > 0 ? (totalAccess - this.cache.size) / totalAccess : 0;
    
    return {
      size: this.cache.size,
      hitRate,
      maxSize: this.maxCacheSize,
    };
  }
} 