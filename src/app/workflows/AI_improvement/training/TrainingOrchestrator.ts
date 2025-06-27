import { EventEmitter } from 'events';
import { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from '../types/niche_types';
import { ModelTrainingPipeline, TrainingConfig, TrainingProgress, TrainingResult } from './ModelTrainingPipeline';
import { TrainingDataCollectionService, DataCollectionConfig, DataQualityReport } from './DataCollectionService';

export interface TrainingSession {
  id: string;
  userId: string;
  platforms: Platform[];
  status: 'preparing' | 'collecting_data' | 'training' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-100
  currentPhase: string;
  dataQuality?: {
    totalPosts: number;
    qualityScore: number;
    readyForTraining: boolean;
  };
  modelResults?: Map<string, TrainingResult>;
  error?: string;
}

export class TrainingOrchestrator extends EventEmitter {
  private supabase: SupabaseClient;
  private currentSession: TrainingSession | null = null;
  private trainingPipeline: ModelTrainingPipeline | null = null;
  private dataCollectionService: TrainingDataCollectionService | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  async startTraining(
    userId: string,
    platforms: Platform[],
    options: {
      lookbackDays?: number;
      minPostsPerPlatform?: number;
      minEngagementThreshold?: number;
      models?: {
        engagementPrediction?: boolean;
        contentOptimization?: boolean;
        sentimentAnalysis?: boolean;
        viralityPrediction?: boolean;
        abTesting?: boolean;
      };
    } = {}
  ): Promise<string> {
    if (this.currentSession && this.currentSession.status !== 'completed' && this.currentSession.status !== 'failed') {
      throw new Error('Training session already in progress');
    }

    // Create new training session
    const sessionId = this.generateSessionId();
    this.currentSession = {
      id: sessionId,
      userId,
      platforms,
      status: 'preparing',
      startTime: new Date(),
      progress: 0,
      currentPhase: 'Initializing training session'
    };

    this.emit('session_started', this.currentSession);

    try {
      // Phase 1: Setup and validation
      await this.setupTrainingEnvironment(userId, platforms, options);
      
      // Phase 2: Data collection and validation
      await this.collectAndValidateData();
      
      // Phase 3: Model training
      await this.executeModelTraining();
      
      // Phase 4: Completion
      this.completeTraining();

    } catch (error) {
      this.failTraining(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }

    return sessionId;
  }

  private async setupTrainingEnvironment(
    userId: string,
    platforms: Platform[],
    options: any
  ): Promise<void> {
    this.updateSession('preparing', 5, 'Setting up training environment...');

    // Configure data collection
    const dataConfig: DataCollectionConfig = {
      platforms,
      lookbackDays: options.lookbackDays || 90,
      minPostsPerPlatform: options.minPostsPerPlatform || 50,
      minEngagementThreshold: options.minEngagementThreshold || 10,
      includeCompetitorData: false
    };

    this.dataCollectionService = new TrainingDataCollectionService(this.supabase, dataConfig);

    // Configure model training
    const trainingConfig: TrainingConfig = {
      models: {
        engagementPrediction: options.models?.engagementPrediction ?? true,
        contentOptimization: options.models?.contentOptimization ?? true,
        sentimentAnalysis: options.models?.sentimentAnalysis ?? true,
        viralityPrediction: options.models?.viralityPrediction ?? true,
        abTesting: options.models?.abTesting ?? false
      },
      dataRequirements: {
        minPostsPerPlatform: dataConfig.minPostsPerPlatform,
        lookbackDays: dataConfig.lookbackDays,
        minEngagementThreshold: dataConfig.minEngagementThreshold
      },
      trainingParams: {
        testSplitRatio: 0.2,
        validationSplitRatio: 0.1,
        crossValidationFolds: 5,
        randomSeed: 42
      },
      outputPaths: {
        modelsDir: './models',
        metricsDir: './metrics',
        logsDir: './logs'
      }
    };

    this.trainingPipeline = new ModelTrainingPipeline(this.supabase, trainingConfig);

    // Set up event listeners
    this.setupEventListeners();

    this.updateSession('preparing', 10, 'Training environment ready');
  }

  private async collectAndValidateData(): Promise<void> {
    if (!this.dataCollectionService || !this.currentSession) {
      throw new Error('Training environment not properly initialized');
    }

    this.updateSession('collecting_data', 15, 'Starting data collection...');

    // Validate data access first
    const accessValidation = await this.dataCollectionService.validateDataAccess(this.currentSession.userId);
    
    if (!accessValidation.hasAccess) {
      throw new Error(`Data access validation failed: ${accessValidation.issues.join(', ')}`);
    }

    // Collect training data
    const collectionResult = await this.dataCollectionService.collectTrainingData(this.currentSession.userId);

    // Update session with data quality info
    this.currentSession.dataQuality = collectionResult.summary;

    if (!collectionResult.summary.readyForTraining) {
      const issues = collectionResult.qualityReports
        .flatMap(report => report.issues)
        .join(', ');
      throw new Error(`Data quality insufficient for training: ${issues}`);
    }

    this.updateSession('collecting_data', 40, 
      `Data collection completed: ${collectionResult.summary.totalPosts} posts collected`);

    this.emit('data_collection_completed', {
      summary: collectionResult.summary,
      qualityReports: collectionResult.qualityReports
    });
  }

  private async executeModelTraining(): Promise<void> {
    if (!this.trainingPipeline || !this.currentSession) {
      throw new Error('Training pipeline not initialized');
    }

    this.updateSession('training', 45, 'Starting model training...');

    await this.trainingPipeline.startTraining(
      this.currentSession.userId,
      this.currentSession.platforms
    );

    // Get training results
    this.currentSession.modelResults = this.trainingPipeline.getResults();

    this.updateSession('training', 95, 'Model training completed');
  }

  private completeTraining(): void {
    if (!this.currentSession) return;

    this.currentSession.status = 'completed';
    this.currentSession.endTime = new Date();
    this.currentSession.progress = 100;
    this.currentSession.currentPhase = 'Training completed successfully';

    this.emit('session_completed', this.currentSession);
  }

  private failTraining(error: string): void {
    if (!this.currentSession) return;

    this.currentSession.status = 'failed';
    this.currentSession.endTime = new Date();
    this.currentSession.error = error;

    this.emit('session_failed', { session: this.currentSession, error });
  }

  private updateSession(
    status: TrainingSession['status'],
    progress: number,
    currentPhase: string
  ): void {
    if (!this.currentSession) return;

    this.currentSession.status = status;
    this.currentSession.progress = progress;
    this.currentSession.currentPhase = currentPhase;

    this.emit('session_updated', this.currentSession);
  }

  private setupEventListeners(): void {
    if (!this.trainingPipeline) return;

    this.trainingPipeline.on('progress_updated', (progress: TrainingProgress) => {
      if (this.currentSession) {
        // Map training progress to session progress (45-95% range)
        const sessionProgress = 45 + (progress.progress * 0.5);
        this.updateSession('training', sessionProgress, progress.message);
      }
    });

    this.trainingPipeline.on('model_training_completed', (event: any) => {
      this.emit('model_completed', event);
    });

    this.trainingPipeline.on('data_collected', (event: any) => {
      this.emit('platform_data_collected', event);
    });

    this.trainingPipeline.on('insufficient_data', (event: any) => {
      this.emit('insufficient_platform_data', event);
    });
  }

  private generateSessionId(): string {
    return `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentSession(): TrainingSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  getSessionProgress(): { progress: number; phase: string; status: string } | null {
    if (!this.currentSession) return null;

    return {
      progress: this.currentSession.progress,
      phase: this.currentSession.currentPhase,
      status: this.currentSession.status
    };
  }

  async getTrainingHistory(userId: string): Promise<TrainingSession[]> {
    // In a real implementation, this would query a database
    // For now, return empty array
    return [];
  }

  isTraining(): boolean {
    return this.currentSession?.status === 'training' || 
           this.currentSession?.status === 'collecting_data' ||
           this.currentSession?.status === 'preparing';
  }

  async stopTraining(): Promise<void> {
    if (this.currentSession && this.isTraining()) {
      this.failTraining('Training stopped by user');
    }
  }
} 