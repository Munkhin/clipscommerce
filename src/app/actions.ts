"use server";

import { createClient } from "../../supabase/server";

/**
 * Check if a user has an active subscription
 * @param userId - The user's ID
 * @returns Promise<boolean> - True if user has active subscription, false otherwise
 */
export async function checkUserSubscription(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const supabase = await createClient();
    
    // Check if user has a subscription record
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking subscription:', error);
      return false;
    }

    // If no subscription found, default to free tier (considered "subscribed" for basic access)
    if (!subscription) {
      return true; // Free tier access
    }

    // Check if subscription is active and not expired
    if (subscription.status === 'active') {
      const currentDate = new Date();
      const endDate = new Date(subscription.current_period_end);
      return currentDate <= endDate;
    }

    return false;
  } catch (error) {
    console.error('Error checking user subscription:', error);
    return false;
  }
}