import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const recordResultSchema = z.object({
  variant_id: z.string(),
  post_id: z.string().optional(),
  metric_value: z.number(),
  conversion_event: z.boolean().optional().default(false),
  metadata: z.object({}).optional(),
});

interface RouteParams {
  params: {
    experimentId: string;
  };
}

// POST - Record experiment result
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experimentId } = params;
    const body = await request.json();
    const validatedData = recordResultSchema.parse(body);

    // Verify experiment exists and is running
    const { data: experiment, error: expError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id)
      .single();

    if (expError || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    if (experiment.status !== 'running') {
      return NextResponse.json({ 
        error: `Cannot record results for experiment with status: ${experiment.status}` 
      }, { status: 400 });
    }

    // Verify variant exists in experiment
    const variantExists = experiment.variants.some((v: any) => v.id === validatedData.variant_id);
    if (!variantExists) {
      return NextResponse.json({ error: 'Invalid variant ID' }, { status: 400 });
    }

    // Record result
    const { data: result, error: insertError } = await supabase
      .from('experiment_results')
      .insert({
        experiment_id: experimentId,
        variant_id: validatedData.variant_id,
        user_id: user.id,
        post_id: validatedData.post_id,
        metric_value: validatedData.metric_value,
        conversion_event: validatedData.conversion_event,
        metadata: validatedData.metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error recording experiment result:', insertError);
      return NextResponse.json({ error: 'Failed to record result' }, { status: 500 });
    }

    // Check if experiment should auto-complete
    await checkAutoCompletion(experimentId, experiment);

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error('Result recording error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid result data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to record result' }, { status: 500 });
  }
}

