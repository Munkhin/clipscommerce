import { Platform } from '../../deliverables/types/deliverables_types';
import { PostMetrics } from '@/app/workflows/data_collection/functions/types';
import { 
  AIImprovementFeedbackLoop,
  AISuggestion,
  ContentPerformanceFeature,
  featureStore 
} from '../functions/feedbackLoop';
import {
  SentimentAnalysis,
  ToneAnalysis,
  ContentOptimization,
  HashtagRecommendation,
  CaptionVariation,
  analyzeSentiment,
  analyzeTone,
  optimizeContent,
  generateCaptionVariations,
  generateHashtagRecommendations,
  analyzeContentPerformancePatterns
} from '../functions/nlp';
import {
  Experiment,
  ExperimentVariant,
  ExperimentAnalysis,
  createExperiment,
  analyzeExperiment,
  generateContentVariations,
  assignVariant,
  recordExperimentData
} from '../functions/abTesting';
import { predictEngagement, evaluateModel, updateModel } from '../functions/updateModel';

/**
 * Main service class for AI Improvement workflow
 * Provides easy integration points for other workflows
 */
export class AIImprovementService {
  private feedbackLoop: AIImprovementFeedbackLoop;
  private initialized: boolean = false;

  constructor() {
    this.feedbackLoop = new AIImprovementFeedbackLoop();
  }

  /**
   * Initialize the AI improvement service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing AI Improvement Service...');
      
      // Run initial feedback loop to populate data
      await this.feedbackLoop.runFeedbackLoop('system_init');
      
      this.initialized = true;
      console.log('AI Improvement Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Improvement Service:', error);
      throw error;
    }
  }

  /**
   * Get content optimization suggestions for a given post
   */
  async getContentOptimization(request: {
    caption: string;
    hashtags?: string[];
    platform: Platform;
    targetAudience?: string;
    userId: string;
  }): Promise<{
    sentiment: SentimentAnalysis;
    tone: ToneAnalysis;
    optimization: ContentOptimization;
    captionVariations: CaptionVariation[];
    hashtagRecommendations: HashtagRecommendation[];
    aiSuggestions: AISuggestion[];
  }> {
    await this.ensureInitialized();

    const { caption, hashtags = [], platform, targetAudience, userId } = request;

    // Analyze current content
    const sentiment = analyzeSentiment(caption);
    const tone = analyzeTone(caption);
    const optimization = optimizeContent(caption, platform);

    // Generate variations and recommendations
    const captionVariations = generateCaptionVariations(caption, platform, targetAudience);
    const hashtagRecommendations = generateHashtagRecommendations(caption, platform, hashtags);

    // Get AI suggestions from feature store
    const aiSuggestions = featureStore.aiSuggestions
      .filter(s => s.userId === userId && s.platform === platform)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return {
      sentiment,
      tone,
      optimization,
      captionVariations,
      hashtagRecommendations,
      aiSuggestions,
    };
  }

  /**
   * Predict engagement for a given post
   */
  async predictPostEngagement(request: {
    caption: string;
    hashtags: string[];
    platform: Platform;
    publishTime?: Date;
    contentType?: 'video' | 'image' | 'carousel' | 'story' | 'reel';
  }): Promise<{
    predictedEngagement: number;
    confidence: number;
    factors: {
      captionScore: number;
      hashtagScore: number;
      timingScore: number;
      platformScore: number;
    };
    recommendations: string[];
  }> {
    await this.ensureInitialized();

    const { caption, hashtags, platform, publishTime, contentType } = request;

    // Calculate various scoring factors
    const captionScore = this.calculateCaptionScore(caption, platform);
    const hashtagScore = this.calculateHashtagScore(hashtags, platform);
    const timingScore = this.calculateTimingScore(publishTime || new Date(), platform);
    const platformScore = this.calculatePlatformScore(platform, contentType);

    // Use ML model for prediction
    const likeRatio = (captionScore + hashtagScore) / 200; // Normalize to 0-1
    const predictedEngagement = predictEngagement(likeRatio);

    // Calculate confidence based on data quality
    const confidence = Math.min(0.95, 0.6 + (captionScore + hashtagScore + timingScore) / 300);

    // Generate recommendations
    const recommendations = this.generateEngagementRecommendations({
      captionScore,
      hashtagScore,
      timingScore,
      platformScore,
      platform,
    });

    return {
      predictedEngagement: Math.max(0, predictedEngagement),
      confidence,
      factors: {
        captionScore,
        hashtagScore,
        timingScore,
        platformScore,
      },
      recommendations,
    };
  }

