export interface UsageLimits {
  viralBlitzCycle: number; // -1 for unlimited
  ideaGenerator: number; // -1 for unlimited  
  autoposts: number; // -1 for unlimited
  ecommerceAccess: boolean;
  analyticsAccess: 'none' | 'basic' | 'advanced';
  accountSets: number; // -1 for unlimited
  teamDashboard: boolean;
}

export interface UserUsage {
  viralBlitzCycleUsed: number;
  ideaGeneratorUsed: number;
  autopostsUsed: number;
  lastReset: Date;
  currentPeriodStart: Date;
}

export interface SubscriptionTier {
  id: 'free' | 'lite' | 'pro' | 'team';
  name: string;
  limits: UsageLimits;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    limits: {
      viralBlitzCycle: 1,
      ideaGenerator: 1,
      autoposts: 1,
      ecommerceAccess: false,
      analyticsAccess: 'basic',
      accountSets: 1,
      teamDashboard: false,
    }
  },
  lite: {
    id: 'lite',
    name: 'Lite',
    limits: {
      viralBlitzCycle: 15,
      ideaGenerator: 15,
      autoposts: 15,
      ecommerceAccess: false,
      analyticsAccess: 'basic',
      accountSets: 1,
      teamDashboard: false,
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro', 
    limits: {
      viralBlitzCycle: -1, // unlimited
      ideaGenerator: -1, // unlimited
      autoposts: -1, // unlimited
      ecommerceAccess: true,
      analyticsAccess: 'advanced',
      accountSets: -1, // unlimited
      teamDashboard: false,
    }
  },
  team: {
    id: 'team',
    name: 'Team',
    limits: {
      viralBlitzCycle: -1, // unlimited
      ideaGenerator: -1, // unlimited
      autoposts: -1, // unlimited
      ecommerceAccess: true,
      analyticsAccess: 'advanced',
      accountSets: -1, // unlimited
      teamDashboard: true,
    }
  }
};

export class UsageLimitsService {
  private static instance: UsageLimitsService;
  
  public static getInstance(): UsageLimitsService {
    if (!UsageLimitsService.instance) {
      UsageLimitsService.instance = new UsageLimitsService();
    }
    return UsageLimitsService.instance;
  }

  /**
   * Check if user can use a specific feature
   */
  async canUseFeature(
    userId: string,
    feature: keyof Pick<UsageLimits, 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts'>,
    subscriptionTier: string
  ): Promise<{ allowed: boolean; remaining?: number; resetDate?: Date }> {
    const tier = SUBSCRIPTION_TIERS[subscriptionTier];
    if (!tier) {
      return { allowed: false };
    }

    const limit = tier.limits[feature] as number;
    
    // Unlimited usage
    if (limit === -1) {
      return { allowed: true };
    }

    const usage = await this.getUserUsage(userId);
    const currentUsage = this.getCurrentUsageForFeature(usage, feature);
    
    if (currentUsage >= limit) {
      const resetDate = this.getNextResetDate(usage.currentPeriodStart);
      return { 
        allowed: false, 
        remaining: 0,
        resetDate 
      };
    }

    return { 
      allowed: true, 
      remaining: limit - currentUsage,
      resetDate: this.getNextResetDate(usage.currentPeriodStart)
    };
  }

  /**
   * Track feature usage
   */
  async trackUsage(
    userId: string,
    feature: keyof Pick<UsageLimits, 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts'>,
    amount: number = 1
  ): Promise<void> {
    const usage = await this.getUserUsage(userId);
    
    switch (feature) {
      case 'viralBlitzCycle':
        usage.viralBlitzCycleUsed += amount;
        break;
      case 'ideaGenerator':
        usage.ideaGeneratorUsed += amount;
        break;
      case 'autoposts':
        usage.autopostsUsed += amount;
        break;
    }

    await this.saveUserUsage(userId, usage);
  }

  /**
   * Check if user has access to feature type
   */
  hasFeatureAccess(
    subscriptionTier: string,
    feature: 'ecommerce' | 'analytics' | 'teamDashboard'
  ): boolean {
    const tier = SUBSCRIPTION_TIERS[subscriptionTier];
    if (!tier) return false;

    switch (feature) {
      case 'ecommerce':
        return tier.limits.ecommerceAccess;
      case 'analytics':
        return tier.limits.analyticsAccess !== 'none';
      case 'teamDashboard':
        return tier.limits.teamDashboard;
      default:
        return false;
    }
  }

