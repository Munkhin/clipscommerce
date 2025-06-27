// examples/usage-example.ts

import { createClient } from '@supabase/supabase-js';
import { 
  EngagementPredictionAgent, 
  PredictionRequest,
  quickSetup,
  productionSetup 
} from '../index';

// Example usage of the EngagementPredictionAgent

async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL || 'your-supabase-url',
    process.env.SUPABASE_ANON_KEY || 'your-supabase-key'
  );

  // Quick setup for development
  const agent = await quickSetup(supabase);

  // Create a prediction request
  const request: PredictionRequest = {
    userId: 'user-123',
    platform: 'tiktok',
    contentMetadata: {
      caption: 'Amazing dance video! Check this out 🔥 #viral #fyp #trending',
      hashtags: ['#viral', '#fyp', '#trending', '#dance'],
      duration: 30,
      contentType: 'video',
      scheduledPublishTime: new Date('2024-01-15T18:00:00Z'), // 6 PM
    },
    targetAudience: {
      demographics: { '18-24': 0.6, '25-34': 0.4 },
      interests: ['dance', 'music', 'entertainment'],
    },
  };

  // Get engagement prediction
  const prediction = await agent.predictEngagement(request);

  console.log('Prediction Results:');
  console.log(`Expected Views: ${prediction.predictedMetrics.views.toLocaleString()}`);
  console.log(`Expected Likes: ${prediction.predictedMetrics.likes.toLocaleString()}`);
  console.log(`Expected Engagement Rate: ${(prediction.predictedMetrics.engagementRate * 100).toFixed(2)}%`);
  console.log(`Viral Probability: ${(prediction.viralProbability.score * 100).toFixed(2)}%`);
  console.log(`Is Likely Viral: ${prediction.viralProbability.isLikelyViral ? 'Yes' : 'No'}`);

  console.log('\nOptimization Recommendations:');
  prediction.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
    console.log(`   ${rec.description}`);
    console.log(`   Expected Impact: +${rec.expectedImpact.percentageIncrease.toFixed(1)}% ${rec.expectedImpact.metric}`);
    console.log('');
  });
}

async function batchPredictionExample() {
  console.log('=== Batch Prediction Example ===');

  const supabase = createClient(
    process.env.SUPABASE_URL || 'your-supabase-url',
    process.env.SUPABASE_ANON_KEY || 'your-supabase-key'
  );

  const agent = await quickSetup(supabase);

  // Multiple content pieces to analyze
  const requests: PredictionRequest[] = [
    {
      userId: 'user-123',
      platform: 'tiktok',
      contentMetadata: {
        caption: 'Cooking tutorial - Easy pasta recipe!',
        hashtags: ['#cooking', '#recipe', '#food'],
        contentType: 'video',
        duration: 45,
      },
    },
    {
      userId: 'user-123',
      platform: 'instagram',
      contentMetadata: {
        caption: 'Beautiful sunset from my vacation 🌅',
        hashtags: ['#sunset', '#travel', '#photography', '#vacation'],
        contentType: 'image',
      },
    },
    {
      userId: 'user-123',
      platform: 'youtube',
      contentMetadata: {
        caption: 'Complete TypeScript Tutorial for Beginners',
        hashtags: ['#typescript', '#programming', '#tutorial'],
        contentType: 'video',
        duration: 1200, // 20 minutes
      },
    },
  ];

  // Get batch predictions
  const predictions = await agent.batchPredict(requests);

  console.log('Batch Prediction Results:');
  predictions.forEach((prediction, index) => {
    const request = requests[index];
    console.log(`\n${index + 1}. ${request.platform.toUpperCase()} - ${request.contentMetadata.contentType}`);
    console.log(`   Engagement Rate: ${(prediction.predictedMetrics.engagementRate * 100).toFixed(2)}%`);
    console.log(`   Viral Probability: ${(prediction.viralProbability.score * 100).toFixed(2)}%`);
    console.log(`   Top Recommendation: ${prediction.recommendations[0]?.title || 'None'}`);
  });
}

