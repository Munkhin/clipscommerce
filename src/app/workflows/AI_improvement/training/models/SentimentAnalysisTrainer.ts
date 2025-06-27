import { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from '../../types/niche_types';
import { EventEmitter } from 'events';

export interface SentimentFeatures {
  // Text features
  text: string;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  avgWordLength: number;
  
  // Lexical features
  positiveWordCount: number;
  negativeWordCount: number;
  emotionalWordCount: number;
  intensifierCount: number;
  
  // Punctuation features
  exclamationCount: number;
  questionCount: number;
  capsRatio: number;
  
  // Emoji features
  emojiCount: number;
  positiveEmojiCount: number;
  negativeEmojiCount: number;
  
  // Context features
  platform: Platform;
  contentType: string;
  hasHashtags: boolean;
  hasMentions: boolean;
}

export interface SentimentTarget {
  // Primary sentiment
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  confidence: number; // 0 to 1
  
  // Emotional dimensions
  valence: number; // Pleasant vs Unpleasant (-1 to 1)
  arousal: number; // Calm vs Excited (-1 to 1)
  dominance: number; // Submissive vs Dominant (-1 to 1)
  
  // Specific emotions
  joy: number;
  anger: number;
  fear: number;
  sadness: number;
  surprise: number;
  disgust: number;
  
  // Content characteristics
  authenticity: number; // How genuine the sentiment feels
  intensity: number; // How strong the emotion is
  subjectivity: number; // Objective vs Subjective
}

export interface TrainingData {
  features: SentimentFeatures;
  target: SentimentTarget;
  postId: string;
  timestamp: Date;
}

export interface ModelPerformance {
  // Classification metrics
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  
  // Multi-class metrics
  macroF1: number;
  microF1: number;
  weightedF1: number;
  
  // Regression metrics for scores
  sentimentScoreMSE: number;
  sentimentScoreMAE: number;
  
  // Confusion matrix
  confusionMatrix: number[][];
  
  // Per-class performance
  classPerformance: Record<string, {
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
  }>;
}

export class SentimentAnalysisTrainer extends EventEmitter {
  private supabase: SupabaseClient;
  private trainingData: TrainingData[] = [];
  private model: any = null;
  private performance: ModelPerformance | null = null;
  private isTraining: boolean = false;
  
  // Sentiment lexicons
  private positiveWords: Set<string> = new Set();
  private negativeWords: Set<string> = new Set();
  private emotionalWords: Map<string, string> = new Map();
  private intensifiers: Set<string> = new Set();

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
    this.initializeLexicons();
  }

  private initializeLexicons(): void {
    // Positive words
    const positiveWordsList = [
      'amazing', 'awesome', 'beautiful', 'best', 'brilliant', 'excellent', 'fantastic',
      'good', 'great', 'happy', 'incredible', 'love', 'perfect', 'wonderful',
      'outstanding', 'superb', 'marvelous', 'delightful', 'fabulous', 'terrific'
    ];
    positiveWordsList.forEach(word => this.positiveWords.add(word));

    // Negative words
    const negativeWordsList = [
      'awful', 'bad', 'terrible', 'horrible', 'disgusting', 'hate', 'worst',
      'disappointing', 'annoying', 'frustrating', 'sad', 'angry', 'upset',
      'pathetic', 'useless', 'boring', 'stupid', 'ridiculous', 'outrageous'
    ];
    negativeWordsList.forEach(word => this.negativeWords.add(word));

    // Emotional words with categories
    const emotionalWordsList = [
      ['joy', 'happy'], ['joy', 'excited'], ['joy', 'thrilled'], ['joy', 'delighted'],
      ['anger', 'angry'], ['anger', 'furious'], ['anger', 'mad'], ['anger', 'irritated'],
      ['fear', 'scared'], ['fear', 'afraid'], ['fear', 'terrified'], ['fear', 'worried'],
      ['sadness', 'sad'], ['sadness', 'depressed'], ['sadness', 'miserable'], ['sadness', 'heartbroken'],
      ['surprise', 'surprised'], ['surprise', 'shocked'], ['surprise', 'amazed'], ['surprise', 'astonished'],
      ['disgust', 'disgusted'], ['disgust', 'revolted'], ['disgust', 'repulsed'], ['disgust', 'sickened']
    ];
    emotionalWordsList.forEach(([emotion, word]) => this.emotionalWords.set(word, emotion));

    // Intensifiers
    const intensifiersList = [
      'very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally',
      'really', 'quite', 'rather', 'pretty', 'so', 'too', 'highly', 'deeply'
    ];
    intensifiersList.forEach(word => this.intensifiers.add(word));
  }

  async loadTrainingData(userId: string, platforms: Platform[], lookbackDays: number = 90): Promise<void> {
    this.emit('progress', { phase: 'data_loading', progress: 0, message: 'Loading sentiment training data...' });

    try {
      // Load posts with engagement data to infer sentiment
      const { data: posts, error } = await this.supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', userId)
        .in('platform', platforms)
        .gte('posted_at', new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString())
        .order('posted_at', { ascending: false });

      if (error) throw error;

      this.emit('progress', { phase: 'data_loading', progress: 50, message: 'Processing sentiment features...' });

      // Transform posts to training data
      this.trainingData = await Promise.all(
        posts
          .filter(post => post.caption && post.caption.length > 10) // Filter out very short captions
          .map(async (post) => this.extractSentimentFeatures(post))
      );

      this.emit('progress', { phase: 'data_loading', progress: 100, message: `Loaded ${this.trainingData.length} sentiment samples` });
      this.emit('dataLoaded', { sampleCount: this.trainingData.length });

    } catch (error) {
      this.emit('error', { phase: 'data_loading', error: error.message });
      throw error;
    }
  }

  private async extractSentimentFeatures(post: any): Promise<TrainingData> {
    const text = post.caption || '';
    const words = text.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Extract text features
    const features: SentimentFeatures = {
      text,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: words.length / Math.max(sentences.length, 1),
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1),
      
      // Lexical features
      positiveWordCount: words.filter(word => this.positiveWords.has(word)).length,
      negativeWordCount: words.filter(word => this.negativeWords.has(word)).length,
      emotionalWordCount: words.filter(word => this.emotionalWords.has(word)).length,
      intensifierCount: words.filter(word => this.intensifiers.has(word)).length,
      
      // Punctuation features
      exclamationCount: (text.match(/!/g) || []).length,
      questionCount: (text.match(/\?/g) || []).length,
      capsRatio: (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1),
      
      // Emoji features
      emojiCount: (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length,
      positiveEmojiCount: this.countPositiveEmojis(text),
      negativeEmojiCount: this.countNegativeEmojis(text),
      
      // Context features
      platform: post.platform,
      contentType: post.content_type || 'video',
      hasHashtags: (post.hashtags || []).length > 0,
      hasMentions: /@\w+/.test(text)
    };

    // Infer sentiment from engagement and content
    const target = this.inferSentimentTarget(post, features);

    return {
      features,
      target,
      postId: post.platform_post_id,
      timestamp: new Date(post.posted_at)
    };
  }

  private inferSentimentTarget(post: any, features: SentimentFeatures): SentimentTarget {
    const metrics = post.metrics || {};
    const text = features.text.toLowerCase();
    
    // Calculate basic sentiment score
    const positiveScore = features.positiveWordCount + features.positiveEmojiCount;
    const negativeScore = features.negativeWordCount + features.negativeEmojiCount;
    const totalSentimentWords = positiveScore + negativeScore;
    
    let sentimentScore = 0;
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    if (totalSentimentWords > 0) {
      sentimentScore = (positiveScore - negativeScore) / totalSentimentWords;
      if (sentimentScore > 0.2) sentiment = 'positive';
      else if (sentimentScore < -0.2) sentiment = 'negative';
    }
    
    // Adjust based on engagement (high engagement often indicates positive sentiment)
    const engagementRate = this.calculateEngagementRate(metrics);
    if (engagementRate > 0.1) {
      sentimentScore += 0.2;
      if (sentiment === 'neutral' && sentimentScore > 0.1) sentiment = 'positive';
    }
    
    // Calculate emotional dimensions
    const valence = this.calculateValence(features, metrics);
    const arousal = this.calculateArousal(features);
    const dominance = this.calculateDominance(features);
    
    // Calculate specific emotions
    const emotions = this.calculateSpecificEmotions(features, text);
    
    // Calculate content characteristics
    const authenticity = this.calculateAuthenticity(features);
    const intensity = this.calculateIntensity(features);
    const subjectivity = this.calculateSubjectivity(features);
    
    return {
      sentiment,
      sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
      confidence: Math.min(1, totalSentimentWords / 10 + engagementRate),
      valence,
      arousal,
      dominance,
      ...emotions,
      authenticity,
      intensity,
      subjectivity
    };
  }

  async trainModel(): Promise<void> {
    if (this.trainingData.length === 0) {
      throw new Error('No training data available. Please load data first.');
    }

    this.isTraining = true;
    this.emit('progress', { phase: 'training', progress: 0, message: 'Starting sentiment analysis training...' });

    try {
      // Split data
      const { trainData, testData } = this.splitData();
      
      this.emit('progress', { phase: 'training', progress: 20, message: 'Training sentiment classifier...' });
      
      // Train sentiment classifier
      const sentimentClassifier = await this.trainSentimentClassifier(trainData);
      
      this.emit('progress', { phase: 'training', progress: 40, message: 'Training emotion detector...' });
      
      // Train emotion detector
      const emotionDetector = await this.trainEmotionDetector(trainData);
      
      this.emit('progress', { phase: 'training', progress: 60, message: 'Training sentiment scorer...' });
      
      // Train sentiment scorer
      const sentimentScorer = await this.trainSentimentScorer(trainData);
      
      this.emit('progress', { phase: 'training', progress: 80, message: 'Evaluating model performance...' });
      
      // Combine models
      this.model = {
        sentimentClassifier,
        emotionDetector,
        sentimentScorer,
        version: '1.0.0',
        trainedAt: new Date()
      };
      
      // Evaluate performance
      this.performance = await this.evaluateModel(testData);
      
      this.emit('progress', { phase: 'training', progress: 100, message: 'Sentiment analysis training completed' });
      this.emit('trainingCompleted', { 
        performance: this.performance,
        trainingSize: trainData.length,
        testSize: testData.length
      });

    } catch (error) {
      this.emit('error', { phase: 'training', error: error.message });
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  private splitData(): { trainData: TrainingData[], testData: TrainingData[] } {
    const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);
    const splitPoint = Math.floor(shuffled.length * 0.8);
    
    return {
      trainData: shuffled.slice(0, splitPoint),
      testData: shuffled.slice(splitPoint)
    };
  }

  private async trainSentimentClassifier(trainData: TrainingData[]): Promise<any> {
    // Group data by sentiment class
    const classData = {
      positive: trainData.filter(d => d.target.sentiment === 'positive'),
      negative: trainData.filter(d => d.target.sentiment === 'negative'),
      neutral: trainData.filter(d => d.target.sentiment === 'neutral')
    };

    // Calculate class statistics
    const classStats = Object.entries(classData).map(([sentiment, data]) => ({
      sentiment,
      count: data.length,
      avgPositiveWords: data.reduce((sum, d) => sum + d.features.positiveWordCount, 0) / data.length,
      avgNegativeWords: data.reduce((sum, d) => sum + d.features.negativeWordCount, 0) / data.length,
      avgEmotionalWords: data.reduce((sum, d) => sum + d.features.emotionalWordCount, 0) / data.length,
      avgExclamations: data.reduce((sum, d) => sum + d.features.exclamationCount, 0) / data.length,
      avgCapsRatio: data.reduce((sum, d) => sum + d.features.capsRatio, 0) / data.length
    }));

    return {
      type: 'naive_bayes',
      classStats,
      predict: (features: SentimentFeatures) => {
        const scores = classStats.map(stat => {
          let score = 0;
          
          // Feature scoring
          score += Math.abs(features.positiveWordCount - stat.avgPositiveWords) * -0.1;
          score += Math.abs(features.negativeWordCount - stat.avgNegativeWords) * -0.1;
          score += Math.abs(features.emotionalWordCount - stat.avgEmotionalWords) * -0.05;
          score += Math.abs(features.exclamationCount - stat.avgExclamations) * -0.05;
          score += Math.abs(features.capsRatio - stat.avgCapsRatio) * -0.1;
          
          return { sentiment: stat.sentiment, score };
        });
        
        const bestMatch = scores.reduce((best, current) => 
          current.score > best.score ? current : best
        );
        
        return {
          sentiment: bestMatch.sentiment,
          confidence: Math.max(0.1, Math.min(0.9, (bestMatch.score + 1) / 2))
        };
      }
    };
  }

  private async trainEmotionDetector(trainData: TrainingData[]): Promise<any> {
    // Calculate emotion patterns
    const emotionPatterns = {
      joy: this.calculateEmotionPattern(trainData, 'joy'),
      anger: this.calculateEmotionPattern(trainData, 'anger'),
      fear: this.calculateEmotionPattern(trainData, 'fear'),
      sadness: this.calculateEmotionPattern(trainData, 'sadness'),
      surprise: this.calculateEmotionPattern(trainData, 'surprise'),
      disgust: this.calculateEmotionPattern(trainData, 'disgust')
    };

    return {
      type: 'emotion_detector',
      patterns: emotionPatterns,
      predict: (features: SentimentFeatures) => {
        const emotions: any = {};
        
        Object.entries(emotionPatterns).forEach(([emotion, pattern]) => {
          let score = 0;
          
          // Check for emotion-specific words
          const emotionWords = features.text.toLowerCase().split(/\s+/)
            .filter(word => this.emotionalWords.get(word) === emotion);
          score += emotionWords.length * 0.3;
          
          // Check for general sentiment alignment
          if (emotion === 'joy' && features.positiveWordCount > 0) score += 0.2;
          if (['anger', 'fear', 'sadness', 'disgust'].includes(emotion) && features.negativeWordCount > 0) score += 0.2;
          if (emotion === 'surprise' && features.exclamationCount > 0) score += 0.1;
          
          emotions[emotion] = Math.min(1, score);
        });
        
        return emotions;
      }
    };
  }

  private async trainSentimentScorer(trainData: TrainingData[]): Promise<any> {
    // Calculate scoring weights based on training data
    const weights = {
      positiveWords: 0.3,
      negativeWords: -0.3,
      emotionalWords: 0.1,
      intensifiers: 0.1,
      exclamations: 0.05,
      positiveEmojis: 0.2,
      negativeEmojis: -0.2,
      capsRatio: 0.05
    };

    return {
      type: 'weighted_scorer',
      weights,
      predict: (features: SentimentFeatures) => {
        let score = 0;
        
        score += features.positiveWordCount * weights.positiveWords;
        score += features.negativeWordCount * weights.negativeWords;
        score += features.emotionalWordCount * weights.emotionalWords;
        score += features.intensifierCount * weights.intensifiers;
        score += features.exclamationCount * weights.exclamations;
        score += features.positiveEmojiCount * weights.positiveEmojis;
        score += features.negativeEmojiCount * weights.negativeEmojis;
        score += features.capsRatio * weights.capsRatio;
        
        // Normalize score
        const normalizedScore = Math.tanh(score / 5); // Use tanh to bound between -1 and 1
        
        return {
          sentimentScore: normalizedScore,
          confidence: Math.min(1, Math.abs(normalizedScore) + 0.1)
        };
      }
    };
  }

  async analyzeSentiment(text: string, platform: Platform = 'instagram', contentType: string = 'post'): Promise<SentimentTarget> {
    if (!this.model) {
      throw new Error('Model not trained. Please train the model first.');
    }

    // Extract features
    const features = this.extractFeaturesFromText(text, platform, contentType);
    
    // Get predictions from all models
    const sentimentPrediction = this.model.sentimentClassifier.predict(features);
    const emotionPrediction = this.model.emotionDetector.predict(features);
    const scorePrediction = this.model.sentimentScorer.predict(features);
    
    // Combine predictions
    return {
      sentiment: sentimentPrediction.sentiment,
      sentimentScore: scorePrediction.sentimentScore,
      confidence: (sentimentPrediction.confidence + scorePrediction.confidence) / 2,
      
      // Use simplified calculations for other dimensions
      valence: scorePrediction.sentimentScore,
      arousal: Math.min(1, features.exclamationCount * 0.2 + features.capsRatio),
      dominance: Math.min(1, features.intensifierCount * 0.3),
      
      // Emotions from detector
      joy: emotionPrediction.joy || 0,
      anger: emotionPrediction.anger || 0,
      fear: emotionPrediction.fear || 0,
      sadness: emotionPrediction.sadness || 0,
      surprise: emotionPrediction.surprise || 0,
      disgust: emotionPrediction.disgust || 0,
      
      // Content characteristics
      authenticity: this.calculateAuthenticity(features),
      intensity: Math.min(1, (features.intensifierCount + features.exclamationCount) * 0.2),
      subjectivity: Math.min(1, (features.positiveWordCount + features.negativeWordCount) / Math.max(features.wordCount, 1))
    };
  }

  private extractFeaturesFromText(text: string, platform: Platform, contentType: string): SentimentFeatures {
    const words = text.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      text,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: words.length / Math.max(sentences.length, 1),
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1),
      
      positiveWordCount: words.filter(word => this.positiveWords.has(word)).length,
      negativeWordCount: words.filter(word => this.negativeWords.has(word)).length,
      emotionalWordCount: words.filter(word => this.emotionalWords.has(word)).length,
      intensifierCount: words.filter(word => this.intensifiers.has(word)).length,
      
      exclamationCount: (text.match(/!/g) || []).length,
      questionCount: (text.match(/\?/g) || []).length,
      capsRatio: (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1),
      
      emojiCount: (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length,
      positiveEmojiCount: this.countPositiveEmojis(text),
      negativeEmojiCount: this.countNegativeEmojis(text),
      
      platform,
      contentType,
      hasHashtags: /#\w+/.test(text),
      hasMentions: /@\w+/.test(text)
    };
  }

  private async evaluateModel(testData: TrainingData[]): Promise<ModelPerformance> {
    const predictions = testData.map(data => {
      const sentimentPrediction = this.model.sentimentClassifier.predict(data.features);
      const scorePrediction = this.model.sentimentScorer.predict(data.features);
      
      return {
        predicted: sentimentPrediction.sentiment,
        actual: data.target.sentiment,
        predictedScore: scorePrediction.sentimentScore,
        actualScore: data.target.sentimentScore
      };
    });

    // Calculate classification metrics
    const classes = ['positive', 'negative', 'neutral'];
    const confusionMatrix = this.calculateConfusionMatrix(predictions, classes);
    
    let totalCorrect = 0;
    let totalPredictions = predictions.length;
    
    predictions.forEach(pred => {
      if (pred.predicted === pred.actual) totalCorrect++;
    });
    
    const accuracy = totalCorrect / totalPredictions;
    
    // Calculate per-class metrics
    const classPerformance: Record<string, any> = {};
    classes.forEach(cls => {
      const tp = predictions.filter(p => p.predicted === cls && p.actual === cls).length;
      const fp = predictions.filter(p => p.predicted === cls && p.actual !== cls).length;
      const fn = predictions.filter(p => p.predicted !== cls && p.actual === cls).length;
      
      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
      const support = predictions.filter(p => p.actual === cls).length;
      
      classPerformance[cls] = { precision, recall, f1Score, support };
    });
    
    // Calculate macro and micro averages
    const macroF1 = Object.values(classPerformance).reduce((sum: number, perf: any) => sum + perf.f1Score, 0) / classes.length;
    const microF1 = accuracy; // For multi-class, micro F1 equals accuracy
    
    // Calculate weighted F1
    const totalSupport = Object.values(classPerformance).reduce((sum: number, perf: any) => sum + perf.support, 0);
    const weightedF1 = Object.values(classPerformance).reduce((sum: number, perf: any) => 
      sum + (perf.f1Score * perf.support), 0) / totalSupport;
    
    // Calculate regression metrics for sentiment scores
    const scoreErrors = predictions.map(p => p.predictedScore - p.actualScore);
    const sentimentScoreMSE = scoreErrors.reduce((sum, error) => sum + error * error, 0) / scoreErrors.length;
    const sentimentScoreMAE = scoreErrors.reduce((sum, error) => sum + Math.abs(error), 0) / scoreErrors.length;
    
    return {
      accuracy,
      precision: Object.values(classPerformance).reduce((sum: number, perf: any) => sum + perf.precision, 0) / classes.length,
      recall: Object.values(classPerformance).reduce((sum: number, perf: any) => sum + perf.recall, 0) / classes.length,
      f1Score: macroF1,
      macroF1,
      microF1,
      weightedF1,
      sentimentScoreMSE,
      sentimentScoreMAE,
      confusionMatrix,
      classPerformance
    };
  }

  async saveModel(modelPath: string): Promise<void> {
    if (!this.model || !this.performance) {
      throw new Error('No trained model to save');
    }

    const modelData = {
      model: this.model,
      performance: this.performance,
      lexicons: {
        positiveWords: Array.from(this.positiveWords),
        negativeWords: Array.from(this.negativeWords),
        emotionalWords: Object.fromEntries(this.emotionalWords),
        intensifiers: Array.from(this.intensifiers)
      },
      trainingDate: new Date().toISOString(),
      version: '1.0.0',
      sampleCount: this.trainingData.length
    };

    const { error } = await this.supabase
      .from('trained_models')
      .insert({
        model_name: 'sentiment_analysis',
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

  // Helper methods
  private countPositiveEmojis(text: string): number {
    const positiveEmojis = ['😊', '😃', '😄', '😁', '😆', '😍', '🥰', '😘', '🤗', '😎', '🤩', '🥳', '👍', '👌', '✨', '🎉', '❤️', '💕', '🔥'];
    return positiveEmojis.reduce((count, emoji) => count + (text.split(emoji).length - 1), 0);
  }

  private countNegativeEmojis(text: string): number {
    const negativeEmojis = ['😢', '😭', '😞', '😔', '😟', '😕', '🙁', '😤', '😠', '😡', '🤬', '😰', '😨', '😱', '👎', '💔', '😷', '🤢', '🤮'];
    return negativeEmojis.reduce((count, emoji) => count + (text.split(emoji).length - 1), 0);
  }

  private calculateEngagementRate(metrics: any): number {
    const likes = metrics.likes || 0;
    const comments = metrics.comments || 0;
    const shares = metrics.shares || 0;
    const views = metrics.views || Math.max(likes + comments + shares, 1);
    
    return (likes + comments + shares) / views;
  }

  private calculateValence(features: SentimentFeatures, metrics: any): number {
    let valence = 0;
    
    // Positive indicators
    valence += features.positiveWordCount * 0.2;
    valence += features.positiveEmojiCount * 0.3;
    
    // Negative indicators
    valence -= features.negativeWordCount * 0.2;
    valence -= features.negativeEmojiCount * 0.3;
    
    // Engagement boost
    const engagementRate = this.calculateEngagementRate(metrics);
    if (engagementRate > 0.05) valence += 0.1;
    
    return Math.max(-1, Math.min(1, valence));
  }

  private calculateArousal(features: SentimentFeatures): number {
    let arousal = 0;
    
    arousal += features.exclamationCount * 0.2;
    arousal += features.capsRatio * 0.3;
    arousal += features.intensifierCount * 0.1;
    arousal += Math.min(1, features.emojiCount * 0.1);
    
    return Math.min(1, arousal);
  }

  private calculateDominance(features: SentimentFeatures): number {
    let dominance = 0;
    
    dominance += features.intensifierCount * 0.3;
    dominance += features.exclamationCount * 0.1;
    
    // Questions reduce dominance
    dominance -= features.questionCount * 0.1;
    
    return Math.max(-1, Math.min(1, dominance));
  }

  private calculateSpecificEmotions(features: SentimentFeatures, text: string): any {
    const emotions = {
      joy: 0,
      anger: 0,
      fear: 0,
      sadness: 0,
      surprise: 0,
      disgust: 0
    };

    // Check for emotion-specific words
    const words = text.split(/\s+/);
    words.forEach(word => {
      const emotion = this.emotionalWords.get(word.toLowerCase());
      if (emotion && emotions.hasOwnProperty(emotion)) {
        emotions[emotion as keyof typeof emotions] += 0.2;
      }
    });

    // Adjust based on general sentiment
    if (features.positiveWordCount > 0) {
      emotions.joy += features.positiveWordCount * 0.1;
    }
    
    if (features.negativeWordCount > 0) {
      emotions.anger += features.negativeWordCount * 0.05;
      emotions.sadness += features.negativeWordCount * 0.05;
    }
    
    if (features.exclamationCount > 0) {
      emotions.surprise += features.exclamationCount * 0.1;
    }

    // Normalize emotions
    Object.keys(emotions).forEach(key => {
      emotions[key as keyof typeof emotions] = Math.min(1, emotions[key as keyof typeof emotions]);
    });

    return emotions;
  }

  private calculateAuthenticity(features: SentimentFeatures): number {
    let authenticity = 0.5; // Base authenticity
    
    // Personal pronouns increase authenticity
    const personalPronouns = features.text.toLowerCase().match(/\b(i|me|my|myself|we|us|our)\b/g) || [];
    authenticity += personalPronouns.length * 0.05;
    
    // Moderate emoji use increases authenticity
    if (features.emojiCount > 0 && features.emojiCount <= 3) {
      authenticity += 0.1;
    } else if (features.emojiCount > 5) {
      authenticity -= 0.1; // Too many emojis might seem inauthentic
    }
    
    // Balanced caps ratio
    if (features.capsRatio > 0 && features.capsRatio < 0.3) {
      authenticity += 0.05;
    } else if (features.capsRatio > 0.5) {
      authenticity -= 0.1; // All caps might seem less authentic
    }
    
    return Math.max(0, Math.min(1, authenticity));
  }

  private calculateIntensity(features: SentimentFeatures): number {
    let intensity = 0;
    
    intensity += features.intensifierCount * 0.2;
    intensity += features.exclamationCount * 0.15;
    intensity += features.capsRatio * 0.3;
    intensity += Math.min(1, features.emojiCount * 0.1);
    
    return Math.min(1, intensity);
  }

  private calculateSubjectivity(features: SentimentFeatures): number {
    let subjectivity = 0;
    
    // Opinion words increase subjectivity
    subjectivity += (features.positiveWordCount + features.negativeWordCount) / Math.max(features.wordCount, 1);
    subjectivity += features.emotionalWordCount / Math.max(features.wordCount, 1);
    
    // Personal pronouns increase subjectivity
    const personalPronouns = features.text.toLowerCase().match(/\b(i|me|my|myself|think|feel|believe)\b/g) || [];
    subjectivity += personalPronouns.length / Math.max(features.wordCount, 1);
    
    return Math.min(1, subjectivity);
  }

  private calculateEmotionPattern(trainData: TrainingData[], emotion: string): any {
    const emotionData = trainData.filter(data => {
      const emotionScore = (data.target as any)[emotion];
      return emotionScore && emotionScore > 0.3;
    });

    if (emotionData.length === 0) {
      return { avgFeatures: {}, count: 0 };
    }

    const avgFeatures = {
      positiveWordCount: emotionData.reduce((sum, d) => sum + d.features.positiveWordCount, 0) / emotionData.length,
      negativeWordCount: emotionData.reduce((sum, d) => sum + d.features.negativeWordCount, 0) / emotionData.length,
      emotionalWordCount: emotionData.reduce((sum, d) => sum + d.features.emotionalWordCount, 0) / emotionData.length,
      exclamationCount: emotionData.reduce((sum, d) => sum + d.features.exclamationCount, 0) / emotionData.length,
      capsRatio: emotionData.reduce((sum, d) => sum + d.features.capsRatio, 0) / emotionData.length
    };

    return { avgFeatures, count: emotionData.length };
  }

  private calculateConfusionMatrix(predictions: any[], classes: string[]): number[][] {
    const matrix = classes.map(() => classes.map(() => 0));
    
    predictions.forEach(pred => {
      const actualIndex = classes.indexOf(pred.actual);
      const predictedIndex = classes.indexOf(pred.predicted);
      
      if (actualIndex >= 0 && predictedIndex >= 0) {
        matrix[actualIndex][predictedIndex]++;
      }
    });
    
    return matrix;
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