import { EventEmitter } from 'events';
import { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from '../types/niche_types';
import { PostMetrics } from '../../data_analysis/types/analysis_types';
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

    // Store session in database
    await this.storeTrainingSession(this.currentSession, options);

    this.emit('session_started', this.currentSession);

    try {
      // Phase 1: Setup and validation
      await this.setupTrainingEnvironment(userId, platforms, options);
      
      // Phase 2: Data collection and validation
      const trainingData = await this.collectAndValidateData();
      
      // Phase 3: Model training
      await this.executeModelTraining(trainingData);
      
      // Phase 4: Completion
      await this.completeTraining();

    } catch (error) {
      await this.failTraining(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }

    return sessionId;
  }

  private async setupTrainingEnvironment(
    userId: string,
    platforms: Platform[],
    options: any
  ): Promise<void> {
    await this.updateSession('preparing', 5, 'Setting up training environment...');

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

    await this.updateSession('preparing', 10, 'Training environment ready');
  }

  private async collectAndValidateData(): Promise<PostMetrics[]> {
    if (!this.dataCollectionService || !this.currentSession) {
      throw new Error('Training environment not properly initialized');
    }

    await this.updateSession('collecting_data', 15, 'Starting data collection...');

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

    await this.updateSession('collecting_data', 40, 
      `Data collection completed: ${collectionResult.summary.totalPosts} posts collected`);

    this.emit('data_collection_completed', {
      summary: collectionResult.summary,
      qualityReports: collectionResult.qualityReports
    });

    return collectionResult.data;
  }

  private async executeModelTraining(trainingData: PostMetrics[]): Promise<void> {
    if (!this.trainingPipeline || !this.currentSession) {
      throw new Error('Training pipeline not initialized');
    }

    await this.updateSession('training', 45, 'Starting model training...');

    await this.trainingPipeline.startTraining(trainingData);

    // Get training results
    this.currentSession.modelResults = this.trainingPipeline.getResults();

    await this.updateSession('training', 95, 'Model training completed');
  }

  private async completeTraining(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.status = 'completed';
    this.currentSession.endTime = new Date();
    this.currentSession.progress = 100;
    this.currentSession.currentPhase = 'Training completed successfully';

    // Update in database
    await this.updateTrainingSessionInDb(this.currentSession);

    this.emit('session_completed', this.currentSession);
  }

  private async failTraining(error: string): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.status = 'failed';
    this.currentSession.endTime = new Date();
    this.currentSession.error = error;

    // Update in database
    await this.updateTrainingSessionInDb(this.currentSession);

    this.emit('session_failed', { session: this.currentSession, error });
  }

  private async updateSession(
    status: TrainingSession['status'],
    progress: number,
    currentPhase: string
  ): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.status = status;
    this.currentSession.progress = progress;
    this.currentSession.currentPhase = currentPhase;

    // Update in database
    await this.updateTrainingSessionInDb(this.currentSession);

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

  async getTrainingHistory(userId: string, limit: number = 10): Promise<TrainingSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('model_training_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching training history:', error);
        return [];
      }

      return (data || []).map(row => this.mapDbRowToSession(row));
    } catch (error) {
      console.error('Error in getTrainingHistory:', error);
      return [];
    }
  }

  /**
   * Store new training session in database
   */
  private async storeTrainingSession(session: TrainingSession, options: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('model_training_sessions')
        .insert({
          session_id: session.id,
          user_id: session.userId,
          platforms: session.platforms,
          status: session.status,
          progress: session.progress,
          current_phase: session.currentPhase,
          config: {
            ...options,
            startTime: session.startTime.toISOString()
          },
          started_at: session.startTime.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing training session:', error);
      }
    } catch (error) {
      console.error('Error in storeTrainingSession:', error);
    }
  }

  /**
   * Update training session in database
   */
  private async updateTrainingSessionInDb(session: TrainingSession): Promise<void> {
    try {
      const updateData: any = {
        status: session.status,
        progress: session.progress,
        current_phase: session.currentPhase,
        updated_at: new Date().toISOString()
      };

      if (session.endTime) {
        updateData.completed_at = session.endTime.toISOString();
      }

      if (session.error) {
        updateData.error_message = session.error;
      }

      if (session.dataQuality) {
        updateData.data_quality = session.dataQuality;
      }

      if (session.modelResults) {
        updateData.model_results = Object.fromEntries(session.modelResults);
      }

      const { error } = await this.supabase
        .from('model_training_sessions')
        .update(updateData)
        .eq('session_id', session.id);

      if (error) {
        console.error('Error updating training session:', error);
      }
    } catch (error) {
      console.error('Error in updateTrainingSessionInDb:', error);
    }
  }

  /**
   * Load training session from database
   */
  async loadTrainingSession(sessionId: string): Promise<TrainingSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('model_training_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDbRowToSession(data);
    } catch (error) {
      console.error('Error loading training session:', error);
      return null;
    }
  }

  /**
   * Map database row to TrainingSession object
   */
  private mapDbRowToSession(row: any): TrainingSession {
    const session: TrainingSession = {
      id: row.session_id,
      userId: row.user_id,
      platforms: row.platforms || [],
      status: row.status,
      progress: row.progress || 0,
      currentPhase: row.current_phase || '',
      startTime: new Date(row.started_at),
      endTime: row.completed_at ? new Date(row.completed_at) : undefined,
      error: row.error_message
    };

    if (row.data_quality) {
      session.dataQuality = row.data_quality;
    }

    if (row.model_results) {
      session.modelResults = new Map(Object.entries(row.model_results));
    }

    return session;
  }

  async resumeTraining(sessionId: string): Promise<void> {
    const session = await this.loadTrainingSession(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found.`);
    }

    if (session.status !== 'failed' && session.status !== 'collecting_data') {
      throw new Error(`Session with ID ${sessionId} cannot be resumed. Status: ${session.status}`);
    }

    this.currentSession = session;
    this.emit('session_started', this.currentSession);

    try {
      if (session.status === 'failed') {
        // If the session failed during training, restart the training process
        await this.executeModelTraining([]);
      } else {
        // If the session was interrupted during data collection, restart the data collection
        const trainingData = await this.collectAndValidateData();
        await this.executeModelTraining(trainingData);
      }
      
      await this.completeTraining();
    } catch (error) {
      await this.failTraining(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getSessionStatus(sessionId: string): Promise<void> {
    const session = await this.loadTrainingSession(sessionId);
    if (!session) {
      console.log(`Session with ID ${sessionId} not found.`);
      return;
    }

    console.log('📊 Session Status:');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   User ID: ${session.userId}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Progress: ${session.progress}%`);
    console.log(`   Current Phase: ${session.currentPhase}`);
    if (session.error) {
      console.log(`   Error: ${session.error}`);
    }
  }

  async displayTrainingHistory(userId: string): Promise<void> {
    const history = await this.getTrainingHistory(userId);
    if (history.length === 0) {
      console.log(`No training history found for user ${userId}.`);
      return;
    }

    console.log('📜 Training History:');
    history.forEach(session => {
      console.log(`
   Session ID: ${session.id}
   Status: ${session.status}
   Start Time: ${session.startTime.toLocaleString()}
   End Time: ${session.endTime?.toLocaleString() || 'N/A'}
   Error: ${session.error || 'None'}
      `);
    });
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