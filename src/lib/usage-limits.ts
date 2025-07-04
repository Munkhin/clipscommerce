import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const SUBSCRIPTION_TIERS = {
  lite: {
    name: 'Lite',
    limits: {
      viralBlitzCycle: 5,
      ideaGenerator: 10,
      autoposts: 3
    }
  },
  pro: {
    name: 'Pro',
    limits: {
      viralBlitzCycle: 25,
      ideaGenerator: 50,
      autoposts: 15
    }
  },
  premium: {
    name: 'Premium',
    limits: {
      viralBlitzCycle: -1, // unlimited
      ideaGenerator: -1, // unlimited
      autoposts: 50
    }
  }
};

type FeatureType = 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts';
type AccessFeature = 'ecommerceAccess' | 'analyticsAccess' | 'teamDashboard';

export interface SubscriptionTier {
  name: string;
  limits: {
    viralBlitzCycle: number;
    ideaGenerator: number;
    autoposts: number;
  };
}

class UsageLimitsService {
  async canUseFeature(userId: string, feature: FeatureType, subscriptionTier: string) {
    const tier = SUBSCRIPTION_TIERS[subscriptionTier as keyof typeof SUBSCRIPTION_TIERS];
    if (!tier) {
      return { allowed: false };
    }

    const limit = tier.limits[feature];
    if (limit === -1) { // unlimited
      return { allowed: true };
    }

    try {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('created_at', startOfMonth.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking usage:', error);
        return { allowed: false };
      }

      const currentUsage = data?.usage_count || 0;
      const allowed = currentUsage < limit;

      const nextMonth = new Date(startOfMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      return {
        allowed,
        currentUsage,
        limit,
        resetDate: nextMonth
      };
    } catch (error) {
      console.error('Error checking feature usage:', error);
      return { allowed: false };
    }
  }

  async trackUsage(userId: string, feature: FeatureType, amount: number = 1) {
    try {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Try to update existing record
      const { data: existing } = await supabase
        .from('usage_tracking')
        .select('id, usage_count')
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('created_at', startOfMonth.toISOString())
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('usage_tracking')
          .update({ 
            usage_count: existing.usage_count + amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('usage_tracking')
          .insert({
            user_id: userId,
            feature,
            usage_count: amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  hasFeatureAccess(subscriptionTier: string, feature: AccessFeature): boolean {
    switch (feature) {
      case 'ecommerceAccess':
        return ['pro', 'premium'].includes(subscriptionTier);
      case 'analyticsAccess':
        return ['pro', 'premium'].includes(subscriptionTier);
      case 'teamDashboard':
        return subscriptionTier === 'premium';
      default:
        return false;
    }
  }

  getAnalyticsAccess(subscriptionTier: string) {
    if (subscriptionTier === 'premium') {
      return 'full';
    } else if (subscriptionTier === 'pro') {
      return 'standard';
    } else {
      return 'basic';
    }
  }

  async getUsageSummary(userId: string, subscriptionTier: string) {
    const tier = SUBSCRIPTION_TIERS[subscriptionTier as keyof typeof SUBSCRIPTION_TIERS];
    if (!tier) return null;

    try {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('feature, usage_count')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;

      const summary = {
        tierName: tier.name,
        features: {} as Record<FeatureType, { used: number; limit: number; percentage: number }>
      };

      Object.keys(tier.limits).forEach(feature => {
        const featureKey = feature as FeatureType;
        const limit = tier.limits[featureKey];
        const used = data?.find(d => d.feature === feature)?.usage_count || 0;
        const percentage = limit === -1 ? 0 : Math.round((used / limit) * 100);

        summary.features[featureKey] = {
          used,
          limit,
          percentage
        };
      });

      return summary;
    } catch (error) {
      console.error('Error getting usage summary:', error);
      return null;
    }
  }

  // IP-based throttling for auth endpoints
  async getClientIp(request: NextRequest): Promise<string> {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    return request.ip || 'unknown';
  }

  async isIpThrottled(ip: string, endpoint: string, maxAttempts: number = 5, windowMinutes: number = 15): Promise<{
    throttled: boolean;
    attemptsLeft: number;
    resetTime: Date;
  }> {
    try {
      const supabase = createClient();
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
      
      // Check existing attempts for this IP and endpoint
      const { data, error } = await supabase
        .from('ip_throttling')
        .select('attempts, created_at')
        .eq('ip_address', ip)
        .eq('endpoint', endpoint)
        .gte('created_at', windowStart.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking IP throttling:', error);
        return { throttled: false, attemptsLeft: maxAttempts, resetTime: new Date(Date.now() + windowMinutes * 60 * 1000) };
      }

      const currentAttempts = data?.attempts || 0;
      const attemptsLeft = Math.max(0, maxAttempts - currentAttempts);
      const resetTime = new Date(Date.now() + windowMinutes * 60 * 1000);
      
      return {
        throttled: currentAttempts >= maxAttempts,
        attemptsLeft,
        resetTime
      };
    } catch (error) {
      console.error('Error checking IP throttling:', error);
      return { throttled: false, attemptsLeft: maxAttempts, resetTime: new Date(Date.now() + windowMinutes * 60 * 1000) };
    }
  }

  async recordIpAttempt(ip: string, endpoint: string, success: boolean = false): Promise<void> {
    try {
      const supabase = createClient();
      const now = new Date();
      const windowStart = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
      
      // Try to find existing record for this IP and endpoint in the current window
      const { data: existing } = await supabase
        .from('ip_throttling')
        .select('id, attempts, success_count')
        .eq('ip_address', ip)
        .eq('endpoint', endpoint)
        .gte('created_at', windowStart.toISOString())
        .single();
      
      if (existing) {
        // Update existing record
        await supabase
          .from('ip_throttling')
          .update({ 
            attempts: existing.attempts + 1,
            last_attempt: now.toISOString(),
            success_count: success ? (existing.success_count || 0) + 1 : (existing.success_count || 0),
            updated_at: now.toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from('ip_throttling')
          .insert({
            ip_address: ip,
            endpoint,
            attempts: 1,
            success_count: success ? 1 : 0,
            created_at: now.toISOString(),
            last_attempt: now.toISOString(),
            updated_at: now.toISOString()
          });
      }
    } catch (error) {
      console.error('Error recording IP attempt:', error);
    }
  }

  async cleanupOldThrottlingRecords(): Promise<void> {
    try {
      const supabase = createClient();
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      await supabase
        .from('ip_throttling')
        .delete()
        .lt('created_at', cutoffTime.toISOString());
    } catch (error) {
      console.error('Error cleaning up old throttling records:', error);
    }
  }
}

export const usageLimitsService = new UsageLimitsService();

// Middleware function for protecting routes
export async function protectRoute(feature: FeatureType) {
  return async function middleware(request: NextRequest) {
    try {
      // Get user from session or auth header
      const userId = await getUserFromRequest(request);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get user's subscription tier (you might want to fetch this from database)
      const subscriptionTier = await getUserSubscriptionTier(userId);

      // Check if user can use the feature
      const canUse = await usageLimitsService.canUseFeature(userId, feature, subscriptionTier);
      
      if (!canUse.allowed) {
        return NextResponse.json({
          error: 'Usage limit exceeded',
          message: `You have reached your monthly limit for ${feature}`,
          currentUsage: canUse.currentUsage,
          limit: canUse.limit,
          resetDate: canUse.resetDate
        }, { status: 429 });
      }

      // Track the usage
      await usageLimitsService.trackUsage(userId, feature);

      // Continue to the actual handler
      return null; // null means continue processing
    } catch (error) {
      console.error('Error in protectRoute middleware:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Here you would validate the token and extract user ID
      // For now, returning a placeholder
      return 'user-from-token';
    }

    // Try to get user from cookies/session
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

async function getUserSubscriptionTier(userId: string): Promise<string> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return 'lite'; // default tier
    }

    return data.tier;
  } catch (error) {
    console.error('Error getting user subscription tier:', error);
    return 'lite'; // default tier
  }
}

// IP-based throttling middleware for auth endpoints
export async function withIpThrottling(maxAttempts: number = 5, windowMinutes: number = 15) {
  return async function middleware(request: NextRequest) {
    try {
      const ip = await usageLimitsService.getClientIp(request);
      const endpoint = request.nextUrl.pathname;
      
      // Check if IP is throttled
      const throttleStatus = await usageLimitsService.isIpThrottled(ip, endpoint, maxAttempts, windowMinutes);
      
      if (throttleStatus.throttled) {
        return NextResponse.json({
          error: 'Too many attempts',
          message: `Too many authentication attempts from this IP. Please try again later.`,
          attemptsLeft: throttleStatus.attemptsLeft,
          resetTime: throttleStatus.resetTime
        }, { status: 429 });
      }

      // Record this attempt
      await usageLimitsService.recordIpAttempt(ip, endpoint, false);
      
      // Continue to the actual handler
      return null;
    } catch (error) {
      console.error('Error in IP throttling middleware:', error);
      // Don't block on throttling errors, just log them
      return null;
    }
  };
}

// Helper function to record successful auth attempts
export async function recordSuccessfulAuthAttempt(request: NextRequest) {
  try {
    const ip = await usageLimitsService.getClientIp(request);
    const endpoint = request.nextUrl.pathname;
    await usageLimitsService.recordIpAttempt(ip, endpoint, true);
  } catch (error) {
    console.error('Error recording successful auth attempt:', error);
  }
}