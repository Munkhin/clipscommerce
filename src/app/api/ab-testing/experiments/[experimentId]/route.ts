import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateExperimentSchema = z.object({
  status: z.enum(['draft', 'running', 'paused', 'completed', 'cancelled']).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  end_date: z.string().optional(),
});

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

// GET - Get specific experiment details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experimentId } = params;

    // Get experiment
    const { data: experiment, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id)
      .single();

    if (error || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Get experiment results
    const { data: results, error: resultsError } = await supabase
      .from('experiment_results')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('recorded_at', { ascending: false });

    if (resultsError) {
      console.error('Error fetching experiment results:', resultsError);
    }

    // Calculate current statistics
    const currentResults = await calculateExperimentResults(experimentId);

    return NextResponse.json({
      success: true,
      experiment: {
        ...experiment,
        results: results || [],
        current_analysis: currentResults,
      },
    });

  } catch (error) {
    console.error('Experiment fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch experiment' }, { status: 500 });
  }
}

// PATCH - Update experiment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experimentId } = params;
    const body = await request.json();
    const validatedData = updateExperimentSchema.parse(body);

    // Get current experiment
    const { data: currentExp, error: fetchError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentExp) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Validate status transitions
    if (validatedData.status) {
      const validTransitions = getValidStatusTransitions(currentExp.status);
      if (!validTransitions.includes(validatedData.status)) {
        return NextResponse.json({ 
          error: `Cannot transition from ${currentExp.status} to ${validatedData.status}` 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Set timestamps for status changes
    if (validatedData.status === 'running' && currentExp.status === 'draft') {
      updateData.start_date = new Date().toISOString();
    }

    if (validatedData.status === 'completed' || validatedData.status === 'cancelled') {
      updateData.end_date = new Date().toISOString();
      
      // Calculate final results for completed experiments
      if (validatedData.status === 'completed') {
        const finalResults = await calculateExperimentResults(experimentId);
        updateData.results = finalResults;
        
        if (finalResults?.winning_variant) {
          updateData.winning_variant = finalResults.winning_variant;
          updateData.statistical_significance = finalResults.statistical_significance;
        }
      }
    }

    // Update experiment
    const { data: updatedExp, error: updateError } = await supabase
      .from('ab_experiments')
      .update(updateData)
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating experiment:', updateError);
      return NextResponse.json({ error: 'Failed to update experiment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      experiment: updatedExp,
    });

  } catch (error) {
    console.error('Experiment update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update experiment' }, { status: 500 });
  }
}

// DELETE - Delete experiment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experimentId } = params;

    // Check if experiment exists and belongs to user
    const { data: experiment, error: fetchError } = await supabase
      .from('ab_experiments')
      .select('status')
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Only allow deletion of draft or completed experiments
    if (experiment.status === 'running') {
      return NextResponse.json({ 
        error: 'Cannot delete running experiment. Please pause or complete it first.' 
      }, { status: 400 });
    }

    // Delete experiment results first (foreign key constraint)
    const { error: resultsDeleteError } = await supabase
      .from('experiment_results')
      .delete()
      .eq('experiment_id', experimentId);

    if (resultsDeleteError) {
      console.error('Error deleting experiment results:', resultsDeleteError);
      return NextResponse.json({ error: 'Failed to delete experiment data' }, { status: 500 });
    }

    // Delete experiment
    const { error: deleteError } = await supabase
      .from('ab_experiments')
      .delete()
      .eq('experiment_id', experimentId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting experiment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Experiment deleted successfully',
    });

  } catch (error) {
    console.error('Experiment deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
}

// Helper functions
function getValidStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    draft: ['running', 'cancelled'],
    running: ['paused', 'completed', 'cancelled'],
    paused: ['running', 'completed', 'cancelled'],
    completed: [], // Final state
    cancelled: [], // Final state
  };

  return transitions[currentStatus] || [];
}

async function calculateExperimentResults(experimentId: string) {
  // This is the same function from the main experiments route
  // In a real implementation, you'd extract this to a shared utility
  const supabase = createClient();

  try {
    const { data: experiment, error: expError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('experiment_id', experimentId)
      .single();

    if (expError || !experiment) {
      return null;
    }

    const { data: results, error: resultsError } = await supabase
      .from('experiment_results')
      .select('*')
      .eq('experiment_id', experimentId);

    if (resultsError || !results || results.length === 0) {
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
      const metricValues = variantData.map((r: any) => r.metric_value);
      
      if (sampleSize === 0) {
        return {
          ...variant,
          sample_size: 0,
          metric_value: 0,
          std_dev: 0,
          confidence_interval: [0, 0],
        };
      }

      const mean = metricValues.reduce((sum: number, val: number) => sum + val, 0) / sampleSize;
      const variance = metricValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / sampleSize;
      const stdDev = Math.sqrt(variance);
      const standardError = stdDev / Math.sqrt(sampleSize);
      
      const criticalValue = 1.96;
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

    // Determine winner
    const bestVariant = variantStats.reduce((best, current) => 
      current.metric_value > best.metric_value ? current : best
    );

    const hasSignificantWinner = variantStats[0].sample_size >= experiment.minimum_sample_size &&
                                bestVariant.sample_size >= experiment.minimum_sample_size;

    return {
      status: hasSignificantWinner ? 'significant' : 'inconclusive',
      winning_variant: hasSignificantWinner ? bestVariant.id : null,
      statistical_significance: hasSignificantWinner ? 0.95 : 0,
      variants: variantStats,
      total_sample_size: results.length,
      analysis_date: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error calculating experiment results:', error);
    return null;
  }
}