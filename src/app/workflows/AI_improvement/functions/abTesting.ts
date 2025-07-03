import { Platform, PlatformEnum } from '@/types/platform';
import { PostMetrics } from '../../data_collection/functions/types';
import { Beta } from 'jstat'; // Use jstat for Beta distribution (if not available, mock below)

export type { Platform }; // Re-export Platform type

// A/B Testing Types
export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  weight: number; // Traffic allocation percentage (0-100)
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  variants: ExperimentVariant[];
  startDate: Date;
  endDate?: Date;
  targetMetric: 'engagementRate' | 'likes' | 'comments' | 'shares' | 'views';
  minimumSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // --- Bayesian extensions ---
  priorAlpha?: number; // For Beta prior
  priorBeta?: number;  // For Beta prior
  infoGain?: number;   // Track information gain for sequential stopping
}

export interface ExperimentResult {
  variantId: string;
  sampleSize: number;
  metrics: {
    mean: number;
    standardDeviation: number;
    confidenceInterval: [number, number];
  };
  conversionRate?: number;
  significance?: number;
}

export interface ExperimentAnalysis {
  experimentId: string;
  status: 'insufficient_data' | 'no_significant_difference' | 'significant_difference';
  results: ExperimentResult[];
  winningVariant?: string;
  confidenceLevel: number;
  pValue?: number;
  effectSize?: number;
  recommendations: string[];
  analysisDate: Date;
}

import { SupabaseClient } from '@supabase/supabase-js';

// Database integration for experiments
export class ExperimentManager {
  private supabase: SupabaseClient;
  private experimentsCache: Map<string, Experiment> = new Map();
  private experimentDataCache: Map<string, Map<string, PostMetrics[]>> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async initializeDatabase(): Promise<void> {
    // Ensure database tables exist and are properly set up
    const { error } = await this.supabase.from('ab_experiments').select('id').limit(1);
    if (error) {
      throw new Error(`A/B testing database not properly configured: ${error.message}`);
    }
  }

  /**
   * Creates a new A/B test experiment with database persistence
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    const id = this.generateExperimentId();
    const now = new Date();
    
    const newExperiment: Experiment = {
      ...experiment,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Validate experiment configuration
    this.validateExperiment(newExperiment);
    
    // Store in database
    const { error } = await this.supabase
      .from('ab_experiments')
      .insert({
        experiment_id: id,
        name: newExperiment.name,
        description: newExperiment.description,
        platform: newExperiment.platform,
        status: newExperiment.status,
        variants: newExperiment.variants,
        target_metric: newExperiment.targetMetric,
        minimum_sample_size: newExperiment.minimumSampleSize,
        confidence_level: newExperiment.confidenceLevel,
        prior_alpha: newExperiment.priorAlpha,
        prior_beta: newExperiment.priorBeta,
        start_date: newExperiment.startDate?.toISOString(),
        end_date: newExperiment.endDate?.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        user_id: newExperiment.createdBy
      });

    if (error) {
      throw new Error(`Failed to create experiment: ${error.message}`);
    }
    
    // Cache locally
    this.experimentsCache.set(id, newExperiment);
    this.experimentDataCache.set(id, new Map());
    
    return newExperiment;
  }

  /**
   * Updates an existing experiment with database persistence
   */
  async updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment | null> {
    let experiment: Experiment | null | undefined = this.experimentsCache.get(id);
    
    if (!experiment) {
      // Try to load from database
      experiment = await this.getExperiment(id);
      if (!experiment) return null;
    }

    const updatedExperiment = {
      ...experiment,
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date(),
    };

    this.validateExperiment(updatedExperiment);
    
    // Update in database
    const { error } = await this.supabase
      .from('ab_experiments')
      .update({
        name: updatedExperiment.name,
        description: updatedExperiment.description,
        status: updatedExperiment.status,
        variants: updatedExperiment.variants,
        target_metric: updatedExperiment.targetMetric,
        minimum_sample_size: updatedExperiment.minimumSampleSize,
        confidence_level: updatedExperiment.confidenceLevel,
        prior_alpha: updatedExperiment.priorAlpha,
        prior_beta: updatedExperiment.priorBeta,
        start_date: updatedExperiment.startDate?.toISOString(),
        end_date: updatedExperiment.endDate?.toISOString(),
        updated_at: updatedExperiment.updatedAt.toISOString()
      })
      .eq('experiment_id', id);

    if (error) {
      throw new Error(`Failed to update experiment: ${error.message}`);
    }
    
    this.experimentsCache.set(id, updatedExperiment);
    
    return updatedExperiment;
  }

