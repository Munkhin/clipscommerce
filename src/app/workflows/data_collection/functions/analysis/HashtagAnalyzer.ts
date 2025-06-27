// Specialized Hashtag Performance Analysis Module
import { PostMetrics } from '../types';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';
import { Cache } from '@/lib/utils/cache';

/**
 * HashtagPerformanceResult - Detailed performance metrics for a hashtag
 */
export interface HashtagPerformanceResult {
  hashtag: string;
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number;
  engagementRate: number;
  reachEstimate: number;
  impressionsEstimate: number;
  growthRate?: number; // Percentage change over time
  performanceByPlatform: Record<Platform, {
    posts: number;
    engagement: number;
    engagementRate: number;
  }>;
  trend: 'rising' | 'stable' | 'declining' | 'new';
  relatedHashtags: Array<{
    hashtag: string;
    coOccurrenceCount: number;
    correlationScore: number; // -1 to 1
  }>;
  performanceHistory?: Array<{
    period: string; // e.g., "2023-01", "2023-W01", "2023-01-01"
    posts: number;
    engagement: number;
  }>;
  lastUpdated: number;
}

/**
 * HashtagAnalysisOptions - Configuration for hashtag analysis
 */
export interface HashtagAnalysisOptions {
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  platforms?: Platform[];
  minPostCount?: number;
  includeHistory?: boolean;
  includeRelated?: boolean;
  maxHashtags?: number;
  sortBy?: 'engagement' | 'posts' | 'growth' | 'recent';
}

/**
 * HashtagAnalyzer - Specialized module for tracking and analyzing hashtag performance
 * 
 * Features:
 * - Track individual hashtag engagement metrics
 * - Analyze hashtag reach and impressions
 * - Identify trending and declining hashtags
 * - Find related hashtags and co-occurrence patterns
 * - Generate performance reports with historical data
 */
export class HashtagAnalyzer {
  private posts: PostMetrics[] = [];
  private hashtagCache: Cache<string, HashtagPerformanceResult>;
  private hashtagIndex: Map<string, Set<string>> = new Map(); // hashtag -> post IDs
  private coOccurrenceMatrix: Map<string, Map<string, number>> = new Map(); // hashtag -> related hashtags -> count
  private platformHashtagIndex: Map<string, Map<string, Set<string>>> = new Map(); // platform -> hashtag -> post IDs
  private timeBasedIndex: Map<string, Map<string, Set<string>>> = new Map(); // period -> hashtag -> post IDs
  
  // Performance metrics
  private performanceMetrics = {
    totalHashtagsTracked: 0,
    cacheHits: 0,
    cacheMisses: 0,
    analysisTimeMs: 0,
    lastFullAnalysisTimeMs: 0
  };

  /**
   * Create a new HashtagAnalyzer
   * @param posts Initial posts to analyze
   * @param options Configuration options
   */
  constructor(posts: PostMetrics[] = [], options: { maxCacheSize?: number, cacheTtlMs?: number } = {}) {
    // Initialize cache with reasonable defaults
    this.hashtagCache = new Cache<string, HashtagPerformanceResult>({
      maxSize: options.maxCacheSize || 500,
      ttl: options.cacheTtlMs || 30 * 60 * 1000, // 30 minutes
    });
    
    // Initialize platform index for each supported platform
    const platforms: Platform[] = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE];
    for (const platform of platforms) {
      this.platformHashtagIndex.set(platform, new Map());
    }
    
