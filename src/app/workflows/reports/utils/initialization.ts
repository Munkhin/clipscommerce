import { SupabaseClient } from '@supabase/supabase-js';
import { EngagementPredictionAgent } from '../services/EngagementPredictionAgent';
import { DataIngestionService } from '../services/DataIngestionService';
import { ModelEvaluation } from '../types/EngagementTypes';

/**
 * Initialize the EngagementPredictionAgent with optional data ingestion
 */
export async function initializeEngagementPredictionAgent(
  supabase: SupabaseClient,
  options?: {
    userId?: string;
    ingestData?: boolean;
    platformTokens?: {
      tiktok?: string;
      instagram?: string;
      youtube?: string;
    };
  }
): Promise<{
  agent: EngagementPredictionAgent;
  evaluation: ModelEvaluation;
  dataIngestionService?: DataIngestionService;
}> {
  console.log('Initializing EngagementPredictionAgent...');

  // Create the main agent
  const agent = new EngagementPredictionAgent(supabase);

  // Optionally ingest fresh data before training
  let dataIngestionService: DataIngestionService | undefined;
  if (options?.ingestData && options?.platformTokens && options?.userId) {
    console.log('Ingesting fresh data from social platforms...');
    dataIngestionService = new DataIngestionService(supabase);
    
    try {
      await dataIngestionService.ingestAllPlatforms(options.userId, options.platformTokens);
      console.log('Data ingestion completed successfully');
    } catch (error) {
      console.warn('Data ingestion failed, proceeding with existing data:', error);
    }
  }

  // Initialize and train the agent
  const evaluation = await agent.initialize(options?.userId);

  console.log('EngagementPredictionAgent initialization completed!');
  console.log(`Engagement Model RMSE: ${evaluation.engagementModel.rmse.toFixed(4)}`);
  console.log(`Viral Model Accuracy: ${evaluation.viralModel.accuracy.toFixed(4)}`);

  return {
    agent,
    evaluation,
    dataIngestionService,
  };
}

/**
 * Quick setup for development/testing
 */
export async function quickSetup(supabase: SupabaseClient): Promise<EngagementPredictionAgent> {
  const { agent } = await initializeEngagementPredictionAgent(supabase);
  return agent;
}

/**
 * Production setup with data ingestion
 */
export async function productionSetup(
  supabase: SupabaseClient,
  userId: string,
  platformTokens: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
  }
): Promise<{
  agent: EngagementPredictionAgent;
  evaluation: ModelEvaluation;
  dataIngestionService: DataIngestionService;
}> {
  const result = await initializeEngagementPredictionAgent(supabase, {
    userId,
    ingestData: true,
    platformTokens,
  });

  if (!result.dataIngestionService) {
    throw new Error('Data ingestion service not initialized');
  }

  return {
    agent: result.agent,
    evaluation: result.evaluation,
    dataIngestionService: result.dataIngestionService,
  };
} 