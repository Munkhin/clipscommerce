# Billing & Subscriptions Implementation

This document outlines the complete billing and subscription system implementation for ClipsCommerce.

## Overview

The billing system integrates Stripe for payment processing and subscription management with Supabase for data persistence. It includes:

- Dynamic subscription plans with usage quotas
- Real-time subscription status syncing via webhooks
- Usage tracking and enforcement
- Dynamic checkout session creation

## Architecture

### Database Schema

**user_subscriptions** table:
- Tracks user subscription data from Stripe
- Contains subscription status, plan, billing periods
- Links to Stripe customer and subscription IDs

**subscription_usage** table:
- Tracks feature usage per billing period
- Supports monthly quotas and limits
- Used for quota enforcement

### Services

**SubscriptionService** (`/src/services/subscriptionService.ts`):
- Manages subscription data and Stripe integration
- Handles checkout session creation
- Tracks usage and enforces limits
- Syncs subscription data from webhooks

## Files Created/Modified

### Database Migration
- `/supabase/migrations/20250705000000_user_subscriptions.sql`
  - Creates subscription and usage tracking tables
  - Adds database functions for usage management
  - Sets up Row Level Security policies

### Core Service
- `/src/services/subscriptionService.ts`
  - Main subscription management service
  - Defines subscription plans and pricing
  - Handles Stripe integration
  - Manages usage tracking and quota enforcement

### API Endpoints
- `/src/app/api/stripe/webhook/route.ts`
  - Handles Stripe webhook events
  - Syncs subscription status changes
  - Processes payment events

- `/src/app/api/temp/checkout/route.ts` (Updated)
  - Dynamic checkout session creation
  - Plan validation
  - Supports both GET and POST methods

### Updated Features
- `/src/app/api/autoposting/schedule/route.ts` (Updated)
  - `checkPostingLimits()` now uses actual subscription data
  - `updateUsageTracking()` tracks autopost usage
  - Enforces subscription quotas

- `/src/app/actions/subscription.ts` (Updated)
  - Updated to use new subscription service
  - Real subscription status checking
  - Usage summary retrieval

## Subscription Plans

The system supports four subscription tiers:

### Free Plan
- 1 viral blitz cycle/month
- 1 idea generation/month  
- 1 autopost/month
- Basic analytics
- No ecommerce access

### Lite Plan ($29.97/month)
- 15 viral blitz cycles/month
- 15 idea generations/month
- 15 autoposts/month
- Basic analytics
- No ecommerce access

### Pro Plan ($297/month)  
- Unlimited viral blitz cycles
- Unlimited idea generations
- Unlimited autoposts
- Advanced analytics
- Ecommerce access

### Team Plan ($997/month)
- Everything in Pro
- Team dashboard access
- Multiple account sets

## Configuration

### Environment Variables Required

Add these to your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs for subscription plans
STRIPE_LITE_PRICE_ID=price_your_lite_plan_price_id
STRIPE_PRO_PRICE_ID=price_your_pro_plan_price_id
STRIPE_TEAM_PRICE_ID=price_your_team_plan_price_id
```

### Stripe Setup

1. **Create Products and Prices** in Stripe Dashboard:
   - Create recurring subscription prices for each plan
   - Copy the price IDs to environment variables

2. **Configure Webhook Endpoint**:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `checkout.session.completed`

3. **Copy Webhook Secret** to `STRIPE_WEBHOOK_SECRET`

## Usage Examples

### Check if User Can Use Feature

```typescript
import { subscriptionService } from '@/services/subscriptionService';

const canUse = await subscriptionService.canUseFeature(userId, 'autoposts');
if (!canUse.allowed) {
  // Show upgrade prompt
  return { error: 'Feature not available on your plan' };
}
```

### Track Feature Usage

```typescript
import { subscriptionService } from '@/services/subscriptionService';

// After successful feature use
await subscriptionService.trackUsage(userId, 'autoposts', 1);
```

### Create Checkout Session

```typescript
import { subscriptionService } from '@/services/subscriptionService';

const checkoutUrl = await subscriptionService.createCheckoutSession(
  userId,
  priceId,
  'https://yourapp.com/success',
  'https://yourapp.com/cancel'
);
```

### Get Usage Summary

```typescript
import { subscriptionService } from '@/services/subscriptionService';

const summary = await subscriptionService.getUsageSummary(userId);
console.log(summary.usage); // Current usage for all features
console.log(summary.plan);  // Current subscription plan
```

## Testing

To test the implementation:

1. **Run Database Migration**:
   ```bash
   supabase db push
   ```

2. **Set Up Stripe Test Data**:
   - Create test products and prices
   - Configure webhook endpoint (use ngrok for local testing)

3. **Test Checkout Flow**:
   - Visit `/api/temp/checkout?price_id=your_test_price_id`
   - Complete test payment in Stripe
   - Verify subscription creation in database

4. **Test Usage Limits**:
   - Schedule autoposts until limit is reached
   - Verify quota enforcement works

5. **Test Webhooks**:
   - Use Stripe CLI to forward webhooks locally:
     ```bash
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     ```

## Key Features

### Quota Enforcement
- Real-time usage checking before feature access
- Monthly quota resets
- Graceful handling of limit exceeded scenarios

### Subscription Syncing
- Automatic subscription status updates via webhooks
- Handles subscription creation, updates, and cancellations
- Maintains data consistency between Stripe and application

### Dynamic Pricing
- Plans and prices defined in code
- Easy to modify subscription tiers
- Validation of price IDs before checkout

### Security
- Row Level Security on all subscription tables
- Webhook signature verification
- User data isolation

## Error Handling

The system includes comprehensive error handling:
- Database connection failures
- Stripe API errors
- Invalid subscription states
- Usage tracking failures (non-blocking)

## Performance Considerations

- Usage queries are optimized with database indexes
- Subscription data is cached where appropriate
- Webhook processing is designed to be idempotent

## Future Enhancements

- Usage analytics dashboard
- Subscription analytics and metrics
- Advanced billing features (prorations, discounts)
- Team member management for Team plans
- Custom usage alerts and notifications