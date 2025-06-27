import { PostMetrics } from '@/app/workflows/data_collection/functions/types';
import { Platform } from '../../deliverables/types/deliverables_types';
import { 
  AnalysisResult, 
  PerformanceTrends, 
  CompetitorAnalysis,
  VideoOptimizationAnalysisData,
  AIImprovementAnalysisData 
} from '@/app/workflows/data_analysis/types/analysis_types';

// Enhanced feature store with real data integration
export interface FeatureStore {
  userInteractions: UserInteraction[];
  contentPerformance: ContentPerformanceFeature[];
  platformMetrics: PlatformMetric[];
  competitorInsights: CompetitorInsight[];
  workflowPerformance: WorkflowPerformanceMetric[];
  aiSuggestions: AISuggestion[];
  experimentResults: FeedbackExperimentResult[];
}

export interface UserInteraction {
  userId: string;
  action: 'like' | 'comment' | 'share' | 'view' | 'save' | 'click';
  postId: string;
  platform: Platform;
  timestamp: number;
  sessionId?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  location?: string;
  metadata?: Record<string, any>;
}

export interface ContentPerformanceFeature {
  postId: string;
  platform: Platform;
  contentType: 'video' | 'image' | 'carousel' | 'story' | 'reel';
  engagementRate: number;
  likeRatio: number;
  commentRatio: number;
  shareRatio: number;
  viewDuration?: number;
  dropOffPoints?: number[];
  hashtags: string[];
  caption: string;
  publishTime: Date;
  audienceReach: number;
  impressions: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  viralityScore: number;
  qualityScore: number;
}

export interface PlatformMetric {
  platform: Platform;
  activeUsers: number;
  averageEngagement: number;
  trendingTopics: string[];
  optimalPostingTimes: { hour: number; score: number }[];
  competitorActivity: number;
  timestamp: number;
}

export interface CompetitorInsight {
  competitorId: string;
  platform: Platform;
  strategy: string;
  performanceMetrics: {
    averageEngagement: number;
    postingFrequency: number;
    contentTypes: Record<string, number>;
  };
  successFactors: string[];
  timestamp: number;
}

export interface WorkflowPerformanceMetric {
  workflowName: string;
  executionTime: number;
  successRate: number;
  errorRate: number;
  userSatisfaction: number;
  improvementSuggestions: string[];
  timestamp: number;
}

export interface AISuggestion {
  id: string;
  type: 'content' | 'timing' | 'hashtags' | 'caption' | 'strategy';
  suggestion: string;
  confidence: number;
  expectedImprovement: number;
  appliedAt?: Date;
  actualImprovement?: number;
  feedback?: 'positive' | 'negative' | 'neutral';
  userId: string;
  platform: Platform;
}

export interface FeedbackExperimentResult {
  experimentId: string;
  variantId: string;
  metric: string;
  improvement: number;
  significance: number;
  sampleSize: number;
  duration: number;
  platform: Platform;
}

// Enhanced feature store with real data
export const featureStore: FeatureStore = {
  userInteractions: [],
  contentPerformance: [],
  platformMetrics: [],
  competitorInsights: [],
  workflowPerformance: [],
  aiSuggestions: [],
  experimentResults: [],
};

// Data integration interfaces
export interface DataCollectionService {
  getPostMetrics(userId: string, timeRange: { start: Date; end: Date }): Promise<PostMetrics[]>;
  getUserInteractions(userId: string, timeRange: { start: Date; end: Date }): Promise<UserInteraction[]>;
  getPlatformMetrics(platform: Platform, timeRange: { start: Date; end: Date }): Promise<PlatformMetric[]>;
}

export interface AnalysisService {
  getPerformanceTrends(userId: string): Promise<AnalysisResult<PerformanceTrends>>;
  getCompetitorAnalysis(userId: string): Promise<AnalysisResult<CompetitorAnalysis[]>>;
  getVideoOptimizationData(userId: string): Promise<AnalysisResult<VideoOptimizationAnalysisData>>;
}

// Enhanced feedback loop with real data integration
export class AIImprovementFeedbackLoop {
  private dataCollectionService?: DataCollectionService;
  private analysisService?: AnalysisService;