  /**
   * Get analytics access level
   */
  getAnalyticsAccess(subscriptionTier: string): 'none' | 'basic' | 'advanced' {
    const tier = SUBSCRIPTION_TIERS[subscriptionTier];
    return tier?.limits.analyticsAccess || 'none';
  }

  /**
   * Get user's current usage
   */
  async getUserUsage(userId: string): Promise<UserUsage> {
    // In production, this would fetch from database
    // For now, simulate with localStorage or default values
    try {
      const stored = localStorage.getItem(`usage_${userId}`);
      if (stored) {
        const usage = JSON.parse(stored);
        
        // Check if we need to reset monthly usage
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        if (new Date(usage.currentPeriodStart) < monthStart) {
          // Reset monthly usage
          return {
            viralBlitzCycleUsed: 0,
            ideaGeneratorUsed: 0,
            autopostsUsed: 0,
            lastReset: now,
            currentPeriodStart: monthStart,
          };
        }
        
        return {
          ...usage,
          lastReset: new Date(usage.lastReset),
          currentPeriodStart: new Date(usage.currentPeriodStart),
        };
      }
    } catch (error) {
      console.error('Error loading user usage:', error);
    }

    // Default usage for new users
    const now = new Date();
    return {
      viralBlitzCycleUsed: 0,
      ideaGeneratorUsed: 0,
      autopostsUsed: 0,
      lastReset: now,
      currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }

  /**
   * Save user usage to storage
   */
  private async saveUserUsage(userId: string, usage: UserUsage): Promise<void> {
    try {
      localStorage.setItem(`usage_${userId}`, JSON.stringify(usage));
    } catch (error) {
      console.error('Error saving user usage:', error);
    }
  }

  /**
   * Get current usage for specific feature
   */
  private getCurrentUsageForFeature(
    usage: UserUsage,
    feature: keyof Pick<UsageLimits, 'viralBlitzCycle' | 'ideaGenerator' | 'autoposts'>
  ): number {
    switch (feature) {
      case 'viralBlitzCycle':
        return usage.viralBlitzCycleUsed;
      case 'ideaGenerator':
        return usage.ideaGeneratorUsed;
      case 'autoposts':
        return usage.autopostsUsed;
      default:
        return 0;
    }
  }

  /**
   * Get next reset date (beginning of next month)
   */
  private getNextResetDate(currentPeriodStart: Date): Date {
    const nextMonth = new Date(currentPeriodStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  }

  /**
   * Get usage summary for user
   */
  async getUsageSummary(userId: string, subscriptionTier: string): Promise<{
    tier: SubscriptionTier;
    usage: UserUsage;
    remainingUsage: {
      viralBlitzCycle: number | 'unlimited';
      ideaGenerator: number | 'unlimited';
      autoposts: number | 'unlimited';
    };
    nextReset: Date;
  }> {
    const tier = SUBSCRIPTION_TIERS[subscriptionTier];
    const usage = await this.getUserUsage(userId);
    
    const calculateRemaining = (limit: number, used: number): number | 'unlimited' => {
      if (limit === -1) return 'unlimited';
      return Math.max(0, limit - used);
    };

    return {
      tier,
      usage,
      remainingUsage: {
        viralBlitzCycle: calculateRemaining(tier.limits.viralBlitzCycle, usage.viralBlitzCycleUsed),
        ideaGenerator: calculateRemaining(tier.limits.ideaGenerator, usage.ideaGeneratorUsed),
        autoposts: calculateRemaining(tier.limits.autoposts, usage.autopostsUsed),
      },
      nextReset: this.getNextResetDate(usage.currentPeriodStart),
    };
  }

  /**
   * Reset user usage (for testing or admin purposes)
   */
  async resetUserUsage(userId: string): Promise<void> {
    const now = new Date();
    const usage: UserUsage = {
      viralBlitzCycleUsed: 0,
      ideaGeneratorUsed: 0,
      autopostsUsed: 0,
      lastReset: now,
      currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    };
    
    await this.saveUserUsage(userId, usage);
  }
}

// Singleton instance
export const usageLimitsService = UsageLimitsService.getInstance(); 