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

  // Convert string platform to scanner platform enum
  private convertToScannerPlatform(platform: Platform): ScannerPlatform {
    switch (platform) {
      case 'TikTok':
        return ScannerPlatform.TIKTOK;
      case 'Instagram':
        return ScannerPlatform.INSTAGRAM;
      case 'Facebook':
        return ScannerPlatform.FACEBOOK;
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

    // Quality checks
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