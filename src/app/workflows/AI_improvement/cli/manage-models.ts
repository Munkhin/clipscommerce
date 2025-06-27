#!/usr/bin/env node

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { ModelRegistry } from '../training/deployment/ModelRegistry';
import { ModelEvaluator } from '../training/evaluation/ModelEvaluator';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface CLICommand {
  command: string;
  args: Record<string, string>;
}

function parseArguments(): CLICommand {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const parsedArgs: Record<string, string> = {};

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      parsedArgs[key] = value;
    }
  }

  return { command, args: parsedArgs };
}

function printUsage() {
  console.log(`
🤖 AI Model Management CLI

Usage: npm run ai:manage-models <command> [options]

Commands:
  list                        List all trained models
  info <model-id>            Show detailed model information
  compare <id1> <id2>        Compare two models
  deploy <model-id>          Deploy a model to environment
  retire <model-id>          Retire/deprecate a model
  export <model-id>          Export model for external use
  search <query>             Search models by name or description
  stats <model-id>           Show model usage statistics
  evaluate <model-id>        Re-evaluate model performance

List Options:
  --type <type>              Filter by model type (engagement, content, sentiment, etc.)
  --status <status>          Filter by status (trained, deployed, deprecated)
  --environment <env>        Filter by deployment environment
  --limit <number>           Limit number of results (default: 10)

Deploy Options:
  --environment <env>        Target environment (development, staging, production)
  --replicas <number>        Number of replicas (default: 1)
  --auto-scale              Enable auto-scaling

Export Options:
  --format <format>          Export format (json, onnx, tensorflow)
  --output <path>            Output file path

Examples:
  npm run ai:manage-models list
  npm run ai:manage-models list -- --type=engagement --status=deployed
  npm run ai:manage-models info -- --model-id=engagement_v1.0_12345
  npm run ai:manage-models compare -- --id1=model1 --id2=model2
  npm run ai:manage-models deploy -- --model-id=model1 --environment=production
  npm run ai:manage-models search -- --query=sentiment
  npm run ai:manage-models export -- --model-id=model1 --format=onnx

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
`);
}

async function validateEnvironment(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('  - NEXT_SERVICE_ROLE_KEY');
    console.error('\nPlease set these in your .env.local file');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from('trained_models').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }

  return true;
}

async function listModels(registry: ModelRegistry, args: Record<string, string>) {
  console.log('📋 Listing trained models...\n');

  const filters = {
    type: args.type,
    status: args.status,
    environment: args.environment,
    limit: args.limit ? parseInt(args.limit) : 10
  };

  try {
    const models = await registry.listModels(filters);

    if (models.length === 0) {
      console.log('No models found matching the criteria.');
      return;
    }

    console.log(`Found ${models.length} models:\n`);

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name} (${model.version})`);
      console.log(`   ID: ${model.id}`);
      console.log(`   Type: ${model.type}`);
      console.log(`   Status: ${model.status}`);
      console.log(`   Score: ${model.overallScore.toFixed(1)}%`);
      console.log(`   Created: ${model.createdAt.toLocaleDateString()}`);
      console.log(`   Size: ${(model.modelSize / 1024).toFixed(1)} KB`);
      console.log(`   Predictions: ${model.predictionCount}`);
      
      if (model.deploymentEnvironment) {
        console.log(`   Environment: ${model.deploymentEnvironment}`);
      }
      
      if (model.tags.length > 0) {
        console.log(`   Tags: ${model.tags.join(', ')}`);
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to list models:', error);
  }
}

async function showModelInfo(registry: ModelRegistry, args: Record<string, string>) {
  const modelId = args['model-id'];
  if (!modelId) {
    console.error('❌ Model ID is required. Use --model-id=<id>');
    return;
  }

  console.log(`📊 Model Information: ${modelId}\n`);

  try {
    const model = await registry.getModel(modelId);
    if (!model) {
      console.error('❌ Model not found');
      return;
    }

    console.log(`Name: ${model.name}`);
    console.log(`Type: ${model.type}`);
    console.log(`Version: ${model.version}`);
    console.log(`Status: ${model.status}`);
    console.log(`Description: ${model.description || 'N/A'}`);
    console.log('');

    console.log('📈 Performance Metrics:');
    console.log(`Overall Score: ${model.overallScore.toFixed(1)}%`);
    Object.entries(model.performanceMetrics).forEach(([metric, value]) => {
      console.log(`${metric}: ${typeof value === 'number' ? value.toFixed(3) : value}`);
    });
    console.log('');

    console.log('🔧 Training Information:');
    console.log(`Training Date: ${model.trainingDate.toLocaleString()}`);
    console.log(`Training Duration: ${model.trainingDuration} minutes`);
    console.log(`Training Data Size: ${model.trainingDataSize} samples`);
    console.log('');

    console.log('📦 Model Details:');
    console.log(`Model Size: ${(model.modelSize / 1024).toFixed(1)} KB`);
    console.log(`Checksum: ${model.checksum}`);
    console.log(`Is Latest: ${model.isLatest ? 'Yes' : 'No'}`);
    console.log('');

    if (model.status === 'deployed') {
      console.log('🚀 Deployment Information:');
      console.log(`Environment: ${model.deploymentEnvironment}`);
      console.log(`Deployment Date: ${model.deploymentDate?.toLocaleString()}`);
      console.log('');
    }

    console.log('📊 Usage Statistics:');
    console.log(`Total Predictions: ${model.predictionCount}`);
    console.log(`Last Used: ${model.lastUsed?.toLocaleString() || 'Never'}`);
    console.log('');

    if (model.tags.length > 0) {
      console.log(`Tags: ${model.tags.join(', ')}`);
      console.log('');
    }

    console.log(`Created By: ${model.createdBy}`);
    console.log(`Created At: ${model.createdAt.toLocaleString()}`);
    console.log(`Updated At: ${model.updatedAt.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Failed to get model info:', error);
  }
}

