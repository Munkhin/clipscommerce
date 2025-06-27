import { StrategyRecommendation, PredictionRequest, EngagementPrediction } from '../types/EngagementTypes';

/**
 * Engine for generating optimization strategies and recommendations
 */
export class StrategyEngine {
  private optimalTimingData: Map<string, number[]>;
  private hashtagPerformanceData: Map<string, number>;
  private contentTypePerformance: Map<string, number>;

  constructor() {
    this.optimalTimingData = new Map();
    this.hashtagPerformanceData = new Map();
    this.contentTypePerformance = new Map();
    
    this.initializeDefaultData();
  }

  /**
   * Initialize with default performance data
   */
  private initializeDefaultData(): void {
    // Optimal posting times by platform (hours of day)
    this.optimalTimingData.set('tiktok', [18, 19, 20, 21, 22]); // Evening hours
    this.optimalTimingData.set('instagram', [11, 12, 17, 18, 19]); // Lunch and evening
    this.optimalTimingData.set('youtube', [14, 15, 16, 20, 21]); // Afternoon and evening

    // Popular hashtag performance scores (simplified)
    const popularHashtags = [
      '#viral', '#trending', '#fyp', '#foryou', '#love', '#instagood', 
      '#photooftheday', '#fashion', '#beautiful', '#happy', '#cute',
      '#tbt', '#followme', '#picoftheday', '#follow', '#me', '#selfie',
      '#summer', '#art', '#instadaily', '#friends', '#repost', '#nature'
    ];
    
    popularHashtags.forEach(tag => {
      this.hashtagPerformanceData.set(tag, Math.random() * 0.5 + 0.5); // 0.5-1.0 score
    });

    // Content type performance by platform
    this.contentTypePerformance.set('tiktok-video', 0.85);
    this.contentTypePerformance.set('tiktok-short', 0.90);
    this.contentTypePerformance.set('instagram-reel', 0.80);
    this.contentTypePerformance.set('instagram-image', 0.65);
    this.contentTypePerformance.set('instagram-carousel', 0.75);
    this.contentTypePerformance.set('youtube-video', 0.70);
    this.contentTypePerformance.set('youtube-short', 0.85);
  }

