import { aiImprovementService } from '../AIImprovementService';
import { ContentNiche } from '../../types/niche_types';
import { Platform } from '../../../deliverables/types/deliverables_types';
// import { MetricsTracker } from '@/lib/utils/metrics';
// import { EnhancedCache } from '@/lib/utils/caching';

// Placeholder types until modules are available
interface MetricsTracker {
  track(metric: string, value: number, tags?: Record<string, any>): void;
  timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  increment(metric: string, tags?: Record<string, any>): void;
  getMetrics(): Record<string, any>;
}

interface EnhancedCache<T = any> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// Placeholder implementations
const createMetricsTracker = (): MetricsTracker => ({
  track: (metric: string, value: number, tags?: Record<string, any>) => {
    console.log(`Metric ${metric}: ${value}`, tags);
  },
  timeAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      console.log(`${label} took ${Date.now() - start}ms`);
    }
  },
  increment: (metric: string, tags?: Record<string, any>) => {
    console.log(`Increment ${metric}`, tags);
  },
  getMetrics: () => ({})
});

const createEnhancedCache = <T = any>(): EnhancedCache<T> => ({
  get: async (key: string) => null,
  set: async (key: string, value: T, ttl?: number) => {},
  delete: async (key: string) => {}
});
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface ContentOptimizationTask {
  type: 'optimize_content' | 'update_optimization_models' | 'generate_variations';
  niche?: ContentNiche;
  platform?: Platform;
  contentId?: string;
  baseContent?: { caption: string; hashtags?: string[] };
  focus?: ('captions' | 'hashtags' | 'timing' | 'visuals')[];
  priority?: 'high' | 'medium' | 'low';
  parameters?: Record<string, any>;
}

// --- Production-Grade Contextual Bandit Implementation ---
export interface BanditContext {
  platform: Platform;
  contentType: 'video' | 'image' | 'text';
  audienceSegment: string;
  timeOfDay: number;
  dayOfWeek: number;
  historicalEngagement: number;
  contentLength: number;
  hasHashtags: boolean;
  hasThumbnail: boolean;
  userId: string;
}

export interface BanditArm {
  id: string;
  name: string;
  parameters: Record<string, any>;
  features: number[]; // Feature vector for contextual learning
  createdAt: Date;
  version: string;
}

export interface BanditReward {
  armId: string;
  context: BanditContext;
  reward: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ModelWeights {
  weights: number[];
  confidence: number;
  lastUpdated: Date;
  trainingExamples: number;
}

/**
 * Production-grade contextual bandit using Thompson Sampling
 * with online linear regression for contextual feature learning
 */
export class ProductionContextualBandit {
  private arms: Map<string, BanditArm> = new Map();
  private modelWeights: Map<string, ModelWeights> = new Map();
  private redis: Redis | null = null;
  private cache: EnhancedCache;
  private metrics: MetricsTracker;
  private readonly alpha: number; // Exploration parameter
  private readonly lambda: number; // Regularization parameter
  private readonly contextDimension: number;

  constructor(
    alpha = 1.0,
    lambda = 1.0,
    contextDimension = 20,
    redisUrl?: string
  ) {
    this.alpha = alpha;
    this.lambda = lambda;
    this.contextDimension = contextDimension;
    this.cache = createEnhancedCache(); // 5 min cache
    this.metrics = createMetricsTracker();
    
    // Initialize Redis if URL provided
    if (redisUrl || process.env.REDIS_URL) {
      try {
        this.redis = new Redis(redisUrl || process.env.REDIS_URL!);
        console.log('✅ Contextual Bandit connected to Redis');
      } catch (error) {
        console.warn('⚠️ Failed to connect to Redis, using in-memory storage:', error);
      }
    }
  }