async function compareModels(registry: ModelRegistry, args: Record<string, string>) {
  const id1 = args.id1;
  const id2 = args.id2;

  if (!id1 || !id2) {
    console.error('❌ Both model IDs are required. Use --id1=<id> --id2=<id>');
    return;
  }

  console.log(`🔍 Comparing models: ${id1} vs ${id2}\n`);

  try {
    const comparison = await registry.compareModels(id1, id2);

    console.log('📊 Model Comparison Results:\n');

    console.log(`Model 1: ${comparison.model1.name} (${comparison.model1.version})`);
    console.log(`  Overall Score: ${comparison.model1.overallScore.toFixed(1)}%`);
    console.log(`  Created: ${comparison.model1.createdAt.toLocaleDateString()}`);
    console.log('');

    console.log(`Model 2: ${comparison.model2.name} (${comparison.model2.version})`);
    console.log(`  Overall Score: ${comparison.model2.overallScore.toFixed(1)}%`);
    console.log(`  Created: ${comparison.model2.createdAt.toLocaleDateString()}`);
    console.log('');

    console.log('📈 Performance Comparison:');
    Object.entries(comparison.performanceComparison).forEach(([metric, comp]) => {
      const arrow = comp.improvement > 0 ? '↗️' : comp.improvement < 0 ? '↘️' : '➡️';
      const significant = comp.significantDifference ? ' (significant)' : '';
      console.log(`${metric}: ${comp.model1Value.toFixed(3)} → ${comp.model2Value.toFixed(3)} ${arrow} ${comp.improvement.toFixed(1)}%${significant}`);
    });
    console.log('');

    console.log('🎯 Recommendation:');
    console.log(`${comparison.recommendation.replace('_', ' ').toUpperCase()}`);
    console.log(`Reasoning: ${comparison.reasoning}`);

  } catch (error) {
    console.error('❌ Failed to compare models:', error);
  }
}

async function deployModel(registry: ModelRegistry, args: Record<string, string>) {
  const modelId = args['model-id'];
  const environment = args.environment as 'development' | 'staging' | 'production';

  if (!modelId) {
    console.error('❌ Model ID is required. Use --model-id=<id>');
    return;
  }

  if (!environment || !['development', 'staging', 'production'].includes(environment)) {
    console.error('❌ Valid environment is required. Use --environment=development|staging|production');
    return;
  }

  console.log(`🚀 Deploying model ${modelId} to ${environment}...\n`);

  try {
    const config = {
      environment,
      replicas: args.replicas ? parseInt(args.replicas) : 1,
      resourceLimits: {
        cpu: '500m',
        memory: '512Mi'
      },
      autoScaling: {
        enabled: args['auto-scale'] === 'true',
        minReplicas: 1,
        maxReplicas: 10,
        targetCPUUtilization: 70
      },
      healthCheck: {
        enabled: true,
        endpoint: '/health',
        intervalSeconds: 30,
        timeoutSeconds: 5
      }
    };

    await registry.deployModel(modelId, environment, config);

    console.log('✅ Model deployed successfully!');
    console.log(`   Model ID: ${modelId}`);
    console.log(`   Environment: ${environment}`);
    console.log(`   Replicas: ${config.replicas}`);
    console.log(`   Auto-scaling: ${config.autoScaling.enabled ? 'Enabled' : 'Disabled'}`);

  } catch (error) {
    console.error('❌ Failed to deploy model:', error);
  }
}

async function retireModel(registry: ModelRegistry, args: Record<string, string>) {
  const modelId = args['model-id'];
  const reason = args.reason || 'Manual retirement';

  if (!modelId) {
    console.error('❌ Model ID is required. Use --model-id=<id>');
    return;
  }

  console.log(`🗑️  Retiring model ${modelId}...\n`);

  try {
    await registry.retireModel(modelId, reason);

    console.log('✅ Model retired successfully!');
    console.log(`   Model ID: ${modelId}`);
    console.log(`   Reason: ${reason}`);

  } catch (error) {
    console.error('❌ Failed to retire model:', error);
  }
}

