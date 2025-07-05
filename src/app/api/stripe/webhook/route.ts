import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { syncSubscriptionFromStripe, deleteSubscription } from '@/actions/subscriptionActions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${error.message}` },
        { status: 400 }
      );
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing subscription updated:', subscription.id);
    await syncSubscriptionFromStripe(subscription);
    
    // Log subscription status change
    console.log(`Subscription ${subscription.id} updated to status: ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('Processing subscription deleted:', subscription.id);
    
    // Get the customer to find the user
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer || customer.deleted) {
      console.error('Customer not found for deleted subscription');
      return;
    }

    const userId = customer.metadata?.userId;
    if (!userId) {
      console.error('User ID not found in customer metadata');
      return;
    }

    // Delete subscription and revert to free plan
    await deleteSubscription(userId);
    
    console.log(`Subscription ${subscription.id} deleted for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    console.log('Processing trial will end:', subscription.id);
    
    // Get the customer to find the user
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer || customer.deleted) {
      console.error('Customer not found for trial ending');
      return;
    }

    const userId = customer.metadata?.userId;
    if (!userId) {
      console.error('User ID not found in customer metadata');
      return;
    }

    // Here you could send a notification email to the user
    // about their trial ending soon
    console.log(`Trial ending soon for user ${userId}, subscription ${subscription.id}`);
    
    // You could implement email notification logic here
    // await sendTrialEndingEmail(userId, subscription);
  } catch (error) {
    console.error('Error handling trial will end:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Processing payment succeeded:', invoice.id);
    
    if (invoice.subscription) {
      // Fetch the latest subscription data and sync it
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await syncSubscriptionFromStripe(subscription);
      
      console.log(`Payment succeeded for subscription ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Processing payment failed:', invoice.id);
    
    if (invoice.subscription) {
      // Fetch the latest subscription data and sync it
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await syncSubscriptionFromStripe(subscription);
      
      console.log(`Payment failed for subscription ${subscription.id}`);
      
      // Here you could send a notification email to the user
      // about the failed payment
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      if (!customer || customer.deleted) {
        console.error('Customer not found for failed payment');
        return;
      }

      const userId = customer.metadata?.userId;
      if (userId) {
        console.log(`Payment failed for user ${userId}, subscription ${subscription.id}`);
        // You could implement email notification logic here
        // await sendPaymentFailedEmail(userId, subscription, invoice);
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout completed:', session.id);
    
    if (session.subscription) {
      // Fetch the subscription and sync it
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await syncSubscriptionFromStripe(subscription);
      
      console.log(`Checkout completed for subscription ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error);
    throw error;
  }
}