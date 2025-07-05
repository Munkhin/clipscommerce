'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripe_price_id: string;
  features: {
    viralBlitzCycle: number; // -1 for unlimited
    ideaGenerator: number; // -1 for unlimited
    autoposts: number; // -1 for unlimited
    ecommerceAccess: boolean;
    analyticsAccess: 'basic' | 'advanced';
    accountSets: number; // -1 for unlimited
    teamDashboard: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    stripe_price_id: '',
    features: {
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
    price: 2997, // $29.97 in cents
    currency: 'usd',
    interval: 'month',
    stripe_price_id: process.env.STRIPE_LITE_PRICE_ID!,
    features: {
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
    price: 29700, // $297 in cents
    currency: 'usd',
    interval: 'month',
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID!,
    features: {
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
    price: 99700, // $997 in cents
    currency: 'usd',
    interval: 'month',
    stripe_price_id: process.env.STRIPE_TEAM_PRICE_ID!,
    features: {
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

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_tier: string;
  status: string;
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_start?: string;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageData {
  feature: string;
  usage_count: number;
  limit: number;
  period_start: string;
  period_end: string;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  
  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const supabase = await createClient(cookies());
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as UserSubscription;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  /**
   * Get user's subscription tier (with fallback to free)
   */
  async getUserSubscriptionTier(userId: string): Promise<string> {
    const subscription = await this.getUserSubscription(userId);
    return subscription?.subscription_tier || 'free';
  }

  /**
   * Check if user can use a specific feature
   */
  async canUseFeature(
    userId: string,
    feature: keyof SubscriptionPlan['features']
  ): Promise<{
    allowed: boolean;
    remaining?: number;
    resetDate?: Date;
    limit?: number;
    used?: number;
  }> {
    try {
      const subscriptionTier = await this.getUserSubscriptionTier(userId);
      const plan = SUBSCRIPTION_PLANS[subscriptionTier];
      
      if (!plan) {
        return { allowed: false };
      }

      const featureLimit = plan.features[feature];
      
      // Handle boolean features
      if (typeof featureLimit === 'boolean') {
        return { allowed: featureLimit };
      }

      // Handle string features
      if (typeof featureLimit === 'string') {
        return { allowed: true };
      }

      // Handle numeric features
      if (typeof featureLimit === 'number') {
        // Unlimited usage
        if (featureLimit === -1) {
          return { allowed: true };
        }

        // Check current usage
        const currentUsage = await this.getCurrentUsage(userId, feature as string);
        const remaining = Math.max(0, featureLimit - currentUsage);
        
        return {
          allowed: currentUsage < featureLimit,
          remaining,
          resetDate: this.getNextResetDate(),
          limit: featureLimit,
          used: currentUsage
        };
      }

      return { allowed: false };
    } catch (error) {
      console.error('Error checking feature usage:', error);
      return { allowed: false };
    }
  }

  /**
   * Track feature usage
   */
  async trackUsage(userId: string, feature: string, amount: number = 1): Promise<void> {
    try {
      const supabase = await createClient(cookies());
      
      await supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_feature: feature,
        p_amount: amount
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  /**
   * Get current usage for a feature
   */
  async getCurrentUsage(userId: string, feature: string): Promise<number> {
    try {
      const supabase = await createClient(cookies());
      
      const { data, error } = await supabase.rpc('get_current_usage', {
        p_user_id: userId,
        p_feature: feature
      });

      if (error) {
        console.error('Error getting current usage:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting current usage:', error);
      return 0;
    }
  }

  /**
   * Get usage summary for user
   */
  async getUsageSummary(userId: string): Promise<{
    subscription: UserSubscription | null;
    plan: SubscriptionPlan;
    usage: UsageData[];
  }> {
    const subscription = await this.getUserSubscription(userId);
    const subscriptionTier = subscription?.subscription_tier || 'free';
    const plan = SUBSCRIPTION_PLANS[subscriptionTier];
    
    const usageFeatures = ['viralBlitzCycle', 'ideaGenerator', 'autoposts'];
    const usage: UsageData[] = [];

    for (const feature of usageFeatures) {
      const currentUsage = await this.getCurrentUsage(userId, feature);
      const limit = plan.features[feature as keyof typeof plan.features] as number;
      
      usage.push({
        feature,
        usage_count: currentUsage,
        limit,
        period_start: this.getCurrentPeriodStart().toISOString(),
        period_end: this.getNextResetDate().toISOString()
      });
    }

    return {
      subscription,
      plan,
      usage
    };
  }

  /**
   * Create or update subscription from Stripe webhook
   */
  async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      const supabase = await createClient(cookies());
      
      // Get the user ID from the customer
      const customer = await stripe.customers.retrieve(stripeSubscription.customer as string);
      if (!customer || customer.deleted) {
        throw new Error('Customer not found');
      }

      // Extract user ID from customer metadata
      const userId = customer.metadata?.userId;
      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // Determine subscription tier from price ID
      const subscriptionTier = this.getSubscriptionTierFromPriceId(stripeSubscription.items.data[0].price.id);

      const subscriptionData = {
        user_id: userId,
        stripe_customer_id: stripeSubscription.customer as string,
        stripe_subscription_id: stripeSubscription.id,
        subscription_tier: subscriptionTier,
        status: stripeSubscription.status,
        price_id: stripeSubscription.items.data[0].price.id,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
      };

      // Upsert subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }

      // Update profile subscription tier
      await supabase
        .from('profiles')
        .update({ subscription_tier: subscriptionTier })
        .eq('id', userId);

    } catch (error) {
      console.error('Error syncing subscription from Stripe:', error);
      throw error;
    }
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(userId: string): Promise<void> {
    try {
      const supabase = await createClient(cookies());
      
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);

      // Reset to free tier
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', userId);

    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription tier from Stripe price ID
   */
  private getSubscriptionTierFromPriceId(priceId: string): string {
    for (const [tierId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (plan.stripe_price_id === priceId) {
        return tierId;
      }
    }
    return 'free';
  }

  /**
   * Get current period start (beginning of current month)
   */
  private getCurrentPeriodStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get next reset date (beginning of next month)
   */
  private getNextResetDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const supabase = await createClient(cookies());
      
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user already has a Stripe customer
      let customerId: string | undefined;
      const subscription = await this.getUserSubscription(userId);
      
      if (subscription?.stripe_customer_id) {
        customerId = subscription.stripe_customer_id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId
          }
        });
        customerId = customer.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
        },
      });

      if (!session.url) {
        throw new Error('Failed to create checkout session');
      }

      return session.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Get all subscription plans
   */
  getSubscriptionPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Get specific subscription plan
   */
  getSubscriptionPlan(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS[planId] || null;
  }
}

export const subscriptionService = SubscriptionService.getInstance();