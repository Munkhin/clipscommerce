'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, BarChart3, Users, Building2, Calculator, ArrowRight, ChevronRight, Shield, Sparkles, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';
import NavigationBar from '@/app/landing/components/NavigationBar';

import { getPricingTiers } from "@/lib/supabase/queries/pricing";

// Dynamic import for ROI Calculator
const ROICalculator = lazy(() => import('@/components/pricing/ROICalculator'));

interface PricingTier {
  id: string;
  name: string;
  price: number;
  yearlyPrice?: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
}

interface Feature {
  name: string;
  tiers: {
    [key: string]: boolean;
  };
  description: string;
}

interface FAQ {
  question: string;
  answer: string;
}


export const dynamic = 'force-dynamic';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const teamCardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showROICalculator, setShowROICalculator] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Using fixed prices as specified
  
  // Predefined pricing tiers with specified pricing structure
  const pricingTiers: PricingTier[] = [
    {
      id: 'lite',
      name: 'Lite',
      price: 20,
      yearlyPrice: 240, // $20/month, billed annually
      description: '$20/month',
      features: [
        'Viral Blitz Cycle Framework (15 uses)',
        'Idea Generator Framework (15 uses)',
        '15 autoposts/month',
        'Basic analytics (no e-commerce)'
      ],
      ctaText: 'Select Plan',
      stripeMonthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK,
      stripeYearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 70,
      yearlyPrice: 600, // $50/month, billed annually
      description: '$70/month',
      features: [
        'Viral Blitz Cycle Framework (unlimited)',
        'Idea Generator Framework (unlimited)',
        'Unlimited posts',
        'Multiple account sets',
        'E-commerce integration',
        'Advanced analytics & reporting'
      ],
      isPopular: true,
      ctaText: 'Get Started',
      stripeMonthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK,
      stripeYearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK,
    }
  ];

  const features: Feature[] = [
    {
      name: 'AI clipping',
      tiers: { 'Free': true, 'Pro': true, 'Business': true },
      description: 'Automated content clip generation'
    },
    {
      name: 'Processing speed',
      tiers: { 'Free': false, 'Pro': true, 'Business': true },
      description: 'Faster processing times for content'
    },
    {
      name: 'Video import sources',
      tiers: { 'Free': false, 'Pro': true, 'Business': true },
      description: 'Import from multiple platforms'
    },
    {
      name: 'Dedicated account manager',
      tiers: { 'Free': false, 'Pro': false, 'Business': true },
      description: 'Personal support for your account'
    },
    {
      name: 'API Access',
      tiers: { 'Free': false, 'Pro': false, 'Business': true },
      description: 'Full API access for custom integrations'
    }
  ];

  const faqs: FAQ[] = [
    {
      question: "What's the 10-day guarantee?",
      answer: "We're confident in our platform's ability to deliver results. If you don't see measurable improvements in your social media performance within 10 days, contact us for a full refund."
    },
    {
      question: "What's the difference between the pricing tiers?",
      answer: "Lite ($20/month or $240/year) offers essential features for getting started. Pro ($70/month or $600/year) includes unlimited features, multiple account sets, e-commerce integration, and advanced analytics for growing businesses."
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans.'
    },
    {
      question: 'How does the cancellation work?',
      answer: 'You can cancel your subscription at any time. Your account will remain active until the end of your billing period.'
    },
    {
      question: 'Do you offer discounts for non-profits?',
      answer: 'Yes, we offer special pricing for registered non-profit organizations. Please contact our sales team for more information.'
    }
  ];


  const handleCtaClick = (tier: PricingTier) => {
    const priceId = billingCycle === 'monthly' ? tier.stripeMonthlyPriceId : tier.stripeYearlyPriceId;
    const redirectUrl = `/sign-up?plan=${tier.id}&billing=${billingCycle}&priceId=${encodeURIComponent(priceId || '')}`;
    window.location.href = redirectUrl;
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-lightning-DEFAULT pt-16">
      {/* Structured Data - FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map((faq) => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }}
      />
      
      {/* Structured Data - Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "ClipsCommerce",
            "url": "https://clipscommerce.com",
            "logo": "https://clipscommerce.com/images/logo.png",
            "description": "AI-powered short-form content creation platform for e-commerce sellers",
            "sameAs": [
              "https://twitter.com/clipscommerce",
              "https://linkedin.com/company/clipscommerce"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+1-555-012-3456",
              "contactType": "Customer Service",
              "email": "hello@clipscommerce.com"
            }
          })
        }}
      />
      
      <NavigationBar />
      <div className="container mx-auto px-4 py-12">
        {/* CTA section */}
        <div className="mb-4 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-12 text-center relative overflow-hidden shadow-xl"
          >
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-bold text-white mb-6"
            >
              Choose Your Plan
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-white/80 max-w-3xl mx-auto mb-10"
            >
              Simple choices, powerful results.
            </motion.p>
            
            {/* Billing toggle */}
            <div className="flex justify-center items-center space-x-4 mb-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex bg-black/30 p-1 rounded-full border border-white/10 backdrop-blur-sm"
              >
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] flex items-center ${billingCycle === 'monthly' 
                    ? 'bg-[#8D5AFF] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] flex items-center ${billingCycle === 'yearly' 
                    ? 'bg-[#8D5AFF] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'}`}
                >
                  Yearly
                  <span className="ml-1 text-xs bg-[#5afcc0] text-black px-2 py-0.5 rounded-full">
                    Save 30%
                  </span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Pricing cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12 relative"
        >
          {pricingTiers.map((tier: PricingTier, index: number) => {
            // Handle pricing display for all tiers
            const priceDisplay = () => {
              return `$${billingCycle === 'yearly' ? tier.yearlyPrice : tier.price}`;
            };
            
            // Calculate transforms to position Team tier higher
            const cardPositionStyle = tier.isPopular ? { marginTop: '-40px' } : {};
            
            return (
              <motion.div
                key={tier.id}
                variants={cardVariants}
                whileHover={{ y: -8 }}
                style={cardPositionStyle}
                className={`relative rounded-xl overflow-hidden backdrop-blur-sm ${tier.isPopular 
                  ? 'border-2 border-[#8D5AFF]/50 bg-gradient-to-br from-black to-[#1A1A1A] z-10'
                  : 'border border-white/10 bg-black/40'}`}
              >
                {tier.isPopular && (
                  <div className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] text-white text-center py-2 font-semibold text-sm">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="p-6 relative flex flex-col h-full" style={{ minHeight: tier.isPopular ? '640px' : '600px' }}>
                  {/* Glow effect for popular plan */}
                  {tier.isPopular && (
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#8D5AFF]/20 rounded-full filter blur-3xl -z-10" />
                  )}
                  
                  <h3 className="text-xl font-bold text-white mb-4">{tier.name}</h3>
                  
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold text-white">
                      {priceDisplay()}
                    </span>
                    <span className="text-white/60 ml-2">
                      {billingCycle === 'yearly' ? '/year' : '/month'}
                    </span>
                  </div>
                  
                  {billingCycle === 'yearly' && tier.isPopular && (
                    <div className="text-[#5afcc0] text-sm mb-4">Save 30% with annual billing</div>
                  )}
                  
                  {/* Bonus section */}
                  <div className="bg-[#5afcc0]/10 rounded-lg p-4 mb-6 border border-[#5afcc0]/20">
                    <div className="flex items-start">
                      <ChevronRight className="h-5 w-5 text-[#5afcc0] mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white/80">
                        <span className="text-[#5afcc0] font-medium">Purchase now</span> and get exclusive bonuses worth up to $899
                      </p>
                    </div>
                  </div>
                  
                  {/* 10-day guarantee instead of free trial */}
                  <div className="flex items-center justify-center text-sm text-white/60 mb-6">
                    <Shield className="h-4 w-4 mr-2 text-[#5afcc0]" />
                    <span>10-day results guarantee</span>
                  </div>
                  
                  <div className="mt-auto pt-6">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleCtaClick(tier)}
                      className={`w-full py-3 rounded-xl font-medium transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${tier.isPopular
                        ? 'bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] text-white hover:shadow-lg hover:shadow-[#8D5AFF]/20'
                        : 'bg-[#8D5AFF] text-white hover:bg-[#8D5AFF]/90'}`}
                    >
                      {tier.ctaText}
                    </motion.button>
                  </div>
                  
                  <div className="space-y-2 flex-grow mt-4">
                    <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                      FEATURES
                    </p>
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <div className="w-4 h-4 rounded-full bg-[#5afcc0]/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                          <Check className="h-2.5 w-2.5 text-[#8D5AFF]" />
                        </div>
                        <span className="text-xs text-white/80">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Bottom glow for highlighted plan */}
                  {tier.isPopular && (
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#5afcc0]/10 rounded-full filter blur-3xl -z-10" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ROI Calculator - Load dynamically */}
        {!showROICalculator ? (
          <div className="mt-28 mb-32 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.button
                onClick={() => setShowROICalculator(true)}
                className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-xl font-medium inline-flex items-center shadow-lg shadow-[#8D5AFF]/30 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Calculator className="mr-2 h-5 w-5" />
                Calculate Your ROI
              </motion.button>
              <p className="text-white/60 text-sm mt-4">
                See how our platform delivers measurable results for your business
              </p>
            </motion.div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="mt-28 mb-32 max-w-4xl mx-auto">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D5AFF]"></div>
                </div>
              </div>
            </div>
          }>
            <ROICalculator pricingTiers={pricingTiers} />
          </Suspense>
        )}

        {/* FAQ Section */}
        <div className="mb-32 max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-center mb-12 text-[#8B5CF6]"
          >
            Frequently Asked Questions
          </motion.h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/40 border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  aria-expanded={activeFaq === index}
                  className="flex justify-between items-center w-full text-left p-6 hover:bg-white/5 transition-colors duration-200"
                >
                  <span className="font-medium text-lg text-white">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-[#5afcc0] transition-all duration-300 ease-in-out ${activeFaq === index ? 'transform rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, y: -10 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: -10 }}
                      transition={{ 
                        duration: 0.4, 
                        ease: [0.4, 0.0, 0.2, 1],
                        opacity: { duration: 0.3 }
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0 text-white/80 border-t border-white/10">
                        <div className="pt-4">
                          {faq.answer}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Get in Touch Bar */}
        <div className="mt-32 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#8D5AFF]/10 to-[#5afcc0]/10 border border-[#8D5AFF]/20 rounded-2xl p-8 text-center"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto">
              Have specific requirements or need enterprise features? Our team is here to help you find the perfect solution for your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.a
                href="mailto:hello@clipscommerce.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 bg-[#8D5AFF] text-white rounded-xl font-medium hover:bg-[#8D5AFF]/90 transition-all min-h-[44px] min-w-[44px]"
              >
                <Mail className="mr-2 h-4 w-4" />
                Get in Touch
              </motion.a>
              <motion.a
                href="tel:+1-555-0123"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 border border-white/20 text-white rounded-xl font-medium hover:bg-white/5 transition-all min-h-[44px] min-w-[44px]"
              >
                <span className="mr-2">📞</span>
                Call Us: +1 (555) 012-3456
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
