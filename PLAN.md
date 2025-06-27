# ClipsCommerce Production Prep Plan

## Overview
This document captures the remaining optimization and deployment tasks applied in the last sprint to bring ClipsCommerce to production-ready quality.

### Completed In This Sprint
1. Pricing overhaul – Lite ($20), Pro (MOST POPULAR), Team; buttons, colours, ROI calc.
2. Navigation CTAs updated to `/dashboard`.
3. ContactSection component and integration in landing page.
4. Team CTA under EnterpriseSection.
5. Static "API Docs – Coming Soon" page.
6. Global CSS fix for stray horizontal scrollbar.
7. Brand-colour updates across pricing assets.

### Pending / Next Steps
1. **Middleware Access Control**  
   • Guard `/team_dashboard/**` for Team subscribers only.  
   • Root `/` redirect to `/team-dashboard` when user.tier==="team".

2. **Dashboard SubscriptionComponent**  
   • Remove legacy Free plan.  
   • Enforce Lite (15-use limits) in UI.  
   • Persist subscription tier in Supabase `user_metadata`.

3. **Backend Usage Limits**  
   • Server endpoints to count framework executions per tier; return 402 when exceeded.  
   • UI gates already conditionally hide e-commerce for Lite.

4. **Unit / Integration Tests**  
   • Jest tests for middleware redirects.  
   • Testing PricingSection rendering (snapshot) and ContactSection visibility.

5. **Performance & SEO**  
   • Run `next build && next lint` — fix any remaining warnings.  
   • Add meta tags and OpenGraph images.

6. **Deployment**  
   • Configure Vercel environment variables for all Stripe links.  
   • Enable Incremental Static Regeneration where applicable.  
   • Add monitoring (LogRocket/Sentry).

---
Maintainer: AI pair-programming session – June 2025 