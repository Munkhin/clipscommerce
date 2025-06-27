'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CreditCard, FileText, Clock, Shield, Check, X } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

type Plan = {
  id: string;
  name: string;
  price: number;
  yearlyPrice?: number;
  interval: 'monthly' | 'yearly';
  description: string;
  features: string[];
  isPopular?: boolean;
  stripeMonthlyLinkEnv?: string;
  stripeYearlyLinkEnv?: string;
};

type StripeLinks = {
  NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK: string;
  NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK: string;
  NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK: string;
  NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK: string;
  NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK: string;
  NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK: string;
};

interface SubscriptionComponentProps {
  navigate?: (url: string) => void;
  stripeLinks?: StripeLinks;
}

export default function SubscriptionComponent({ navigate, stripeLinks }: SubscriptionComponentProps = {}) {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState<string>('lite'); // Default to Lite plan
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const nav = navigate || ((url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  });

  // Updated pricing structure to match the new schema
  const plans: Plan[] = [
    {
      id: 'lite',
      name: 'Lite',
      price: 9,
      yearlyPrice: 99,
      interval: 'monthly',
      description: 'Access to basic content automation features.',
      features: [
        'AI-driven content generation',
        'Basic scheduling',
        'Single platform integration',
        'Basic analytics (no e-commerce)'
      ],
      stripeMonthlyLinkEnv: 'NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK',
      stripeYearlyLinkEnv: 'NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 70,
      yearlyPrice: 699,
      interval: 'monthly',
      description: 'Advanced features for professional creators.',
      isPopular: true,
      features: [
        'Everything in Lite',
        'Unlimited posts',
        '1 set of accounts',
        'E-commerce integration',
        'AI-driven content optimization',
        'Multi-platform scheduling',
        'Detailed performance analytics'
      ],
      stripeMonthlyLinkEnv: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK',
      stripeYearlyLinkEnv: 'NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK'
    },
    {
      id: 'team',
      name: 'Team',
      price: 199,
      yearlyPrice: 1999,
      interval: 'monthly',
      description: 'Collaborative features for larger teams.',
      features: [
        'Everything in Pro',
        'Manage unlimited accounts',
        'Brand Voice AI (for consistency)',
        'Team collaboration mode',
        'Advanced analytics & reporting'
      ],
      stripeMonthlyLinkEnv: 'NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK',
      stripeYearlyLinkEnv: 'NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK',
    }
  ];

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    
    if (plan) {
      // For paid plans, redirect to appropriate Stripe checkout
      let stripeLink = '';
      
      if (plan.id === 'lite') {
        stripeLink = billingCycle === 'yearly'
          ? stripeLinks?.NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK || process.env[plan.stripeYearlyLinkEnv!] || ''
          : stripeLinks?.NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK || process.env[plan.stripeMonthlyLinkEnv!] || '';
      } else if (plan.id === 'pro') {
        stripeLink = billingCycle === 'yearly'
          ? stripeLinks?.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK || process.env[plan.stripeYearlyLinkEnv!] || ''
          : stripeLinks?.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK || process.env[plan.stripeMonthlyLinkEnv!] || '';
      } else if (plan.id === 'team') {
        stripeLink = billingCycle === 'yearly'
          ? stripeLinks?.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK || process.env[plan.stripeYearlyLinkEnv!] || ''
          : stripeLinks?.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK || process.env[plan.stripeMonthlyLinkEnv!] || '';

        // For team plans, store redirect to team dashboard
        try {
          localStorage.setItem('post_payment_redirect', '/team-dashboard');
        } catch (err) {
          console.error('Failed to set localStorage:', err);
          // Continue execution instead of throwing
        }
      }
      
      if (stripeLink) {
        try {
          nav(stripeLink);
        } catch (err) {
          console.error('Failed to navigate to Stripe:', err);
          // Fallback to updating plan locally
          setActivePlan(planId);
          setSuccessMessage('Navigation failed, but plan selection recorded.');
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      } else {
        // Fallback if env variable not set
        setActivePlan(planId);
        setSuccessMessage('Your subscription plan has been updated successfully.');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
  };

  const formatPrice = (plan: Plan) => {
    // Lite, Pro, Team are paid plans
    const price = billingCycle === 'yearly' ? plan.yearlyPrice || plan.price : plan.price;
    return `$${price}${billingCycle === 'monthly' ? '/month' : '/year'}`;
  };

  // Mock invoice data
  const invoices = [
    { id: 'INV-001', date: '2025-05-01', amount: '$70.00', status: 'Paid' },
    { id: 'INV-002', date: '2025-04-01', amount: '$70.00', status: 'Paid' },
    { id: 'INV-003', date: '2025-03-01', amount: '$70.00', status: 'Paid' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription plan and billing</p>
      </div>

      <GlassCard className="p-6">
        <Tabs defaultValue="plans">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">
              <Shield className="h-4 w-4 mr-2" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4">
            {successMessage && (
              <Alert className="bg-green-50 text-green-800 border-green-200 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center mb-6">
              <div className="bg-[#1A1A1A] p-1 rounded-full inline-flex items-center border border-[#8D5AFF]/20">
                <Button
                  variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full ${billingCycle === 'monthly' ? 'bg-[#8D5AFF] text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBillingCycle('yearly')}
                  className={`rounded-full ${billingCycle === 'yearly' ? 'bg-[#8D5AFF] text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Yearly
                  <Badge 
                    className={`ml-2 px-2 py-0.5 rounded-sm text-xs font-medium`}
                    style={
                      billingCycle === 'yearly'
                        ? { background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', color: 'white' }
                        // Inline styles with !important for inactive state
                        : { 
                            backgroundColor: '#202020 !important', 
                            borderColor: '#353535 !important', 
                            color: 'rgb(156 163 175 / 1) !important', // gray-400
                            borderWidth: '1px !important',
                            borderStyle: 'solid !important'
                          }
                    }
                  >
                    30% off
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <GlassCard 
                  key={plan.id} 
                  className={`relative ${plan.isPopular ? 'border-[#8D5AFF] shadow-lg shadow-[#8D5AFF]/20' : 'border-[#8D5AFF]/20'} flex flex-col`}
                >
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <Badge className="bg-[#8D5AFF] text-white">Popular</Badge>
                    </div>
                  )}
                  <div className="p-6 flex-grow-0">
                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                      {plan.name}
                      {plan.name === 'Team' && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">Enterprise Features</span>
                      )}
                    </h3>
                    <p className="text-5xl font-bold gradient-text mb-4">
                      {formatPrice(plan)}
                    </p>
                    <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 pt-0 mt-auto">
                    <Button 
                      onClick={() => handleSelectPlan(plan.id)}
                      className="w-full btn-primary"
                    >
                      {user?.user_metadata?.subscription_tier === plan.id ? "Current Plan" : "Select Plan"}
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-400" />
                Payment Information
              </h3>
              {/* TODO: Integrate with Stripe Elements for real payment method management */}
              <p className="text-gray-400 mb-4">No payment methods on file. Please add one to manage your billing.</p>
              <Button className="btn-primary">
                Add Payment Method
              </Button>
            </GlassCard>

            <GlassCard className="mt-6 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-400" />
                Billing History
              </h3>
              {/* TODO: Fetch real billing history from Stripe */}
              <p className="text-gray-400">No billing history available.</p>
            </GlassCard>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-400" />
                Your Invoices
              </h3>
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr className="text-gray-400 uppercase text-sm border-b border-gray-700">
                        <th className="py-2 px-4">Invoice ID</th>
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4">Amount</th>
                        <th className="py-2 px-4">Status</th>
                        <th className="py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-800 last:border-b-0 text-white">
                          <td className="py-3 px-4">{invoice.id}</td>
                          <td className="py-3 px-4">{invoice.date}</td>
                          <td className="py-3 px-4">{invoice.amount}</td>
                          <td className={`py-3 px-4 ${invoice.status === 'Paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {invoice.status}
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm" className="text-violet-400 hover:text-white">
                              View PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400">No invoices available.</p>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  );
}
