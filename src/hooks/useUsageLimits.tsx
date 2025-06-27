import { useState, useEffect } from 'react';
import { usageLimitsService, SUBSCRIPTION_TIERS } from '@/lib/usage-limits';
import { useAuth } from '@/providers/AuthProvider';

export function useUsageLimits(subscriptionTier: string = 'lite') {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user can use a specific feature
   */
  const canUseFeature = async (feature: 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts') => {
    if (!user) return { allowed: false };
    
    try {
      return await usageLimitsService.canUseFeature(user.id, feature, subscriptionTier);
    } catch (err) {
      console.error('Error checking feature usage:', err);
      return { allowed: false };
    }
  };

  /**
   * Track usage for a feature
   */
  const trackUsage = async (feature: 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts', amount: number = 1) => {
    if (!user) return false;
    
    try {
      await usageLimitsService.trackUsage(user.id, feature, amount);
      return true;
    } catch (err) {
      console.error('Error tracking usage:', err);
      return false;
    }
  };

  /**
   * Check if user has access to a feature type
   */
  const hasFeatureAccess = (feature: 'ecommerce' | 'analytics' | 'teamDashboard') => {
    return usageLimitsService.hasFeatureAccess(subscriptionTier, feature);
  };

  /**
   * Get analytics access level
   */
  const getAnalyticsAccess = () => {
    return usageLimitsService.getAnalyticsAccess(subscriptionTier);
  };

  /**
   * Get usage summary
   */
  const getUsageSummary = async () => {
    if (!user) return null;
    
    try {
      return await usageLimitsService.getUsageSummary(user.id, subscriptionTier);
    } catch (err) {
      console.error('Error getting usage summary:', err);
      return null;
    }
  };

  /**
   * Check with enforcement - throws error if limit reached
   */
  const checkAndTrackUsage = async (feature: 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts') => {
    const canUse = await canUseFeature(feature);
    
    if (!canUse.allowed) {
      const tier = SUBSCRIPTION_TIERS[subscriptionTier];
      throw new Error(
        `Usage limit reached for ${feature}. ` +
        `You've used all ${tier?.limits[feature]} allowed uses for this month. ` +
        `${canUse.resetDate ? `Resets on ${canUse.resetDate.toLocaleDateString()}.` : ''} ` +
        'Upgrade your plan for unlimited usage.'
      );
    }

    // Track the usage
    await trackUsage(feature);
    return canUse;
  };

  return {
    canUseFeature,
    trackUsage,
    hasFeatureAccess,
    getAnalyticsAccess,
    getUsageSummary,
    checkAndTrackUsage,
    subscriptionTier,
    tier: SUBSCRIPTION_TIERS[subscriptionTier],
    loading,
    error,
  };
}

/**
 * Higher-order component wrapper for usage enforcement
 */
export function withUsageEnforcement<T extends object>(
  Component: React.ComponentType<T>,
  feature: 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts',
  subscriptionTier: string = 'lite'
) {
  return function WrappedComponent(props: T) {
    const { canUseFeature, tier } = useUsageLimits(subscriptionTier);
    const [canUse, setCanUse] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      checkUsage();
    }, []);

    const checkUsage = async () => {
      try {
        const result = await canUseFeature(feature);
        setCanUse(result.allowed);
      } catch (error) {
        console.error('Error checking usage:', error);
        setCanUse(false);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#5afcc0]"></div>
        </div>
      );
    }

    if (!canUse) {
      return (
        <div className="bg-gradient-to-r from-[#8D5AFF]/10 to-[#5afcc0]/10 border border-[#8D5AFF]/30 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Usage Limit Reached</h3>
          <p className="text-neutral-400 mb-4">
            You've reached your monthly limit for {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}.
          </p>
          <p className="text-sm text-neutral-500 mb-4">
            Current plan: <span className="text-[#8D5AFF]">{tier?.name}</span>
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/subscription'}
            className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all"
          >
            Upgrade Plan
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
} 