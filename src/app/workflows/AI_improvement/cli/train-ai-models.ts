#!/usr/bin/env node

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { TrainingOrchestrator } from '../training/TrainingOrchestrator';
import { createClient } from '@supabase/supabase-js';
import { Platform } from '../../data_analysis/types/analysis_types';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface CLIOptions {
  userId: string;
  platforms: Platform[];
  lookbackDays: number;
  minPostsPerPlatform: number;
  minEngagementThreshold: number;
  models: {
    engagementPrediction: boolean;
    contentOptimization: boolean;
    sentimentAnalysis: boolean;
    viralityPrediction: boolean;
    abTesting: boolean;
  };
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: Partial<CLIOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--user-id':
        options.userId = value;
        break;
      case '--platforms':
        options.platforms = value.split(',').map(p => p.trim() as Platform);
        break;
      case '--lookback-days':
        options.lookbackDays = parseInt(value);
        break;
      case '--min-posts':
        options.minPostsPerPlatform = parseInt(value);
        break;
      case '--min-engagement':
        options.minEngagementThreshold = parseInt(value);
        break;
      case '--models':
        const modelList = value.split(',').map(m => m.trim());
        options.models = {
          engagementPrediction: modelList.includes('engagement'),
          contentOptimization: modelList.includes('content'),
          sentimentAnalysis: modelList.includes('sentiment'),
          viralityPrediction: modelList.includes('virality'),
          abTesting: modelList.includes('abtesting')
        };
        break;
    }
  }

  // Set defaults
  return {
    userId: options.userId || 'default-user',
    platforms: options.platforms || ['TikTok', 'Instagram', 'YouTube'],
    lookbackDays: options.lookbackDays || 90,
    minPostsPerPlatform: options.minPostsPerPlatform || 50,
    minEngagementThreshold: options.minEngagementThreshold || 10,
    models: options.models || {
      engagementPrediction: true,
      contentOptimization: true,
      sentimentAnalysis: true,
      viralityPrediction: true,
      abTesting: false
    }
  };
}

function printUsage() {
  console.log(`
🤖 AI Model Training CLI

Usage: npm run train-ai-models [options]

Options:
  --user-id <id>              User ID for training data (default: default-user)
  --platforms <list>          Comma-separated platforms (default: tiktok,instagram,youtube)
  --lookback-days <days>      Days of historical data (default: 90)
  --min-posts <count>         Minimum posts per platform (default: 50)
  --min-engagement <count>    Minimum engagement threshold (default: 10)
  --models <list>             Models to train: engagement,content,sentiment,virality,abtesting
                             (default: engagement,content,sentiment,virality)

Examples:
  npm run train-ai-models
  npm run train-ai-models -- --user-id=user123 --platforms=tiktok,instagram
  npm run train-ai-models -- --lookback-days=180 --models=engagement,content

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
`);
}

async function validateEnvironment(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables:');
    if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('\nPlease set these in your .env.local file');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from('user_posts').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is expected if table doesn't exist yet
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 AI Model Training CLI Starting...\n');

  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  // Validate environment
  if (!(await validateEnvironment())) {
    process.exit(1);
  }

  // Parse arguments
  const options = parseArguments();

  console.log('📋 Training Configuration:');
  console.log(`   User ID: ${options.userId}`);
  console.log(`   Platforms: ${options.platforms.join(', ')}`);
  console.log(`   Lookback Days: ${options.lookbackDays}`);
  console.log(`   Min Posts per Platform: ${options.minPostsPerPlatform}`);
  console.log(`   Min Engagement Threshold: ${options.minEngagementThreshold}`);
  console.log(`   Models to Train: ${Object.entries(options.models)
    .filter(([_, enabled]) => enabled)
    .map(([model, _]) => model)
    .join(', ')}`);
  console.log('');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Initialize training orchestrator
  const orchestrator = new TrainingOrchestrator(supabase);

  // Set up event listeners for progress tracking
  orchestrator.on('session_started', (session) => {
    console.log(`🎯 Training session started: ${session.id}`);
  });

  orchestrator.on('session_updated', (session) => {
    const progressBar = '█'.repeat(Math.floor(session.progress / 5)) + 
                       '░'.repeat(20 - Math.floor(session.progress / 5));
    console.log(`📊 [${progressBar}] ${session.progress}% - ${session.currentPhase}`);
  });

  orchestrator.on('platform_data_collected', (event) => {
    console.log(`✅ Collected ${event.count} posts from ${event.platform}`);
  });

  orchestrator.on('insufficient_platform_data', (event) => {
    console.log(`⚠️  Insufficient data for ${event.platform}: ${event.found}/${event.required} posts`);
  });

  orchestrator.on('data_collection_completed', (event) => {
    console.log(`📦 Data collection completed:`);
    console.log(`   Total Posts: ${event.summary.totalPosts}`);
    console.log(`   Quality Score: ${event.summary.qualityScore}%`);
    console.log(`   Ready for Training: ${event.summary.readyForTraining ? '✅' : '❌'}`);
    
    Object.entries(event.summary.platformBreakdown).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count} posts`);
    });
    console.log('');
  });

  orchestrator.on('model_completed', (event) => {
    console.log(`🎉 Model training completed: ${event.model}`);
    if (event.result.performance) {
      Object.entries(event.result.performance).forEach(([metric, value]) => {
        console.log(`   ${metric}: ${typeof value === 'number' ? value.toFixed(3) : value}`);
      });
    }
    console.log('');
  });

  orchestrator.on('session_completed', (session) => {
    console.log('🎊 Training completed successfully!');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Duration: ${((session.endTime!.getTime() - session.startTime.getTime()) / 1000 / 60).toFixed(1)} minutes`);
    
    if (session.modelResults) {
      console.log(`   Models Trained: ${session.modelResults.size}`);
      session.modelResults.forEach((result: any, modelName: string) => {
        console.log(`     - ${modelName}: ${result.version}`);
      });
    }
    console.log('');
  });

  orchestrator.on('session_failed', (event) => {
    console.error(`❌ Training failed: ${event.error}`);
    process.exit(1);
  });

  try {
    // Start training
    const sessionId = await orchestrator.startTraining(
      options.userId,
      options.platforms,
      {
        lookbackDays: options.lookbackDays,
        minPostsPerPlatform: options.minPostsPerPlatform,
        minEngagementThreshold: options.minEngagementThreshold,
        models: options.models
      }
    );

    console.log(`✨ Training completed! Session ID: ${sessionId}`);
    
  } catch (error) {
    console.error('❌ Training failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Training interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Training terminated');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { main as trainAIModels }; 