import { Platform } from "@/types/platform";
import * as tf from '@tensorflow/tfjs';
import { Cache } from '../utils/cache';

// Types for time-series forecasting
interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

interface TimeSeriesData {
  points: TimeSeriesPoint[];
  mean: number;
  std: number;
  min: number;
  max: number;
}

interface OptimalTimeSlot {
  dayOfWeek: number; // 0-6, 0 is Sunday
  hour: number; // 0-23
  score: number; // 0-1 engagement prediction
  confidence: number; // 0-1
}

interface ContentSimulation {
  contentId: string;
  predictedEngagement: EngagementMetrics;
  confidenceScore: number;
  recommendedChanges?: string[];
}

export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

export class EngagementPredictor {
  // Performance tracking
  private static performanceMetrics = {
    totalPredictions: 0,
    cacheHits: 0,
    aiModelUsage: 0,
    averagePredictionTimeMs: 0,
    totalPredictionTimeMs: 0
  };
  private static cache = new Cache<string, any>({
    maxSize: 500,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  private static modelCache: {
    timeSeriesModel?: tf.LayersModel;
    contentModel?: tf.LayersModel;
    lastUpdated?: number;
  } = {};
  private static platformAverages: Record<Platform, EngagementMetrics> = {
    'instagram': {
      likes: 500,
      comments: 25,
      shares: 50,
      saves: 75,
      reach: 1200,
      impressions: 1800,
      engagementRate: 0.04
    },
    'twitter': {
      likes: 100,
      comments: 5,
      shares: 15,
      saves: 10,
      reach: 800,
      impressions: 1200,
      engagementRate: 0.02
    },
    'tiktok': {
      likes: 1000,
      comments: 50,
      shares: 200,
      saves: 150,
      reach: 5000,
      impressions: 10000,
      engagementRate: 0.08
    },
    'facebook': {
      likes: 200,
      comments: 10,
      shares: 30,
      saves: 20,
      reach: 1000,
      impressions: 1500,
      engagementRate: 0.03
    },
    'linkedin': {
      likes: 150,
      comments: 8,
      shares: 20,
      saves: 25,
      reach: 900,
      impressions: 1300,
      engagementRate: 0.025
    },
    'youtube': {
      likes: 300,
      comments: 40,
      shares: 25,
      saves: 100,
      reach: 3000,
      impressions: 5000,
      engagementRate: 0.035
    }
  };

  /**
   * Predict engagement metrics for a post with enhanced AI modeling
   */
  static async predictEngagement(
    platform: Platform,
    content: string,
    historicalData: any[],
    postTime?: Date,
    mediaUrls?: string[]
  ): Promise<EngagementMetrics> {
    // Check cache first to avoid recomputation
    const cacheKey = `engagement_${platform}_${this.hashContent(content)}_${postTime?.toISOString() || 'anytime'}`;
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) return cachedResult;

    const platformAvg = this.platformAverages[platform];
    let contentScore = this.analyzeContent(content);
    let historicalEngagement = this.analyzeHistoricalData(historicalData);
    
    // Enhanced prediction model - combined approach
    try {
      // First try to use the ML model if available
      if (await this.isModelAvailable()) {
        const timeFactors = postTime ? await this.getTimeFactors(platform, postTime) : { multiplier: 1, confidence: 0.5 };
        const mediaFactors = mediaUrls?.length ? await this.analyzeMedia(mediaUrls) : { multiplier: 1, confidence: 0.5 };
        
        // Apply time and media factors
        contentScore *= timeFactors.multiplier;
        historicalEngagement *= mediaFactors.multiplier;
      }
    } catch (error) {
      console.warn('Advanced prediction failed, falling back to basic model:', error);
    }
    
    // Create result with enhanced factors
    const result = {
      likes: Math.round(platformAvg.likes * contentScore * historicalEngagement),
      comments: Math.round(platformAvg.comments * contentScore * historicalEngagement * 0.8),
      shares: Math.round(platformAvg.shares * contentScore * historicalEngagement * 0.9),
      saves: Math.round(platformAvg.saves * contentScore * historicalEngagement * 0.7),
      reach: Math.round(platformAvg.reach * contentScore * historicalEngagement * 1.1),
      impressions: Math.round(platformAvg.impressions * contentScore * historicalEngagement * 1.1),
      engagementRate: platformAvg.engagementRate * contentScore * historicalEngagement
    };
    
    // Store in cache to avoid recomputation
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Calculate a content quality score (0.5 to 1.5)
   */
  private static analyzeContent(content: string): number {
    // Simple analysis - in a real app, use NLP
    let score = 1.0;
    const length = content.length;
    const wordCount = content.split(/\s+/).length;
    const hasEmojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(content);
    const hasHashtags = /#\w+/.test(content);
    const hasMentions = /@\w+/.test(content);
    
    // Length score (optimal 150-300 chars)
    if (length > 50 && length < 500) {
      score *= 1.1;
    } else if (length >= 500) {
      score *= 0.9;
    }
    
    // Word count score (optimal 20-50 words)
    if (wordCount >= 15 && wordCount <= 60) {
      score *= 1.1;
    } else if (wordCount > 60) {
      score *= 0.9;
    }
    
    // Engagement elements
    if (hasEmojis) score *= 1.05;
    if (hasHashtags) score *= 1.05;
    if (hasMentions) score *= 1.03;
    
    return Math.min(Math.max(score, 0.5), 1.5);
  }

  /**
   * Create a simple hash for content to use as cache key
   */
  private static hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Check if ML models are available and initialized
   */
  private static async isModelAvailable(): Promise<boolean> {
    try {
      // Check if we've already loaded the models
      if (this.modelCache.timeSeriesModel && this.modelCache.contentModel) {
        return true;
      }
      
      // Try to initialize TensorFlow.js
      await tf.ready();
      
      // For now, we'll just return false to indicate no models available
      // In a real implementation, we would load models here
      return false;
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }
  
  /**
   * Get time-based engagement factors
   */
  private static async getTimeFactors(platform: Platform, postTime: Date): Promise<{multiplier: number, confidence: number}> {
    const hour = postTime.getHours();
    const dayOfWeek = postTime.getDay();
    
    // Simple time-based factors (to be replaced with ML model)
    // This is a placeholder implementation
    
    // Peak hours for different platforms (simplified)
    const peakHours: Record<Platform, number[]> = {
      'instagram': [12, 13, 17, 18, 19, 20],
      'twitter': [8, 9, 12, 15, 16, 17],
      'tiktok': [19, 20, 21, 22, 23],
      'facebook': [13, 14, 15, 16, 19, 20],
      'linkedin': [8, 9, 10, 11, 16, 17],
      'youtube': [15, 16, 17, 18, 19, 20]
    };
    
    // Peak days (0 = Sunday)
    const peakDays: Record<Platform, number[]> = {
      'instagram': [1, 2, 4, 5],
      'twitter': [1, 2, 3, 4, 5],
      'tiktok': [1, 2, 3, 6],
      'facebook': [1, 3, 5],
      'linkedin': [1, 2, 3],
      'youtube': [0, 5, 6]
    };
    
    let multiplier = 1.0;
    
    // Apply hour factor
    if (peakHours[platform].includes(hour)) {
      multiplier *= 1.15; // 15% boost for peak hours
    } else if (hour >= 0 && hour <= 5) {
      multiplier *= 0.8; // 20% reduction for very late/early hours
    }
    
    // Apply day factor
    if (peakDays[platform].includes(dayOfWeek)) {
      multiplier *= 1.1; // 10% boost for peak days
    }
    
    return {
      multiplier: multiplier,
      confidence: 0.7 // Medium confidence since this is based on heuristics
    };
  }
  
  /**
   * Analyze media attachments to predict engagement boost
   */
  private static async analyzeMedia(mediaUrls: string[]): Promise<{multiplier: number, confidence: number}> {
    // Simple media analysis heuristics
    // In a real implementation, this would use computer vision models
    
    let multiplier = 1.0;
    
    // Multiple media items tend to increase engagement
    if (mediaUrls.length > 1) {
      multiplier *= 1.1;
    }
    
    // For simplicity, we'll just check file extensions
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    const hasVideo = mediaUrls.some(url => 
      videoExtensions.some(ext => url.toLowerCase().endsWith(ext))
    );
    
    // Videos typically get more engagement
    if (hasVideo) {
      multiplier *= 1.2;
    }
    
    return {
      multiplier,
      confidence: 0.6 // Medium-low confidence as this is very simplified
    };
  }
  
  /**
   * Predict optimal posting times for a given platform and content type
   * Uses historical engagement data and time-series analysis
   * 
   * @param platform The social media platform
   * @param contentType Content category (e.g., 'video', 'image', 'text')
   * @param historicalData Previous post performance data
   * @param count Number of time slots to recommend
   * @returns Array of optimal time slots sorted by predicted engagement
   */
  static async predictOptimalPostingTimes(
    platform: Platform,
    contentType: string,
    historicalData: any[],
    count: number = 5
  ): Promise<OptimalTimeSlot[]> {
    // Check cache first
    const cacheKey = `optimal_times_${platform}_${contentType}_${count}`;
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    const startTime = performance.now();
    
    // Create a 2D matrix of day/hour combinations with scores
    const timeSlots: OptimalTimeSlot[] = [];
    
    // If we have sufficient historical data, analyze posting patterns
    if (historicalData && historicalData.length >= 10) {
      // Group posts by day and hour
      const performanceByTime = new Map<string, number[]>();
      
      for (const post of historicalData) {
        if (!post.publishedAt) continue;
        
        const postDate = new Date(post.publishedAt);
        const day = postDate.getDay();
        const hour = postDate.getHours();
        const key = `${day}_${hour}`;
        
        if (!performanceByTime.has(key)) {
          performanceByTime.set(key, []);
        }
        
        // Add engagement rate to the time slot
        performanceByTime.get(key)!.push(post.engagementRate || 0);
      }
      
      // Calculate average performance for each time slot
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}_${hour}`;
          const engagementRates = performanceByTime.get(key) || [];
          
          // Only consider slots with enough data points
          if (engagementRates.length >= 2) {
            const avgEngagement = engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length;
            
            timeSlots.push({
              dayOfWeek: day,
              hour,
              score: avgEngagement,
              confidence: Math.min(0.5 + (engagementRates.length / 10) * 0.5, 0.95) // Confidence increases with more data
            });
          } else {
            // For slots with insufficient data, use the platform-specific heuristics
            const baselineScore = this.getBaselineTimeScore(platform, day, hour);
            timeSlots.push({
              dayOfWeek: day,
              hour,
              score: baselineScore.score,
              confidence: baselineScore.confidence
            });
          }
        }
      }
    } else {
      // Not enough historical data, use platform-specific patterns
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const baselineScore = this.getBaselineTimeScore(platform, day, hour);
          timeSlots.push({
            dayOfWeek: day,
            hour,
            score: baselineScore.score,
            confidence: baselineScore.confidence
          });
        }
      }
    }
    
    // Sort by score (highest first) and take requested count
    const result = timeSlots
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(slot => {
        // Convert dayOfWeek and hour to readable startTime and endTime
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const startTime = `${days[slot.dayOfWeek]} ${slot.hour.toString().padStart(2, '0')}:00`;
        const endHour = (slot.hour + 1) % 24;
        const endTime = `${days[slot.dayOfWeek]} ${endHour.toString().padStart(2, '0')}:00`;
        return {
          ...slot,
          startTime,
          endTime,
        };
      });
    
    // Update performance metrics
    const elapsedTime = performance.now() - startTime;
    this.performanceMetrics.totalPredictions++;
    this.performanceMetrics.totalPredictionTimeMs += elapsedTime;
    this.performanceMetrics.averagePredictionTimeMs = 
      this.performanceMetrics.totalPredictionTimeMs / this.performanceMetrics.totalPredictions;
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Get baseline time score for a platform based on general usage patterns
   */
  private static getBaselineTimeScore(
    platform: Platform, 
    day: number, 
    hour: number
  ): {score: number, confidence: number} {
    // General social media usage patterns
    // Weekdays: 7-9am, 12-2pm, 5-7pm
    // Weekends: 10am-2pm, 7-9pm
    
    const isWeekend = day === 0 || day === 6;
    const isWorkHours = hour >= 9 && hour <= 17;
    const isPeakCommute = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
    const isLateNight = hour >= 22 || hour <= 5;
    
    let score = 0.5; // Base score
    
    // Platform-specific adjustments
    switch (platform) {
      case 'instagram':
        if (isPeakCommute) score += 0.2;
        if (hour >= 12 && hour <= 14) score += 0.15; // Lunch break
        if (hour >= 19 && hour <= 22) score += 0.25; // Evening leisure
        if (isLateNight) score -= 0.3;
        break;
        
      case 'twitter':
        if (isPeakCommute) score += 0.15;
        if (hour >= 11 && hour <= 13) score += 0.1; // Lunch break
        if (hour >= 7 && hour <= 10) score += 0.2; // Morning news
        if (isLateNight) score -= 0.2;
        break;
        
      case 'tiktok':
        if (hour >= 18 && hour <= 23) score += 0.3; // Evening & night
        if (isWeekend && hour >= 12 && hour <= 22) score += 0.15;
        if (hour >= 6 && hour <= 9) score -= 0.2; // Early morning
        break;
        
      case 'linkedin':
        if (isWorkHours && !isWeekend) score += 0.25;
        if (hour >= 7 && hour <= 9 && !isWeekend) score += 0.2; // Morning work prep
        if (isWeekend) score -= 0.15;
        if (isLateNight) score -= 0.4;
        break;
        
      case 'facebook':
        if (hour >= 13 && hour <= 16) score += 0.15;
        if (hour >= 19 && hour <= 22) score += 0.25;
        if (isWeekend && hour >= 10 && hour <= 15) score += 0.1;
        if (isLateNight) score -= 0.25;
        break;
        
      case 'youtube':
        if (hour >= 15 && hour <= 23) score += 0.2; // Afternoon & evening
        if (isWeekend) score += 0.1;
        if (hour >= 6 && hour <= 8) score -= 0.15;
        break;
    }
    
    // Normalize score to 0-1 range
    score = Math.max(0.1, Math.min(0.9, score));
    
    return {
      score,
      confidence: 0.6 // Medium confidence for heuristic approach
    };
  }
  
  /**
   * Simulate content performance before posting
   * 
   * @param platform Target platform
   * @param contentDrafts Array of content drafts to compare
   * @param historicalData Previous post performance
   * @param mediaUrls Optional media attachments
   * @returns Ranked content simulations with predicted engagement
   */
  static async simulateContentPerformance(
    platform: Platform,
    contentDrafts: string[],
    historicalData: any[],
    mediaUrls?: string[]
  ): Promise<ContentSimulation[]> {
    // Check cache first
    const cacheKey = `content_sim_${platform}_${contentDrafts.map(c => this.hashContent(c).substring(0, 8)).join('_')}`;
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    const startTime = performance.now();
    const simulations: ContentSimulation[] = [];
    
    // Process each draft in parallel for efficiency
    const predictions = await Promise.all(contentDrafts.map(async (content, index) => {
      // Predict engagement for this content
      const engagement = await this.predictEngagement(
        platform,
        content,
        historicalData,
        undefined, // No specific time
        mediaUrls
      );
      
      // Analyze content quality
      const contentScore = this.analyzeContent(content);
      
      // Generate improvement recommendations
      const recommendations = this.generateContentRecommendations(content, platform);
      
      return {
        contentId: `draft_${index + 1}`,
        predictedEngagement: engagement,
        confidenceScore: 0.7 + (contentScore - 1) * 0.2, // Scale confidence with content quality
        recommendedChanges: recommendations
      };
    }));
    
    // Sort by predicted engagement rate
    const result = predictions.sort((a, b) => 
      b.predictedEngagement.engagementRate - a.predictedEngagement.engagementRate
    );
    
    // Update performance metrics
    const elapsedTime = performance.now() - startTime;
    this.performanceMetrics.totalPredictions++;
    this.performanceMetrics.totalPredictionTimeMs += elapsedTime;
    this.performanceMetrics.averagePredictionTimeMs = 
      this.performanceMetrics.totalPredictionTimeMs / this.performanceMetrics.totalPredictions;
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Generate content improvement recommendations
   */
  private static generateContentRecommendations(content: string, platform: Platform): string[] {
    const recommendations: string[] = [];
    
    // Length recommendations
    const length = content.length;
    const wordCount = content.split(/\s+/).length;
    
    // Platform-specific length recommendations
    const lengthRecommendations: Record<Platform, {minChars: number, maxChars: number, minWords: number, maxWords: number}> = {
      'instagram': { minChars: 100, maxChars: 500, minWords: 20, maxWords: 100 },
      'twitter': { minChars: 60, maxChars: 280, minWords: 10, maxWords: 50 },
      'tiktok': { minChars: 50, maxChars: 300, minWords: 10, maxWords: 60 },
      'facebook': { minChars: 100, maxChars: 600, minWords: 20, maxWords: 120 },
      'linkedin': { minChars: 150, maxChars: 1000, minWords: 30, maxWords: 200 },
      'youtube': { minChars: 200, maxChars: 1000, minWords: 40, maxWords: 200 }
    };
    
    const platformRec = lengthRecommendations[platform];
    
    if (length < platformRec.minChars) {
      recommendations.push(`Add more content (currently ${length} chars, recommend at least ${platformRec.minChars})`); 
    } else if (length > platformRec.maxChars) {
      recommendations.push(`Consider shortening content (currently ${length} chars, recommend under ${platformRec.maxChars})`); 
    }
    
    // Hashtag recommendations
    const hashtags = (content.match(/#\w+/g) || []);
    const hashtagCount = hashtags.length;
    
    // Platform-specific hashtag recommendations
    const hashtagRecommendations: Record<Platform, {min: number, max: number}> = {
      'instagram': { min: 5, max: 15 },
      'twitter': { min: 1, max: 3 },
      'tiktok': { min: 3, max: 10 },
      'facebook': { min: 0, max: 3 },
      'linkedin': { min: 0, max: 5 },
      'youtube': { min: 3, max: 10 }
    };
    
    const hashtagRec = hashtagRecommendations[platform];
    
    if (hashtagCount < hashtagRec.min) {
      recommendations.push(`Add more hashtags (currently ${hashtagCount}, recommend at least ${hashtagRec.min})`); 
    } else if (hashtagCount > hashtagRec.max) {
      recommendations.push(`Consider reducing hashtags (currently ${hashtagCount}, recommend under ${hashtagRec.max})`); 
    }
    
    // Emoji recommendations
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
    
    if (emojiCount === 0 && platform !== 'linkedin') {
      recommendations.push('Consider adding emojis to increase engagement');
    } else if (emojiCount > 8) {
      recommendations.push('Consider reducing the number of emojis');
    }
    
    // Mentions
    const hasMentions = /@\w+/.test(content);
    if (!hasMentions && (platform === 'instagram' || platform === 'twitter')) {
      recommendations.push('Consider tagging relevant accounts to increase reach');
    }
    
    // Questions
    const hasQuestion = /\?/.test(content);
    if (!hasQuestion) {
      recommendations.push('Consider adding a question to encourage engagement');
    }
    
    return recommendations;
  }
  
  /**
   * Get performance metrics for the predictor
   */
  static getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalPredictions > 0 
        ? this.performanceMetrics.cacheHits / this.performanceMetrics.totalPredictions 
        : 0,
      aiModelUsageRate: this.performanceMetrics.totalPredictions > 0
        ? this.performanceMetrics.aiModelUsage / this.performanceMetrics.totalPredictions
        : 0
    };
  }
  
  private static analyzeHistoricalData(historicalData: any[]): number {
    if (historicalData.length === 0) return 1.0;
    
    const totalEngagement = historicalData.reduce((sum, post) => {
      return sum + (post.engagementRate || 0);
    }, 0);
    
    const avgEngagement = totalEngagement / historicalData.length;
    
    // Normalize to 0.8-1.2 range based on historical performance
    return Math.min(Math.max(0.8, avgEngagement * 10), 1.2);
  }
}
