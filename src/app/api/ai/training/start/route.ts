import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for training request
const startTrainingSchema = z.object({
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])).min(1),
  model_types: z.array(z.enum(['engagement_prediction', 'content_optimization', 'sentiment_analysis', 'virality_prediction'])).min(1),
  config: z.object({
    min_posts_required: z.number().positive().optional().default(50),
    train_test_split: z.number().min(0.1).max(0.9).optional().default(0.8),
    validation_split: z.number().min(0.1).max(0.5).optional().default(0.2),
    epochs: z.number().positive().optional().default(10),
    batch_size: z.number().positive().optional().default(32),
  }).optional().default({}),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = startTrainingSchema.parse(body);

    // Check if user has sufficient data for training
    const dataQualityCheck = await assessTrainingDataQuality(user.id, validatedData.platforms);
    
    if (!dataQualityCheck.readyForTraining) {
      return NextResponse.json({
        error: 'Insufficient training data',
        details: dataQualityCheck,
      }, { status: 400 });
    }

    // Create training session
    const sessionId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: trainingSession, error: sessionError } = await supabase
      .from('model_training_sessions')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        platforms: validatedData.platforms,
        status: 'preparing',
        progress: 0,
        current_phase: 'Data Collection',
        config: {
          ...validatedData.config,
          model_types: validatedData.model_types,
          data_quality: dataQualityCheck,
        },
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating training session:', sessionError);
      return NextResponse.json({ error: 'Failed to create training session' }, { status: 500 });
    }

    // Start training process asynchronously
    startTrainingProcess(sessionId, user.id, validatedData);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      data_quality: dataQualityCheck,
      estimated_duration: calculateEstimatedDuration(dataQualityCheck.totalPosts, validatedData.model_types.length),
    });

  } catch (error) {
    console.error('Training start error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    );
  }
}

async function assessTrainingDataQuality(userId: string, platforms: string[]) {
  const supabase = await createClient();
  
  let totalPosts = 0;
  let validPosts = 0;
  let averageEngagement = 0;
  const issues: string[] = [];
  const recommendations: string[] = [];

  for (const platform of platforms) {
    // Get posts for this platform
    const { data: posts, error } = await supabase
      .from('user_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      console.error(`Error fetching posts for ${platform}:`, error);
      continue;
    }

    // Type guard to ensure posts is an array of the expected shape
    let platformPosts: { caption: string; likes: number; comments: number; engagement_rate: number }[] = [];
    if (Array.isArray(posts)) {
      platformPosts = (posts as unknown[]).filter((p): p is { caption: string; likes: number; comments: number; engagement_rate: number } =>
        typeof p === 'object' && p !== null &&
        'caption' in p && 'likes' in p && 'comments' in p && 'engagement_rate' in p
      );
    }
    totalPosts += platformPosts.length;

    // Assess data quality
    const validPlatformPosts = platformPosts.filter(post => 
      post.caption && 
      post.likes !== null && 
      post.comments !== null && 
      post.engagement_rate !== null
    );
    validPosts += validPlatformPosts.length;

    if (validPlatformPosts.length > 0) {
      const platformEngagement = validPlatformPosts.reduce((sum, post) => sum + (post.engagement_rate || 0), 0) / validPlatformPosts.length;
      averageEngagement += platformEngagement;
    }

    // Check for issues
    if (platformPosts.length < 10) {
      issues.push(`Insufficient posts for ${platform} (${platformPosts.length} found, minimum 10 required)`);
      recommendations.push(`Connect more ${platform} posts or wait for more historical data`);
    }

    if (validPlatformPosts.length / platformPosts.length < 0.8) {
      issues.push(`High proportion of incomplete data for ${platform}`);
      recommendations.push(`Ensure posts have complete engagement metrics`);
    }
  }

  averageEngagement = averageEngagement / platforms.length;

  // Calculate quality score
  const completenessScore = totalPosts > 0 ? validPosts / totalPosts : 0;
  const volumeScore = Math.min(totalPosts / 100, 1); // Ideal: 100+ posts
  const qualityScore = (completenessScore * 0.6) + (volumeScore * 0.4);

  const readyForTraining = totalPosts >= 50 && validPosts >= 40 && qualityScore >= 0.7;

  if (!readyForTraining) {
    if (totalPosts < 50) {
      recommendations.push('Collect at least 50 posts across all platforms');
    }
    if (qualityScore < 0.7) {
      recommendations.push('Improve data quality by ensuring posts have complete engagement metrics');
    }
  }

  // Store assessment
  await supabase
    .from('training_data_quality')
    .insert({
      user_id: userId,
      platform: platforms.join(','),
      total_posts: totalPosts,
      valid_posts: validPosts,
      invalid_posts: totalPosts - validPosts,
      average_engagement: averageEngagement,
      quality_score: qualityScore,
      issues,
      recommendations,
      ready_for_training: readyForTraining,
    });

  return {
    totalPosts,
    validPosts,
    averageEngagement,
    qualityScore,
    issues,
    recommendations,
    readyForTraining,
  };
}

