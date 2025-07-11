'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CreditCard, FileText, Clock, Shield, Check, X, Loader2, ExternalLink } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import PaymentMethodManager from '@/components/stripe/PaymentMethodManager';
import { stripeService, type Invoice } from '@/services/stripeService';

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
  const [billingHistory, setBillingHistory] = useState<Invoice[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const nav = navigate || ((url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  });

  // Load billing history when component mounts
  useEffect(() => {
    loadBillingHistory();
  }, []);

  const loadBillingHistory = async () => {
    try {
      setIsLoadingBilling(true);
      setBillingError(null);
      const history = await stripeService.getBillingHistory({ limit: 10 });
      setBillingHistory(history.invoices);
    } catch (error: any) {
      console.error('Error loading billing history:', error);
      setBillingError(error.message || 'Failed to load billing history');
    } finally {
      setIsLoadingBilling(false);
    }
  };

  // Updated pricing structure to match the new schema
  const plans: Plan[] = [
    {
      id: 'lite',
      name: 'Lite',
      price: 20,
      yearlyPrice: 240, // $20/month, billed annually
      interval: 'monthly',
      description: 'Access to basic content automation features.',
      features: [
        'Viral Blitz Cycle Framework (15 uses)',
        'Idea Generator Framework (15 uses)',
        '15 autoposts/month',
        'Basic analytics (no e-commerce)',
      ],
      stripeMonthlyLinkEnv: 'NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK',
      stripeYearlyLinkEnv: 'NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 70,
      yearlyPrice: 600, // $50/month, billed annually
      interval: 'monthly',
      description: 'Advanced features for professional creators.',
      isPopular: true,
      features: [
        'Viral Blitz Cycle Framework (unlimited)',
        'Idea Generator Framework (unlimited)',
        'Unlimited posts',
        'Multiple account sets',
        'E-commerce integration',
        'Advanced analytics & reporting',
      ],
      stripeMonthlyLinkEnv: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK',
      stripeYearlyLinkEnv: 'NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK'
    },
    {
      id: 'team',
      name: 'Team',
      price: 500,
      yearlyPrice: 6000, // $500/month, billed annually
      interval: 'monthly',
      description: 'Collaborative features for larger teams.',
      features: [
        'Everything in Pro',
        'Team dashboard access',
        'Manage unlimited accounts',
        'Brand Voice AI (for consistency)',
        'Team collaboration mode',
        'Priority support',
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

  const openCustomerPortal = async () => {
    try {
      const { url } = await stripeService.createCustomerPortalSession();
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      // Handle error - could show a toast notification
    }
  };

  return (
    <div className="min-h-screen bg-black text-foreground p-4 md:p-6 space-y-6">
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
                    className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-medium`}
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-violet-400" />
                    Payment Information
                  </h3>
                  <p className="text-gray-400 mt-1">Manage your payment methods and billing settings</p>
                </div>
                <Button 
                  onClick={openCustomerPortal}
                  variant="outline"
                  className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Billing
                </Button>
              </div>
              
              <PaymentMethodManager />
            </GlassCard>

            <GlassCard className="mt-6 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-400" />
                Recent Billing Activity
              </h3>
              
              {billingError && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-400 mb-4">
                  <AlertDescription>{billingError}</AlertDescription>
                </Alert>
              )}
              
              {isLoadingBilling ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                  <span className="ml-2 text-gray-400">Loading billing history...</span>
                </div>
              ) : billingHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr className="text-gray-400 uppercase text-sm border-b border-gray-700">
                        <th className="py-2 px-4">Invoice</th>
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4">Amount</th>
                        <th className="py-2 px-4">Status</th>
                        <th className="py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-800 last:border-b-0 text-white">
                          <td className="py-3 px-4 font-mono text-sm">{invoice.id}</td>
                          <td className="py-3 px-4">{stripeService.formatDate(invoice.created)}</td>
                          <td className="py-3 px-4 font-medium">
                            {stripeService.formatCurrency(invoice.amount_paid, invoice.currency)}
                          </td>
                          <td className={`py-3 px-4 ${stripeService.getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              {invoice.hosted_invoice_url && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-violet-400 hover:text-white"
                                  onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                                >
                                  View
                                </Button>
                              )}
                              {invoice.invoice_pdf && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-violet-400 hover:text-white"
                                  onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                                >
                                  PDF
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400">No billing history available yet.</p>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-violet-400" />
                    All Invoices
                  </h3>
                  <p className="text-gray-400 mt-1">Download and view your complete billing history</p>
                </div>
                <Button 
                  onClick={loadBillingHistory}
                  variant="outline"
                  disabled={isLoadingBilling}
                  className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  {isLoadingBilling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
              
              {billingError && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-400 mb-4">
                  <AlertDescription>{billingError}</AlertDescription>
                </Alert>
              )}
              
              {isLoadingBilling ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                  <span className="ml-2 text-gray-400">Loading invoices...</span>
                </div>
              ) : billingHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr className="text-gray-400 uppercase text-sm border-b border-gray-700">
                        <th className="py-2 px-4">Invoice ID</th>
                        <th className="py-2 px-4">Billing Period</th>
                        <th className="py-2 px-4">Amount</th>
                        <th className="py-2 px-4">Status</th>
                        <th className="py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-800 last:border-b-0 text-white">
                          <td className="py-3 px-4 font-mono text-sm">{invoice.id}</td>
                          <td className="py-3 px-4">
                            {stripeService.formatDate(invoice.period_start)} - {stripeService.formatDate(invoice.period_end)}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {stripeService.formatCurrency(invoice.amount_paid, invoice.currency)}
                          </td>
                          <td className={`py-3 px-4 ${stripeService.getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              {invoice.hosted_invoice_url && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-violet-400 hover:text-white"
                                  onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                                >
                                  View
                                </Button>
                              )}
                              {invoice.invoice_pdf && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-violet-400 hover:text-white"
                                  onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                                >
                                  Download PDF
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No invoices available yet.</p>
                  <p className="text-gray-500 text-sm mt-2">Invoices will appear here once you have an active subscription.</p>
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  );
}
