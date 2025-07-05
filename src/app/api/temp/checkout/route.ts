import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { subscriptionService } from '@/services/subscriptionService';
import { createCheckoutSession } from '@/actions/subscriptionActions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const priceId = searchParams.get('price_id');

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Redirect to sign in if not authenticated
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('redirectedFrom', request.url);
      return NextResponse.redirect(signInUrl.toString());
    }

    // Validate that the price ID exists in our plans
    const plans = subscriptionService.getSubscriptionPlans();
    const selectedPlan = plans.find(plan => plan.stripe_price_id === priceId);
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Create dynamic checkout session using subscription service
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`;
    
    const checkoutUrl = await createCheckoutSession(
      user.id,
      priceId,
      successUrl,
      cancelUrl
    );

    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}

// POST method for programmatic checkout session creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Validate that the price ID exists in our plans
    const plans = subscriptionService.getSubscriptionPlans();
    const selectedPlan = plans.find(plan => plan.stripe_price_id === priceId);
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Create dynamic checkout session using subscription service
    const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`;
    
    const checkoutUrl = await createCheckoutSession(
      user.id,
      priceId,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl
    );

    return NextResponse.json({ 
      url: checkoutUrl,
      planName: selectedPlan.name 
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}
