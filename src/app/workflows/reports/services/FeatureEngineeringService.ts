import { PostPerformanceData, EngagementFeatures } from '../types/EngagementTypes';

/**
 * Service for transforming raw post data into ML-ready features
 */
export class FeatureEngineeringService {
  private holidays: Set<string>;
  private textEmbeddingCache: Map<string, number[]>;

  constructor() {
    this.holidays = new Set([
      '01-01', '07-04', '12-25', '11-28', // Add more holidays as needed
    ]);
    this.textEmbeddingCache = new Map();
  }

  /**
   * Transform post performance data into engineered features
   */
  async engineerFeatures(
    postData: PostPerformanceData,
    historicalData: PostPerformanceData[]
  ): Promise<EngagementFeatures> {
    const publishDate = new Date(postData.publishedAt);
    
    // Temporal features
    const temporalFeatures = this.extractTemporalFeatures(publishDate);
    
    // Content features
    const contentFeatures = this.extractContentFeatures(postData.contentMetadata);
    
    // Engagement ratios
    const engagementFeatures = this.calculateEngagementRatios(postData.metrics);
    
    // Historical performance features
    const historicalFeatures = this.calculateHistoricalFeatures(historicalData);
    
    // Content embeddings
    const textEmbedding = await this.generateTextEmbedding(
      postData.contentMetadata.caption || ''
    );
    
    // External factors
    const externalFeatures = this.calculateExternalFactors(
      postData.externalFactors,
      publishDate
    );

    return {
      ...temporalFeatures,
      ...contentFeatures,
      ...engagementFeatures,
      ...historicalFeatures,
      textEmbedding,
      ...externalFeatures,
    };
  }

  /**
   * Extract temporal features from publish date
   */
  private extractTemporalFeatures(publishDate: Date) {
    const hour = publishDate.getHours();
    const dayOfWeek = publishDate.getDay();
    const monthDay = `${String(publishDate.getMonth() + 1).padStart(2, '0')}-${String(publishDate.getDate()).padStart(2, '0')}`;

    return {
      hourOfDay: hour,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: this.holidays.has(monthDay),
    };
  }

  /**
   * Extract content-based features
   */
  private extractContentFeatures(contentMetadata: PostPerformanceData['contentMetadata']) {
    const contentTypeMap = {
      'video': 0,
      'image': 1,
      'carousel': 2,
      'reel': 3,
      'short': 4,
    };

    return {
      captionLength: contentMetadata.caption?.length || 0,
      hashtagCount: contentMetadata.hashtags.length,
      contentDuration: contentMetadata.duration || 0,
      contentTypeEncoded: contentTypeMap[contentMetadata.contentType] || 0,
    };
  }

  /**
   * Calculate engagement ratio features
   */
  private calculateEngagementRatios(metrics: PostPerformanceData['metrics']) {
    const views = Math.max(metrics.views, 1); // Avoid division by zero

    return {
      likesPerView: metrics.likes / views,
      commentsPerView: metrics.comments / views,
      sharesPerView: metrics.shares / views,
    };
  }

  /**
   * Calculate historical performance features
   */
  private calculateHistoricalFeatures(historicalData: PostPerformanceData[]) {
    if (historicalData.length === 0) {
      return {
        avgEngagementLast7Days: 0,
        avgEngagementLast30Days: 0,
        followerCount: 0,
      };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last7Days = historicalData.filter(
      post => new Date(post.publishedAt) >= sevenDaysAgo
    );
    const last30Days = historicalData.filter(
      post => new Date(post.publishedAt) >= thirtyDaysAgo
    );

    const avgEngagement7 = last7Days.length > 0
      ? last7Days.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / last7Days.length
      : 0;

    const avgEngagement30 = last30Days.length > 0
      ? last30Days.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / last30Days.length
      : 0;

    // Estimate follower count from recent performance (simplified)
    const recentViews = last30Days.slice(0, 5).map(post => post.metrics.views);
    const avgViews = recentViews.length > 0
      ? recentViews.reduce((sum, views) => sum + views, 0) / recentViews.length
      : 0;
    const estimatedFollowers = Math.round(avgViews * 0.1); // Rough estimate

    return {
      avgEngagementLast7Days: avgEngagement7,
      avgEngagementLast30Days: avgEngagement30,
      followerCount: estimatedFollowers,
    };
  }

  /**
   * Generate text embedding for caption (simplified implementation)
   */
  private async generateTextEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.textEmbeddingCache.has(text)) {
      return this.textEmbeddingCache.get(text)!;
    }

    // Simplified text embedding using basic NLP features
    // In production, use BERT/T5 or similar transformer models
    const words = text.toLowerCase().split(/\s+/);
    const features = [
      words.length, // Word count
      text.length, // Character count
      (text.match(/[!?]/g) || []).length, // Exclamation/question marks
      (text.match(/@\w+/g) || []).length, // Mentions
      (text.match(/#\w+/g) || []).length, // Hashtags
      (text.match(/https?:\/\/\S+/g) || []).length, // URLs
      words.filter(word => ['amazing', 'incredible', 'wow', 'love', 'best'].includes(word)).length, // Positive words
    ];

    // Pad or truncate to fixed size (128 dimensions)
    const embedding = new Array(128).fill(0);
    for (let i = 0; i < Math.min(features.length, 128); i++) {
      embedding[i] = features[i];
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    this.textEmbeddingCache.set(text, embedding);
    return embedding;
  }

  /**
   * Calculate external factor features
   */
  private calculateExternalFactors(
    externalFactors?: PostPerformanceData['externalFactors'],
    publishDate?: Date
  ) {
    if (!externalFactors) {
      return {
        trendScore: 0,
        competitorScore: 0,
        seasonalityScore: 0,
      };
    }

    // Trend score based on trending topics
    const trendScore = externalFactors.trendingTopics.length * 0.1;

    // Competitor activity score
    const competitorScore = Math.min(externalFactors.competitorActivity / 100, 1);

    // Seasonality score based on month and day
    let seasonalityScore = 0;
    if (publishDate) {
      const month = publishDate.getMonth();
      const dayOfWeek = publishDate.getDay();
      
      // Higher scores for holiday seasons and weekends
      if ([10, 11].includes(month)) seasonalityScore += 0.3; // Holiday season
      if ([5, 6].includes(dayOfWeek)) seasonalityScore += 0.2; // Weekend
      if ([17, 18, 19, 20].includes(publishDate.getHours())) seasonalityScore += 0.1; // Prime time
    }

    return {
      trendScore: Math.min(trendScore, 1),
      competitorScore,
      seasonalityScore: Math.min(seasonalityScore, 1),
    };
  }

  /**
   * Batch process multiple posts for training data
   */
  async batchEngineerFeatures(
    posts: PostPerformanceData[]
  ): Promise<EngagementFeatures[]> {
    const features: EngagementFeatures[] = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const historicalData = posts.slice(0, i); // Use previous posts as historical context
      
      const engineeredFeatures = await this.engineerFeatures(post, historicalData);
      features.push(engineeredFeatures);
    }

    return features;
  }

  /**
   * Clear embedding cache to free memory
   */
  clearCache(): void {
    this.textEmbeddingCache.clear();
  }
} 