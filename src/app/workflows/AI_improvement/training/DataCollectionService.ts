import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform, PostMetrics } from '../../data_analysis/types/analysis_types';
import { Platform as ScannerPlatform } from '../../deliverables/types/deliverables_types';
import { EnhancedScannerService } from '../../data_collection/functions/EnhancedScannerService';
import { CacheSystem, createDevCacheSystem } from '../../data_collection/functions/cache/CacheSystem';

export interface DataCollectionConfig {
  platforms: Platform[];
  lookbackDays: number;
  minPostsPerPlatform: number;
  minEngagementThreshold: number;
  includeCompetitorData: boolean;
  competitorIds?: string[];
}

export interface DataQualityReport {
  platform: Platform;
  totalPosts: number;
  validPosts: number;
  invalidPosts: number;
  averageEngagement: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  issues: string[];
  recommendations: string[];
}

export interface CollectionProgress {
  platform: Platform;
  status: 'pending' | 'collecting' | 'completed' | 'failed';
  progress: number; // 0-100
  postsCollected: number;
  estimatedTotal: number;
  startTime?: Date;
  completionTime?: Date;
  error?: string;
}

export class TrainingDataCollectionService {
  private supabase: SupabaseClient;
  private scannerService: EnhancedScannerService;
  private config: DataCollectionConfig;
  private collectionProgress: Map<Platform, CollectionProgress> = new Map();

