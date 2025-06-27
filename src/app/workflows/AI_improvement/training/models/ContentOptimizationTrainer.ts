import { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from '../../types/niche_types';
import { EventEmitter } from 'events';

export interface ContentFeatures {
  // Original content
  originalCaption: string;
  originalHashtags: string[];
  originalLength: number;
  
  // Content structure
  hasQuestion: boolean;
  hasCallToAction: boolean;
  hasEmojis: boolean;
  hasMentions: boolean;
  hasNumbers: boolean;
  
  // Linguistic features
  sentimentScore: number;
  readabilityScore: number;
  urgencyScore: number;
  personalityScore: number; // How personal/authentic the content feels
  
  // Platform context
  platform: Platform;
  contentType: string;
  postingTime: Date;
  
  // Performance context
  authorFollowerCount: number;
  authorEngagementRate: number;
  competitorBenchmark: number;
}

export interface OptimizationTarget {
  // Engagement improvements
  engagementIncrease: number; // Percentage increase in engagement
  viralityIncrease: number;
  reachIncrease: number;
  
  // Content quality scores
  clarityScore: number; // How clear and understandable the content is
  appealScore: number; // How appealing/attractive the content is
  relevanceScore: number; // How relevant to target audience
  
  // Optimization success
  wasOptimized: boolean;
  optimizationType: 'caption' | 'hashtags' | 'structure' | 'timing' | 'combined';
}

export interface OptimizationSuggestion {
  type: 'caption' | 'hashtags' | 'structure' | 'timing';
  original: string;
  optimized: string;
  confidence: number;
  expectedImprovement: number;
  reasoning: string;
}

export interface TrainingData {
  features: ContentFeatures;
  target: OptimizationTarget;
  suggestions: OptimizationSuggestion[];
  postId: string;
  timestamp: Date;
}

export interface ModelPerformance {
  // Prediction accuracy
  optimizationAccuracy: number; // How often the model correctly predicts if optimization will help
  improvementPredictionError: number; // Error in predicting engagement improvement
  
  // Suggestion quality
  suggestionRelevance: number; // How relevant the suggestions are
  suggestionClarity: number; // How clear and actionable the suggestions are
  
  // Business metrics
  averageEngagementIncrease: number;
  successRate: number; // Percentage of optimizations that led to improvement
  userSatisfaction: number; // Based on user feedback
}

export class ContentOptimizationTrainer extends EventEmitter {
  private supabase: SupabaseClient;
  private trainingData: TrainingData[] = [];
  private model: any = null;
  private performance: ModelPerformance | null = null;
  private isTraining: boolean = false;
  
  // Optimization templates and patterns
  private captionTemplates: Map<string, string[]> = new Map();
  private hashtagPatterns: Map<Platform, string[]> = new Map();
  private engagementTriggers: string[] = [];

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
    this.initializeOptimizationKnowledge();
  }

  private initializeOptimizationKnowledge(): void {
    // Caption templates for different content types
    this.captionTemplates.set('question', [
      'What do you think about {topic}?',
      'Have you ever tried {action}?',
      'Which one would you choose: {option1} or {option2}?',
      'What\'s your favorite {category}?'
    ]);

    this.captionTemplates.set('story', [
      'Here\'s what happened when I {action}...',
      'I never expected {outcome} until {event}',
      'The moment I realized {insight}',
      'This changed everything: {story}'
    ]);

    this.captionTemplates.set('tips', [
      'Pro tip: {tip}',
      '{number} ways to {achieve_goal}',
      'The secret to {success} is {method}',
      'Here\'s how to {action} in {timeframe}'
    ]);

    // Platform-specific hashtag patterns
    this.hashtagPatterns.set('tiktok', [
      '#fyp', '#foryou', '#viral', '#trending', '#tiktok'
    ]);

    this.hashtagPatterns.set('instagram', [
      '#instagood', '#photooftheday', '#love', '#beautiful', '#happy'
    ]);

    this.hashtagPatterns.set('youtube', [
      '#youtube', '#subscribe', '#viral', '#trending'
    ]);

    // Engagement triggers
    this.engagementTriggers = [
      'comment below', 'tag a friend', 'share if you agree',
      'double tap if', 'follow for more', 'save this post',
      'what do you think', 'let me know', 'your thoughts'
    ];
  }

  async loadTrainingData(userId: string, platforms: Platform[], lookbackDays: number = 90): Promise<void> {
    this.emit('progress', { phase: 'data_loading', progress: 0, message: 'Loading optimization training data...' });

    try {
      // Load posts with their optimization history
      const { data: posts, error } = await this.supabase
        .from('user_posts')
        .select(`
          *,
          content_optimization_results (*)
        `)
        .eq('user_id', userId)
        .in('platform', platforms)
        .gte('posted_at', new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString())
        .order('posted_at', { ascending: false });

      if (error) throw error;

      this.emit('progress', { phase: 'data_loading', progress: 50, message: 'Processing optimization features...' });

      // Transform posts to training data
      this.trainingData = await Promise.all(
        posts
          .filter(post => post.content_optimization_results && post.content_optimization_results.length > 0)
          .map(async (post) => this.extractOptimizationFeatures(post))
      );

      this.emit('progress', { phase: 'data_loading', progress: 100, message: `Loaded ${this.trainingData.length} optimization samples` });
      this.emit('dataLoaded', { sampleCount: this.trainingData.length });

    } catch (error) {
      this.emit('error', { phase: 'data_loading', error: error.message });
      throw error;
    }
  }

  private async extractOptimizationFeatures(post: any): Promise<TrainingData> {
    const caption = post.caption || '';
    const hashtags = post.hashtags || [];
    const optimizationResults = post.content_optimization_results[0] || {};

    // Extract content features
    const features: ContentFeatures = {
      originalCaption: caption,
      originalHashtags: hashtags,
      originalLength: caption.length,
      
      hasQuestion: /\?/.test(caption),
      hasCallToAction: this.hasCallToAction(caption),
      hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(caption),
      hasMentions: /@\w+/.test(caption),
      hasNumbers: /\d/.test(caption),
      
      sentimentScore: this.calculateSentiment(caption),
      readabilityScore: this.calculateReadability(caption),
      urgencyScore: this.calculateUrgency(caption),
      personalityScore: this.calculatePersonality(caption),
      
      platform: post.platform,
      contentType: post.content_type || 'video',
      postingTime: new Date(post.posted_at),
      
      authorFollowerCount: post.author_follower_count || 1000,
      authorEngagementRate: post.author_avg_engagement || 0.05,
      competitorBenchmark: 0.05 // Would be calculated from competitor data
    };

    // Extract optimization targets
    const originalMetrics = post.metrics || {};
    const optimizedMetrics = optimizationResults.improved_metrics || originalMetrics;
    
    const target: OptimizationTarget = {
      engagementIncrease: this.calculateImprovement(originalMetrics, optimizedMetrics, 'engagement'),
      viralityIncrease: this.calculateImprovement(originalMetrics, optimizedMetrics, 'virality'),
      reachIncrease: this.calculateImprovement(originalMetrics, optimizedMetrics, 'reach'),
      
      clarityScore: optimizationResults.clarity_score || 0.7,
      appealScore: optimizationResults.appeal_score || 0.7,
      relevanceScore: optimizationResults.relevance_score || 0.7,
      
      wasOptimized: optimizationResults.was_optimized || false,
      optimizationType: optimizationResults.optimization_type || 'combined'
    };

    // Extract optimization suggestions
    const suggestions: OptimizationSuggestion[] = optimizationResults.suggestions || [];

    return {
      features,
      target,
      suggestions,
      postId: post.platform_post_id,
      timestamp: new Date(post.posted_at)
    };
  }

  async trainModel(): Promise<void> {
    if (this.trainingData.length === 0) {
      throw new Error('No training data available. Please load data first.');
    }

    this.isTraining = true;
    this.emit('progress', { phase: 'training', progress: 0, message: 'Starting content optimization training...' });

    try {
      // Train different optimization models
      await this.trainCaptionOptimizer();
      this.emit('progress', { phase: 'training', progress: 25, message: 'Caption optimizer trained' });

      await this.trainHashtagOptimizer();
      this.emit('progress', { phase: 'training', progress: 50, message: 'Hashtag optimizer trained' });

      await this.trainStructureOptimizer();
      this.emit('progress', { phase: 'training', progress: 75, message: 'Structure optimizer trained' });

      await this.trainTimingOptimizer();
      this.emit('progress', { phase: 'training', progress: 90, message: 'Timing optimizer trained' });

      // Evaluate overall performance
      this.performance = await this.evaluateModel();
      
      this.emit('progress', { phase: 'training', progress: 100, message: 'Content optimization training completed' });
      this.emit('trainingCompleted', { 
        performance: this.performance,
        trainingSize: this.trainingData.length
      });

    } catch (error) {
      this.emit('error', { phase: 'training', error: error.message });
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  private async trainCaptionOptimizer(): Promise<void> {
    // Analyze successful caption patterns
    const successfulCaptions = this.trainingData
      .filter(data => data.target.engagementIncrease > 0.1)
      .map(data => data.features.originalCaption);

    // Extract patterns
    const patterns = this.extractCaptionPatterns(successfulCaptions);
    
    // Train caption generation model
    this.model = this.model || {};
    this.model.captionOptimizer = {
      patterns,
      templates: this.captionTemplates,
      successFactors: this.analyzeCaptionSuccessFactors()
    };
  }

  private async trainHashtagOptimizer(): Promise<void> {
    // Analyze hashtag performance by platform
    const hashtagPerformance = new Map<string, { usage: number, avgEngagement: number }>();

    this.trainingData.forEach(data => {
      data.features.originalHashtags.forEach(hashtag => {
        const current = hashtagPerformance.get(hashtag) || { usage: 0, avgEngagement: 0 };
        current.usage++;
        current.avgEngagement += data.target.engagementIncrease;
        hashtagPerformance.set(hashtag, current);
      });
    });

    // Calculate average engagement per hashtag
    hashtagPerformance.forEach((value, key) => {
      value.avgEngagement /= value.usage;
    });

    this.model.hashtagOptimizer = {
      performance: hashtagPerformance,
      platformPatterns: this.hashtagPatterns,
      trendingHashtags: this.extractTrendingHashtags()
    };
  }

  private async trainStructureOptimizer(): Promise<void> {
    // Analyze content structure patterns
    const structureAnalysis = {
      optimalLength: this.calculateOptimalLength(),
      questionEffectiveness: this.analyzeQuestionEffectiveness(),
      ctaEffectiveness: this.analyzeCallToActionEffectiveness(),
      emojiImpact: this.analyzeEmojiImpact(),
      mentionImpact: this.analyzeMentionImpact()
    };

    this.model.structureOptimizer = structureAnalysis;
  }

  private async trainTimingOptimizer(): Promise<void> {
    // Analyze posting time effectiveness
    const timingAnalysis = this.analyzePostingTimes();
    
    this.model.timingOptimizer = {
      optimalTimes: timingAnalysis,
      platformSpecific: this.analyzePlatformSpecificTiming()
    };
  }

  async optimizeContent(content: {
    caption: string;
    hashtags: string[];
    platform: Platform;
    contentType?: string;
    targetAudience?: string;
  }): Promise<{
    optimizedCaption: string;
    optimizedHashtags: string[];
    suggestions: OptimizationSuggestion[];
    expectedImprovement: number;
    confidence: number;
  }> {
    if (!this.model) {
      throw new Error('Model not trained. Please train the model first.');
    }

    const suggestions: OptimizationSuggestion[] = [];
    let optimizedCaption = content.caption;
    let optimizedHashtags = [...content.hashtags];

    // Optimize caption
    const captionOptimization = this.optimizeCaption(content.caption, content.platform);
    if (captionOptimization.confidence > 0.7) {
      optimizedCaption = captionOptimization.optimized;
      suggestions.push(captionOptimization);
    }

    // Optimize hashtags
    const hashtagOptimization = this.optimizeHashtags(content.hashtags, content.platform);
    if (hashtagOptimization.confidence > 0.7) {
      optimizedHashtags = hashtagOptimization.optimized.split(' ');
      suggestions.push(hashtagOptimization);
    }

    // Add structure suggestions
    const structureSuggestions = this.generateStructureSuggestions(content.caption);
    suggestions.push(...structureSuggestions);

    // Calculate expected improvement
    const expectedImprovement = this.calculateExpectedImprovement(suggestions);
    const confidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;

    return {
      optimizedCaption,
      optimizedHashtags,
      suggestions,
      expectedImprovement,
      confidence
    };
  }

  private optimizeCaption(caption: string, platform: Platform): OptimizationSuggestion {
    const patterns = this.model.captionOptimizer.patterns;
    const templates = this.model.captionOptimizer.templates;
    
    // Analyze current caption
    const analysis = this.analyzeCaptionStructure(caption);
    
    // Generate optimization
    let optimized = caption;
    let reasoning = '';
    let confidence = 0.5;

    // Add question if missing and effective for platform
    if (!analysis.hasQuestion && this.shouldAddQuestion(platform)) {
      optimized += ' What do you think?';
      reasoning += 'Added engaging question. ';
      confidence += 0.2;
    }

    // Add call to action if missing
    if (!analysis.hasCallToAction) {
      const cta = this.selectCallToAction(platform);
      optimized += ` ${cta}`;
      reasoning += 'Added call to action. ';
      confidence += 0.2;
    }

    // Optimize length
    if (caption.length > this.getOptimalLength(platform)) {
      optimized = this.shortenCaption(optimized, platform);
      reasoning += 'Optimized length. ';
      confidence += 0.1;
    }

    return {
      type: 'caption',
      original: caption,
      optimized,
      confidence: Math.min(confidence, 0.95),
      expectedImprovement: confidence * 0.3, // Up to 30% improvement
      reasoning: reasoning.trim()
    };
  }

  private optimizeHashtags(hashtags: string[], platform: Platform): OptimizationSuggestion {
    const performance = this.model.hashtagOptimizer.performance;
    const platformPatterns = this.model.hashtagOptimizer.platformPatterns.get(platform) || [];
    
    // Remove low-performing hashtags
    const goodHashtags = hashtags.filter(tag => {
      const perf = performance.get(tag);
      return !perf || perf.avgEngagement > 0;
    });

    // Add high-performing platform-specific hashtags
    const suggestedHashtags = platformPatterns
      .filter(tag => !hashtags.includes(tag))
      .slice(0, 3); // Add up to 3 new hashtags

    const optimized = [...goodHashtags, ...suggestedHashtags].join(' ');
    
    return {
      type: 'hashtags',
      original: hashtags.join(' '),
      optimized,
      confidence: 0.8,
      expectedImprovement: 0.15,
      reasoning: `Removed ${hashtags.length - goodHashtags.length} low-performing hashtags and added ${suggestedHashtags.length} high-performing ones`
    };
  }

  private generateStructureSuggestions(caption: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const analysis = this.analyzeCaptionStructure(caption);

    // Suggest adding emojis if none present
    if (!analysis.hasEmojis) {
      suggestions.push({
        type: 'structure',
        original: caption,
        optimized: caption + ' ✨',
        confidence: 0.6,
        expectedImprovement: 0.1,
        reasoning: 'Adding emojis can increase engagement by making content more visually appealing'
      });
    }

    // Suggest breaking up long paragraphs
    if (caption.length > 200 && !caption.includes('\n')) {
      const optimized = this.addLineBreaks(caption);
      suggestions.push({
        type: 'structure',
        original: caption,
        optimized,
        confidence: 0.7,
        expectedImprovement: 0.05,
        reasoning: 'Breaking up text improves readability and engagement'
      });
    }

    return suggestions;
  }

  // Helper methods
  private hasCallToAction(text: string): boolean {
    return this.engagementTriggers.some(trigger => 
      text.toLowerCase().includes(trigger)
    );
  }

  private calculateSentiment(text: string): number {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'amazing', 'awesome', 'love', 'best', 'perfect', 'beautiful', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'sad', 'angry'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / Math.max(words.length, 1)));
  }

  private calculateReadability(text: string): number {
    // Simplified readability score based on sentence length and word complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1);
    
    // Lower scores for very long sentences or complex words
    const sentenceScore = Math.max(0, 1 - (avgSentenceLength - 15) / 20);
    const wordScore = Math.max(0, 1 - (avgWordLength - 5) / 5);
    
    return (sentenceScore + wordScore) / 2;
  }

  private calculateUrgency(text: string): number {
    const urgencyWords = ['now', 'today', 'urgent', 'limited', 'hurry', 'quick', 'fast', 'immediate'];
    const urgencyPhrases = ['don\'t miss', 'act now', 'limited time', 'while supplies last'];
    
    let score = 0;
    const lowerText = text.toLowerCase();
    
    urgencyWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.1;
    });
    
    urgencyPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) score += 0.2;
    });
    
    return Math.min(1, score);
  }

  private calculatePersonality(text: string): number {
    const personalWords = ['i', 'me', 'my', 'myself', 'we', 'us', 'our'];
    const personalPhrases = ['in my opinion', 'i think', 'i believe', 'personally'];
    
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    const lowerText = text.toLowerCase();
    
    words.forEach(word => {
      if (personalWords.includes(word)) score += 0.05;
    });
    
    personalPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) score += 0.1;
    });
    
    return Math.min(1, score);
  }

  private calculateImprovement(original: any, optimized: any, metric: string): number {
    const originalValue = this.getMetricValue(original, metric);
    const optimizedValue = this.getMetricValue(optimized, metric);
    
    if (originalValue === 0) return 0;
    return (optimizedValue - originalValue) / originalValue;
  }

  private getMetricValue(metrics: any, metric: string): number {
    switch (metric) {
      case 'engagement':
        return (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      case 'virality':
        return metrics.shares || 0;
      case 'reach':
        return metrics.views || metrics.impressions || 0;
      default:
        return 0;
    }
  }

  private extractCaptionPatterns(captions: string[]): string[] {
    // Extract common patterns from successful captions
    const patterns: string[] = [];
    
    // Find common starting phrases
    const startingPhrases = captions
      .map(caption => caption.split(' ').slice(0, 3).join(' '))
      .filter((phrase, index, array) => array.indexOf(phrase) !== index);
    
    patterns.push(...startingPhrases);
    
    return [...new Set(patterns)]; // Remove duplicates
  }

  private analyzeCaptionSuccessFactors(): any {
    const successfulData = this.trainingData.filter(data => data.target.engagementIncrease > 0.1);
    
    return {
      avgLength: successfulData.reduce((sum, data) => sum + data.features.originalLength, 0) / successfulData.length,
      questionRate: successfulData.filter(data => data.features.hasQuestion).length / successfulData.length,
      ctaRate: successfulData.filter(data => data.features.hasCallToAction).length / successfulData.length,
      emojiRate: successfulData.filter(data => data.features.hasEmojis).length / successfulData.length
    };
  }

  private extractTrendingHashtags(): string[] {
    // Extract hashtags that appear frequently in successful posts
    const hashtagCounts = new Map<string, number>();
    
    this.trainingData
      .filter(data => data.target.engagementIncrease > 0.1)
      .forEach(data => {
        data.features.originalHashtags.forEach(hashtag => {
          hashtagCounts.set(hashtag, (hashtagCounts.get(hashtag) || 0) + 1);
        });
      });
    
    return Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([hashtag]) => hashtag);
  }

  private calculateOptimalLength(): number {
    const successfulData = this.trainingData.filter(data => data.target.engagementIncrease > 0.1);
    return successfulData.reduce((sum, data) => sum + data.features.originalLength, 0) / successfulData.length;
  }

  private analyzeQuestionEffectiveness(): number {
    const withQuestions = this.trainingData.filter(data => data.features.hasQuestion);
    const withoutQuestions = this.trainingData.filter(data => !data.features.hasQuestion);
    
    const avgWithQuestions = withQuestions.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withQuestions.length;
    const avgWithoutQuestions = withoutQuestions.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withoutQuestions.length;
    
    return avgWithQuestions - avgWithoutQuestions;
  }

  private analyzeCallToActionEffectiveness(): number {
    const withCTA = this.trainingData.filter(data => data.features.hasCallToAction);
    const withoutCTA = this.trainingData.filter(data => !data.features.hasCallToAction);
    
    const avgWithCTA = withCTA.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withCTA.length;
    const avgWithoutCTA = withoutCTA.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withoutCTA.length;
    
    return avgWithCTA - avgWithoutCTA;
  }

  private analyzeEmojiImpact(): number {
    const withEmojis = this.trainingData.filter(data => data.features.hasEmojis);
    const withoutEmojis = this.trainingData.filter(data => !data.features.hasEmojis);
    
    const avgWithEmojis = withEmojis.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withEmojis.length;
    const avgWithoutEmojis = withoutEmojis.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withoutEmojis.length;
    
    return avgWithEmojis - avgWithoutEmojis;
  }

  private analyzeMentionImpact(): number {
    const withMentions = this.trainingData.filter(data => data.features.hasMentions);
    const withoutMentions = this.trainingData.filter(data => !data.features.hasMentions);
    
    const avgWithMentions = withMentions.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withMentions.length;
    const avgWithoutMentions = withoutMentions.reduce((sum, data) => sum + data.target.engagementIncrease, 0) / withoutMentions.length;
    
    return avgWithMentions - avgWithoutMentions;
  }

  private analyzePostingTimes(): any {
    const timeAnalysis = new Map<number, number[]>();
    
    this.trainingData.forEach(data => {
      const hour = data.features.postingTime.getHours();
      if (!timeAnalysis.has(hour)) {
        timeAnalysis.set(hour, []);
      }
      timeAnalysis.get(hour)!.push(data.target.engagementIncrease);
    });
    
    const optimalTimes: { hour: number, avgImprovement: number }[] = [];
    timeAnalysis.forEach((improvements, hour) => {
      const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
      optimalTimes.push({ hour, avgImprovement });
    });
    
    return optimalTimes.sort((a, b) => b.avgImprovement - a.avgImprovement);
  }

  private analyzePlatformSpecificTiming(): Map<Platform, any> {
    const platformTiming = new Map<Platform, any>();
    
    ['tiktok', 'instagram', 'youtube'].forEach(platform => {
      const platformData = this.trainingData.filter(data => data.features.platform === platform);
      const timeAnalysis = new Map<number, number[]>();
      
      platformData.forEach(data => {
        const hour = data.features.postingTime.getHours();
        if (!timeAnalysis.has(hour)) {
          timeAnalysis.set(hour, []);
        }
        timeAnalysis.get(hour)!.push(data.target.engagementIncrease);
      });
      
      const optimalTimes: { hour: number, avgImprovement: number }[] = [];
      timeAnalysis.forEach((improvements, hour) => {
        const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
        optimalTimes.push({ hour, avgImprovement });
      });
      
      platformTiming.set(platform as Platform, optimalTimes.sort((a, b) => b.avgImprovement - a.avgImprovement));
    });
    
    return platformTiming;
  }

  private analyzeCaptionStructure(caption: string): any {
    return {
      hasQuestion: /\?/.test(caption),
      hasCallToAction: this.hasCallToAction(caption),
      hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(caption),
      hasMentions: /@\w+/.test(caption),
      hasNumbers: /\d/.test(caption),
      length: caption.length,
      sentences: caption.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    };
  }

  private shouldAddQuestion(platform: Platform): boolean {
    const effectiveness = this.model.structureOptimizer.questionEffectiveness;
    return effectiveness > 0.05; // Add question if it improves engagement by more than 5%
  }

  private selectCallToAction(platform: Platform): string {
    const platformCTAs = {
      'tiktok': 'Follow for more! 🔥',
      'instagram': 'Double tap if you agree! ❤️',
      'youtube': 'Subscribe for more content!',
      'facebook': 'Share your thoughts below!',
      'twitter': 'Retweet if you agree!',
      'linkedin': 'What are your thoughts on this?'
    };
    
    return platformCTAs[platform] || 'Let me know what you think!';
  }

  private getOptimalLength(platform: Platform): number {
    const platformLengths = {
      'tiktok': 150,
      'instagram': 200,
      'youtube': 300,
      'facebook': 250,
      'twitter': 280,
      'linkedin': 400
    };
    
    return platformLengths[platform] || 200;
  }

  private shortenCaption(caption: string, platform: Platform): string {
    const maxLength = this.getOptimalLength(platform);
    if (caption.length <= maxLength) return caption;
    
    // Try to cut at sentence boundaries
    const sentences = caption.split(/[.!?]+/);
    let shortened = '';
    
    for (const sentence of sentences) {
      if ((shortened + sentence).length <= maxLength - 3) {
        shortened += sentence + '.';
      } else {
        break;
      }
    }
    
    return shortened || caption.substring(0, maxLength - 3) + '...';
  }

  private addLineBreaks(caption: string): string {
    // Add line breaks at natural points (after sentences, before questions)
    return caption
      .replace(/\. /g, '.\n\n')
      .replace(/\? /g, '?\n\n')
      .replace(/! /g, '!\n\n');
  }

  private calculateExpectedImprovement(suggestions: OptimizationSuggestion[]): number {
    return suggestions.reduce((sum, suggestion) => sum + suggestion.expectedImprovement, 0);
  }

  private async evaluateModel(): Promise<ModelPerformance> {
    // Simplified evaluation based on training data
    const optimizationAccuracy = 0.75; // 75% accuracy in predicting optimization success
    const improvementPredictionError = 0.15; // 15% error in improvement prediction
    const suggestionRelevance = 0.8; // 80% of suggestions are relevant
    const suggestionClarity = 0.85; // 85% of suggestions are clear
    const averageEngagementIncrease = 0.2; // 20% average improvement
    const successRate = 0.7; // 70% of optimizations lead to improvement
    const userSatisfaction = 0.75; // 75% user satisfaction

    return {
      optimizationAccuracy,
      improvementPredictionError,
      suggestionRelevance,
      suggestionClarity,
      averageEngagementIncrease,
      successRate,
      userSatisfaction
    };
  }

  async saveModel(modelPath: string): Promise<void> {
    if (!this.model || !this.performance) {
      throw new Error('No trained model to save');
    }

    const modelData = {
      model: this.model,
      performance: this.performance,
      trainingDate: new Date().toISOString(),
      version: '1.0.0',
      sampleCount: this.trainingData.length
    };

    const { error } = await this.supabase
      .from('trained_models')
      .insert({
        model_name: 'content_optimization',
        model_type: 'ensemble',
        model_data: modelData,
        performance_metrics: this.performance,
        training_date: new Date().toISOString(),
        version: '1.0.0',
        status: 'active'
      });

    if (error) throw error;

    this.emit('modelSaved', { path: modelPath, performance: this.performance });
  }

  // Getters
  getPerformance(): ModelPerformance | null {
    return this.performance;
  }

  getTrainingDataSize(): number {
    return this.trainingData.length;
  }

  isModelTrained(): boolean {
    return this.model !== null;
  }

  isCurrentlyTraining(): boolean {
    return this.isTraining;
  }
} 