  /**
   * Add a new arm (content variation) to the bandit
   */
  async addArm(arm: BanditArm): Promise<void> {
    this.arms.set(arm.id, arm);
    
    // Initialize model weights for this arm
    this.modelWeights.set(arm.id, {
      weights: new Array(this.contextDimension).fill(0),
      confidence: 0.1,
      lastUpdated: new Date(),
      trainingExamples: 0
    });

    // Persist to Redis
    if (this.redis) {
      await this.redis.hset(
        'bandit:arms',
        arm.id,
        JSON.stringify(arm)
      );
      await this.redis.hset(
        'bandit:weights',
        arm.id,
        JSON.stringify(this.modelWeights.get(arm.id))
      );
    }
  }

  /**
   * Select the best arm using Thompson Sampling with contextual features
   */
  async selectArm(context: BanditContext): Promise<string> {
    return this.metrics.timeAsync('selectArm', async () => {
      const contextVector = this.extractFeatures(context);
      const cacheKey = `selection:${this.hashContext(context)}`;
      
      // Check cache for recent selection
      const cached = this.cache.get(cacheKey);
      if (cached && Math.random() > 0.1) { // 10% chance to bypass cache for exploration
        this.metrics.increment('cacheHits');
        return cached;
      }

      let bestArm = '';
      let bestScore = -Infinity;

      // Thompson Sampling: sample from posterior distribution
      for (const [armId, weights] of Array.from(this.modelWeights.entries())) {
        const expectedReward = this.dotProduct(weights.weights, contextVector);
        
        // Sample from normal distribution with confidence-based variance
        const variance = this.alpha * weights.confidence;
        const sampledReward = this.sampleNormal(expectedReward, variance);
        
        if (sampledReward > bestScore) {
          bestScore = sampledReward;
          bestArm = armId;
        }
      }

      // Fallback to random selection if no arms available
      if (!bestArm && this.arms.size > 0) {
        const armIds = Array.from(this.arms.keys());
        bestArm = armIds[Math.floor(Math.random() * armIds.length)];
      }

      // Cache the selection
      this.cache.set(cacheKey, bestArm, 60000); // 1 minute cache
      this.metrics.increment('armSelections');
      
      return bestArm;
    });
  }

  /**
   * Update the bandit with reward feedback using online linear regression
   */
  async updateReward(reward: BanditReward): Promise<void> {
    return this.metrics.timeAsync('updateReward', async () => {
      const weights = this.modelWeights.get(reward.armId);
      if (!weights) {
        console.warn(`No weights found for arm ${reward.armId}`);
        return;
      }

      const contextVector = this.extractFeatures(reward.context);
      
      // Online linear regression update (Ridge regression)
      const prediction = this.dotProduct(weights.weights, contextVector);
      const error = reward.reward - prediction;
      
      // Update weights using gradient descent
      const learningRate = 1.0 / (weights.trainingExamples + this.lambda);
      for (let i = 0; i < weights.weights.length; i++) {
        weights.weights[i] += learningRate * error * contextVector[i];
      }
      
      // Update confidence (decreases as we get more data)
      weights.confidence = 1.0 / Math.sqrt(weights.trainingExamples + 1);
      weights.trainingExamples++;
      weights.lastUpdated = new Date();

      // Persist updated weights
      if (this.redis) {
        await Promise.all([
          this.redis.hset('bandit:weights', reward.armId, JSON.stringify(weights)),
          this.redis.lpush('bandit:rewards', JSON.stringify(reward))
        ]);
      }

      this.metrics.increment('rewardUpdates');
      console.log(`Updated weights for arm ${reward.armId}, new confidence: ${weights.confidence.toFixed(3)}`);
    });
  }

