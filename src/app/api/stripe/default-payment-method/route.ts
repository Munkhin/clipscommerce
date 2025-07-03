import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const setDefaultPaymentMethodSchema = z.object({
  payment_method_id: z.string().min(1, 'Payment method ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = setDefaultPaymentMethodSchema.parse(body);

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Verify payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(validatedData.payment_method_id);
    
    if (paymentMethod.customer !== profile.stripe_customer_id) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Update customer's default payment method
    await stripe.customers.update(profile.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: validatedData.payment_method_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated successfully',
    });

  } catch (error) {
    console.error('Error setting default payment method:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set default payment method' },
      { status: 500 }
    );
  }
}