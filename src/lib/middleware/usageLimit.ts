import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UsageLimitOptions {
  operationType: 'content_generation' | 'video_optimization' | 'data_analysis' | 'ai_recommendation';
  executionCount?: number;
  costUnits?: number;
  bypassRoles?: string[];
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

export class UsageLimitMiddleware {
  /**
   * Middleware function to check usage limits before framework execution
   */
  static async checkUsageLimit(
    request: NextRequest,
    options: UsageLimitOptions
  ): Promise<NextResponse | null> {
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get user subscription tier and profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, role')
        .eq('id', session.user.id)
        .single();

      const tier = profile?.subscription_tier || 'lite';
      const userRole = profile?.role;

      // Check if user has bypass privileges
      if (options.bypassRoles && userRole && options.bypassRoles.includes(userRole)) {
        return null; // Allow bypass
      }

      // Get monthly limit for user tier
      const limit = MONTHLY_LIMITS[tier as keyof TierLimits];
      
      // Team tier has unlimited usage
      if (limit === null) {
        return null; // No limit for team tier
      }

      // Get current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageRecords, error } = await supabase
        .from('usage_tracking')
        .select('execution_count')
        .eq('user_id', session.user.id)
        .gte('timestamp', startOfMonth.toISOString());

      if (error) {
        console.error('Usage tracking query error:', error);
        // Allow request to proceed if usage tracking fails
        return null;
      }

      const currentUsage = usageRecords?.reduce((sum, record) => sum + record.execution_count, 0) || 0;
      const executionCount = options.executionCount || 1;

      // Check if adding this execution would exceed the limit
      if (currentUsage + executionCount > limit) {
        // Return HTTP 402 Payment Required
        return NextResponse.json({
          error: 'Usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED',
          details: {
            subscription_tier: tier,
            current_usage: currentUsage,
            monthly_limit: limit,
            requested_executions: executionCount,
            remaining: Math.max(0, limit - currentUsage),
            reset_date: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString()
          },
          upgrade_info: {
            required: true,
            recommended_tier: tier === 'lite' ? 'pro' : 'team',
            upgrade_url: '/pricing',
            benefits: this.getUpgradeBenefits(tier)
          },
          support: {
            contact_url: '/contact',
            help_url: '/help/usage-limits'
          }
        }, { 
          status: 402,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': Math.max(0, limit - currentUsage).toString(),
            'X-RateLimit-Reset': new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).getTime().toString(),
            'Retry-After': '86400' // Try again tomorrow
          }
        });
      }

      // Usage is within limits, return null to allow request
      return null;
    } catch (error) {
      console.error('Usage limit check error:', error);
      // Allow request to proceed if middleware fails
      return null;
    }
  }

  /**
   * Track usage after successful execution
   */
  static async trackUsage(
    userId: string,
    options: UsageLimitOptions
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      const usageRecord = {
        user_id: userId,
        operation_type: options.operationType,
        execution_count: options.executionCount || 1,
        cost_units: options.costUnits || 1,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('usage_tracking')
        .insert([usageRecord]);

      if (error) {
        console.error('Usage tracking error:', error);
        // Don't throw error to avoid breaking the main request
      }
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }

  /**
   * Get upgrade benefits based on current tier
   */
  private static getUpgradeBenefits(currentTier: string): string[] {
    switch (currentTier) {
      case 'lite':
        return [
          'Increase to 100 monthly executions',
          'Priority processing',
          'Advanced analytics',
          'Email support'
        ];
      case 'pro':
        return [
          'Unlimited executions',
          'Team collaboration features',
          'Advanced workflow automation',
          'Dedicated support',
          'Custom integrations'
        ];
      default:
        return ['Contact sales for enterprise features'];
    }
  }

  /**
   * Create Express-style middleware wrapper
   */
  static withUsageLimit(options: UsageLimitOptions) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      return this.checkUsageLimit(request, options);
    };
  }

  /**
   * Get current usage statistics for a user
   */
  static async getUserUsageStats(userId: string): Promise<{
    subscription_tier: string;
    current_usage: number;
    monthly_limit: number | null;
    remaining: number | null;
    reset_date: string;
    usage_by_operation: any[];
  } | null> {
    try {
      const supabase = await createClient();
      
      // Get user subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      const tier = profile?.subscription_tier || 'lite';
      const limit = MONTHLY_LIMITS[tier as keyof TierLimits];

      // Get current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageRecords } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startOfMonth.toISOString());

      const totalUsage = usageRecords?.reduce((sum, record) => sum + record.execution_count, 0) || 0;

      return {
        subscription_tier: tier,
        current_usage: totalUsage,
        monthly_limit: limit,
        remaining: limit ? Math.max(0, limit - totalUsage) : null,
        reset_date: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString(),
        usage_by_operation: usageRecords || []
      };
    } catch (error) {
      console.error('Get usage stats error:', error);
      return null;
    }
  }
}

// Convenience functions for common usage patterns
export const contentGenerationLimit = (executionCount = 1) => 
  UsageLimitMiddleware.withUsageLimit({ 
    operationType: 'content_generation', 
    executionCount 
  });

export const videoOptimizationLimit = (executionCount = 1) => 
  UsageLimitMiddleware.withUsageLimit({ 
    operationType: 'video_optimization', 
    executionCount 
  });

export const dataAnalysisLimit = (executionCount = 1) => 
  UsageLimitMiddleware.withUsageLimit({ 
    operationType: 'data_analysis', 
    executionCount 
  });

export const aiRecommendationLimit = (executionCount = 1) => 
  UsageLimitMiddleware.withUsageLimit({ 
    operationType: 'ai_recommendation', 
    executionCount 
  }); 