  /**
   * Create and manage A/B tests
   */
  async createABTest(request: {
    name: string;
    description: string;
    platform: Platform;
    baseContent: {
      caption: string;
      hashtags: string[];
    };
    variationType: 'caption' | 'hashtags' | 'tone' | 'length';
    targetMetric: 'engagementRate' | 'likes' | 'comments' | 'shares' | 'views';
    duration: number; // days
    userId: string;
  }): Promise<{
    experiment: Experiment;
    variants: ExperimentVariant[];
    assignmentInstructions: string;
  }> {
    await this.ensureInitialized();

    const { name, description, platform, baseContent, variationType, targetMetric, duration, userId } = request;

    // Generate content variations
    const variants = generateContentVariations({ ...baseContent, platform }, variationType);

    // Create experiment
    const experiment = createExperiment({
      name,
      description,
      platform,
      status: 'draft',
      variants,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      targetMetric,
      minimumSampleSize: 100,
      confidenceLevel: 0.95,
      createdBy: userId,
    });

    const assignmentInstructions = this.generateAssignmentInstructions(experiment, variants);

    return {
      experiment,
      variants,
      assignmentInstructions,
    };
  }

  /**
   * Analyze A/B test results
   */
  async analyzeABTest(experimentId: string): Promise<{
    analysis: ExperimentAnalysis | null;
    insights: string[];
    nextSteps: string[];
  }> {
    await this.ensureInitialized();

    const analysis = analyzeExperiment(experimentId);
    
    if (!analysis) {
      return {
        analysis: null,
        insights: ['Experiment not found'],
        nextSteps: ['Verify experiment ID'],
      };
    }

    const insights = this.generateExperimentInsights(analysis);
    const nextSteps = this.generateExperimentNextSteps(analysis);

    return {
      analysis,
      insights,
      nextSteps,
    };
  }

  /**
   * Get performance insights for a user
   */
  async getPerformanceInsights(userId: string): Promise<{
    overallPerformance: {
      averageEngagement: number;
      topPerformingPlatform: Platform;
      improvementTrend: number;
    };
    contentInsights: {
      topPerformingWords: string[];
      optimalCaptionLength: Record<Platform, number>;
      bestHashtags: Record<Platform, string[]>;
    };
    recommendations: AISuggestion[];
    experimentOpportunities: string[];
  }> {
    await this.ensureInitialized();

    // Run feedback loop for user
    await this.feedbackLoop.runFeedbackLoop(userId);

    // Calculate overall performance
    const userContent = featureStore.contentPerformance.filter(c => 
      // In a real implementation, we'd filter by userId
      true
    );

    const averageEngagement = userContent.length > 0 
      ? userContent.reduce((sum, c) => sum + c.engagementRate, 0) / userContent.length
      : 0;

    const platformPerformance = userContent.reduce((acc, content) => {
      if (!acc[content.platform]) acc[content.platform] = [];
      acc[content.platform].push(content.engagementRate);
      return acc;
    }, {} as Record<Platform, number[]>);

    const topPerformingPlatform = Object.entries(platformPerformance)
      .map(([platform, rates]) => ({
        platform: platform as Platform,
        avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      }))
      .sort((a, b) => b.avgRate - a.avgRate)[0]?.platform || Platform.TIKTOK;

    // Calculate improvement trend (mock)
    const improvementTrend = Math.random() * 20 - 5; // -5% to +15%

    // Get content insights
    const rawInsights = analyzeContentPerformancePatterns();
    const contentInsights = {
      topPerformingWords: rawInsights.topPerformingWords,
      optimalCaptionLength: rawInsights.optimalCaptionLength,
      bestHashtags: rawInsights.highEngagementHashtags,
    };

    // Get user-specific recommendations
    const recommendations = featureStore.aiSuggestions
      .filter(s => s.userId === userId)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    // Generate experiment opportunities
    const experimentOpportunities = this.generateExperimentOpportunities(userContent);

    return {
      overallPerformance: {
        averageEngagement,
        topPerformingPlatform,
        improvementTrend,
      },
      contentInsights,
      recommendations,
      experimentOpportunities,
    };
  }