    // Process initial posts if provided
    if (posts.length > 0) {
      this.updatePosts(posts);
    }
  }

  /**
   * Update the posts dataset and rebuild indices
   * @param newPosts New posts to analyze
   * @param append Whether to append to existing posts or replace them
   */
  public updatePosts(newPosts: PostMetrics[], append: boolean = false): void {
    const startTime = Date.now();
    
    // Update posts collection
    if (append) {
      this.posts = [...this.posts, ...newPosts];
    } else {
      this.posts = [...newPosts];
      
      // Clear indices if replacing all posts
      this.hashtagIndex.clear();
      this.coOccurrenceMatrix.clear();
      const platformsList: Platform[] = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE];
      for (const platform of platformsList) {
        this.platformHashtagIndex.set(platform, new Map());
      }
      this.timeBasedIndex.clear();
    }
    
    // Process new posts and update indices
    for (const post of newPosts) {
      this.indexPost(post);
    }
    
    // Invalidate cache for affected hashtags
    const affectedHashtags = new Set<string>();
    for (const post of newPosts) {
      if (post.hashtags) {
        for (const hashtag of post.hashtags) {
          affectedHashtags.add(hashtag.toLowerCase());
        }
      }
    }
    
    for (const hashtag of affectedHashtags) {
      // Remove from cache if exists
      const cacheKey = `hashtag_${hashtag}`;
      if (this.hashtagCache.get(cacheKey)) {
        this.hashtagCache.set(cacheKey, undefined as any);
      }
    }
    
    this.performanceMetrics.analysisTimeMs = Date.now() - startTime;
    this.performanceMetrics.totalHashtagsTracked = this.hashtagIndex.size;
  }

  /**
   * Index a single post for hashtag analysis
   * @param post Post to index
   */
  private indexPost(post: PostMetrics): void {
    if (!post.hashtags || post.hashtags.length === 0) return;
    
    const postId = post.id;
    const platform = post.platform;
    const timestamp = new Date(post.timestamp);
    
    // Normalize hashtags (lowercase)
    const normalizedHashtags = post.hashtags.map((tag: string) => tag.toLowerCase());
    
    // Update hashtag index
    for (const hashtag of normalizedHashtags) {
      // Main hashtag index
      if (!this.hashtagIndex.has(hashtag)) {
        this.hashtagIndex.set(hashtag, new Set());
      }
      this.hashtagIndex.get(hashtag)!.add(postId);
      
      // Platform-specific index
      const platformIndex = this.platformHashtagIndex.get(platform);
      if (platformIndex) {
        if (!platformIndex.has(hashtag)) {
          platformIndex.set(hashtag, new Set());
        }
        const tagSet = platformIndex.get(hashtag);
        if (tagSet) {
          tagSet.add(postId);
        }
      }
      
      // Time-based index (by month, week, and day)
      const month = timestamp.toISOString().substring(0, 7); // YYYY-MM
      const week = this.getISOWeek(timestamp);
      const day = timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
      
      for (const period of [month, week, day]) {
        if (!this.timeBasedIndex.has(period)) {
          this.timeBasedIndex.set(period, new Map());
        }
        
        const periodIndex = this.timeBasedIndex.get(period);
        if (periodIndex) {
          if (!periodIndex.has(hashtag)) {
            periodIndex.set(hashtag, new Set());
          }
          const tagSet = periodIndex.get(hashtag);
          if (tagSet) {
            tagSet.add(postId);
          }
        }
      }
    }
    
    // Update co-occurrence matrix for related hashtags
    for (let i = 0; i < normalizedHashtags.length; i++) {
      const hashtag1 = normalizedHashtags[i];
      
      if (!this.coOccurrenceMatrix.has(hashtag1)) {
        this.coOccurrenceMatrix.set(hashtag1, new Map());
      }
      
      const relatedTags = this.coOccurrenceMatrix.get(hashtag1)!;
      
      for (let j = 0; j < normalizedHashtags.length; j++) {
        if (i === j) continue; // Skip self
        
        const hashtag2 = normalizedHashtags[j];
        relatedTags.set(hashtag2, (relatedTags.get(hashtag2) || 0) + 1);
      }
    }
  }

  /**
   * Get ISO week string (YYYY-Wnn) from date
   */
  private getISOWeek(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000 / 7) + 1;
    return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get performance metrics for a specific hashtag
   * @param hashtag Hashtag to analyze (case insensitive)
   * @param options Analysis options
   */
  public async getHashtagPerformance(hashtag: string, options: HashtagAnalysisOptions = {}): Promise<HashtagPerformanceResult | null> {
    const startTime = Date.now();
    const normalizedTag = hashtag.toLowerCase().replace(/^#/, '');
    const cacheKey = `hashtag_${normalizedTag}`;
    
    // Check cache first
    const cached = this.hashtagCache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.cacheHits++;
      return cached;
    }
    
    this.performanceMetrics.cacheMisses++;
    
    // Get posts containing this hashtag
    const postIds = this.hashtagIndex.get(normalizedTag);
    if (!postIds || postIds.size === 0) {
      return null; // Hashtag not found
    }
    
    // Apply time range filter if specified
    let filteredPostIds = [...postIds];
    if (options.timeRange) {
      filteredPostIds = filteredPostIds.filter(id => {
        const post = this.posts.find(p => p.id === id);
        if (!post) return false;
        
        const postDate = new Date(post.timestamp);
        if (options.timeRange!.start && postDate < options.timeRange!.start) return false;
        if (options.timeRange!.end && postDate > options.timeRange!.end) return false;
        
        return true;
      });
    }
    
    // Apply platform filter if specified
    if (options.platforms && options.platforms.length > 0) {
      filteredPostIds = filteredPostIds.filter(id => {
        const post = this.posts.find(p => p.id === id);
        return post && options.platforms!.includes(post.platform);
      });
    }
    
    // If no posts match filters, return null
    if (filteredPostIds.length === 0) {
      return null;
    }
    
    // Get the actual posts
    const hashtagPosts = filteredPostIds.map(id => 
      this.posts.find(p => p.id === id)
    ).filter(Boolean) as PostMetrics[];
    
    // Calculate basic metrics
    const totalPosts = hashtagPosts.length;
    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    
    // Platform-specific metrics
    const platformMetrics: Record<string, { 
      posts: number; 
      engagement: number;
      reach: number;
      impressions: number;
    }> = {};
    
    const platforms = ['tiktok', 'instagram', 'youtube'] as Platform[];
    for (const platform of platforms) {
      platformMetrics[platform] = { posts: 0, engagement: 0, reach: 0, impressions: 0 };
    }
    
    // Calculate engagement metrics
    for (const post of hashtagPosts) {
      const engagement = this.calculateEngagement(post);
      totalEngagement += engagement;
      
      // Platform-specific metrics
      platformMetrics[post.platform].posts++;
      platformMetrics[post.platform].engagement += engagement;
      
      // Reach and impressions estimates
      const reachEstimate = Math.floor(engagement * this.getReachMultiplier(post.platform));
      const impressionsEstimate = Math.floor(reachEstimate * this.getImpressionMultiplier(post.platform));
      
      totalReach += reachEstimate;
      totalImpressions += impressionsEstimate;
      platformMetrics[post.platform].reach += reachEstimate;
      platformMetrics[post.platform].impressions += impressionsEstimate;
    }
    
    // Calculate performance by platform
    const performanceByPlatform: Record<string, {
      posts: number;
      engagement: number;
      engagementRate: number;
    }> = {};
    
    const platformsList = ['tiktok', 'instagram', 'youtube'] as Platform[];
    for (const platform of platformsList) {
      const metrics = platformMetrics[platform];
      performanceByPlatform[platform] = {
        posts: metrics.posts,
        engagement: metrics.engagement,
        engagementRate: metrics.posts > 0 ? (metrics.engagement / metrics.posts) * 100 : 0
      };
    }
    
    // Calculate growth rate if historical data is available
    let growthRate: number | undefined;
    
    if (this.timeBasedIndex.size > 0) {
      const now = new Date();
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const currentMonthStr = now.toISOString().substring(0, 7);
      const lastMonthStr = lastMonth.toISOString().substring(0, 7);
      
      const currentMonthIndex = this.timeBasedIndex.get(currentMonthStr);
      const lastMonthIndex = this.timeBasedIndex.get(lastMonthStr);
      
      if (currentMonthIndex && lastMonthIndex) {
        const currentMonthCount = currentMonthIndex.get(normalizedTag)?.size || 0;
        const lastMonthCount = lastMonthIndex.get(normalizedTag)?.size || 0;
        
        if (lastMonthCount > 0) {
          growthRate = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
        }
      }
    }
    
    // Determine trend
    let trend: 'rising' | 'stable' | 'declining' | 'new' = 'stable';
    if (growthRate !== undefined) {
      if (growthRate > 15) trend = 'rising';
      else if (growthRate < -15) trend = 'declining';
    } else {
      // If no historical data, check if it's a new hashtag (all posts within last 2 weeks)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const isNew = hashtagPosts.every(post => new Date(post.timestamp) >= twoWeeksAgo);
      if (isNew) trend = 'new';
    }
    
    // Find related hashtags
    let relatedHashtags: Array<{
      hashtag: string;
      coOccurrenceCount: number;
      correlationScore: number;
    }> = [];
    
    if (options.includeRelated !== false) {
      const coOccurrences = this.coOccurrenceMatrix.get(normalizedTag);
      if (coOccurrences) {
        relatedHashtags = Array.from(coOccurrences.entries())
          .map(([relatedTag, count]) => {
            // Calculate correlation score (simplified)
            const tagTotalPosts = this.hashtagIndex.get(normalizedTag)?.size || 0;
            const relatedTagTotalPosts = this.hashtagIndex.get(relatedTag)?.size || 0;
            
            // Use Jaccard similarity coefficient
            const correlationScore = relatedTagTotalPosts > 0 ? 
              count / (tagTotalPosts + relatedTagTotalPosts - count) : 0;
            
            return {
              hashtag: relatedTag,
              coOccurrenceCount: count,
              correlationScore
            };
          })
          .sort((a, b) => b.correlationScore - a.correlationScore)
          .slice(0, 10);
      }
    }
    
    // Generate performance history if requested
    let performanceHistory: Array<{
      period: string;
      posts: number;
      engagement: number;
    }> | undefined;
    
    if (options.includeHistory) {
      performanceHistory = [];
      
      // Get last 6 months
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().substring(0, 7);
        
        const monthIndex = this.timeBasedIndex.get(monthStr);
        const monthPosts = monthIndex?.get(normalizedTag)?.size || 0;
        
        // Calculate engagement for this period
        let monthEngagement = 0;
        if (monthPosts > 0) {
          const postIds = monthIndex?.get(normalizedTag) || new Set();
          const periodPosts = [...postIds].map(id => 
            this.posts.find(p => p.id === id)
          ).filter(Boolean) as PostMetrics[];
          
          monthEngagement = periodPosts.reduce((sum, post) => 
            sum + this.calculateEngagement(post), 0);
        }
        
        performanceHistory.push({
          period: monthStr,
          posts: monthPosts,
          engagement: monthEngagement
        });
      }
      
      // Sort chronologically
      performanceHistory.reverse();
    }
    
    // Create result
    const result: HashtagPerformanceResult = {
      hashtag: normalizedTag,
      totalPosts,
      totalEngagement,
      avgEngagement: totalPosts > 0 ? totalEngagement / totalPosts : 0,
      engagementRate: totalPosts > 0 ? (totalEngagement / totalPosts) * 100 : 0,
      reachEstimate: totalReach,
      impressionsEstimate: totalImpressions,
      growthRate,
      performanceByPlatform,
      trend,
      relatedHashtags,
      performanceHistory,
      lastUpdated: Date.now()
    };
    
    // Cache result
    this.hashtagCache.set(cacheKey, result);
    
    this.performanceMetrics.analysisTimeMs += Date.now() - startTime;
    return result;
  }

  /**
   * Get top performing hashtags based on specified criteria
   * @param options Analysis options
   */
  public async getTopHashtags(options: HashtagAnalysisOptions = {}): Promise<HashtagPerformanceResult[]> {
    const startTime = Date.now();
    
    // Set defaults
    const maxHashtags = options.maxHashtags || 20;
    const minPostCount = options.minPostCount || 3;
    const sortBy = options.sortBy || 'engagement';
    
    // Get all hashtags that meet minimum post count
    const qualifyingHashtags = Array.from(this.hashtagIndex.entries())
      .filter(([_, postIds]) => postIds.size >= minPostCount)
      .map(([hashtag]) => hashtag);
    
    // Get performance data for each hashtag
    const hashtagPerformance: HashtagPerformanceResult[] = [];
    
    for (const hashtag of qualifyingHashtags) {
      const performance = await this.getHashtagPerformance(hashtag, options);
      if (performance) {
        hashtagPerformance.push(performance);
      }
    }
    
    // Sort based on criteria
    switch (sortBy) {
      case 'engagement':
        hashtagPerformance.sort((a, b) => b.avgEngagement - a.avgEngagement);
        break;
      case 'posts':
        hashtagPerformance.sort((a, b) => b.totalPosts - a.totalPosts);
        break;
      case 'growth':
        hashtagPerformance.sort((a, b) => 
          (b.growthRate || 0) - (a.growthRate || 0)
        );
        break;
      case 'recent':
        hashtagPerformance.sort((a, b) => b.lastUpdated - a.lastUpdated);
        break;
    }
    
    // Limit to requested number
    const result = hashtagPerformance.slice(0, maxHashtags);
    
    this.performanceMetrics.lastFullAnalysisTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Calculate engagement score for a post
   * @param post Post to calculate engagement for
   */
  private calculateEngagement(post: PostMetrics): number {
    // Platform-specific engagement calculation
    switch (post.platform) {
      case 'instagram':
        return (post.likes || 0) * 1.0 + 
               (post.comments || 0) * 1.5 + 
               (post.shares || 0) * 1.8;
      
      case 'tiktok':
        return (post.likes || 0) * 1.0 + 
               (post.comments || 0) * 1.5 + 
               (post.shares || 0) * 2.0 + 
               (post.views || 0) * 0.01;
      
      case 'youtube':
        return (post.likes || 0) * 1.0 + 
               (post.comments || 0) * 2.0 + 
               (post.shares || 0) * 3.0 + 
               (post.views || 0) * 0.01;
      
      default:
        // Generic calculation
        return (post.likes || 0) + 
               (post.comments || 0) * 2 + 
               (post.shares || 0) * 2;
    }
  }

  /**
   * Get reach multiplier for a platform
   * Used to estimate reach from engagement
   */
  private getReachMultiplier(platform: Platform): number {
    switch (platform) {
      case 'instagram': return 7.5;
      case 'tiktok': return 15.0;
      case 'youtube': return 5.0;
      default: return 8.0;
    }
  }

  /**
   * Get impression multiplier for a platform
   * Used to estimate impressions from reach
   */
  private getImpressionMultiplier(platform: Platform): number {
    switch (platform) {
      case 'instagram': return 1.3;
      case 'tiktok': return 1.5;
      case 'youtube': return 1.2;
      default: return 1.4;
    }
  }

  /**
   * Get performance metrics for the analyzer
   */
  public getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.cacheHits / 
        (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses || 1),
      totalHashtags: this.hashtagIndex.size,
      totalPosts: this.posts.length
    };
  }

  /**
   * Clear cache and performance metrics
   */
  public resetCache(): void {
    this.hashtagCache.clear();
    this.performanceMetrics.cacheHits = 0;
    this.performanceMetrics.cacheMisses = 0;
  }
}