// GET - Get experiment results with analysis
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experimentId } = params;
    const { searchParams } = new URL(request.url);
    const includeRaw = searchParams.get('include_raw') === 'true';

    // Verify experiment exists
    const { data: experiment, error: expError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id)
      .single();

    if (expError || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Get experiment results
    let resultsData = null;
    if (includeRaw) {
      const { data: results, error: resultsError } = await supabase
        .from('experiment_results')
        .select('*')
        .eq('experiment_id', experimentId)
        .order('recorded_at', { ascending: false });

      if (resultsError) {
        console.error('Error fetching raw results:', resultsError);
      } else {
        resultsData = results;
      }
    }

    // Calculate analysis
    const analysis = await calculateDetailedAnalysis(experimentId, experiment);

    return NextResponse.json({
      success: true,
      experiment_id: experimentId,
      analysis,
      raw_results: resultsData,
    });

  } catch (error) {
    console.error('Results fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

async function checkAutoCompletion(experimentId: string, experiment: any) {
  const supabase = createClient();

  try {
    // Get current result count
    const { data: results, error } = await supabase
      .from('experiment_results')
      .select('variant_id')
      .eq('experiment_id', experimentId);

    if (error || !results) {
      return;
    }

    // Count results per variant
    const variantCounts = results.reduce((acc, result) => {
      acc[result.variant_id] = (acc[result.variant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check if all variants have minimum sample size
    const allVariantsHaveMinSample = experiment.variants.every((variant: any) => 
      (variantCounts[variant.id] || 0) >= experiment.minimum_sample_size
    );

    if (!allVariantsHaveMinSample) {
      return; // Not ready for auto-completion
    }

    // Check if experiment has been running long enough (at least 3 days)
    const startDate = new Date(experiment.start_date);
    const now = new Date();
    const daysDiff = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 3) {
      return; // Too early for auto-completion
    }

    // Calculate current significance
    const analysis = await calculateDetailedAnalysis(experimentId, experiment);
    
    if (analysis && analysis.statistical_significance >= experiment.confidence_level) {
      // Auto-complete the experiment
      await supabase
        .from('ab_experiments')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
          results: analysis,
          winning_variant: analysis.winning_variant,
          statistical_significance: analysis.statistical_significance,
        })
        .eq('experiment_id', experimentId);

      console.log(`Auto-completed experiment ${experimentId} with significant results`);
    }

  } catch (error) {
    console.error('Error checking auto-completion:', error);
  }
}

async function calculateDetailedAnalysis(experimentId: string, experiment: any) {
  const supabase = createClient();

  try {
    // Get all results
    const { data: results, error } = await supabase
      .from('experiment_results')
      .select('*')
      .eq('experiment_id', experimentId);

    if (error || !results || results.length === 0) {
      return {
        status: 'no_data',
        total_sample_size: 0,
        variants: experiment.variants.map((v: any) => ({
          ...v,
          sample_size: 0,
          metric_value: 0,
          conversion_rate: 0,
          confidence_interval: [0, 0],
        })),
      };
    }

    // Group by variant
    const variantResults = results.reduce((acc, result) => {
      if (!acc[result.variant_id]) {
        acc[result.variant_id] = [];
      }
      acc[result.variant_id].push(result);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate detailed stats for each variant
    const variantStats = experiment.variants.map((variant: any) => {
      const variantData = variantResults[variant.id] || [];
      const sampleSize = variantData.length;
      
      if (sampleSize === 0) {
        return {
          ...variant,
          sample_size: 0,
          metric_value: 0,
          conversion_rate: 0,
          confidence_interval: [0, 0],
          daily_breakdown: [],
        };
      }

      // Calculate metrics
      const metricValues = variantData.map(r => r.metric_value);
      const conversions = variantData.filter(r => r.conversion_event).length;
      
      const mean = metricValues.reduce((sum, val) => sum + val, 0) / sampleSize;
      const variance = metricValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sampleSize;
      const stdDev = Math.sqrt(variance);
      const conversionRate = conversions / sampleSize;
      
      // Confidence interval for mean
      const standardError = stdDev / Math.sqrt(sampleSize);
      const criticalValue = 1.96; // 95% confidence
      const marginOfError = criticalValue * standardError;
      const confidenceInterval = [mean - marginOfError, mean + marginOfError];

      // Daily breakdown
      const dailyBreakdown = calculateDailyBreakdown(variantData);

      return {
        ...variant,
        sample_size: sampleSize,
        metric_value: mean,
        conversion_rate: conversionRate,
        std_dev: stdDev,
        confidence_interval: confidenceInterval,
        daily_breakdown: dailyBreakdown,
        conversions,
      };
    });

    // Statistical significance testing
    const controlVariant = variantStats[0];
    const testVariants = variantStats.slice(1);
    
    let bestVariant = controlVariant;
    let maxSignificance = 0;
    let isSignificant = false;

    for (const testVariant of testVariants) {
      if (testVariant.sample_size >= experiment.minimum_sample_size && 
          controlVariant.sample_size >= experiment.minimum_sample_size) {
        
        const significance = calculateSignificance(controlVariant, testVariant);
        
        if (significance > maxSignificance) {
          maxSignificance = significance;
          if (testVariant.metric_value > controlVariant.metric_value) {
            bestVariant = testVariant;
          }
          isSignificant = significance >= experiment.confidence_level;
        }
      }
    }

    // Risk assessment
    const riskAssessment = calculateRiskAssessment(variantStats, bestVariant);

    return {
      status: isSignificant ? 'significant' : 'inconclusive',
      winning_variant: isSignificant ? bestVariant.id : null,
      statistical_significance: maxSignificance,
      confidence_level: experiment.confidence_level,
      variants: variantStats,
      total_sample_size: results.length,
      risk_assessment: riskAssessment,
      analysis_date: new Date().toISOString(),
      recommendations: generateRecommendations(variantStats, isSignificant, bestVariant),
    };

  } catch (error) {
    console.error('Error calculating detailed analysis:', error);
    return null;
  }
}

function calculateDailyBreakdown(variantData: any[]) {
  const dailyMap = new Map<string, { count: number; total_metric: number; conversions: number }>();
  
  variantData.forEach(result => {
    const date = new Date(result.recorded_at).toISOString().split('T')[0];
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { count: 0, total_metric: 0, conversions: 0 });
    }
    
    const dayData = dailyMap.get(date)!;
    dayData.count++;
    dayData.total_metric += result.metric_value;
    if (result.conversion_event) {
      dayData.conversions++;
    }
  });

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    sample_size: data.count,
    avg_metric: data.total_metric / data.count,
    conversion_rate: data.conversions / data.count,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSignificance(controlVariant: any, testVariant: any): number {
  const controlMean = controlVariant.metric_value;
  const testMean = testVariant.metric_value;
  const controlSize = controlVariant.sample_size;
  const testSize = testVariant.sample_size;
  const controlStd = controlVariant.std_dev;
  const testStd = testVariant.std_dev;
  
  if (controlSize === 0 || testSize === 0 || controlStd === 0 || testStd === 0) {
    return 0;
  }
  
  // Welch's t-test for unequal variances
  const pooledSE = Math.sqrt((controlStd ** 2 / controlSize) + (testStd ** 2 / testSize));
  const tStat = Math.abs(testMean - controlMean) / pooledSE;
  
  // Degrees of freedom (Welch-Satterthwaite equation)
  const df = Math.pow(pooledSE, 4) / (
    Math.pow(controlStd ** 2 / controlSize, 2) / (controlSize - 1) +
    Math.pow(testStd ** 2 / testSize, 2) / (testSize - 1)
  );
  
  // Convert t-statistic to confidence level (simplified)
  const confidence = Math.min(0.999, 1 - Math.exp(-tStat));
  
  return confidence;
}

function calculateRiskAssessment(variantStats: any[], bestVariant: any) {
  const worstCase = Math.min(...variantStats.map(v => v.confidence_interval[0]));
  const bestCase = Math.max(...variantStats.map(v => v.confidence_interval[1]));
  
  const potentialLoss = bestVariant.metric_value - worstCase;
  const potentialGain = bestCase - bestVariant.metric_value;
  
  return {
    potential_loss: potentialLoss,
    potential_gain: potentialGain,
    risk_ratio: potentialGain > 0 ? potentialLoss / potentialGain : 0,
    confidence_in_winner: bestVariant.sample_size >= 100 ? 'high' : 
                         bestVariant.sample_size >= 50 ? 'medium' : 'low',
  };
}

function generateRecommendations(variantStats: any[], isSignificant: boolean, bestVariant: any): string[] {
  const recommendations = [];
  
  if (!isSignificant) {
    recommendations.push('Continue the experiment to gather more data before making a decision.');
    
    const minSampleSize = Math.min(...variantStats.map(v => v.sample_size));
    if (minSampleSize < 100) {
      recommendations.push(`Increase sample size - current minimum is ${minSampleSize}, aim for at least 100 per variant.`);
    }
  } else {
    recommendations.push(`Implement the winning variant (${bestVariant.name}) for improved performance.`);
    
    const improvement = ((bestVariant.metric_value - variantStats[0].metric_value) / variantStats[0].metric_value * 100).toFixed(1);
    recommendations.push(`Expected improvement: ${improvement}% over the control variant.`);
  }
  
  // Check for data quality issues
  const hasLowVariance = variantStats.some(v => v.std_dev < 0.01);
  if (hasLowVariance) {
    recommendations.push('Some variants show very low variance - consider reviewing data collection methods.');
  }
  
  return recommendations;
}