async function startTrainingProcess(sessionId: string, userId: string, config: z.infer<typeof startTrainingSchema>) {
  const supabase = await createClient();

  try {
    // Update status to collecting_data
    await updateTrainingProgress(sessionId, 'collecting_data', 10, 'Collecting Training Data');

    // Simulate data collection phase
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update status to training
    await updateTrainingProgress(sessionId, 'training', 30, 'Training Models');

    // Train each model type
    for (let i = 0; i < config.model_types.length; i++) {
      const modelType = config.model_types[i];
      const progress = 30 + (i + 1) * (60 / config.model_types.length);
      
      await updateTrainingProgress(sessionId, 'training', progress, `Training ${modelType} model`);
      
      // Simulate model training
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Store trained model
      await storeTrainedModel(userId, modelType, config.platforms, sessionId);
    }

    // Complete training
    await updateTrainingProgress(sessionId, 'completed', 100, 'Training Complete');

    console.log(`Training session ${sessionId} completed successfully`);

  } catch (error) {
    console.error(`Training session ${sessionId} failed:`, error);
    
    await supabase
      .from('model_training_sessions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);
  }
}

async function updateTrainingProgress(sessionId: string, status: string, progress: number, phase: string) {
  const supabase = await createClient();
  
  await supabase
    .from('model_training_sessions')
    .update({
      status,
      progress,
      current_phase: phase,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('session_id', sessionId);
}

async function storeTrainedModel(userId: string, modelType: string, platforms: string[], sessionId: string) {
  const supabase = await createClient();
  
  // Mock model performance metrics
  const mockMetrics = {
    accuracy: 0.85 + Math.random() * 0.1,
    precision_score: 0.80 + Math.random() * 0.15,
    recall: 0.82 + Math.random() * 0.13,
    f1_score: 0.83 + Math.random() * 0.12,
    mse: Math.random() * 0.05,
    mae: Math.random() * 0.03,
    r2_score: 0.75 + Math.random() * 0.2,
  };

  const modelName = `${modelType}_${userId}_${Date.now()}`;
  const version = '1.0.0';

  await supabase
    .from('trained_models')
    .insert({
      model_name: modelName,
      model_type: modelType,
      version,
      user_id: userId,
      platforms,
      accuracy: mockMetrics.accuracy,
      precision_score: mockMetrics.precision_score,
      recall: mockMetrics.recall,
      f1_score: mockMetrics.f1_score,
      mse: mockMetrics.mse,
      mae: mockMetrics.mae,
      r2_score: mockMetrics.r2_score,
      model_path: `/models/${userId}/${modelName}`,
      config_path: `/models/${userId}/${modelName}/config.json`,
      training_data_size: 100 + Math.floor(Math.random() * 500),
      validation_metrics: {
        cross_validation_score: mockMetrics.accuracy,
        training_session_id: sessionId,
        training_duration_minutes: 15 + Math.random() * 30,
      },
    });
}

function calculateEstimatedDuration(totalPosts: number, modelCount: number): string {
  // Rough estimation based on data volume and model complexity
  const baseMinutes = Math.max(5, Math.floor(totalPosts / 10));
  const totalMinutes = baseMinutes * modelCount;
  
  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}

// GET endpoint to check training status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get training session
    const { data: session, error } = await supabase
      .from('model_training_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Training session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session,
    });

  } catch (error) {
    console.error('Training status error:', error);
    return NextResponse.json({ error: 'Failed to get training status' }, { status: 500 });
  }
}