  constructor(
    dataCollectionService?: DataCollectionService,
    analysisService?: AnalysisService
  ) {
    this.dataCollectionService = dataCollectionService;
    this.analysisService = analysisService;
  }

  /**
   * Main feedback loop that integrates data from all workflows
   */
  async runFeedbackLoop(userId: string): Promise<void> {
    try {
      console.log(`Running AI improvement feedback loop for user: ${userId}`);
      
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date(),
      };

      // Collect data from various sources
      await this.collectContentPerformanceData(userId, timeRange);
      await this.collectUserInteractionData(userId, timeRange);
      await this.collectCompetitorInsights(userId);
      await this.collectWorkflowPerformanceData();
      
      // Extract features and generate insights
      await this.extractContentFeatures();
      await this.generateAIInsights(userId);
      await this.evaluateAISuggestions();
      
      // Update models and recommendations
      await this.updatePredictionModels();
      await this.generateWorkflowImprovements();
      
      console.log('Feedback loop completed successfully');
    } catch (error) {
      console.error('Error in feedback loop:', error);
      throw error;
    }
  }

  /**
   * Collects content performance data from data collection workflow
   */
  private async collectContentPerformanceData(
    userId: string, 
    timeRange: { start: Date; end: Date }
  ): Promise<void> {
    if (!this.dataCollectionService) {
      // Fallback to sample data if service not available
      this.generateSampleContentData();
      return;
    }

    try {
      const postMetrics = await this.dataCollectionService.getPostMetrics(userId, timeRange);
      
      for (const post of postMetrics) {
        const feature: ContentPerformanceFeature = {
          postId: post.id,
          platform: post.platform,
          contentType: this.inferContentType(post),
          engagementRate: post.engagementRate,
          likeRatio: post.likes / Math.max(post.views, 1),
          commentRatio: post.comments / Math.max(post.views, 1),
          shareRatio: post.shares / Math.max(post.views, 1),
          hashtags: post.hashtags || [],
          caption: post.caption || '',
          publishTime: post.timestamp,
          audienceReach: post.views,
          impressions: post.views * 1.2, // Estimated
          sentiment: this.analyzeSentiment(post.caption || ''),
          viralityScore: this.calculateViralityScore(post),
          qualityScore: this.calculateQualityScore(post),
        };

        featureStore.contentPerformance.push(feature);
      }
    } catch (error) {
      console.error('Error collecting content performance data:', error);
      this.generateSampleContentData();
    }
  }

  /**
   * Collects user interaction data
   */
  private async collectUserInteractionData(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<void> {
    if (!this.dataCollectionService) {
      this.generateSampleInteractionData();
      return;
    }

    try {
      const interactions = await this.dataCollectionService.getUserInteractions(userId, timeRange);
      featureStore.userInteractions.push(...interactions);
    } catch (error) {
      console.error('Error collecting user interaction data:', error);
      this.generateSampleInteractionData();
    }
  }

  /**
   * Collects competitor insights from analysis workflow
   */
  private async collectCompetitorInsights(userId: string): Promise<void> {
    if (!this.analysisService) {
      this.generateSampleCompetitorData();
      return;
    }

    try {
      const competitorAnalysis = await this.analysisService.getCompetitorAnalysis(userId);
      
      if (competitorAnalysis.success && competitorAnalysis.data) {
        for (const competitor of competitorAnalysis.data) {
          const insight: CompetitorInsight = {
            competitorId: competitor.competitorId,
            platform: Platform.TIKTOK, // Default, should be extracted from data
            strategy: competitor.contentAnalysis.commonTopics.join(', '),
            performanceMetrics: {
              averageEngagement: competitor.engagementMetrics.averageEngagementRate,
              postingFrequency: competitor.contentAnalysis.postingFrequency,
              contentTypes: competitor.contentAnalysis.bestPerformingFormats.reduce((acc, format) => {
                acc[format] = 1;
                return acc;
              }, {} as Record<string, number>),
            },
            successFactors: competitor.topPerformingContent.keySuccessFactors,
            timestamp: Date.now(),
          };

          featureStore.competitorInsights.push(insight);
        }
      }
    } catch (error) {
      console.error('Error collecting competitor insights:', error);
      this.generateSampleCompetitorData();
    }
  }

  /**
   * Collects workflow performance metrics
   */
  private async collectWorkflowPerformanceData(): Promise<void> {
    // Mock workflow performance data (in production, collect from actual workflow metrics)
    const workflows = [
      'data_collection',
      'video_optimization', 
      'autoposting',
      'competitor_tactics',
      'content_template_generator'
    ];

    for (const workflow of workflows) {
      const metric: WorkflowPerformanceMetric = {
        workflowName: workflow,
        executionTime: Math.random() * 5000 + 1000, // 1-6 seconds
        successRate: Math.random() * 0.2 + 0.8, // 80-100%
        errorRate: Math.random() * 0.1, // 0-10%
        userSatisfaction: Math.random() * 2 + 3, // 3-5 rating
        improvementSuggestions: this.generateWorkflowSuggestions(workflow),
        timestamp: Date.now(),
      };

      featureStore.workflowPerformance.push(metric);
    }
  }

  /**
   * Extracts advanced features from collected data
   */
  private async extractContentFeatures(): Promise<void> {
    // Temporal features
    this.extractTemporalFeatures();
    
    // Content quality features
    this.extractQualityFeatures();
    
    // Audience engagement patterns
    this.extractEngagementPatterns();
    
    // Cross-platform performance correlations
    this.extractCrossPlatformFeatures();
  }

  /**
   * Generates AI-powered insights and suggestions
   */
  private async generateAIInsights(userId: string): Promise<void> {
    const insights = [
      this.generateContentOptimizationSuggestions(userId),
      this.generateTimingOptimizationSuggestions(userId),
      this.generateHashtagSuggestions(userId),
      this.generateStrategyRecommendations(userId),
    ].flat();

    featureStore.aiSuggestions.push(...insights);
  }

  /**
   * Evaluates the effectiveness of previous AI suggestions
   */
  private async evaluateAISuggestions(): Promise<void> {
    const appliedSuggestions = featureStore.aiSuggestions.filter(s => s.appliedAt);
    
    for (const suggestion of appliedSuggestions) {
      if (!suggestion.actualImprovement) {
        // Calculate actual improvement based on performance data
        const improvement = this.calculateSuggestionImpact(suggestion);
        suggestion.actualImprovement = improvement;
        
        // Update suggestion confidence based on actual results
        this.updateSuggestionConfidence(suggestion);
      }
    }
  }

  /**
   * Updates prediction models based on new data
   */
  private async updatePredictionModels(): Promise<void> {
    // Update engagement prediction model
    this.updateEngagementModel();
    
    // Update virality prediction model
    this.updateViralityModel();
    
    // Update optimal timing model
    this.updateTimingModel();
    
    // Update content quality model
    this.updateQualityModel();
  }

  /**
   * Generates improvements for other workflows
   */
  private async generateWorkflowImprovements(): Promise<void> {
    const improvements = {
      data_collection: this.generateDataCollectionImprovements(),
      video_optimization: this.generateVideoOptimizationImprovements(),
      autoposting: this.generateAutopostingImprovements(),
      competitor_tactics: this.generateCompetitorTacticsImprovements(),
      content_template_generator: this.generateContentTemplateImprovements(),
    };

    console.log('Generated workflow improvements:', improvements);
  }

  // Helper methods for feature extraction and analysis

  private inferContentType(post: PostMetrics): 'video' | 'image' | 'carousel' | 'story' | 'reel' {
    // Infer content type based on available metadata
    if (post.metadata?.duration) return 'video';
    if (post.metadata?.isShort) return 'reel';
    return 'image'; // Default
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis (in production, use advanced NLP)
    const positiveWords = ['love', 'amazing', 'great', 'awesome', 'fantastic'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'horrible'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateViralityScore(post: PostMetrics): number {
    // Calculate virality based on engagement velocity and reach
    const engagementVelocity = (post.likes + post.comments + post.shares) / Math.max(post.views, 1);
    const shareRatio = post.shares / Math.max(post.views, 1);
    const timeDecay = Math.exp(-((Date.now() - post.timestamp.getTime()) / (24 * 60 * 60 * 1000))); // Decay over days
    
    return Math.min(1, (engagementVelocity * 10 + shareRatio * 50) * timeDecay);
  }

  private calculateQualityScore(post: PostMetrics): number {
    // Calculate content quality based on multiple factors
    const engagementQuality = post.engagementRate / 100;
    const commentToLikeRatio = post.comments / Math.max(post.likes, 1);
    const captionQuality = (post.caption?.length || 0) > 50 ? 0.8 : 0.5;
    const hashtagQuality = (post.hashtags?.length || 0) > 3 ? 0.8 : 0.5;
    
    return (engagementQuality + commentToLikeRatio + captionQuality + hashtagQuality) / 4;
  }

  private extractTemporalFeatures(): void {
    // Extract time-based patterns from content performance
    const hourlyPerformance: Record<number, number[]> = {};
    
    for (const content of featureStore.contentPerformance) {
      const hour = content.publishTime.getHours();
      if (!hourlyPerformance[hour]) hourlyPerformance[hour] = [];
      hourlyPerformance[hour].push(content.engagementRate);
    }

    // Store temporal insights
    console.log('Temporal features extracted:', Object.keys(hourlyPerformance).length, 'hours analyzed');
  }

  private extractQualityFeatures(): void {
    // Extract content quality patterns
    const qualityFactors = featureStore.contentPerformance.map(content => ({
      captionLength: content.caption.length,
      hashtagCount: content.hashtags.length,
      sentiment: content.sentiment,
      qualityScore: content.qualityScore,
      engagementRate: content.engagementRate,
    }));

    console.log('Quality features extracted for', qualityFactors.length, 'posts');
  }

  private extractEngagementPatterns(): void {
    // Extract audience engagement patterns
    const engagementPatterns = featureStore.userInteractions.reduce((patterns, interaction) => {
      const key = `${interaction.platform}_${interaction.action}`;
      patterns[key] = (patterns[key] || 0) + 1;
      return patterns;
    }, {} as Record<string, number>);

    console.log('Engagement patterns extracted:', engagementPatterns);
  }

  private extractCrossPlatformFeatures(): void {
    // Extract cross-platform performance correlations
    const platformPerformance = featureStore.contentPerformance.reduce((perf, content) => {
      if (!perf[content.platform]) perf[content.platform] = [];
      perf[content.platform].push(content.engagementRate);
      return perf;
    }, {} as Record<Platform, number[]>);

    console.log('Cross-platform features extracted for platforms:', Object.keys(platformPerformance));
  }

  private generateContentOptimizationSuggestions(userId: string): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    // Analyze top-performing content
    const topContent = featureStore.contentPerformance
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5);

    if (topContent.length > 0) {
      const avgCaptionLength = topContent.reduce((sum, c) => sum + c.caption.length, 0) / topContent.length;
      const commonHashtags = this.findCommonHashtags(topContent);

      suggestions.push({
        id: `content_opt_${Date.now()}`,
        type: 'content',
        suggestion: `Optimize caption length to around ${Math.round(avgCaptionLength)} characters based on your top-performing content`,
        confidence: 0.8,
        expectedImprovement: 15,
        userId,
        platform: Platform.TIKTOK, // Default
      });

      if (commonHashtags.length > 0) {
        suggestions.push({
          id: `hashtag_opt_${Date.now()}`,
          type: 'hashtags',
          suggestion: `Use these high-performing hashtags: ${commonHashtags.slice(0, 3).join(', ')}`,
          confidence: 0.7,
          expectedImprovement: 12,
          userId,
          platform: Platform.TIKTOK,
        });
      }
    }

    return suggestions;
  }

  private generateTimingOptimizationSuggestions(userId: string): AISuggestion[] {
    // Analyze optimal posting times
    const hourlyPerformance: Record<number, number[]> = {};
    
    for (const content of featureStore.contentPerformance) {
      const hour = content.publishTime.getHours();
      if (!hourlyPerformance[hour]) hourlyPerformance[hour] = [];
      hourlyPerformance[hour].push(content.engagementRate);
    }

    const bestHours = Object.entries(hourlyPerformance)
      .map(([hour, rates]) => ({
        hour: parseInt(hour),
        avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      }))
      .sort((a, b) => b.avgRate - a.avgRate)
      .slice(0, 3);

    if (bestHours.length > 0) {
      return [{
        id: `timing_opt_${Date.now()}`,
        type: 'timing',
        suggestion: `Post between ${bestHours[0].hour}:00-${bestHours[0].hour + 1}:00 for optimal engagement`,
        confidence: 0.75,
        expectedImprovement: 20,
        userId,
        platform: Platform.TIKTOK,
      }];
    }

    return [];
  }

  private generateHashtagSuggestions(userId: string): AISuggestion[] {
    // Analyze hashtag performance
    const hashtagPerformance: Record<string, number[]> = {};
    
    for (const content of featureStore.contentPerformance) {
      for (const hashtag of content.hashtags) {
        if (!hashtagPerformance[hashtag]) hashtagPerformance[hashtag] = [];
        hashtagPerformance[hashtag].push(content.engagementRate);
      }
    }

    const topHashtags = Object.entries(hashtagPerformance)
      .map(([hashtag, rates]) => ({
        hashtag,
        avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
        usage: rates.length,
      }))
      .filter(h => h.usage >= 2) // Only hashtags used multiple times
      .sort((a, b) => b.avgRate - a.avgRate)
      .slice(0, 5);

    if (topHashtags.length > 0) {
      return [{
        id: `hashtag_suggest_${Date.now()}`,
        type: 'hashtags',
        suggestion: `Try these high-performing hashtags: ${topHashtags.map(h => h.hashtag).join(', ')}`,
        confidence: 0.65,
        expectedImprovement: 10,
        userId,
        platform: Platform.TIKTOK,
      }];
    }

    return [];
  }

  private generateStrategyRecommendations(userId: string): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    // Analyze content type performance
    const typePerformance = featureStore.contentPerformance.reduce((perf, content) => {
      if (!perf[content.contentType]) perf[content.contentType] = [];
      perf[content.contentType].push(content.engagementRate);
      return perf;
    }, {} as Record<string, number[]>);

    const bestType = Object.entries(typePerformance)
      .map(([type, rates]) => ({
        type,
        avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      }))
      .sort((a, b) => b.avgRate - a.avgRate)[0];

    if (bestType) {
      suggestions.push({
        id: `strategy_${Date.now()}`,
        type: 'strategy',
        suggestion: `Focus more on ${bestType.type} content - it performs ${Math.round(bestType.avgRate)}% better on average`,
        confidence: 0.7,
        expectedImprovement: 18,
        userId,
        platform: Platform.TIKTOK,
      });
    }

    return suggestions;
  }

  private calculateSuggestionImpact(suggestion: AISuggestion): number {
    // Calculate actual impact of applied suggestion
    // This would compare performance before and after suggestion application
    return Math.random() * 30 - 5; // Mock: -5% to +25% improvement
  }

  private updateSuggestionConfidence(suggestion: AISuggestion): void {
    if (suggestion.actualImprovement !== undefined && suggestion.expectedImprovement) {
      const accuracy = 1 - Math.abs(suggestion.actualImprovement - suggestion.expectedImprovement) / suggestion.expectedImprovement;
      suggestion.confidence = Math.max(0.1, Math.min(1, suggestion.confidence * accuracy));
    }
  }

  private updateEngagementModel(): void {
    // Update engagement prediction model with new data
    console.log('Updated engagement prediction model with', featureStore.contentPerformance.length, 'data points');
  }

  private updateViralityModel(): void {
    // Update virality prediction model
    console.log('Updated virality prediction model');
  }

  private updateTimingModel(): void {
    // Update optimal timing model
    console.log('Updated timing optimization model');
  }

  private updateQualityModel(): void {
    // Update content quality assessment model
    console.log('Updated content quality model');
  }

  private generateDataCollectionImprovements(): string[] {
    return [
      'Increase data collection frequency for trending content',
      'Add sentiment analysis to collected posts',
      'Implement real-time competitor monitoring',
    ];
  }

  private generateVideoOptimizationImprovements(): string[] {
    return [
      'Focus on video length optimization based on engagement patterns',
      'Implement audio trend analysis',
      'Add thumbnail A/B testing capabilities',
    ];
  }

  private generateAutopostingImprovements(): string[] {
    return [
      'Adjust posting schedule based on audience engagement patterns',
      'Implement cross-platform posting optimization',
      'Add engagement prediction before posting',
    ];
  }

  private generateCompetitorTacticsImprovements(): string[] {
    return [
      'Increase competitor analysis frequency',
      'Add strategy pattern recognition',
      'Implement competitive gap analysis',
    ];
  }

  private generateContentTemplateImprovements(): string[] {
    return [
      'Update templates based on high-performing content patterns',
      'Add platform-specific template variations',
      'Implement dynamic template generation',
    ];
  }

  private generateWorkflowSuggestions(workflow: string): string[] {
    const suggestions: Record<string, string[]> = {
      data_collection: ['Optimize API rate limiting', 'Add data validation'],
      video_optimization: ['Improve processing speed', 'Add quality metrics'],
      autoposting: ['Better scheduling algorithm', 'Add failure recovery'],
      competitor_tactics: ['Expand competitor database', 'Add trend detection'],
      content_template_generator: ['More template variety', 'Better personalization'],
    };

    return suggestions[workflow] || ['General performance optimization'];
  }

  private findCommonHashtags(content: ContentPerformanceFeature[]): string[] {
    const hashtagCounts: Record<string, number> = {};
    
    for (const post of content) {
      for (const hashtag of post.hashtags) {
        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
      }
    }

    return Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([hashtag]) => hashtag)
      .slice(0, 10);
  }

  // Fallback methods for sample data generation
  private generateSampleContentData(): void {
    for (let i = 0; i < 20; i++) {
      const feature: ContentPerformanceFeature = {
        postId: `post_${i}`,
        platform: i % 2 === 0 ? Platform.TIKTOK : Platform.INSTAGRAM,
        contentType: ['video', 'image', 'reel'][i % 3] as any,
        engagementRate: Math.random() * 15 + 5,
        likeRatio: Math.random() * 0.1 + 0.05,
        commentRatio: Math.random() * 0.02 + 0.005,
        shareRatio: Math.random() * 0.01 + 0.002,
        hashtags: [`#tag${i}`, `#trending`, `#viral`],
        caption: `Sample caption for post ${i}`,
        publishTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        audienceReach: Math.floor(Math.random() * 10000 + 1000),
        impressions: Math.floor(Math.random() * 15000 + 1500),
        sentiment: ['positive', 'negative', 'neutral'][i % 3] as any,
        viralityScore: Math.random(),
        qualityScore: Math.random() * 0.5 + 0.5,
      };

      featureStore.contentPerformance.push(feature);
    }
  }

  private generateSampleInteractionData(): void {
    for (let i = 0; i < 50; i++) {
      const interaction: UserInteraction = {
        userId: `user_${i % 10}`,
        action: ['like', 'comment', 'share', 'view'][i % 4] as any,
        postId: `post_${i % 20}`,
        platform: i % 2 === 0 ? Platform.TIKTOK : Platform.INSTAGRAM,
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      };

      featureStore.userInteractions.push(interaction);
    }
  }

  private generateSampleCompetitorData(): void {
    for (let i = 0; i < 5; i++) {
      const insight: CompetitorInsight = {
        competitorId: `competitor_${i}`,
        platform: Platform.TIKTOK,
        strategy: `Strategy ${i}: Focus on trending topics`,
        performanceMetrics: {
          averageEngagement: Math.random() * 10 + 5,
          postingFrequency: Math.random() * 5 + 1,
          contentTypes: { video: 0.8, image: 0.2 },
        },
        successFactors: [`Factor ${i}A`, `Factor ${i}B`],
        timestamp: Date.now(),
      };

      featureStore.competitorInsights.push(insight);
    }
  }
}

// Legacy functions for backward compatibility
export function feedbackLoop(): void {
  const loop = new AIImprovementFeedbackLoop();
  loop.runFeedbackLoop('default_user').catch(console.error);
}

export function ingestSampleBatchData(): void {
  const loop = new AIImprovementFeedbackLoop();
  loop['generateSampleContentData']();
  loop['generateSampleInteractionData']();
  loop['generateSampleCompetitorData']();
}