  // Convert analysis platform to scanner platform string
  private convertToScannerPlatform(platform: Platform): ScannerPlatform {
    switch (platform) {
      case Platform.TIKTOK:
        return 'tiktok';
      case Platform.INSTAGRAM:
        return 'instagram';
      case Platform.FACEBOOK:
        return 'facebook';
      case Platform.YOUTUBE:
        return 'youtube';
      case 'Twitter':
        return 'twitter';
      case 'LinkedIn':
        return 'linkedin';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  constructor(
    supabase: SupabaseClient,
    config: DataCollectionConfig
  ) {
    this.supabase = supabase;
    this.config = config;
    
    // Initialize scanner service with cache system
    const cacheSystem = createDevCacheSystem('ai_improvement');
    this.scannerService = new EnhancedScannerService(cacheSystem);
    
    this.initializeProgress();
  }

  async collectTrainingData(userId: string): Promise<{
    data: PostMetrics[];
    qualityReports: DataQualityReport[];
    summary: {
      totalPosts: number;
      platformBreakdown: Record<Platform, number>;
      qualityScore: number;
      readyForTraining: boolean;
    };
  }> {
    console.log(`🚀 Starting data collection for user: ${userId}`);
    
    const allData: PostMetrics[] = [];
    const qualityReports: DataQualityReport[] = [];

    // Initialize platform clients (this would need actual tokens)
    await this.initializePlatformClients(userId);

    for (const platform of this.config.platforms) {
      this.updateProgress(platform, 'collecting', 0);
      
      try {
        console.log(`📊 Collecting data from ${platform}...`);
        const platformData = await this.collectPlatformData(userId, platform);
        
        // Store data in database
        await this.storeCollectedData(userId, platform, platformData);
        
        // Assess data quality
        const qualityReport = await this.assessDataQuality(platform, platformData);
        qualityReports.push(qualityReport);
        
        allData.push(...platformData);
        
        this.updateProgress(platform, 'completed', 100, platformData.length);
        console.log(`✅ Collected ${platformData.length} posts from ${platform}`);
        
      } catch (error) {
        console.error(`❌ Failed to collect data from ${platform}:`, error);
        this.updateProgress(platform, 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const summary = this.generateSummary(allData, qualityReports);
    
    console.log(`🎉 Data collection completed. Total posts: ${summary.totalPosts}`);
    return { data: allData, qualityReports, summary };
  }

  private async initializePlatformClients(userId: string): Promise<void> {
    // This would initialize platform clients with actual tokens
    // For now, we'll use mock initialization
    const platforms = this.config.platforms.map(platform => ({
      platform: this.convertToScannerPlatform(platform),
      accessToken: `mock_token_${platform}`,
      userId
    }));

    await this.scannerService.initializePlatforms(platforms);
  }

  private async collectPlatformData(userId: string, platform: Platform): Promise<PostMetrics[]> {
    try {
      // First, try to get existing data from database
      const existingData = await this.getExistingData(userId, platform);
      
      if (existingData.length >= this.config.minPostsPerPlatform) {
        console.log(`📋 Using existing data for ${platform}: ${existingData.length} posts`);
        return existingData;
      }

      // Collect new data using scanner service
      console.log(`🔍 Fetching new data from ${platform}...`);
      const scanResults = await this.scannerService.getUserPosts(
        this.convertToScannerPlatform(platform), 
        userId, 
        this.config.lookbackDays
      );

      // Transform scanner results to PostMetrics format
      const transformedData = scanResults.map(result => this.transformScanResultToPostMetrics(result, platform));
      return transformedData;
      
    } catch (error) {
      console.error(`Error collecting data from ${platform}:`, error);
      throw error;
    }
  }

  private async getExistingData(userId: string, platform: Platform): Promise<PostMetrics[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .gte('posted_at', new Date(Date.now() - this.config.lookbackDays * 24 * 60 * 60 * 1000).toISOString())
        .order('posted_at', { ascending: false });

      if (error) {
        console.error('Error fetching existing data:', error);
        return [];
      }

      return (data || []).map(post => this.transformDbPostToMetrics(post));
    } catch (error) {
      console.error('Error in getExistingData:', error);
      return [];
    }
  }

  private transformDbPostToMetrics(dbPost: any): PostMetrics {
    return {
      id: dbPost.platform_post_id,
      platform: dbPost.platform as Platform,
      url: dbPost.media_url || '',
      caption: dbPost.caption || '',
      hashtags: dbPost.hashtags || [],
      publishedAt: dbPost.posted_at,
      metrics: {
        likes: dbPost.likes || 0,
        comments: dbPost.comments || 0,
        shares: dbPost.shares || 0,
        views: dbPost.views || 0,
        saves: dbPost.saves || 0,
        engagementRate: dbPost.engagement_rate || 0
      },
      metadata: dbPost.raw_data || {}
    };
  }

  private transformScanResultToPostMetrics(scanResult: any, platform: Platform): PostMetrics {
    return {
      id: scanResult.id,
      platform,
      url: scanResult.url || '',
      caption: scanResult.caption || '',
      hashtags: scanResult.hashtags || [],
      publishedAt: scanResult.timestamp?.toISOString() || new Date().toISOString(),
      metrics: {
        likes: scanResult.likes || 0,
        comments: scanResult.comments || 0,
        shares: scanResult.shares || 0,
        views: scanResult.views || 0,
        saves: scanResult.saves || 0,
        engagementRate: scanResult.engagementRate || 0
      },
      metadata: scanResult.metadata || {}
    };
  }

  private async storeCollectedData(userId: string, platform: Platform, posts: PostMetrics[]): Promise<void> {
    if (posts.length === 0) return;

    console.log(`💾 Storing ${posts.length} posts for ${platform}...`);

    const dbPosts = posts.map(post => ({
      user_id: userId,
      platform: platform,
      post_id: post.id,
      platform_post_id: post.id,
      caption: post.caption,
      hashtags: post.hashtags,
      media_type: post.metadata?.mediaType || 'unknown',
      media_url: post.url,
      thumbnail_url: post.metadata?.thumbnailUrl,
      posted_at: post.publishedAt,
      likes: post.metrics.likes,
      comments: post.metrics.comments,
      shares: post.metrics.shares,
      views: post.metrics.views,
      saves: post.metrics.saves || 0,
      engagement_rate: post.metrics.engagementRate,
      engagement_score: this.calculateEngagementScore(post.metrics),
      raw_data: post.metadata
    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < dbPosts.length; i += batchSize) {
      const batch = dbPosts.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('user_posts')
        .upsert(batch, { 
          onConflict: 'platform,platform_post_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error storing batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }

    console.log(`✅ Successfully stored ${posts.length} posts for ${platform}`);
  }

  private calculateEngagementScore(metrics: PostMetrics['metrics']): number {
    // Simple engagement score calculation
    const { likes, comments, shares, views } = metrics;
    const totalEngagement = likes + (comments * 2) + (shares * 3);
    return views > 0 ? (totalEngagement / views) * 100 : totalEngagement;
  }

  private async assessDataQuality(platform: Platform, data: PostMetrics[]): Promise<DataQualityReport> {
    const validPosts = data.filter(post => this.isValidPost(post));
    const invalidPosts = data.length - validPosts.length;
    
    const engagementValues = validPosts
      .map(post => post.metrics.engagementRate)
      .filter(rate => rate > 0);
    
    const averageEngagement = engagementValues.length > 0 
      ? engagementValues.reduce((sum, rate) => sum + rate, 0) / engagementValues.length 
      : 0;

    const dates = data
      .map(post => new Date(post.publishedAt))
      .sort((a, b) => a.getTime() - b.getTime());

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Enhanced quality checks
    await this.performDetailedQualityAnalysis(platform, validPosts, issues, recommendations);

    // Basic checks
    if (validPosts.length < this.config.minPostsPerPlatform) {
      issues.push(`Insufficient posts: ${validPosts.length} < ${this.config.minPostsPerPlatform} required`);
      recommendations.push('Increase lookback period or lower minimum post threshold');
    }

    if (averageEngagement < this.config.minEngagementThreshold) {
      issues.push(`Low average engagement: ${averageEngagement.toFixed(2)}% < ${this.config.minEngagementThreshold}% required`);
      recommendations.push('Consider including more engaging content or adjusting engagement threshold');
    }

    if (invalidPosts > data.length * 0.2) {
      issues.push(`High invalid post ratio: ${((invalidPosts / data.length) * 100).toFixed(1)}%`);
      recommendations.push('Review data collection filters and validation criteria');
    }

    // Store quality assessment in database
    await this.storeQualityAssessment(platform, {
      totalPosts: data.length,
      validPosts: validPosts.length,
      invalidPosts,
      averageEngagement,
      issues,
      recommendations
    });

    return {
      platform,
      totalPosts: data.length,
      validPosts: validPosts.length,
      invalidPosts,
      averageEngagement,
      dateRange: {
        earliest: dates[0] || new Date(),
        latest: dates[dates.length - 1] || new Date()
      },
      issues,
      recommendations
    };
  }

  /**
   * Perform detailed quality analysis
   */
  private async performDetailedQualityAnalysis(
    platform: Platform,
    posts: PostMetrics[],
    issues: string[],
    recommendations: string[]
  ): Promise<void> {
    // Data distribution analysis
    this.analyzeDataDistribution(posts, issues, recommendations);
    
    // Content quality analysis
    this.analyzeContentQuality(posts, issues, recommendations);
    
    // Temporal consistency analysis
    this.analyzeTemporalConsistency(posts, issues, recommendations);
    
    // Platform-specific analysis
    this.analyzePlatformSpecificMetrics(platform, posts, issues, recommendations);
    
    // Outlier detection
    this.detectOutliers(posts, issues, recommendations);
  }

  /**
   * Analyze data distribution for training suitability
   */
  private analyzeDataDistribution(
    posts: PostMetrics[],
    issues: string[],
    recommendations: string[]
  ): void {
    const engagementRates = posts.map(p => p.metrics.engagementRate).filter(r => r > 0);
    
    if (engagementRates.length === 0) {
      issues.push('No posts with positive engagement rate');
      recommendations.push('Review engagement calculation or data collection process');
      return;
    }

    // Calculate distribution metrics
    const sorted = engagementRates.sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    // Check for sufficient variance
    if (iqr < 0.01) { // Less than 1% variance
      issues.push(`Low engagement variance (IQR: ${(iqr * 100).toFixed(2)}%)`);
      recommendations.push('Include more diverse content to improve model training');
    }

    // Check for skewness
    const mean = engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length;
    const skewness = mean > median * 1.5 ? 'high-positive' : mean < median * 0.5 ? 'high-negative' : 'normal';
    
    if (skewness !== 'normal') {
      issues.push(`Highly skewed engagement distribution (${skewness})`);
      recommendations.push('Consider data transformation or balanced sampling');
    }
  }

  /**
   * Analyze content quality
   */
  private analyzeContentQuality(
    posts: PostMetrics[],
    issues: string[],
    recommendations: string[]
  ): void {
    const emptyCaption = posts.filter(p => !p.caption || p.caption.trim().length === 0).length;
    const noHashtags = posts.filter(p => !p.hashtags || p.hashtags.length === 0).length;
    const zeroMetrics = posts.filter(p => 
      p.metrics.likes === 0 && p.metrics.comments === 0 && p.metrics.views === 0
    ).length;

    const emptyCaptionRatio = emptyCaption / posts.length;
    const noHashtagsRatio = noHashtags / posts.length;
    const zeroMetricsRatio = zeroMetrics / posts.length;

    if (emptyCaptionRatio > 0.3) {
      issues.push(`High ratio of posts with empty captions: ${(emptyCaptionRatio * 100).toFixed(1)}%`);
      recommendations.push('Improve caption data collection or filter out posts without captions');
    }

    if (noHashtagsRatio > 0.5) {
      issues.push(`High ratio of posts without hashtags: ${(noHashtagsRatio * 100).toFixed(1)}%`);
      recommendations.push('Consider platform-specific hashtag collection strategies');
    }

    if (zeroMetricsRatio > 0.1) {
      issues.push(`High ratio of posts with zero metrics: ${(zeroMetricsRatio * 100).toFixed(1)}%`);
      recommendations.push('Review metric collection timing or filter out unengaged posts');
    }
  }

  /**
   * Analyze temporal consistency
   */
  private analyzeTemporalConsistency(
    posts: PostMetrics[],
    issues: string[],
    recommendations: string[]
  ): void {
    const dates = posts.map(p => new Date(p.publishedAt)).sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length < 2) return;

    // Check for temporal gaps
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const gapDays = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gapDays);
    }

    const maxGap = Math.max(...gaps);
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

    if (maxGap > 7) { // More than 7 days gap
      issues.push(`Large temporal gap detected: ${maxGap.toFixed(1)} days`);
      recommendations.push('Ensure consistent posting frequency for better model training');
    }

    if (avgGap > 2) { // Average gap more than 2 days
      issues.push(`Irregular posting frequency: ${avgGap.toFixed(1)} days average gap`);
      recommendations.push('Consider including more recent posts or adjusting collection period');
    }

    // Check data freshness
    const latestDate = dates[dates.length - 1];
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest > 7) {
      issues.push(`Data not fresh: latest post is ${daysSinceLatest.toFixed(1)} days old`);
      recommendations.push('Include more recent posts for better model relevance');
    }
  }

  /**
   * Analyze platform-specific metrics
   */
  private analyzePlatformSpecificMetrics(
    platform: Platform,
    posts: PostMetrics[],
    issues: string[],
    recommendations: string[]
  ): void {
    const platformExpectations = {
      [Platform.TIKTOK]: {
        minViews: 100,
        viewsToLikesRatio: 0.05, // 5% like rate is reasonable
        commentsImportant: true
      },
      [Platform.INSTAGRAM]: {
        minViews: 50,
        viewsToLikesRatio: 0.03, // 3% like rate
        savesImportant: true
      },
      [Platform.YOUTUBE]: {
        minViews: 10,
        viewsToLikesRatio: 0.02, // 2% like rate
        commentsImportant: true
      }
    };

    const expectations = platformExpectations[platform as keyof typeof platformExpectations];
    if (!expectations) return;

    // Check view counts
    const lowViewPosts = posts.filter(p => p.metrics.views < expectations.minViews).length;
    if (lowViewPosts > posts.length * 0.5) {
      issues.push(`High ratio of low-view posts for ${platform}: ${lowViewPosts}/${posts.length}`);
      recommendations.push(`Consider filtering posts with less than ${expectations.minViews} views`);
    }

    // Check engagement ratios
    const validRatioPosts = posts.filter(p => {
      const ratio = p.metrics.views > 0 ? p.metrics.likes / p.metrics.views : 0;
      return ratio >= expectations.viewsToLikesRatio * 0.5; // Allow 50% below expected
    }).length;

    if (validRatioPosts < posts.length * 0.3) {
      issues.push(`Low engagement ratio posts for ${platform}: ${validRatioPosts}/${posts.length}`);
      recommendations.push(`Review ${platform}-specific engagement patterns`);
    }
  }

  /**
   * Detect statistical outliers
   */
  private detectOutliers(
    posts: PostMetrics[],
    issues: string[],
    recommendations: string[]
  ): void {
    const metrics = ['likes', 'comments', 'shares', 'views'] as const;
    
    for (const metric of metrics) {
      const values = posts.map(p => p.metrics[metric]).filter(v => v > 0);
      if (values.length === 0) continue;

      const sorted = values.sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const outliers = values.filter(v => v < lowerBound || v > upperBound);
      const outlierRatio = outliers.length / values.length;

      if (outlierRatio > 0.1) { // More than 10% outliers
        issues.push(`High outlier ratio for ${metric}: ${(outlierRatio * 100).toFixed(1)}%`);
        recommendations.push(`Consider outlier treatment for ${metric} values`);
      }
    }
  }

  /**
   * Store quality assessment in database
   */
  private async storeQualityAssessment(
    platform: Platform,
    assessment: {
      totalPosts: number;
      validPosts: number;
      invalidPosts: number;
      averageEngagement: number;
      issues: string[];
      recommendations: string[];
    }
  ): Promise<void> {
    try {
      const qualityScore = this.calculateQualityScore(assessment);
      const readyForTraining = assessment.issues.length === 0 && qualityScore >= 0.7;

      const { error } = await this.supabase
        .from('training_data_quality')
        .insert({
          user_id: 'system', // Will be updated when we have user context
          platform: platform,
          total_posts: assessment.totalPosts,
          valid_posts: assessment.validPosts,
          invalid_posts: assessment.invalidPosts,
          average_engagement: assessment.averageEngagement,
          quality_score: qualityScore,
          issues: assessment.issues,
          recommendations: assessment.recommendations,
          ready_for_training: readyForTraining,
          assessed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing quality assessment:', error);
      }
    } catch (error) {
      console.error('Error in storeQualityAssessment:', error);
    }
  }

  /**
   * Calculate overall quality score (0-1)
   */
  private calculateQualityScore(assessment: {
    totalPosts: number;
    validPosts: number;
    invalidPosts: number;
    averageEngagement: number;
    issues: string[];
  }): number {
    let score = 1.0;

    // Penalize for invalid posts
    const invalidRatio = assessment.invalidPosts / assessment.totalPosts;
    score -= invalidRatio * 0.3;

    // Penalize for low engagement
    if (assessment.averageEngagement < this.config.minEngagementThreshold) {
      score -= 0.2;
    }

    // Penalize for insufficient data
    if (assessment.validPosts < this.config.minPostsPerPlatform) {
      score -= 0.3;
    }

    // Penalize for each issue
    score -= assessment.issues.length * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private isValidPost(post: PostMetrics): boolean {
    return !!(
      post.id &&
      post.caption &&
      post.publishedAt &&
      post.metrics.views >= 0 &&
      post.metrics.likes >= 0
    );
  }

  private generateSummary(data: PostMetrics[], reports: DataQualityReport[]) {
    const platformBreakdown: Record<Platform, number> = {} as Record<Platform, number>;
    
    for (const platform of this.config.platforms) {
      platformBreakdown[platform] = data.filter(post => post.platform === platform).length;
    }

    const totalValidPosts = reports.reduce((sum, report) => sum + report.validPosts, 0);
    const totalPosts = data.length;
    const qualityScore = totalPosts > 0 ? (totalValidPosts / totalPosts) : 0;
    
    const readyForTraining = reports.every(report => 
      report.validPosts >= this.config.minPostsPerPlatform &&
      report.averageEngagement >= this.config.minEngagementThreshold &&
      report.issues.length === 0
    );

    return {
      totalPosts,
      platformBreakdown,
      qualityScore,
      readyForTraining
    };
  }

  private initializeProgress(): void {
    for (const platform of this.config.platforms) {
      this.collectionProgress.set(platform, {
        platform,
        status: 'pending',
        progress: 0,
        postsCollected: 0,
        estimatedTotal: this.config.minPostsPerPlatform
      });
    }
  }

  private updateProgress(
    platform: Platform,
    status: CollectionProgress['status'],
    progress: number,
    postsCollected: number = 0,
    error?: string
  ): void {
    const current = this.collectionProgress.get(platform);
    if (current) {
      current.status = status;
      current.progress = progress;
      current.postsCollected = postsCollected;
      
      if (status === 'collecting' && !current.startTime) {
        current.startTime = new Date();
      }
      
      if (status === 'completed' || status === 'failed') {
        current.completionTime = new Date();
      }
      
      if (error) {
        current.error = error;
      }
      
      this.collectionProgress.set(platform, current);
    }
  }

  getCollectionProgress(): CollectionProgress[] {
    return Array.from(this.collectionProgress.values());
  }

  async validateDataAccess(userId: string): Promise<{
    hasAccess: boolean;
    platforms: Record<Platform, boolean>;
    issues: string[];
    recommendations: string[];
  }> {
    const platforms: Record<Platform, boolean> = {} as Record<Platform, boolean>;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check database connectivity
    try {
      const { error } = await this.supabase
        .from('user_posts')
        .select('id')
        .limit(1);

      if (error) {
        issues.push('Database connection failed');
        recommendations.push('Check Supabase configuration and credentials');
      }
    } catch (error) {
      issues.push('Database access error');
      recommendations.push('Verify database setup and permissions');
    }

    // Check platform access (mock for now)
    for (const platform of this.config.platforms) {
      platforms[platform] = true; // Mock success
    }

    const hasAccess = issues.length === 0;

    return {
      hasAccess,
      platforms,
      issues,
      recommendations
    };
  }
} 