async function productionExample() {
  console.log('=== Production Setup Example ===');

  const supabase = createClient(
    process.env.SUPABASE_URL || 'your-supabase-url',
    process.env.SUPABASE_ANON_KEY || 'your-supabase-key'
  );

  // Production setup with data ingestion
  const { agent, evaluation, dataIngestionService } = await productionSetup(
    supabase,
    'user-123',
    {
      tiktok: process.env.TIKTOK_ACCESS_TOKEN,
      instagram: process.env.INSTAGRAM_ACCESS_TOKEN,
      youtube: process.env.YOUTUBE_ACCESS_TOKEN,
    }
  );

  console.log('Model Performance:');
  console.log(`Engagement Model R²: ${evaluation.engagementModel.r2Score.toFixed(4)}`);
  console.log(`Viral Model Accuracy: ${evaluation.viralModel.accuracy.toFixed(4)}`);

  // Schedule regular data updates
  const scheduleId = await dataIngestionService.scheduleDataIngestion(
    'user-123',
    {
      tiktok: process.env.TIKTOK_ACCESS_TOKEN,
      instagram: process.env.INSTAGRAM_ACCESS_TOKEN,
    },
    'daily'
  );

  console.log(`Scheduled daily data ingestion: ${scheduleId}`);

  // Example prediction with fresh data
  const request: PredictionRequest = {
    userId: 'user-123',
    platform: 'tiktok',
    contentMetadata: {
      caption: 'New trending dance challenge! 💃',
      hashtags: ['#dance', '#challenge', '#viral'],
      contentType: 'video',
      duration: 15,
    },
  };

  const prediction = await agent.predictEngagement(request);
  console.log(`\nPrediction with fresh data:`);
  console.log(`Viral Probability: ${(prediction.viralProbability.score * 100).toFixed(2)}%`);
}

async function optimizationWorkflowExample() {
  console.log('=== Optimization Workflow Example ===');

  const supabase = createClient(
    process.env.SUPABASE_URL || 'your-supabase-url',
    process.env.SUPABASE_ANON_KEY || 'your-supabase-key'
  );

  const agent = await quickSetup(supabase);

  // Original content idea
  let request: PredictionRequest = {
    userId: 'user-123',
    platform: 'tiktok',
    contentMetadata: {
      caption: 'My video',
      hashtags: ['#video'],
      contentType: 'video',
      duration: 60,
      scheduledPublishTime: new Date('2024-01-15T10:00:00Z'), // 10 AM
    },
  };

  console.log('Original Content Analysis:');
  let prediction = await agent.predictEngagement(request);
  console.log(`Engagement Rate: ${(prediction.predictedMetrics.engagementRate * 100).toFixed(2)}%`);
  console.log(`Viral Probability: ${(prediction.viralProbability.score * 100).toFixed(2)}%`);

  // Apply optimization recommendations
  const topRecommendation = prediction.recommendations[0];
  console.log(`\nApplying top recommendation: ${topRecommendation.title}`);

  // Optimized version based on recommendations
  const optimizedRequest: PredictionRequest = {
    ...request,
    contentMetadata: {
      ...request.contentMetadata,
      caption: 'Amazing dance tutorial! Learn this trending move 🔥 #viral #fyp #trending #dance',
      hashtags: ['#viral', '#fyp', '#trending', '#dance', '#tutorial'],
      duration: 30, // Optimized duration
      scheduledPublishTime: new Date('2024-01-15T19:00:00Z'), // 7 PM (optimal time)
    },
  };

  console.log('\nOptimized Content Analysis:');
  const optimizedPrediction = await agent.predictEngagement(optimizedRequest);
  console.log(`Engagement Rate: ${(optimizedPrediction.predictedMetrics.engagementRate * 100).toFixed(2)}%`);
  console.log(`Viral Probability: ${(optimizedPrediction.viralProbability.score * 100).toFixed(2)}%`);

  const improvement = ((optimizedPrediction.predictedMetrics.engagementRate - prediction.predictedMetrics.engagementRate) / prediction.predictedMetrics.engagementRate) * 100;
  console.log(`\nImprovement: +${improvement.toFixed(1)}% engagement rate`);
}

// Run examples
async function runExamples() {
  try {
    await basicUsageExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await batchPredictionExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await optimizationWorkflowExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Only run production example if tokens are available
    if (process.env.TIKTOK_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN) {
      await productionExample();
    } else {
      console.log('Skipping production example (no API tokens provided)');
    }
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for use in other files
export {
  basicUsageExample,
  batchPredictionExample,
  productionExample,
  optimizationWorkflowExample,
  runExamples,
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples();
} 