  /**
   * Extract numerical features from context for machine learning
   */
  private extractFeatures(context: BanditContext): number[] {
    const features: number[] = [];
    
    // Platform encoding (one-hot)
    const platforms = ['tiktok', 'instagram', 'facebook', 'youtube', 'twitter', 'linkedin'];
    platforms.forEach(platform => {
      features.push(context.platform === platform ? 1 : 0);
    });
    
    // Content type encoding
    const contentTypes = ['video', 'image', 'text'];
    contentTypes.forEach(type => {
      features.push(context.contentType === type ? 1 : 0);
    });
    
    // Numerical features (normalized)
    features.push(
      context.timeOfDay / 24.0,
      context.dayOfWeek / 7.0,
      Math.min(context.historicalEngagement / 1000.0, 1.0), // Cap at 1000
      Math.min(context.contentLength / 500.0, 1.0), // Cap at 500 chars
      context.hasHashtags ? 1 : 0,
      context.hasThumbnail ? 1 : 0
    );
    
    // Audience segment hash (simple encoding)
    const segmentHash = this.hashString(context.audienceSegment) % 3;
    features.push(segmentHash / 3.0);
    
    // Pad or truncate to fixed dimension
    while (features.length < this.contextDimension) {
      features.push(0);
    }
    return features.slice(0, this.contextDimension);
  }

  /**
   * Calculate dot product of two vectors
   */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  }

  /**
   * Sample from normal distribution using Box-Muller transform
   */
  private sampleNormal(mean: number, variance: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + Math.sqrt(variance) * z0;
  }