  /**
   * Record post performance for learning
   */
  async recordPostPerformance(postMetrics: PostMetrics): Promise<void> {
    await this.ensureInitialized();

    // Convert PostMetrics to ContentPerformanceFeature
    const feature: ContentPerformanceFeature = {
      postId: postMetrics.id,
      platform: postMetrics.platform,
      contentType: this.inferContentType(postMetrics),
      engagementRate: postMetrics.engagementRate,
      likeRatio: postMetrics.likes / Math.max(postMetrics.views, 1),
      commentRatio: postMetrics.comments / Math.max(postMetrics.views, 1),
      shareRatio: postMetrics.shares / Math.max(postMetrics.views, 1),
      hashtags: postMetrics.hashtags || [],
      caption: postMetrics.caption || '',
      publishTime: postMetrics.timestamp,
      audienceReach: postMetrics.views,
      impressions: postMetrics.views * 1.2, // Estimated
      sentiment: this.analyzeSentimentSimple(postMetrics.caption || ''),
      viralityScore: this.calculateViralityScore(postMetrics),
      qualityScore: this.calculateQualityScore(postMetrics),
    };

    // Add to feature store
    featureStore.contentPerformance.push(feature);

    // Update ML models
    updateModel();

    console.log(`Recorded performance for post ${postMetrics.id}`);
  }

  /**
   * Get workflow improvement suggestions
   */
  async getWorkflowImprovements(): Promise<{
    dataCollection: string[];
    videoOptimization: string[];
    autoposting: string[];
    competitorTactics: string[];
    contentTemplateGenerator: string[];
  }> {
    await this.ensureInitialized();

    return {
      dataCollection: [
        'Increase data collection frequency for trending content',
        'Add sentiment analysis to collected posts',
        'Implement real-time competitor monitoring',
        'Expand data collection to include story metrics',
      ],
      videoOptimization: [
        'Focus on video length optimization based on engagement patterns',
        'Implement audio trend analysis',
        'Add thumbnail A/B testing capabilities',
        'Optimize for platform-specific video formats',
      ],
      autoposting: [
        'Adjust posting schedule based on audience engagement patterns',
        'Implement cross-platform posting optimization',
        'Add engagement prediction before posting',
        'Create dynamic content scheduling',
      ],
      competitorTactics: [
        'Increase competitor analysis frequency',
        'Add strategy pattern recognition',
        'Implement competitive gap analysis',
        'Monitor competitor posting schedules',
      ],
      contentTemplateGenerator: [
        'Update templates based on high-performing content patterns',
        'Add platform-specific template variations',
        'Implement dynamic template generation',
        'Create audience-specific templates',
      ],
    };
  }

