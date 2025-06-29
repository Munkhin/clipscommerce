import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const startingAfter = searchParams.get('starting_after');

    interface Profile {
  stripe_customer_id: string;
}

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single<Profile>();

    if (!profile || !profile.stripe_customer_id) {
      return NextResponse.json({
        invoices: [],
        has_more: false,
        total_count: 0,
      });
    }

    // Fetch invoices from Stripe
    const invoicesParams: Stripe.InvoiceListParams = {
      customer: profile.stripe_customer_id,
      limit: Math.min(limit, 100), // Stripe's maximum
      status: 'paid', // Only fetch paid invoices for billing history
    };

    if (startingAfter) {
      invoicesParams.starting_after = startingAfter;
    }

    const invoices = await stripe.invoices.list(invoicesParams);

    // Format invoices for frontend
    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      subscription_id: invoice.subscription,
    }));

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
      has_more: invoices.has_more,
      total_count: invoices.data.length,
    });

  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}