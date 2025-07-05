'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { subscriptionService } from '@/services/subscriptionService';

export async function checkSubscription() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  try {
    const subscription = await subscriptionService.getUserSubscription(user.id);
    const tier = await subscriptionService.getUserSubscriptionTier(user.id);
    const plan = subscriptionService.getSubscriptionPlan(tier);
    
    if (!plan) {
      return null;
    }

    return {
      isActive: subscription?.status === 'active' || tier === 'free',
      plan: tier,
      subscription: subscription,
      features: plan.features,
      expiresAt: subscription?.current_period_end || null,
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return null;
  }
}

export async function createCheckoutSession(
  priceId: string,
  successUrl?: string,
  cancelUrl?: string
) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  try {
    const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`;
    
    const url = await subscriptionService.createCheckoutSession(
      user.id,
      priceId,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl
    );
    
    return {
      url,
      sessionId: null, // Stripe session ID will be in the success URL
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function getUsageSummary() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  try {
    return await subscriptionService.getUsageSummary(user.id);
  } catch (error) {
    console.error('Error getting usage summary:', error);
    throw error;
  }
}

export async function canUseFeature(feature: string) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { allowed: false };
  }
  
  try {
    return await subscriptionService.canUseFeature(user.id, feature as any);
  } catch (error) {
    console.error('Error checking feature usage:', error);
    return { allowed: false };
  }
}