  /**
   * Gets an experiment by ID with database fallback
   */
  async getExperiment(id: string): Promise<Experiment | null> {
    // Check cache first
    const cached = this.experimentsCache.get(id);
    if (cached) return cached;

    // Load from database
    const { data, error } = await this.supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', id)
      .single();

    if (error || !data) return null;

    const experiment: Experiment = {
      id: data.experiment_id,
      name: data.name,
      description: data.description,
      platform: data.platform,
      status: data.status,
      variants: data.variants,
      targetMetric: data.target_metric,
      minimumSampleSize: data.minimum_sample_size,
      confidenceLevel: data.confidence_level,
      priorAlpha: data.prior_alpha,
      priorBeta: data.prior_beta,
      startDate: data.start_date ? new Date(data.start_date) : new Date(),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.user_id
    };

    this.experimentsCache.set(id, experiment);
    return experiment;
  }

  /**
   * Lists all experiments with optional filtering
   */
  async listExperiments(filters?: {
    platform?: Platform;
    status?: Experiment['status'];
    createdBy?: string;
  }): Promise<Experiment[]> {
    let query = this.supabase.from('ab_experiments').select('*');

    if (filters) {
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.createdBy) {
        query = query.eq('user_id', filters.createdBy);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to list experiments:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.experiment_id,
      name: d.name,
      description: d.description,
      platform: d.platform,
      status: d.status,
      variants: d.variants,
      targetMetric: d.target_metric,
      minimumSampleSize: d.minimum_sample_size,
      confidenceLevel: d.confidence_level,
      priorAlpha: d.prior_alpha,
      priorBeta: d.prior_beta,
      startDate: d.start_date ? new Date(d.start_date) : new Date(),
      endDate: d.end_date ? new Date(d.end_date) : undefined,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
      createdBy: d.user_id
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Assigns a user to a variant based on experiment configuration
   */
  assignVariant(experiment: Experiment, userId: string): ExperimentVariant | null {
    if (!experiment || experiment.status !== 'running') return null;

    // Use consistent hashing to ensure same user always gets same variant
    const hash = this.hashString(userId + experiment.id);
    const normalizedHash = hash % 100;

    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (normalizedHash < cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to first variant
    return experiment.variants[0] || null;
  }

  /**
   * Records experiment data for analysis with database persistence
   */
  async recordExperimentData(
    experimentId: string,
    variantId: string,
    data: PostMetrics
  ): Promise<boolean> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'running') return false;

    // Get metric value based on target metric
    const metricValue = this.getMetricValue(data, experiment.targetMetric);
    const conversionEvent = metricValue > 0;

    // Store in database
    const { error } = await this.supabase
      .from('experiment_results')
      .insert({
        experiment_id: experimentId,
        variant_id: variantId,
        user_id: experiment.createdBy,
        post_id: data.id,
        metric_value: metricValue,
        conversion_event: conversionEvent,
        metadata: {
          platform: data.platform,
          publishedAt: data.timestamp,
          engagement: data.metrics
        },
        recorded_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to record experiment data:', error);
      return false;
    }

    // Update cache
    let expData = this.experimentDataCache.get(experimentId);
    if (!expData) {
      expData = new Map();
      this.experimentDataCache.set(experimentId, expData);
    }

    if (!expData.has(variantId)) {
      expData.set(variantId, []);
    }

    expData.get(variantId)!.push(data);
    return true;
  }

  /**
   * Analyzes experiment results with Bayesian statistics and database data
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentAnalysis | null> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) return null;

    // Load experiment data from database
    const { data: experimentResults, error } = await this.supabase
      .from('experiment_results')
      .select('*')
      .eq('experiment_id', experimentId);

    if (error) {
      console.error('Failed to load experiment results:', error);
      return null;
    }

    // Group results by variant
    const variantResults = new Map<string, any[]>();
    for (const result of experimentResults || []) {
      const variantId = result.variant_id;
      if (!variantResults.has(variantId)) {
        variantResults.set(variantId, []);
      }
      variantResults.get(variantId)!.push(result);
    }

    const results: ExperimentResult[] = [];
    
    // Calculate metrics for each variant using Bayesian approach
    for (const variant of experiment.variants) {
      const variantData = variantResults.get(variant.id) || [];
      
      if (variantData.length === 0) {
        results.push({
          variantId: variant.id,
          sampleSize: 0,
          metrics: {
            mean: 0,
            standardDeviation: 0,
            confidenceInterval: [0, 0],
          },
        });
        continue;
      }

      const values = variantData.map(d => d.metric_value);
      const conversions = variantData.filter(d => d.conversion_event).length;
      
      // Bayesian analysis for conversion rate
      const priorAlpha = experiment.priorAlpha || 1;
      const priorBeta = experiment.priorBeta || 1;
      const posteriorAlpha = priorAlpha + conversions;
      const posteriorBeta = priorBeta + (variantData.length - conversions);
      
      const mean = posteriorAlpha / (posteriorAlpha + posteriorBeta);
      const variance = (posteriorAlpha * posteriorBeta) / 
        (Math.pow(posteriorAlpha + posteriorBeta, 2) * (posteriorAlpha + posteriorBeta + 1));
      const stdDev = Math.sqrt(variance);
      
      // Credible interval (Bayesian equivalent of confidence interval)
      const alpha = 1 - experiment.confidenceLevel;
      const confidenceInterval = this.calculateBayesianCredibleInterval(
        posteriorAlpha, posteriorBeta, alpha
      );

      results.push({
        variantId: variant.id,
        sampleSize: variantData.length,
        conversionRate: conversions / variantData.length,
        metrics: {
          mean,
          standardDeviation: stdDev,
          confidenceInterval,
        },
      });
    }

    // Determine statistical significance using Bayesian approach
    const analysis = this.performBayesianAnalysis(experiment, results);
    
    // Store analysis results
    await this.storeAnalysisResults(experimentId, analysis);
    
    return {
      experimentId,
      status: analysis.status,
      results,
      winningVariant: analysis.winningVariant,
      confidenceLevel: experiment.confidenceLevel,
      pValue: analysis.pValue,
      effectSize: analysis.effectSize,
      recommendations: this.generateRecommendations(experiment, analysis),
      analysisDate: new Date(),
    };
  }

  /**
   * Bayesian credible interval calculation
   */
  private calculateBayesianCredibleInterval(
    alpha: number, 
    beta: number, 
    confidenceLevel: number
  ): [number, number] {
    // Using beta distribution quantiles for credible interval
    // This is a simplified implementation - in production use a proper statistical library
    const lowerTail = (1 - confidenceLevel) / 2;
    const upperTail = 1 - lowerTail;
    
    // Beta distribution quantile approximation
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    
    // Normal approximation for large samples
    const zLower = this.normalInverse(lowerTail);
    const zUpper = this.normalInverse(upperTail);
    
    return [
      Math.max(0, mean + zLower * stdDev),
      Math.min(1, mean + zUpper * stdDev)
    ];
  }

  /**
   * Normal distribution inverse (simplified)
   */
  private normalInverse(p: number): number {
    // Simplified approximation of normal inverse - use proper library in production
    if (p <= 0.5) {
      return -Math.sqrt(-2 * Math.log(p));
    } else {
      return Math.sqrt(-2 * Math.log(1 - p));
    }
  }

  /**
   * Bayesian A/B test analysis using Thompson sampling
   */
  private performBayesianAnalysis(
    experiment: Experiment,
    results: ExperimentResult[]
  ): {
    status: ExperimentAnalysis['status'];
    winningVariant?: string;
    pValue?: number;
    effectSize?: number;
    probabilities?: Record<string, number>;
  } {
    // Check if we have sufficient data
    const sufficientData = results.every(r => r.sampleSize >= experiment.minimumSampleSize);
    if (!sufficientData) {
      return { status: 'insufficient_data' };
    }

    // Thompson sampling for multi-variant experiments
    const numSamples = 10000;
    const variantProbabilities: Record<string, number> = {};
    const winCounts: Record<string, number> = {};
    
    // Initialize win counts
    results.forEach(result => {
      winCounts[result.variantId] = 0;
    });

    // Perform Thompson sampling
    for (let i = 0; i < numSamples; i++) {
      let bestVariant = '';
      let bestSample = -1;
      
      for (const result of results) {
        // Sample from Beta distribution
        const priorAlpha = experiment.priorAlpha || 1;
        const priorBeta = experiment.priorBeta || 1;
        const conversions = Math.round(result.sampleSize * (result.conversionRate || 0));
        
        const posteriorAlpha = priorAlpha + conversions;
        const posteriorBeta = priorBeta + (result.sampleSize - conversions);
        
        const sample = this.sampleBeta(posteriorAlpha, posteriorBeta);
        
        if (sample > bestSample) {
          bestSample = sample;
          bestVariant = result.variantId;
        }
      }
      
      winCounts[bestVariant]++;
    }

    // Calculate probability each variant is best
    for (const variantId of Object.keys(winCounts)) {
      variantProbabilities[variantId] = winCounts[variantId] / numSamples;
    }

    // Find winning variant and calculate information gain
    const winningVariant = Object.keys(variantProbabilities)
      .reduce((a, b) => variantProbabilities[a] > variantProbabilities[b] ? a : b);
    
    const maxProbability = Math.max(...Object.values(variantProbabilities));
    const infoGain = this.calculateInformationGain(variantProbabilities);

    // Decision criteria for Bayesian stopping
    if (maxProbability > 0.95 || infoGain > 0.1) {
      return {
        status: 'significant_difference',
        winningVariant,
        effectSize: infoGain,
        probabilities: variantProbabilities
      };
    }

    return {
      status: 'no_significant_difference',
      probabilities: variantProbabilities,
      effectSize: infoGain
    };
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(experimentId: string, analysis: any): Promise<void> {
    const { error } = await this.supabase
      .from('ab_experiments')
      .update({
        results: analysis,
        winning_variant: analysis.winningVariant,
        statistical_significance: analysis.probabilities?.[analysis.winningVariant || ''] || 0,
        info_gain: analysis.effectSize,
        updated_at: new Date().toISOString()
      })
      .eq('experiment_id', experimentId);

    if (error) {
      console.error('Failed to store analysis results:', error);
    }
  }

  private generateExperimentId(): string {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private validateExperiment(experiment: Experiment): void {
    if (experiment.variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants');
    }

    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100');
    }

    if (experiment.confidenceLevel < 0.8 || experiment.confidenceLevel > 0.99) {
      throw new Error('Confidence level must be between 0.8 and 0.99');
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getMetricValue(data: PostMetrics, metric: Experiment['targetMetric']): number {
    switch (metric) {
      case 'engagementRate': return data.engagementRate;
      case 'likes': return data.likes;
      case 'comments': return data.comments;
      case 'shares': return data.shares;
      case 'views': return data.views;
      default: return 0;
    }
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Simplified Beta distribution sampling using acceptance-rejection
    // In production, use a proper statistical library like jStat
    if (alpha <= 1 && beta <= 1) {
      // Use uniform approximation for small alpha/beta
      return Math.random();
    }
    
    // Normal approximation for large alpha/beta
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const sample = mean + Math.sqrt(variance) * normal;
    return Math.max(0, Math.min(1, sample)); // Clamp to [0,1]
  }

  private calculateInformationGain(probabilities: Record<string, number>): number {
    // Info gain: KL divergence from uniform
    const n = Object.keys(probabilities).length;
    const uniform = 1 / n;
    let ig = 0;
    for (const p of Object.values(probabilities)) {
      if (p > 0) {
        ig += p * Math.log(p / uniform);
      }
    }
    return ig;
  }

  private generateRecommendations(
    experiment: Experiment,
    analysis: { status: ExperimentAnalysis['status']; winningVariant?: string; effectSize?: number; probabilities?: Record<string, number> }
  ): string[] {
    const recommendations: string[] = [];

    switch (analysis.status) {
      case 'insufficient_data':
        recommendations.push(
          'Continue running the experiment to collect more data',
          `Target sample size: ${experiment.minimumSampleSize} per variant`,
          'Consider extending the experiment duration'
        );
        break;

      case 'no_significant_difference':
        recommendations.push(
          'No statistically significant difference found between variants',
          'Consider testing more dramatic variations',
          'You may choose either variant or stick with the original'
        );
        if (analysis.probabilities) {
          const maxProb = Math.max(...Object.values(analysis.probabilities));
          if (maxProb > 0.7) {
            recommendations.push(`Leading variant has ${(maxProb * 100).toFixed(1)}% probability of being best`);
          }
        }
        break;

      case 'significant_difference':
        if (analysis.winningVariant) {
          const winProb = analysis.probabilities?.[analysis.winningVariant] || 0;
          recommendations.push(
            `Implement the winning variant: ${analysis.winningVariant}`,
            `Confidence: ${(winProb * 100).toFixed(1)}% probability of being best`,
            `Information gain: ${analysis.effectSize?.toFixed(3)}`,
            'Monitor performance after implementation'
          );
        }
        break;
    }

    return recommendations;
  }
}

/**
 * Generates content variations for A/B testing
 */
export function generateContentVariations(
  baseContent: {
    caption: string;
    hashtags: string[];
    platform: Platform;
  },
  variationType: 'caption' | 'hashtags' | 'tone' | 'length'
): ExperimentVariant[] {
  const variants: ExperimentVariant[] = [];

  switch (variationType) {
    case 'caption':
      variants.push(
        {
          id: 'original',
          name: 'Original Caption',
          description: 'The original caption as provided',
          config: { caption: baseContent.caption },
          weight: 50,
        },
        {
          id: 'optimized',
          name: 'AI-Optimized Caption',
          description: 'Caption optimized for engagement',
          config: { caption: optimizeCaption(baseContent.caption, baseContent.platform) },
          weight: 50,
        }
      );
      break;

    case 'hashtags':
      variants.push(
        {
          id: 'original_hashtags',
          name: 'Original Hashtags',
          description: 'The original hashtag set',
          config: { hashtags: baseContent.hashtags },
          weight: 50,
        },
        {
          id: 'trending_hashtags',
          name: 'Trending Hashtags',
          description: 'Hashtags optimized for current trends',
          config: { hashtags: generateTrendingHashtags(baseContent.platform) },
          weight: 50,
        }
      );
      break;

    case 'tone':
      variants.push(
        {
          id: 'casual_tone',
          name: 'Casual Tone',
          description: 'Casual, friendly tone',
          config: { caption: adjustTone(baseContent.caption, 'casual') },
          weight: 33,
        },
        {
          id: 'professional_tone',
          name: 'Professional Tone',
          description: 'Professional, authoritative tone',
          config: { caption: adjustTone(baseContent.caption, 'professional') },
          weight: 33,
        },
        {
          id: 'excited_tone',
          name: 'Excited Tone',
          description: 'Enthusiastic, energetic tone',
          config: { caption: adjustTone(baseContent.caption, 'excited') },
          weight: 34,
        }
      );
      break;

    case 'length':
      variants.push(
        {
          id: 'short_caption',
          name: 'Short Caption',
          description: 'Concise, brief caption',
          config: { caption: shortenCaption(baseContent.caption) },
          weight: 50,
        },
        {
          id: 'long_caption',
          name: 'Detailed Caption',
          description: 'Extended, detailed caption',
          config: { caption: expandCaption(baseContent.caption) },
          weight: 50,
        }
      );
      break;
  }

  return variants;
}

// Helper functions

function optimizeCaption(caption: string, platform: Platform): string {
  // Platform-specific optimization
  switch (platform) {
    case PlatformEnum.TIKTOK:
      return caption + ' 🔥 #fyp #viral';
    case PlatformEnum.INSTAGRAM:
      return caption + ' ✨ #instagood #photooftheday';
    default:
      return caption + ' 🚀';
  }
}

function generateTrendingHashtags(platform: Platform): string[] {
  // Mock trending hashtags (in production, fetch from real data)
  const trendingByPlatform: Record<Platform, string[]> = {
    tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#tiktok'],
    instagram: ['#instagood', '#photooftheday', '#love', '#beautiful', '#happy'],
    youtube: ['#youtube', '#subscribe', '#viral', '#trending', '#shorts'],
    facebook: ['#facebook', '#social', '#viral', '#trending'],
    twitter: ['#twitter', '#trending', '#viral', '#hashtag'],
    linkedin: ['#linkedin', '#professional', '#networking', '#business'],
  };

  return trendingByPlatform[platform] || ['#trending', '#viral'];
}

function adjustTone(caption: string, tone: 'casual' | 'professional' | 'excited'): string {
  switch (tone) {
    case 'casual':
      return caption.toLowerCase().replace(/[!]+/g, '') + ' 😊';
    case 'professional':
      return caption.replace(/[!]+/g, '.').replace(/😊|😍|🔥|✨/g, '');
    case 'excited':
      return caption.replace(/[.]/g, '!') + ' 🔥🔥🔥';
    default:
      return caption;
  }
}

function shortenCaption(caption: string): string {
  const words = caption.split(' ');
  return words.slice(0, Math.min(10, words.length)).join(' ') + (words.length > 10 ? '...' : '');
}

function expandCaption(caption: string): string {
  return caption + ' Check out more content like this and don\'t forget to follow for daily updates! What do you think about this? Let me know in the comments below! 👇';
}

// Exported standalone functions for use without ExperimentManager class
let experimentManagerInstance: ExperimentManager | null = null;

function getExperimentManagerInstance(supabase: SupabaseClient): ExperimentManager {
  if (!experimentManagerInstance) {
    experimentManagerInstance = new ExperimentManager(supabase);
  }
  return experimentManagerInstance;
}

export async function createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>, supabase: SupabaseClient): Promise<Experiment> {
  const manager = getExperimentManagerInstance(supabase);
  return manager.createExperiment(experiment);
}

export async function updateExperiment(id: string, updates: Partial<Experiment>, supabase: SupabaseClient): Promise<Experiment | null> {
  const manager = getExperimentManagerInstance(supabase);
  return manager.updateExperiment(id, updates);
}

export async function getExperiment(id: string, supabase: SupabaseClient): Promise<Experiment | null> {
  const manager = getExperimentManagerInstance(supabase);
  return manager.getExperiment(id);
}

export async function listExperiments(filters: { platform?: Platform; status?: Experiment['status']; createdBy?: string; } | undefined, supabase: SupabaseClient): Promise<Experiment[]> {
  const manager = getExperimentManagerInstance(supabase);
  return manager.listExperiments(filters);
}

export function assignVariant(experiment: Experiment, userId: string): ExperimentVariant | null {
  const manager = new ExperimentManager({} as SupabaseClient); // Temporary instance for static method
  return manager.assignVariant(experiment, userId);
}

export async function recordExperimentData(experimentId: string, variantId: string, data: PostMetrics, supabase: SupabaseClient): Promise<boolean> {
  const manager = getExperimentManagerInstance(supabase);
  return manager.recordExperimentData(experimentId, variantId, data);
}

export async function analyzeExperiment(experimentId: string, supabase: SupabaseClient): Promise<ExperimentAnalysis | null> {
  const manager = getExperimentManagerInstance(supabase);
  return manager.analyzeExperiment(experimentId);
}