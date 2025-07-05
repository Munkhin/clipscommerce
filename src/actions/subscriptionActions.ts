'use server';

import { subscriptionService } from '@/services/subscriptionService';
import Stripe from 'stripe';

/**
 * Server action to sync subscription from Stripe
 */
export async function syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
  return subscriptionService.syncSubscriptionFromStripe(stripeSubscription);
}

/**
 * Server action to delete subscription
 */
export async function deleteSubscription(userId: string): Promise<void> {
  return subscriptionService.deleteSubscription(userId);
}

/**
 * Server action to create checkout session
 */
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  return subscriptionService.createCheckoutSession(userId, priceId, successUrl, cancelUrl);
}

/**
 * Server action to get user subscription
 */
export async function getUserSubscription(userId: string) {
  return subscriptionService.getUserSubscription(userId);
}

/**
 * Server action to check if user can use feature
 */
export async function canUseFeature(
  userId: string,
  feature: string
) {
  return subscriptionService.canUseFeature(userId, feature as any);
}

/**
 * Server action to track feature usage
 */
export async function trackUsage(userId: string, feature: string, amount: number = 1): Promise<void> {
  return subscriptionService.trackUsage(userId, feature, amount);
}

/**
 * Server action to get usage summary
 */
export async function getUsageSummary(userId: string) {
  return subscriptionService.getUsageSummary(userId);
}