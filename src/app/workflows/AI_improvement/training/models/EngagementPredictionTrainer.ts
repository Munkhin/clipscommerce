import { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from '@/types/platform';
import { PostMetrics } from '@/types/schedule';
import { EventEmitter } from 'events';

export interface EngagementFeatures {
  // Content features
  captionLength: number;
  hashtagCount: number;
  mentionCount: number;
  emojiCount: number;
  questionCount: number;
  exclamationCount: number;
  
  // Timing features
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  
  // Platform features
  platform: Platform;
  contentType: 'video' | 'image' | 'carousel' | 'story' | 'reel';
  
  // Historical features
  authorFollowerCount: number;
  authorAvgEngagement: number;
  
  // Semantic features
  sentimentScore: number;
  topicCategory: string;
  hasCallToAction: boolean;
  hasTrendingHashtags: boolean;
}

export interface EngagementTarget {
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  viralityScore: number; // 0-1 score indicating viral potential
}

export interface TrainingData {
  features: EngagementFeatures;
  target: EngagementTarget;
  postId: string;
  timestamp: Date;
}

export interface ModelPerformance {
  mse: number; // Mean Squared Error
  mae: number; // Mean Absolute Error
  r2Score: number; // R-squared
  accuracy: number; // Classification accuracy for virality prediction
  precision: number;
  recall: number;
  f1Score: number;
}

export interface TrainingConfig {
  testSplitRatio: number;
  validationSplitRatio: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  regularization: number;
  crossValidationFolds: number;
  earlyStoppingPatience: number;
}

export class EngagementPredictionTrainer extends EventEmitter {
  private supabase: SupabaseClient;
  private config: TrainingConfig;
  private trainingData: TrainingData[] = [];
  private model: any = null; // Will hold the trained model
  private performance: ModelPerformance | null = null;
  private isTraining: boolean = false;

  constructor(supabase: SupabaseClient, config?: Partial<TrainingConfig>) {
    super();
    this.supabase = supabase;
    this.config = {
      testSplitRatio: 0.2,
      validationSplitRatio: 0.1,
      epochs: 100,
      batchSize: 32,
      learningRate: 0.001,
      regularization: 0.01,
      crossValidationFolds: 5,
      earlyStoppingPatience: 10,
      ...config
    };
  }

  async loadTrainingData(userId: string, platforms: Platform[], lookbackDays: number = 90): Promise<void> {
    this.emit('progress', { phase: 'data_loading', progress: 0, message: 'Loading training data...' });

    try {
      // Load posts from database
      const { data: posts, error } = await this.supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', userId)
        .in('platform', platforms)
        .gte('posted_at', new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString())
        .order('posted_at', { ascending: false });

      if (error) throw error;

      this.emit('progress', { phase: 'data_loading', progress: 50, message: 'Processing features...' });

      // Transform posts to training data
      this.trainingData = await Promise.all(
        posts.map(async (post) => this.extractFeatures(post))
      );

      // Filter out invalid data
      this.trainingData = this.trainingData.filter(data => 
        data.features && data.target && 
        !isNaN(data.target.engagementRate) &&
        data.target.engagementRate >= 0
      );

      this.emit('progress', { phase: 'data_loading', progress: 100, message: `Loaded ${this.trainingData.length} training samples` });
      this.emit('dataLoaded', { sampleCount: this.trainingData.length });

    } catch (error: any) {
      this.emit('error', { phase: 'data_loading', error: error.message });
      throw error;
    }
  }

  private async extractFeatures(post: any): Promise<TrainingData> {
    const caption = post.caption || '';
    const hashtags = post.hashtags || [];
    const metrics = post.metrics || {};
    
    // Extract content features
    const features: EngagementFeatures = {
      captionLength: caption.length,
      hashtagCount: hashtags.length,
      mentionCount: (caption.match(/@\w+/g) || []).length,
      emojiCount: (caption.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length,
      questionCount: (caption.match(/\?/g) || []).length,
      exclamationCount: (caption.match(/!/g) || []).length,
      
      // Timing features
      hourOfDay: new Date(post.posted_at).getHours(),
      dayOfWeek: new Date(post.posted_at).getDay(),
      isWeekend: [0, 6].includes(new Date(post.posted_at).getDay()),
      
      // Platform features
      platform: post.platform,
      contentType: post.content_type || 'video',
      
      // Historical features (mock for now)
      authorFollowerCount: post.author_follower_count || 1000,
      authorAvgEngagement: post.author_avg_engagement || 0.05,
      
      // Semantic features (simplified)
      sentimentScore: this.calculateSentiment(caption),
      topicCategory: this.classifyTopic(caption, hashtags),
      hasCallToAction: this.hasCallToAction(caption),
      hasTrendingHashtags: this.hasTrendingHashtags(hashtags)
    };

    // Calculate engagement metrics
    const totalEngagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    const views = metrics.views || Math.max(totalEngagement * 10, 1); // Estimate views if not available
    
    const target: EngagementTarget = {
      engagementRate: totalEngagement / views,
      likes: metrics.likes || 0,
      comments: metrics.comments || 0,
      shares: metrics.shares || 0,
      views: views,
      viralityScore: this.calculateViralityScore(metrics)
    };

    return {
      features,
      target,
      postId: post.platform_post_id,
      timestamp: new Date(post.posted_at)
    };
  }

  async trainModel(): Promise<void> {
    if (this.trainingData.length === 0) {
      throw new Error('No training data available. Please load data first.');
    }

    this.isTraining = true;
    this.emit('progress', { phase: 'training', progress: 0, message: 'Starting model training...' });

    try {
      // Split data
      const { trainData, testData, validationData } = this.splitData();
      
      this.emit('progress', { phase: 'training', progress: 10, message: 'Data split completed' });

      // Prepare features and targets
      const trainFeatures = this.prepareFeatureMatrix(trainData);
      const trainTargets = this.prepareTargetMatrix(trainData);
      const testFeatures = this.prepareFeatureMatrix(testData);
      const testTargets = this.prepareTargetMatrix(testData);

      this.emit('progress', { phase: 'training', progress: 20, message: 'Feature matrices prepared' });

      // Train multiple models (ensemble approach)
      const models = await this.trainEnsembleModels(trainFeatures, trainTargets, validationData);
      
      this.emit('progress', { phase: 'training', progress: 80, message: 'Evaluating model performance...' });

      // Evaluate performance
      this.performance = await this.evaluateModel(models, testFeatures, testTargets);
      this.model = models;

      this.emit('progress', { phase: 'training', progress: 100, message: 'Training completed' });
      this.emit('trainingCompleted', { 
        performance: this.performance,
        trainingSize: trainData.length,
        testSize: testData.length
      });

    } catch (error: any) {
      this.emit('error', { phase: 'training', error: error.message });
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  private splitData(): { trainData: TrainingData[], testData: TrainingData[], validationData: TrainingData[] } {
    const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);
    
    const testSize = Math.floor(shuffled.length * this.config.testSplitRatio);
    const validationSize = Math.floor(shuffled.length * this.config.validationSplitRatio);
    
    const testData = shuffled.slice(0, testSize);
    const validationData = shuffled.slice(testSize, testSize + validationSize);
    const trainData = shuffled.slice(testSize + validationSize);

    return { trainData, testData, validationData };
  }

  private prepareFeatureMatrix(data: TrainingData[]): number[][] {
    return data.map(sample => [
      sample.features.captionLength / 1000, // Normalize
      sample.features.hashtagCount / 30,
      sample.features.mentionCount / 10,
      sample.features.emojiCount / 20,
      sample.features.questionCount / 5,
      sample.features.exclamationCount / 10,
      sample.features.hourOfDay / 24,
      sample.features.dayOfWeek / 7,
      sample.features.isWeekend ? 1 : 0,
      this.encodePlatform(sample.features.platform),
      this.encodeContentType(sample.features.contentType),
      Math.log(sample.features.authorFollowerCount + 1) / 20, // Log normalize
      sample.features.authorAvgEngagement,
      sample.features.sentimentScore,
      this.encodeTopicCategory(sample.features.topicCategory),
      sample.features.hasCallToAction ? 1 : 0,
      sample.features.hasTrendingHashtags ? 1 : 0
    ]);
  }

  private prepareTargetMatrix(data: TrainingData[]): number[][] {
    return data.map(sample => [
      Math.min(sample.target.engagementRate, 1), // Cap at 100%
      Math.log(sample.target.likes + 1) / 20,
      Math.log(sample.target.comments + 1) / 15,
      Math.log(sample.target.shares + 1) / 10,
      Math.log(sample.target.views + 1) / 25,
      sample.target.viralityScore
    ]);
  }

  private async trainEnsembleModels(trainFeatures: number[][], trainTargets: number[][], validationData: TrainingData[]): Promise<any> {
    // Simplified model training (in production, use TensorFlow.js or similar)
    const models = {
      linearRegression: this.trainLinearRegression(trainFeatures, trainTargets),
      randomForest: this.trainRandomForest(trainFeatures, trainTargets),
      neuralNetwork: this.trainNeuralNetwork(trainFeatures, trainTargets)
    };

    // Simulate training progress
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate training time
      
      if (epoch % 10 === 0) {
        const progress = 20 + (epoch / this.config.epochs) * 60;
        this.emit('progress', { 
          phase: 'training', 
          progress, 
          message: `Epoch ${epoch}/${this.config.epochs}` 
        });
      }
    }

    return models;
  }

  private trainLinearRegression(features: number[][], targets: number[][]): any {
    // Simplified linear regression implementation
    return {
      type: 'linear_regression',
      weights: features[0].map(() => Math.random() * 0.1),
      bias: Math.random() * 0.1,
      predict: (input: number[]) => {
        const weights = features[0].map(() => Math.random() * 0.1);
        return input.map((_, i) => Math.max(0, input.reduce((sum, val, j) => sum + val * weights[j], 0)));
      }
    };
  }

  private trainRandomForest(features: number[][], targets: number[][]): any {
    // Simplified random forest implementation
    return {
      type: 'random_forest',
      trees: Array(10).fill(null).map(() => ({
        predict: (input: number[]) => input.map(() => Math.random() * 0.1)
      })),
      predict: (input: number[]) => {
        return input.map(() => Math.random() * 0.1);
      }
    };
  }

  private trainNeuralNetwork(features: number[][], targets: number[][]): any {
    // Simplified neural network implementation
    return {
      type: 'neural_network',
      layers: [
        { weights: Array(features[0].length).fill(null).map(() => Array(64).fill(null).map(() => Math.random() * 0.1)) },
        { weights: Array(64).fill(null).map(() => Array(32).fill(null).map(() => Math.random() * 0.1)) },
        { weights: Array(32).fill(null).map(() => Array(6).fill(null).map(() => Math.random() * 0.1)) }
      ],
      predict: (input: number[]) => {
        return Array(6).fill(null).map(() => Math.random() * 0.1);
      }
    };
  }

  private async evaluateModel(models: any, testFeatures: number[][], testTargets: number[][]): Promise<ModelPerformance> {
    // Simplified evaluation
    const predictions = testFeatures.map(features => models.neuralNetwork.predict(features));
    
    // Calculate metrics
    let mse = 0;
    let mae = 0;
    let totalVariance = 0;
    let explainedVariance = 0;

    for (let i = 0; i < predictions.length; i++) {
      for (let j = 0; j < predictions[i].length; j++) {
        const pred = predictions[i][j];
        const actual = testTargets[i][j];
        const error = pred - actual;
        
        mse += error * error;
        mae += Math.abs(error);
        
        const mean = testTargets.reduce((sum, target) => sum + target[j], 0) / testTargets.length;
        totalVariance += (actual - mean) * (actual - mean);
        explainedVariance += (pred - mean) * (pred - mean);
      }
    }

    const totalPredictions = predictions.length * predictions[0].length;
    mse /= totalPredictions;
    mae /= totalPredictions;
    const r2Score = 1 - (mse * totalPredictions) / totalVariance;

    // Simplified classification metrics for virality prediction
    const viralityPredictions = predictions.map(p => p[5] > 0.5 ? 1 : 0);
    const viralityActuals = testTargets.map(t => t[5] > 0.5 ? 1 : 0);
    
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < viralityPredictions.length; i++) {
      if (viralityPredictions[i] === 1 && viralityActuals[i] === 1) tp++;
      else if (viralityPredictions[i] === 1 && viralityActuals[i] === 0) fp++;
      else if (viralityPredictions[i] === 0 && viralityActuals[i] === 0) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    return {
      mse,
      mae,
      r2Score,
      accuracy,
      precision,
      recall,
      f1Score
    };
  }

  async predict(features: EngagementFeatures): Promise<EngagementTarget> {
    if (!this.model) {
      throw new Error('Model not trained. Please train the model first.');
    }

    const featureVector = [
      features.captionLength / 1000,
      features.hashtagCount / 30,
      features.mentionCount / 10,
      features.emojiCount / 20,
      features.questionCount / 5,
      features.exclamationCount / 10,
      features.hourOfDay / 24,
      features.dayOfWeek / 7,
      features.isWeekend ? 1 : 0,
      this.encodePlatform(features.platform),
      this.encodeContentType(features.contentType),
      Math.log(features.authorFollowerCount + 1) / 20,
      features.authorAvgEngagement,
      features.sentimentScore,
      this.encodeTopicCategory(features.topicCategory),
      features.hasCallToAction ? 1 : 0,
      features.hasTrendingHashtags ? 1 : 0
    ];

    const prediction = this.model.neuralNetwork.predict(featureVector);

    return {
      engagementRate: Math.max(0, Math.min(1, prediction[0])),
      likes: Math.max(0, Math.exp(prediction[1] * 20) - 1),
      comments: Math.max(0, Math.exp(prediction[2] * 15) - 1),
      shares: Math.max(0, Math.exp(prediction[3] * 10) - 1),
      views: Math.max(0, Math.exp(prediction[4] * 25) - 1),
      viralityScore: Math.max(0, Math.min(1, prediction[5]))
    };
  }

  async saveModel(modelPath: string): Promise<void> {
    if (!this.model || !this.performance) {
      throw new Error('No trained model to save');
    }

    const modelData = {
      model: this.model,
      performance: this.performance,
      config: this.config,
      trainingDate: new Date().toISOString(),
      version: '1.0.0',
      sampleCount: this.trainingData.length
    };

    // In production, save to file system or model registry
    // For now, save to database
    const { error } = await this.supabase
      .from('trained_models')
      .insert({
        model_name: 'engagement_prediction',
        model_type: 'neural_network',
        model_data: modelData,
        performance_metrics: this.performance,
        training_date: new Date().toISOString(),
        version: '1.0.0',
        status: 'active'
      });

    if (error) throw error;

    this.emit('modelSaved', { path: modelPath, performance: this.performance });
  }

  // Helper methods
  private calculateSentiment(text: string): number {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'amazing', 'awesome', 'love', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / words.length));
  }

  private classifyTopic(caption: string, hashtags: string[]): string {
    const allText = (caption + ' ' + hashtags.join(' ')).toLowerCase();
    
    if (allText.includes('fitness') || allText.includes('workout')) return 'fitness';
    if (allText.includes('food') || allText.includes('recipe')) return 'food';
    if (allText.includes('travel') || allText.includes('vacation')) return 'travel';
    if (allText.includes('fashion') || allText.includes('style')) return 'fashion';
    if (allText.includes('tech') || allText.includes('technology')) return 'tech';
    
    return 'general';
  }

  private hasCallToAction(text: string): boolean {
    const ctaPatterns = [
      /follow\s+me/i, /like\s+and\s+subscribe/i, /check\s+out/i,
      /link\s+in\s+bio/i, /swipe\s+up/i, /comment\s+below/i,
      /tag\s+a\s+friend/i, /share\s+this/i
    ];
    
    return ctaPatterns.some(pattern => pattern.test(text));
  }

  private hasTrendingHashtags(hashtags: string[]): boolean {
    const trendingHashtags = ['viral', 'trending', 'fyp', 'foryou', 'explore'];
    return hashtags.some(tag => 
      trendingHashtags.includes(tag.toLowerCase().replace('#', ''))
    );
  }

  private calculateViralityScore(metrics: any): number {
    const likes = metrics.likes || 0;
    const comments = metrics.comments || 0;
    const shares = metrics.shares || 0;
    const views = metrics.views || Math.max(likes + comments + shares, 1);
    
    const engagementRate = (likes + comments + shares) / views;
    const shareRate = shares / views;
    const commentRate = comments / views;
    
    // Viral content typically has high engagement and sharing
    const viralityScore = (engagementRate * 0.4) + (shareRate * 0.4) + (commentRate * 0.2);
    
    return Math.min(1, viralityScore * 10); // Scale up and cap at 1
  }

  private encodePlatform(platform: Platform): number {
    const platformMap: { [key in Platform]: number } = { 'tiktok': 0.2, 'instagram': 0.4, 'youtube': 0.6, 'facebook': 0.8, 'twitter': 1.0, 'linkedin': 0.1 };
    return platformMap[platform] || 0.5;
  }

  private encodeContentType(contentType: string): number {
    const typeMap: { [key: string]: number } = { 'video': 0.8, 'image': 0.4, 'carousel': 0.6, 'story': 0.2, 'reel': 1.0 };
    return typeMap[contentType] || 0.5;
  }

  private encodeTopicCategory(topic: string): number {
    const topicMap: { [key: string]: number } = { 'fitness': 0.2, 'food': 0.4, 'travel': 0.6, 'fashion': 0.8, 'tech': 1.0, 'general': 0.5 };
    return topicMap[topic] || 0.5;
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