  /**
   * Provide feedback on AI suggestions
   */
  async provideFeedback(suggestionId: string, feedback: 'positive' | 'negative' | 'neutral'): Promise<void> {
    await this.ensureInitialized();

    const suggestion = featureStore.aiSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.feedback = feedback;
      
      // Adjust confidence based on feedback
      if (feedback === 'positive') {
        suggestion.confidence = Math.min(1, suggestion.confidence * 1.1);
      } else if (feedback === 'negative') {
        suggestion.confidence = Math.max(0.1, suggestion.confidence * 0.8);
      }

      console.log(`Recorded ${feedback} feedback for suggestion ${suggestionId}`);
    }
  }

  /**
   * Updates the content optimization patterns by re-analyzing historical data.
   * This is typically called by the MasterOrchestratorAgent.
   */
  async updateContentOptimizationPatterns(): Promise<void> {
    await this.ensureInitialized();
    try {
      console.log('Updating content optimization patterns by calling analyzeContentPerformancePatterns...');
      const patterns = analyzeContentPerformancePatterns(); // from ../functions/nlp
      // The patterns are derived from featureStore and used by other functions.
      // For now, we log the action. If these patterns needed to be stored centrally
      // beyond the featureStore's implicit use, this is where it would happen.
      console.log('Content optimization patterns updated successfully. Top performing words count:', patterns.topPerformingWords.length);
    } catch (error) {
      console.error('Failed to update content optimization patterns:', error);
      // Optionally, re-throw or handle as per system design
    }
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private calculateCaptionScore(caption: string, platform: Platform): number {
    const sentiment = analyzeSentiment(caption);
    const tone = analyzeTone(caption);
    const optimization = optimizeContent(caption, platform);

    let score = 50; // Base score

    // Sentiment bonus
    if (sentiment.sentiment === 'positive') score += sentiment.confidence * 20;
    
    // Tone bonus
    score += tone.confidence * 15;

    // Length optimization
    const optimalLength = this.getOptimalLength(platform);
    const lengthRatio = caption.length / optimalLength;
    if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
      score += 10; // Within optimal range
    }

    // Engagement elements
    if (caption.includes('?')) score += 5; // Question
    if (caption.match(/[!]{1,2}/)) score += 3; // Excitement
    if (caption.match(/[✨💕🌟💯🔥]/)) score += 5; // Emojis

    return Math.min(100, Math.max(0, score));
  }

  private calculateHashtagScore(hashtags: string[], platform: Platform): number {
    if (hashtags.length === 0) return 0;

    let score = 0;
    const optimalCount = this.getOptimalHashtagCount(platform);

    // Count bonus/penalty
    if (hashtags.length === optimalCount) {
      score += 20;
    } else if (Math.abs(hashtags.length - optimalCount) <= 2) {
      score += 15;
    } else {
      score += 5;
    }

    // Quality bonus
    const trendingHashtags = this.getTrendingHashtags(platform);
    const trendingCount = hashtags.filter(h => trendingHashtags.includes(h)).length;
    score += trendingCount * 10;

    // Diversity bonus
    const uniqueTypes = new Set(hashtags.map(h => this.categorizeHashtag(h))).size;
    score += uniqueTypes * 5;

    return Math.min(100, score);
  }

  private calculateTimingScore(publishTime: Date, platform: Platform): number {
    const hour = publishTime.getHours();
    const dayOfWeek = publishTime.getDay();

    // Platform-specific optimal times
    const optimalTimes = {
      [Platform.TIKTOK]: [18, 19, 20, 21], // 6-9 PM
      [Platform.INSTAGRAM]: [11, 12, 17, 18, 19], // 11-12 PM, 5-7 PM
      [Platform.YOUTUBE]: [14, 15, 20, 21], // 2-3 PM, 8-9 PM
      [Platform.FACEBOOK]: [9, 13, 15], // 9 AM, 1 PM, 3 PM
      [Platform.TWITTER]: [9, 12, 17], // 9 AM, 12 PM, 5 PM
      [Platform.LINKEDIN]: [8, 9, 12, 17], // 8-9 AM, 12 PM, 5 PM
    };

    const platformOptimal = optimalTimes[platform] || [12, 18];
    const isOptimalTime = platformOptimal.includes(hour);

    let score = 30; // Base score

    if (isOptimalTime) {
      score += 50; // Large bonus for optimal times (total: 80)
    } else {
      // Penalty for very poor times (late night/early morning)
      if (hour >= 0 && hour <= 5) score -= 20; // Very late/early hours (total: 10)
      else if (hour >= 22 && hour <= 23) score -= 10; // Late evening (total: 20)
      else score += 10; // Decent times get small bonus (total: 40)
    }

    // Day of week bonus
    if (dayOfWeek >= 1 && dayOfWeek <= 5) score += 10; // Weekdays
    else if (dayOfWeek === 0 || dayOfWeek === 6) score += 5; // Weekends

    return Math.min(100, Math.max(10, score)); // Ensure minimum score of 10
  }

  private calculatePlatformScore(platform: Platform, contentType?: string): number {
    // Platform-specific content type preferences
    const preferences = {
      [Platform.TIKTOK]: { video: 100, reel: 90, image: 30 },
      [Platform.INSTAGRAM]: { reel: 100, image: 80, video: 70, carousel: 85 },
      [Platform.YOUTUBE]: { video: 100, image: 20 },
      [Platform.FACEBOOK]: { video: 80, image: 70, carousel: 75 },
      [Platform.TWITTER]: { image: 70, video: 60 },
      [Platform.LINKEDIN]: { image: 80, video: 70, carousel: 60 },
    };

    const platformPrefs = preferences[platform];
    return contentType ? (platformPrefs[contentType as keyof typeof platformPrefs] || 50) : 75;
  }

  private generateEngagementRecommendations(factors: {
    captionScore: number;
    hashtagScore: number;
    timingScore: number;
    platformScore: number;
    platform: Platform;
  }): string[] {
    const recommendations: string[] = [];

    if (factors.captionScore < 60) {
      recommendations.push('Improve caption with more engaging language and questions');
    }

    if (factors.hashtagScore < 50) {
      recommendations.push('Add more relevant and trending hashtags');
    }

    if (factors.timingScore < 60) {
      recommendations.push('Consider posting during peak engagement hours');
    }

    if (factors.platformScore < 70) {
      recommendations.push('Optimize content format for this platform');
    }

    return recommendations;
  }

  private generateAssignmentInstructions(experiment: Experiment, variants: ExperimentVariant[]): string {
    return `
A/B Test: ${experiment.name}

Instructions:
1. Use the assignVariant() function to assign users to variants
2. Track performance metrics: ${experiment.targetMetric}
3. Run for ${Math.ceil((experiment.endDate!.getTime() - experiment.startDate.getTime()) / (24 * 60 * 60 * 1000))} days
4. Minimum sample size: ${experiment.minimumSampleSize} per variant

Variants:
${variants.map(v => `- ${v.name}: ${v.description} (${v.weight}% traffic)`).join('\n')}
    `;
  }

  private generateExperimentInsights(analysis: ExperimentAnalysis): string[] {
    const insights: string[] = [];

    switch (analysis.status) {
      case 'significant_difference':
        insights.push(`Statistically significant difference found (p-value: ${analysis.pValue?.toFixed(4)})`);
        if (analysis.winningVariant) {
          insights.push(`Winning variant: ${analysis.winningVariant}`);
        }
        if (analysis.effectSize) {
          insights.push(`Effect size: ${analysis.effectSize.toFixed(3)} (${this.interpretEffectSize(analysis.effectSize)})`);
        }
        break;
      
      case 'no_significant_difference':
        insights.push('No statistically significant difference between variants');
        insights.push('Consider testing more dramatic variations');
        break;
      
      case 'insufficient_data':
        insights.push('Insufficient data to determine statistical significance');
        insights.push('Continue running the experiment');
        break;
    }

    return insights;
  }

  private generateExperimentNextSteps(analysis: ExperimentAnalysis): string[] {
    const nextSteps: string[] = [];

    switch (analysis.status) {
      case 'significant_difference':
        nextSteps.push('Implement the winning variant');
        nextSteps.push('Monitor performance after implementation');
        nextSteps.push('Consider testing additional variations');
        break;
      
      case 'no_significant_difference':
        nextSteps.push('Choose either variant or stick with original');
        nextSteps.push('Design new test with more dramatic differences');
        break;
      
      case 'insufficient_data':
        nextSteps.push('Continue running the experiment');
        nextSteps.push('Consider extending the duration');
        nextSteps.push('Increase traffic allocation if possible');
        break;
    }

    return nextSteps;
  }

  private generateExperimentOpportunities(content: ContentPerformanceFeature[]): string[] {
    const opportunities: string[] = [];

    // Analyze content patterns for experiment ideas
    const captionLengths = content.map(c => c.caption.length);
    const avgLength = captionLengths.reduce((sum, len) => sum + len, 0) / captionLengths.length;

    if (avgLength > 200) {
      opportunities.push('Test shorter vs longer captions');
    }

    const hashtagCounts = content.map(c => c.hashtags.length);
    const avgHashtags = hashtagCounts.reduce((sum, count) => sum + count, 0) / hashtagCounts.length;

    if (avgHashtags < 5) {
      opportunities.push('Test different hashtag quantities');
    }

    opportunities.push('Test different posting times');
    opportunities.push('Test emoji usage variations');
    opportunities.push('Test call-to-action variations');

    return opportunities;
  }

  private inferContentType(post: PostMetrics): 'video' | 'image' | 'carousel' | 'story' | 'reel' {
    if (post.metadata?.duration) return 'video';
    if (post.metadata?.isShort) return 'reel';
    return 'image';
  }

  private analyzeSentimentSimple(text: string): 'positive' | 'negative' | 'neutral' {
    const sentiment = analyzeSentiment(text);
    return sentiment.sentiment;
  }

  private calculateViralityScore(post: PostMetrics): number {
    const engagementVelocity = (post.likes + post.comments + post.shares) / Math.max(post.views, 1);
    const shareRatio = post.shares / Math.max(post.views, 1);
    return Math.min(1, engagementVelocity * 10 + shareRatio * 50);
  }

  private calculateQualityScore(post: PostMetrics): number {
    const engagementQuality = post.engagementRate / 100;
    const commentToLikeRatio = post.comments / Math.max(post.likes, 1);
    return (engagementQuality + commentToLikeRatio) / 2;
  }

  private getOptimalLength(platform: Platform): number {
    const lengths = {
      [Platform.TIKTOK]: 150,
      [Platform.INSTAGRAM]: 125,
      [Platform.YOUTUBE]: 200,
      [Platform.FACEBOOK]: 250,
      [Platform.TWITTER]: 280,
      [Platform.LINKEDIN]: 300,
    };
    return lengths[platform] || 150;
  }

  private getOptimalHashtagCount(platform: Platform): number {
    const counts = {
      [Platform.TIKTOK]: 5,
      [Platform.INSTAGRAM]: 8,
      [Platform.YOUTUBE]: 3,
      [Platform.FACEBOOK]: 3,
      [Platform.TWITTER]: 2,
      [Platform.LINKEDIN]: 3,
    };
    return counts[platform] || 5;
  }

  private getTrendingHashtags(platform: Platform): string[] {
    const trending = {
      [Platform.TIKTOK]: ['#fyp', '#viral', '#trending'],
      [Platform.INSTAGRAM]: ['#instagood', '#photooftheday', '#love'],
      [Platform.YOUTUBE]: ['#youtube', '#subscribe', '#viral'],
      [Platform.FACEBOOK]: ['#facebook', '#social', '#community'],
      [Platform.TWITTER]: ['#twitter', '#trending', '#viral'],
      [Platform.LINKEDIN]: ['#linkedin', '#professional', '#career'],
    };
    return trending[platform] || [];
  }

  private categorizeHashtag(hashtag: string): string {
    const lower = hashtag.toLowerCase();
    if (lower.includes('trend') || lower.includes('viral')) return 'trending';
    if (lower.includes('love') || lower.includes('happy')) return 'emotion';
    if (lower.includes('photo') || lower.includes('pic')) return 'visual';
    return 'general';
  }

  private interpretEffectSize(effectSize: number): string {
    if (effectSize < 0.2) return 'small effect';
    if (effectSize < 0.5) return 'medium effect';
    return 'large effect';
  }
}

// Export singleton instance
export const aiImprovementService = new AIImprovementService(); 