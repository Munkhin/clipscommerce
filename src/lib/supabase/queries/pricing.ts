import { createClient } from '../server';
import { Database } from '@/types/supabase';

type PricingTier = Database['public']['Tables']['pricing_tiers']['Row'] & {
  tier_benefits: Array<{ description: string }>;
};

export interface Tier {
  id: string;
  name: string;
  price: number;
  currency: string;
  order: number;
  benefits: Array<{ description: string }>;
}

// Fetch all pricing tiers with their benefits
export async function getPricingTiers(): Promise<Tier[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select(`
        id,
        name,
        price,
        currency,
        "order",
        tier_benefits (
          description
        )
      `)
      .order('order', { ascending: true });

    if (error) {
      throw error;
    }

    // Type assertion since we know the shape of our data
    const tiers = data as unknown as PricingTier[];

    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: tier.price,
      currency: tier.currency,
      order: tier.order,
      benefits: tier.tier_benefits || [],
    }));
  } catch (error) {
    console.error('Error in getPricingTiers:', error);
    return [];
  }
}

// Create or update a pricing tier
export async function upsertPricingTier(
  tier: Omit<Tier, 'benefits'>
): Promise<Database['public']['Tables']['pricing_tiers']['Row']> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .upsert({
        id: tier.id,
        name: tier.name,
        price: tier.price,
        currency: tier.currency,
        order: tier.order,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in upsertPricingTier:', error);
    throw error;
  }
}

// Add a benefit to a tier
export async function addTierBenefit(
  tierId: string, 
  description: string
): Promise<Database['public']['Tables']['tier_benefits']['Row']> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('tier_benefits')
      .insert({
        tier_id: tierId,
        description,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addTierBenefit:', error);
    throw error;
  }
}
