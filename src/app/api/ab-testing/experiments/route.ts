import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const createExperimentSchema = z.object({
  name: z.string().min(1, 'Experiment name is required'),
  description: z.string().optional(),
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  target_metric: z.enum(['engagement_rate', 'likes', 'comments', 'shares', 'views', 'saves']),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    content: z.object({
      caption: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      posting_time: z.string().optional(),
      visual_style: z.string().optional(),
    }),
    weight: z.number().min(0).max(1), // Traffic allocation
  })).min(2).max(5),
  minimum_sample_size: z.number().positive().optional().default(100),
  confidence_level: z.number().min(0.8).max(0.99).optional().default(0.95),
  duration_days: z.number().positive().max(30).optional().default(7),
});

const recordResultSchema = z.object({
  experiment_id: z.string(),
  variant_id: z.string(),
  post_id: z.string().optional(),
  metric_value: z.number(),
  conversion_event: z.boolean().optional().default(false),
  metadata: z.object({}).optional(),
});

// POST - Create new A/B experiment
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createExperimentSchema.parse(body);

    // Validate variant weights sum to 1
    const totalWeight = validatedData.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      return NextResponse.json({ error: 'Variant weights must sum to 1.0' }, { status: 400 });
    }

    // Check for active experiments limit
    const { data: activeExperiments, error: activeError } = await supabase
      .from('ab_experiments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'running');

    if (activeError) {
      console.error('Error checking active experiments:', activeError);
      return NextResponse.json({ error: 'Failed to validate experiment limits' }, { status: 500 });
    }

    if (activeExperiments.length >= 3) {
      return NextResponse.json({ 
        error: 'Maximum of 3 active experiments allowed. Please complete or pause existing experiments first.' 
      }, { status: 400 });
    }

    // Generate experiment ID
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate Bayesian priors (using uniform priors for now)
    const priorAlpha = 1.0;
    const priorBeta = 1.0;

    // Create experiment
    const { data: experiment, error: createError } = await supabase
      .from('ab_experiments')
      .insert({
        experiment_id: experimentId,
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
        platform: validatedData.platform,
        status: 'draft',
        variants: validatedData.variants,
        target_metric: validatedData.target_metric,
        minimum_sample_size: validatedData.minimum_sample_size,
        confidence_level: validatedData.confidence_level,
        prior_alpha: priorAlpha,
        prior_beta: priorBeta,
        start_date: null, // Will be set when experiment starts
        end_date: null,
        results: null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating experiment:', createError);
      return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      experiment_id: experimentId,
      experiment,
    });

  } catch (error) {
    console.error('Experiment creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid experiment data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
  }
}

// GET - List experiments for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    let query = supabase
      .from('ab_experiments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: experiments, error } = await query;

    if (error) {
      console.error('Error fetching experiments:', error);
      return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
    }

    // Enrich experiments with current results
    const enrichedExperiments = await Promise.all(
      experiments.map(async (exp) => {
        if (exp.status === 'running' || exp.status === 'completed') {
          const results = await calculateExperimentResults(exp.experiment_id);
          return { ...exp, current_results: results };
        }
        return exp;
      })
    );

    return NextResponse.json({
      success: true,
      experiments: enrichedExperiments,
    });

  } catch (error) {
    console.error('Experiments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }
}

// Helper function to calculate experiment results
async function calculateExperimentResults(experimentId: string) {
  const supabase = createClient();

  try {
    // Get experiment details
    const { data: experiment, error: expError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', experimentId)
      .single();

    if (expError || !experiment) {
      return null;
    }

    // Get all results for this experiment
    const { data: results, error: resultsError } = await supabase
      .from('experiment_results')
      .select('*')
      .eq('experiment_id', experimentId);

    if (resultsError) {
      console.error('Error fetching experiment results:', resultsError);
      return null;
    }

    if (!results || results.length === 0) {
      return {
        status: 'no_data',
        variants: experiment.variants.map((v: any) => ({
          ...v,
          sample_size: 0,
          metric_value: 0,
          confidence_interval: [0, 0],
        })),
      };
    }

    // Group results by variant
    const variantResults = results.reduce((acc, result) => {
      if (!acc[result.variant_id]) {
        acc[result.variant_id] = [];
      }
      acc[result.variant_id].push(result);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate statistics for each variant
    const variantStats = experiment.variants.map((variant: any) => {
      const variantData = variantResults[variant.id] || [];
      const sampleSize = variantData.length;
      const metricValues = variantData.map(r => r.metric_value);
      
      if (sampleSize === 0) {
        return {
          ...variant,
          sample_size: 0,
          metric_value: 0,
          std_dev: 0,
          confidence_interval: [0, 0],
        };
      }

      const mean = metricValues.reduce((sum, val) => sum + val, 0) / sampleSize;
      const variance = metricValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sampleSize;
      const stdDev = Math.sqrt(variance);
      const standardError = stdDev / Math.sqrt(sampleSize);
      
      // Calculate 95% confidence interval
      const criticalValue = 1.96; // For 95% confidence
      const marginOfError = criticalValue * standardError;
      const confidenceInterval = [mean - marginOfError, mean + marginOfError];

      return {
        ...variant,
        sample_size: sampleSize,
        metric_value: mean,
        std_dev: stdDev,
        confidence_interval: confidenceInterval,
      };
    });

    // Determine statistical significance and winning variant
    const controlVariant = variantStats[0];
    const testVariants = variantStats.slice(1);
    
    let winningVariant = null;
    let statisticalSignificance = 0;
    let hasSignificantWinner = false;

    if (controlVariant.sample_size >= experiment.minimum_sample_size) {
      // Bayesian A/B testing using Beta distribution
      for (const testVariant of testVariants) {
        if (testVariant.sample_size >= experiment.minimum_sample_size) {
          const significance = calculateBayesianSignificance(
            controlVariant,
            testVariant,
            experiment.prior_alpha,
            experiment.prior_beta
          );
          
          if (significance > statisticalSignificance) {
            statisticalSignificance = significance;
            winningVariant = testVariant.id;
            hasSignificantWinner = significance >= experiment.confidence_level;
          }
        }
      }
    }

    return {
      status: hasSignificantWinner ? 'significant' : 'inconclusive',
      winning_variant: winningVariant,
      statistical_significance: statisticalSignificance,
      variants: variantStats,
      total_sample_size: results.length,
      analysis_date: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error calculating experiment results:', error);
    return null;
  }
}

function calculateBayesianSignificance(
  controlVariant: any,
  testVariant: any,
  priorAlpha: number,
  priorBeta: number
): number {
  // Simplified Bayesian calculation
  // In production, you'd use a proper Beta distribution calculation
  
  const controlMean = controlVariant.metric_value;
  const testMean = testVariant.metric_value;
  const controlSize = controlVariant.sample_size;
  const testSize = testVariant.sample_size;
  
  if (controlSize === 0 || testSize === 0) {
    return 0;
  }
  
  // Calculate pooled standard error
  const pooledVariance = (
    (controlVariant.std_dev ** 2 * (controlSize - 1)) +
    (testVariant.std_dev ** 2 * (testSize - 1))
  ) / (controlSize + testSize - 2);
  
  const standardError = Math.sqrt(pooledVariance * (1/controlSize + 1/testSize));
  
  if (standardError === 0) {
    return testMean > controlMean ? 0.99 : 0.01;
  }
  
  // Calculate z-score
  const zScore = Math.abs(testMean - controlMean) / standardError;
  
  // Convert to confidence level (simplified)
  const confidence = Math.min(0.999, 1 - Math.exp(-zScore));
  
  return confidence;
}