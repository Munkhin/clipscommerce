import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UsageRecord {
  user_id: string;
  operation_type: 'content_generation' | 'video_optimization' | 'data_analysis' | 'ai_recommendation';
  execution_count: number;
  cost_units: number;
  timestamp: string;
}

interface TierLimits {
  lite: number;
  pro: number;
  team: number | null; // null = unlimited
}

const MONTHLY_LIMITS: TierLimits = {
  lite: 15,
  pro: 100,
  team: null
};

// GET /api/usage - Get current usage for user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', session.user.id)
      .single();

    const tier = profile?.subscription_tier || 'lite';
    const limit = MONTHLY_LIMITS[tier as keyof TierLimits];

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usageRecords, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('timestamp', startOfMonth.toISOString());

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
    }

    const totalUsage = usageRecords?.reduce((sum, record) => sum + record.execution_count, 0) || 0;
    
    return NextResponse.json({
      user_id: session.user.id,
      subscription_tier: tier,
      current_usage: totalUsage,
      monthly_limit: limit,
      remaining: limit ? Math.max(0, limit - totalUsage) : null,
      reset_date: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString(),
      usage_by_operation: usageRecords || []
    });

  } catch (error) {
    console.error('Usage GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/usage - Track new usage
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation_type, execution_count = 1, cost_units = 1 } = body;

    if (!operation_type) {
      return NextResponse.json({ error: 'operation_type is required' }, { status: 400 });
    }

    // Get user subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', session.user.id)
      .single();

    const tier = profile?.subscription_tier || 'lite';
    const limit = MONTHLY_LIMITS[tier as keyof TierLimits];

    // Check current usage if limit exists
    if (limit !== null) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageRecords } = await supabase
        .from('usage_tracking')
        .select('execution_count')
        .eq('user_id', session.user.id)
        .gte('timestamp', startOfMonth.toISOString());

      const currentUsage = usageRecords?.reduce((sum, record) => sum + record.execution_count, 0) || 0;
      
      if (currentUsage + execution_count > limit) {
        return NextResponse.json({
          error: 'Usage limit exceeded',
          current_usage: currentUsage,
          monthly_limit: limit,
          requested_executions: execution_count,
          upgrade_required: true,
          upgrade_url: '/pricing'
        }, { status: 402 }); // Payment Required
      }
    }

    // Record the usage
    const usageRecord: UsageRecord = {
      user_id: session.user.id,
      operation_type,
      execution_count,
      cost_units,
      timestamp: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('usage_tracking')
      .insert([usageRecord]);

    if (insertError) {
      console.error('Usage tracking insert error:', insertError);
      return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      recorded: usageRecord,
      message: 'Usage tracked successfully'
    });

  } catch (error) {
    console.error('Usage POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 