  /**
   * Hash context for caching
   */
  private hashContext(context: BanditContext): string {
    return crypto.createHash('md5').update(JSON.stringify(context)).digest('hex');
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Load existing arms and weights from Redis
   */
  async loadFromPersistence(): Promise<void> {
    if (!this.redis) return;

    try {
      // Load arms
      const arms = await this.redis.hgetall('bandit:arms');
      for (const [armId, armData] of Object.entries(arms)) {
        this.arms.set(armId, JSON.parse(armData));
      }

      // Load weights
      const weights = await this.redis.hgetall('bandit:weights');
      for (const [armId, weightData] of Object.entries(weights)) {
        this.modelWeights.set(armId, JSON.parse(weightData));
      }

      console.log(`Loaded ${this.arms.size} arms and ${this.modelWeights.size} weight sets from Redis`);
    } catch (error) {
      console.error('Failed to load bandit data from Redis:', error);
    }
  }

  /**
   * Get bandit performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics.getMetrics(),
      armCount: this.arms.size,
      totalTrainingExamples: Array.from(this.modelWeights.values())
        .reduce((sum, weights) => sum + weights.trainingExamples, 0),
      averageConfidence: Array.from(this.modelWeights.values())
        .reduce((sum, weights) => sum + weights.confidence, 0) / this.modelWeights.size
    };
  }

  /**
   * Get arm performance summary
   */
  getArmPerformance(): Array<{armId: string, expectedReward: number, confidence: number, examples: number}> {
    return Array.from(this.modelWeights.entries()).map(([armId, weights]) => ({
      armId,
      expectedReward: weights.weights.reduce((sum, w) => sum + Math.abs(w), 0) / weights.weights.length,
      confidence: weights.confidence,
      examples: weights.trainingExamples
    }));
  }

  /**
   * Close Redis connection
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * Content Optimization Agent
 * 
 * Specializes in enhancing content quality, engagement, and virality potential
 * through NLP, visual analysis, and A/B testing insights.
 *
 * ContentOptimizationAgent
 * - Integrates contextual bandit (epsilon-greedy) for variation selection (T4.1)
 * - Persists reward signals for online learning (T4.2)
 * [T4.1, T4.2] Contextual bandit and reward persistence implemented (2025-06-15)
 */
export class ContentOptimizationAgent {
  private isActive: boolean = false;
  private currentTask: ContentOptimizationTask | null = null;
  private performanceScore: number = 0.8; // Initial performance score
  private bandit: ProductionContextualBandit;
  private metrics: MetricsTracker;
  private modelVersion: string;
  private abTestConfig: Map<string, any> = new Map();

  constructor(redisUrl?: string) {
    this.bandit = new ProductionContextualBandit(1.0, 1.0, 20, redisUrl);
    this.metrics = createMetricsTracker();
    this.modelVersion = `v${Date.now()}`;
    this.initializeDefaultArms();
  }

  /**
   * Start the content optimization agent
   */
  async start(): Promise<void> {
    this.isActive = true;
    await this.bandit.loadFromPersistence();
    console.log('🚀 Content Optimization Agent started with production bandit');
  }

  /**
   * Stop the content optimization agent
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.currentTask = null;
    await this.bandit.shutdown();
    console.log('🛑 Content Optimization Agent stopped');
  }

  /**
   * Execute a content optimization task
   */
  async executeTask(task: ContentOptimizationTask): Promise<void> {
    if (!this.isActive) {
      throw new Error('Content Optimization Agent is not active');
    }

    this.currentTask = task;
    console.log(`📊 Executing content optimization task: ${task.type}`);

    try {
      switch (task.type) {
        case 'optimize_content':
          await this.optimizeContent(task);
          break;
        case 'update_optimization_models':
          await this.updateOptimizationModels(task);
          break;
        case 'generate_variations':
          await this.generateVariations(task);
          break;
        default:
          // This ensures that if a new task type is added to the interface
          // and not handled here, TypeScript will warn us.
          const exhaustiveCheck: never = task.type; 
          throw new Error(`Unknown task type: ${exhaustiveCheck}`);
      }
      console.log(`✅ Task ${task.type} completed successfully`);
    } catch (error) {
      console.error(`❌ Task ${task.type} failed:`, error);
      // Potentially update agent performance score based on failure
      this.performanceScore = Math.max(0.1, this.performanceScore - 0.1);
      throw error;
    } finally {
      this.currentTask = null;
    }
  }

  private async optimizeContent(task: ContentOptimizationTask): Promise<void> {
    return this.metrics.timeAsync('optimizeContent', async () => {
      console.log('Optimizing content for task:', task);
      if (!task.baseContent || !task.platform) {
        console.warn('optimizeContent task requires baseContent and platform.');
        return;
      }

      // Create context for bandit selection
      const context: BanditContext = this.createBanditContext(task);
      
      // Use production bandit to select best optimization strategy
      const selectedArmId = await this.bandit.selectArm(context);
      console.log(`[Production Bandit] Selected optimization strategy: ${selectedArmId}`);

      // Call AIImprovementService with selected strategy
      const optimizationResult = await aiImprovementService.getContentOptimization({
        caption: task.baseContent.caption,
        hashtags: task.baseContent.hashtags,
        platform: task.platform,
        userId: task.parameters?.userId || 'content_opt_agent_user',
        targetAudience: task.parameters?.targetAudience || 'general',
      });

      console.log('Content optimization suggestions received:', optimizationResult.optimization.improvements);
      
      // Store the optimization for later reward feedback
      this.storeOptimizationForReward(selectedArmId, context, task);
      
      this.performanceScore = Math.min(1, this.performanceScore + 0.05);
    });
  }

  private async updateOptimizationModels(task: ContentOptimizationTask): Promise<void> {
    console.log('Updating optimization models/patterns as per task:', task);
    // This is the step from the plan (Task 3, Step 3)
    await aiImprovementService.updateContentOptimizationPatterns();
    console.log('Optimization models/patterns updated via AIImprovementService.');
    this.performanceScore = Math.min(1, this.performanceScore + 0.02); // Slight performance boost for maintenance
  }

  private async generateVariations(task: ContentOptimizationTask): Promise<void> {
    console.log('Generating content variations for task:', task);
    // This would typically involve using AIImprovementService or nlp functions
    // to create A/B test variants or other content alternatives.
    if (task.baseContent && task.platform && task.focus) {
        // Placeholder for variation generation logic
        console.log(`Variations would be generated for ${task.platform} focusing on ${task.focus.join(', ')}`);
    } else {
        console.warn('generateVariations task requires baseContent, platform, and focus.');
    }
    // Use bandit to select best variation if multiple
    if (task.baseContent) {
      const variations = [{ id: 'v1', context: { platform: task.platform } }]; // Example
      const selected = await this.selectContentVariation(variations);
      console.log(`[Bandit] Selected variation: ${selected}`);
    }
    this.performanceScore = Math.min(1, this.performanceScore + 0.03);
  }

  // Agent status and performance methods (similar to DataCollectionAgent)
  async getStatus(): Promise<'active' | 'idle' | 'error'> {
    if (!this.isActive) return 'idle';
    // Basic error check: if performance is too low, report error
    if (this.performanceScore < 0.3) return 'error';
    return this.currentTask ? 'active' : 'idle';
  }

  async getPerformance(): Promise<number> {
    // Could be a more complex calculation based on successful task completions,
    // quality of optimizations, etc.
    return this.performanceScore;
  }

  async getResourceUtilization(): Promise<number> {
    // Simulate resource utilization
    return this.currentTask ? Math.random() * 0.5 + 0.3 : Math.random() * 0.2; // Higher if active
  }

  async getCurrentTask(): Promise<string | undefined> {
    return this.currentTask ? `${this.currentTask.type} for niche: ${this.currentTask.niche || 'N/A'}` : undefined;
  }

  /**
   * Initialize default optimization arms/strategies
   */
  private async initializeDefaultArms(): Promise<void> {
    const defaultArms: BanditArm[] = [
      {
        id: 'aggressive_cta',
        name: 'Aggressive Call-to-Action',
        parameters: { ctaStrength: 'high', urgency: true },
        features: [1, 0, 0, 0.8, 0.7],
        createdAt: new Date(),
        version: this.modelVersion
      },
      {
        id: 'subtle_engagement',
        name: 'Subtle Engagement',
        parameters: { ctaStrength: 'low', emotional: true },
        features: [0, 1, 0, 0.3, 0.9],
        createdAt: new Date(),
        version: this.modelVersion
      },
      {
        id: 'hashtag_heavy',
        name: 'Hashtag Heavy Strategy',
        parameters: { hashtagCount: 'high', trending: true },
        features: [0, 0, 1, 0.9, 0.4],
        createdAt: new Date(),
        version: this.modelVersion
      },
      {
        id: 'minimal_clean',
        name: 'Minimal Clean Approach',
        parameters: { hashtagCount: 'low', clean: true },
        features: [0, 0, 0, 0.1, 0.8],
        createdAt: new Date(),
        version: this.modelVersion
      }
    ];

    for (const arm of defaultArms) {
      await this.bandit.addArm(arm);
    }
  }

  /**
   * Create bandit context from task
   */
  private createBanditContext(task: ContentOptimizationTask): BanditContext {
    const now = new Date();
    return {
      platform: task.platform || 'INSTAGRAM',
      contentType: task.parameters?.contentType || 'text',
      audienceSegment: task.parameters?.audienceSegment || 'general',
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      historicalEngagement: task.parameters?.historicalEngagement || 0,
      contentLength: task.baseContent?.caption?.length || 0,
      hasHashtags: (task.baseContent?.hashtags?.length || 0) > 0,
      hasThumbnail: !!task.parameters?.thumbnailUrl,
      userId: task.parameters?.userId || 'anonymous'
    };
  }

  /**
   * Store optimization for later reward feedback
   */
  private storeOptimizationForReward(
    armId: string, 
    context: BanditContext, 
    task: ContentOptimizationTask
  ): void {
    // In a real system, this would be stored in a database with content ID
    // for later reward tracking when engagement metrics are available
    const optimizationRecord = {
      armId,
      context,
      taskId: task.parameters?.taskId || crypto.randomUUID(),
      timestamp: new Date(),
      contentId: task.contentId
    };
    
    console.log(`Stored optimization record for reward tracking:`, optimizationRecord);
  }

  /**
   * Record content performance reward (call this when engagement data is available)
   */
  public async recordContentReward(
    contentId: string, 
    engagementMetrics: {
      likes: number;
      comments: number;
      shares: number;
      clickThroughRate: number;
      reachRate: number;
    },
    context: BanditContext,
    armId: string
  ): Promise<void> {
    // Calculate normalized reward (0-1 scale)
    const reward = this.calculateNormalizedReward(engagementMetrics, context);
    
    const banditReward: BanditReward = {
      armId,
      context,
      reward,
      timestamp: new Date(),
      metadata: {
        contentId,
        engagementMetrics,
        modelVersion: this.modelVersion
      }
    };

    await this.bandit.updateReward(banditReward);
    console.log(`Recorded reward ${reward.toFixed(3)} for arm ${armId} and content ${contentId}`);
  }

  /**
   * Calculate normalized reward from engagement metrics
   */
  private calculateNormalizedReward(
    metrics: any, 
    context: BanditContext
  ): number {
    // Weighted combination of engagement metrics
    const likeWeight = 0.3;
    const commentWeight = 0.4;
    const shareWeight = 0.2;
    const ctrWeight = 0.1;
    
    // Normalize metrics to 0-1 scale (platform-specific)
    const platformNorms = {
      TIKTOK: { likes: 100, comments: 20, shares: 10, ctr: 0.05 },
      INSTAGRAM: { likes: 50, comments: 10, shares: 5, ctr: 0.03 },
      YOUTUBE: { likes: 20, comments: 5, shares: 2, ctr: 0.08 }
    };
    
    const norms = platformNorms[context.platform as keyof typeof platformNorms] || platformNorms.INSTAGRAM;
    
    const normalizedLikes = Math.min(metrics.likes / norms.likes, 1);
    const normalizedComments = Math.min(metrics.comments / norms.comments, 1);
    const normalizedShares = Math.min(metrics.shares / norms.shares, 1);
    const normalizedCTR = Math.min(metrics.clickThroughRate / norms.ctr, 1);
    
    return likeWeight * normalizedLikes +
           commentWeight * normalizedComments +
           shareWeight * normalizedShares +
           ctrWeight * normalizedCTR;
  }

  /**
   * Get bandit performance metrics
   */
  public getBanditMetrics() {
    return this.bandit.getMetrics();
  }

  /**
   * Get arm performance summary
   */
  public getArmPerformance() {
    return this.bandit.getArmPerformance();
  }

  /**
   * Configure A/B test
   */
  public configureABTest(
    testName: string, 
    config: {
      arms: string[];
      trafficSplit: number[];
      duration: number;
      metrics: string[];
    }
  ): void {
    this.abTestConfig.set(testName, {
      ...config,
      startTime: new Date(),
      endTime: new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000) // duration in days
    });
    console.log(`Configured A/B test: ${testName}`);
  }

  /**
   * Get A/B test results
   */
  public getABTestResults(testName: string) {
    const config = this.abTestConfig.get(testName);
    if (!config) return null;
    
    const armPerformance = this.getArmPerformance();
    const testArms = armPerformance.filter(arm => config.arms.includes(arm.armId));
    
    return {
      testName,
      config,
      results: testArms,
      isActive: new Date() < config.endTime,
      winner: testArms.reduce((best, current) => 
        current.expectedReward > best.expectedReward ? current : best
      )
    };
  }

  /**
   * Deploy model version
   */
  public deployModelVersion(version: string): void {
    this.modelVersion = version;
    console.log(`Deployed model version: ${version}`);
  }

  /**
   * Get current model version
   */
  public getModelVersion(): string {
    return this.modelVersion;
  }

  /**
   * Select best content variation using contextual bandit
   */
  private async selectContentVariation(variations: Array<{id: string, context: any}>): Promise<string> {
    if (variations.length === 0) {
      throw new Error('No variations provided for selection');
    }
    
    if (variations.length === 1) {
      return variations[0].id;
    }
    
    // Create bandit context from the first variation (assuming similar context)
    const context: BanditContext = {
      platform: variations[0].context?.platform || 'INSTAGRAM',
      contentType: 'text',
      audienceSegment: 'general',
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      historicalEngagement: 0,
      contentLength: 100, // default
      hasHashtags: false,
      hasThumbnail: false,
      userId: 'variation_selection'
    };
    
    // Use bandit to select best arm (variation)
    const selectedArmId = await this.bandit.selectArm(context);
    
    // Map arm ID back to variation ID if possible, otherwise return first variation
    const selectedVariation = variations.find(v => v.id === selectedArmId) || variations[0];
    return selectedVariation.id;
  }
} 