async function exportModel(registry: ModelRegistry, args: Record<string, string>) {
  const modelId = args['model-id'];
  const format = args.format as 'json' | 'onnx' | 'tensorflow' || 'json';
  const outputPath = args.output;

  if (!modelId) {
    console.error('❌ Model ID is required. Use --model-id=<id>');
    return;
  }

  console.log(`📦 Exporting model ${modelId} in ${format} format...\n`);

  try {
    const exportResult = await registry.exportModel(modelId, format);

    console.log('✅ Model exported successfully!');
    console.log(`   Model ID: ${modelId}`);
    console.log(`   Format: ${exportResult.exportFormat}`);
    console.log(`   Export Date: ${exportResult.exportDate.toLocaleString()}`);
    console.log(`   Model Size: ${(JSON.stringify(exportResult.modelData).length / 1024).toFixed(1)} KB`);

    if (outputPath) {
      // In a real implementation, you would write to file
      console.log(`   Output Path: ${outputPath}`);
      console.log('   (File writing not implemented in this demo)');
    } else {
      console.log('\n📄 Model Data Preview:');
      console.log(JSON.stringify(exportResult.modelData, null, 2).substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ Failed to export model:', error);
  }
}

async function searchModels(registry: ModelRegistry, args: Record<string, string>) {
  const query = args.query;

  if (!query) {
    console.error('❌ Search query is required. Use --query=<search_term>');
    return;
  }

  console.log(`🔍 Searching models for: "${query}"\n`);

  try {
    const filters = {
      type: args.type,
      status: args.status,
      minScore: args['min-score'] ? parseFloat(args['min-score']) : undefined,
      maxAge: args['max-age'] ? parseInt(args['max-age']) : undefined
    };

    const models = await registry.searchModels(query, filters);

    if (models.length === 0) {
      console.log('No models found matching the search criteria.');
      return;
    }

    console.log(`Found ${models.length} models:\n`);

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name} (${model.version})`);
      console.log(`   ID: ${model.id}`);
      console.log(`   Type: ${model.type}`);
      console.log(`   Score: ${model.overallScore.toFixed(1)}%`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Tags: ${model.tags.join(', ') || 'None'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to search models:', error);
  }
}

async function showModelStats(registry: ModelRegistry, args: Record<string, string>) {
  const modelId = args['model-id'];
  const days = args.days ? parseInt(args.days) : 30;

  if (!modelId) {
    console.error('❌ Model ID is required. Use --model-id=<id>');
    return;
  }

  console.log(`📊 Usage Statistics for ${modelId} (last ${days} days)\n`);

  try {
    const stats = await registry.getModelUsageStats(modelId, days);

    console.log(`Total Predictions: ${stats.totalPredictions}`);
    console.log(`Average per Day: ${stats.avgPredictionsPerDay.toFixed(1)}`);
    console.log(`Peak Usage Day: ${stats.peakUsageDay}`);
    console.log('');

    console.log('📈 Daily Usage:');
    stats.dailyPredictions.slice(-7).forEach(day => {
      const bar = '█'.repeat(Math.floor(day.count / Math.max(stats.avgPredictionsPerDay, 1) * 10));
      console.log(`${day.date}: ${day.count.toString().padStart(4)} ${bar}`);
    });

  } catch (error) {
    console.error('❌ Failed to get model stats:', error);
  }
}

async function evaluateModel(evaluator: ModelEvaluator, args: Record<string, string>) {
  const modelId = args['model-id'];

  if (!modelId) {
    console.error('❌ Model ID is required. Use --model-id=<id>');
    return;
  }

  console.log(`🔬 Re-evaluating model ${modelId}...\n`);

  try {
    // This would require loading test data and the model
    // For now, just show that the functionality exists
    console.log('⚠️  Model re-evaluation requires test data and is not implemented in this demo.');
    console.log('   In a full implementation, this would:');
    console.log('   - Load the model from registry');
    console.log('   - Load fresh test data');
    console.log('   - Run comprehensive evaluation');
    console.log('   - Update performance metrics');
    console.log('   - Generate evaluation report');

  } catch (error) {
    console.error('❌ Failed to evaluate model:', error);
  }
}

async function main() {
  console.log('🤖 AI Model Management CLI\n');

  const { command, args } = parseArguments();

  // Check for help
  if (command === 'help' || args.help) {
    printUsage();
    return;
  }

  // Validate environment
  if (!(await validateEnvironment())) {
    process.exit(1);
  }

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const registry = new ModelRegistry(supabase);
  const evaluator = new ModelEvaluator(supabase);

  // Execute command
  try {
    switch (command) {
      case 'list':
        await listModels(registry, args);
        break;
      case 'info':
        await showModelInfo(registry, args);
        break;
      case 'compare':
        await compareModels(registry, args);
        break;
      case 'deploy':
        await deployModel(registry, args);
        break;
      case 'retire':
        await retireModel(registry, args);
        break;
      case 'export':
        await exportModel(registry, args);
        break;
      case 'search':
        await searchModels(registry, args);
        break;
      case 'stats':
        await showModelStats(registry, args);
        break;
      case 'evaluate':
        await evaluateModel(evaluator, args);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Use "help" to see available commands.');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Operation interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Operation terminated');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { main as manageModels }; 