  /**
   * Generate comprehensive optimization strategies
   */
  async generateStrategies(
    request: PredictionRequest,
    currentPrediction: EngagementPrediction
  ): Promise<StrategyRecommendation[]> {
    const strategies: StrategyRecommendation[] = [];

    // Timing optimization
    const timingStrategies = this.generateTimingStrategies(request, currentPrediction);
    strategies.push(...timingStrategies);

    // Hashtag optimization
    const hashtagStrategies = this.generateHashtagStrategies(request, currentPrediction);
    strategies.push(...hashtagStrategies);

    // Content optimization
    const contentStrategies = this.generateContentStrategies(request, currentPrediction);
    strategies.push(...contentStrategies);

    // Audience targeting
    const audienceStrategies = this.generateAudienceStrategies(request, currentPrediction);
    strategies.push(...audienceStrategies);

    // Sort by expected impact and priority
    return strategies.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.expectedImpact.percentageIncrease - a.expectedImpact.percentageIncrease;
    });
  }

  /**
   * Generate timing-based optimization strategies
   */
  private generateTimingStrategies(
    request: PredictionRequest,
    currentPrediction: EngagementPrediction
  ): StrategyRecommendation[] {
    const strategies: StrategyRecommendation[] = [];
    const optimalHours = this.optimalTimingData.get(request.platform) || [];
    
    if (request.contentMetadata.scheduledPublishTime) {
      const scheduledHour = request.contentMetadata.scheduledPublishTime.getHours();
      
      if (!optimalHours.includes(scheduledHour)) {
        const bestHour = optimalHours[0];
        const expectedIncrease = this.calculateTimingImpact(scheduledHour, bestHour, request.platform);
        
        strategies.push({
          type: 'timing',
          title: 'Optimize Posting Time',
          description: `Consider posting at ${bestHour}:00 instead of ${scheduledHour}:00 for better engagement on ${request.platform}.`,
          expectedImpact: {
            metric: 'engagement_rate',
            percentageIncrease: expectedIncrease,
            confidence: 0.75,
          },
          actionable: true,
          priority: expectedIncrease > 15 ? 'high' : 'medium',
        });
      }
    }

    // Weekend vs weekday strategy
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    if (!isWeekend && request.platform === 'tiktok') {
      strategies.push({
        type: 'timing',
        title: 'Weekend Posting Strategy',
        description: 'TikTok content typically performs 20-30% better on weekends due to increased user activity.',
        expectedImpact: {
          metric: 'engagement_rate',
          percentageIncrease: 25,
          confidence: 0.65,
        },
        actionable: true,
        priority: 'medium',
      });
    }

    return strategies;
  }

  /**
   * Generate hashtag optimization strategies
   */
  private generateHashtagStrategies(
    request: PredictionRequest,
    currentPrediction: EngagementPrediction
  ): StrategyRecommendation[] {
    const strategies: StrategyRecommendation[] = [];
    const currentHashtags = request.contentMetadata.hashtags;
    
    // Analyze current hashtag performance
    const currentHashtagScore = this.calculateHashtagScore(currentHashtags);
    
    // Suggest high-performing hashtags not currently used
    const suggestedHashtags = this.findOptimalHashtags(currentHashtags, request.platform);
    
    if (suggestedHashtags.length > 0) {
      const potentialScore = this.calculateHashtagScore([...currentHashtags, ...suggestedHashtags]);
      const improvement = ((potentialScore - currentHashtagScore) / currentHashtagScore) * 100;
      
      strategies.push({
        type: 'hashtags',
        title: 'Optimize Hashtag Mix',
        description: `Add trending hashtags: ${suggestedHashtags.slice(0, 3).join(', ')} to increase discoverability.`,
        expectedImpact: {
          metric: 'reach',
          percentageIncrease: Math.min(improvement, 40),
          confidence: 0.70,
        },
        actionable: true,
        priority: improvement > 20 ? 'high' : 'medium',
      });
    }

    // Hashtag count optimization
    const optimalCount = this.getOptimalHashtagCount(request.platform);
    if (currentHashtags.length !== optimalCount) {
      const action = currentHashtags.length < optimalCount ? 'add more' : 'reduce';
      strategies.push({
        type: 'hashtags',
        title: 'Optimize Hashtag Count',
        description: `${request.platform} performs best with ${optimalCount} hashtags. Consider ${action} hashtags.`,
        expectedImpact: {
          metric: 'engagement_rate',
          percentageIncrease: 10,
          confidence: 0.60,
        },
        actionable: true,
        priority: 'low',
      });
    }

    return strategies;
  }

  /**
   * Generate content optimization strategies
   */
  private generateContentStrategies(
    request: PredictionRequest,
    currentPrediction: EngagementPrediction
  ): StrategyRecommendation[] {
    const strategies: StrategyRecommendation[] = [];
    const contentKey = `${request.platform}-${request.contentMetadata.contentType}`;
    const currentPerformance = this.contentTypePerformance.get(contentKey) || 0.5;
    
    // Suggest better content types
    const betterContentTypes = this.findBetterContentTypes(request.platform, currentPerformance);
    
    if (betterContentTypes.length > 0) {
      const bestType = betterContentTypes[0];
      const improvement = ((bestType.score - currentPerformance) / currentPerformance) * 100;
      
      strategies.push({
        type: 'content',
        title: 'Optimize Content Format',
        description: `${bestType.type} typically performs ${improvement.toFixed(0)}% better than ${request.contentMetadata.contentType} on ${request.platform}.`,
        expectedImpact: {
          metric: 'engagement_rate',
          percentageIncrease: improvement,
          confidence: 0.65,
        },
        actionable: true,
        priority: improvement > 15 ? 'high' : 'medium',
      });
    }

    // Caption length optimization
    const captionLength = request.contentMetadata.caption?.length || 0;
    const optimalLength = this.getOptimalCaptionLength(request.platform);
    
    if (Math.abs(captionLength - optimalLength) > 50) {
      const action = captionLength < optimalLength ? 'expand' : 'shorten';
      strategies.push({
        type: 'content',
        title: 'Optimize Caption Length',
        description: `Consider ${action}ing your caption. ${request.platform} captions perform best around ${optimalLength} characters.`,
        expectedImpact: {
          metric: 'engagement_rate',
          percentageIncrease: 8,
          confidence: 0.55,
        },
        actionable: true,
        priority: 'low',
      });
    }

    // Duration optimization for videos
    if (request.contentMetadata.duration && request.contentMetadata.contentType.includes('video')) {
      const optimalDuration = this.getOptimalDuration(request.platform);
      const currentDuration = request.contentMetadata.duration;
      
      if (Math.abs(currentDuration - optimalDuration) > 10) {
        const action = currentDuration < optimalDuration ? 'extend' : 'shorten';
        strategies.push({
          type: 'content',
          title: 'Optimize Video Duration',
          description: `Consider ${action}ing your video. ${request.platform} videos perform best around ${optimalDuration} seconds.`,
          expectedImpact: {
            metric: 'watch_time',
            percentageIncrease: 12,
            confidence: 0.60,
          },
          actionable: true,
          priority: 'medium',
        });
      }
    }

    return strategies;
  }

  /**
   * Generate audience targeting strategies
   */
  private generateAudienceStrategies(
    request: PredictionRequest,
    currentPrediction: EngagementPrediction
  ): StrategyRecommendation[] {
    const strategies: StrategyRecommendation[] = [];

    // Engagement rate threshold strategies
    if (currentPrediction.predictedMetrics.engagementRate < 0.03) {
      strategies.push({
        type: 'audience',
        title: 'Improve Audience Targeting',
        description: 'Low predicted engagement suggests content may not resonate with current audience. Consider A/B testing different approaches.',
        expectedImpact: {
          metric: 'engagement_rate',
          percentageIncrease: 25,
          confidence: 0.50,
        },
        actionable: true,
        priority: 'high',
      });
    }

    // Viral probability enhancement
    if (currentPrediction.viralProbability.score < 0.3) {
      strategies.push({
        type: 'audience',
        title: 'Increase Viral Potential',
        description: 'Add trending elements, use current memes, or create content around popular topics to increase viral probability.',
        expectedImpact: {
          metric: 'viral_probability',
          percentageIncrease: 40,
          confidence: 0.45,
        },
        actionable: true,
        priority: 'medium',
      });
    }

    return strategies;
  }

  /**
   * Calculate timing impact based on hour difference
   */
  private calculateTimingImpact(currentHour: number, optimalHour: number, platform: string): number {
    const hourDifference = Math.abs(currentHour - optimalHour);
    const baseImpact = platform === 'tiktok' ? 20 : 15; // TikTok is more time-sensitive
    return Math.max(5, baseImpact - (hourDifference * 2));
  }

  /**
   * Calculate hashtag performance score
   */
  private calculateHashtagScore(hashtags: string[]): number {
    let totalScore = 0;
    let scoredTags = 0;

    for (const tag of hashtags) {
      const score = this.hashtagPerformanceData.get(tag.toLowerCase());
      if (score) {
        totalScore += score;
        scoredTags++;
      }
    }

    return scoredTags > 0 ? totalScore / scoredTags : 0.5;
  }

  /**
   * Find optimal hashtags not currently used
   */
  private findOptimalHashtags(currentHashtags: string[], platform: string): string[] {
    const currentSet = new Set(currentHashtags.map(tag => tag.toLowerCase()));
    const suggestions: Array<{ tag: string, score: number }> = [];

    for (const [tag, score] of this.hashtagPerformanceData.entries()) {
      if (!currentSet.has(tag) && score > 0.7) {
        suggestions.push({ tag, score });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.tag);
  }

  /**
   * Get optimal hashtag count by platform
   */
  private getOptimalHashtagCount(platform: string): number {
    const counts = {
      'tiktok': 3,
      'instagram': 8,
      'youtube': 5,
    };
    return counts[platform as keyof typeof counts] || 5;
  }

  /**
   * Find better performing content types
   */
  private findBetterContentTypes(platform: string, currentScore: number): Array<{ type: string, score: number }> {
    const betterTypes: Array<{ type: string, score: number }> = [];

    for (const [key, score] of this.contentTypePerformance.entries()) {
      if (key.startsWith(platform) && score > currentScore) {
        const type = key.split('-')[1];
        betterTypes.push({ type, score });
      }
    }

    return betterTypes.sort((a, b) => b.score - a.score);
  }

  /**
   * Get optimal caption length by platform
   */
  private getOptimalCaptionLength(platform: string): number {
    const lengths = {
      'tiktok': 100,
      'instagram': 150,
      'youtube': 200,
    };
    return lengths[platform as keyof typeof lengths] || 150;
  }

  /**
   * Get optimal video duration by platform
   */
  private getOptimalDuration(platform: string): number {
    const durations = {
      'tiktok': 15,
      'instagram': 30,
      'youtube': 60,
    };
    return durations[platform as keyof typeof durations] || 30;
  }

  /**
   * Update performance data based on actual results
   */
  updatePerformanceData(
    hashtag: string,
    performance: number,
    contentType: string,
    platform: string,
    actualPerformance: number
  ): void {
    // Update hashtag performance
    if (hashtag) {
      const currentScore = this.hashtagPerformanceData.get(hashtag) || 0.5;
      const newScore = (currentScore + performance) / 2;
      this.hashtagPerformanceData.set(hashtag, newScore);
    }

    // Update content type performance
    const contentKey = `${platform}-${contentType}`;
    const currentContentScore = this.contentTypePerformance.get(contentKey) || 0.5;
    const newContentScore = (currentContentScore + actualPerformance) / 2;
    this.contentTypePerformance.set(contentKey, newContentScore);
  }
} 