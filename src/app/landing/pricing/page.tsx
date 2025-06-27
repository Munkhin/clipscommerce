'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, BarChart3, Users, Building2, Calculator, ArrowRight, ChevronRight, Shield, Sparkles, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';
import NavigationBar from '@/app/landing/components/NavigationBar';

import { getPricingTiers } from "@/lib/supabase/queries/pricing";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  yearlyPrice?: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  stripePriceId?: string;
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

interface PlatformOption {
  id: string;
  label: string;
  icon: React.ReactNode;
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
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok']);
  const [followers, setFollowers] = useState<number>(0);
  const [posts, setPosts] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleFollowersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFollowers(parseInt(e.target.value) || 0);
  };

  const handlePostsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPosts(parseInt(e.target.value) || 0);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  // Using fixed prices as specified
  
  // Predefined pricing tiers with specified pricing structure
  const pricingTiers: PricingTier[] = [
    {
      id: 'lite',
      name: 'Lite',
      price: 20,
      yearlyPrice: 240,
      description: '$20/month',
      features: [
        'Viral Blitz Cycle Framework (15 uses)',
        'Idea Generator Framework (15 uses)',
        '15 autoposts/month',
        'Basic analytics (no e-commerce)'
      ],
      ctaText: 'Select Plan',
      stripePriceId: process.env.NEXT_PUBLIC_STRIPE_LITE_LINK
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 70,
      yearlyPrice: 840,
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
      stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_LINK
    },
    {
      id: 'team',
      name: 'Team',
      price: 500, // Monthly price
      yearlyPrice: 6000, // Annual price ($500 * 12)
      description: '$500/month',
      features: [
        'Everything in Pro',
        'Team dashboard access',
        'Manage unlimited accounts',
        'Brand Voice AI (for consistency)',
        'Team collaboration mode',
        'Priority support'
      ],
      ctaText: 'Select Plan',
      stripePriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_LINK
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
      answer: "Pro ($70/month or $600/year) is for individuals managing up to 3 accounts. Team ($100/month or $900/year) adds collaboration features and supports up to 10 accounts. Enterprise ($160/month or $1,500+/year) offers unlimited accounts, custom integrations, and dedicated support."
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

  const platformOptions: PlatformOption[] = [
    {
      id: 'tiktok',
      label: 'TikTok',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/></svg>
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
    },
    {
      id: 'youtube',
      label: 'YouTube',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    }
  ];

  // Enhanced ROI calculation with more accurate logic
  const calculateGrowth = () => {
    if (followers === 0 && posts === 0) return 0;
    
    // Base engagement calculation based on platform mix
    const platformMultipliers = {
      tiktok: 1.5,    // Higher viral potential
      instagram: 1.2, // Good for business
      youtube: 1.8,   // Highest retention value
      linkedin: 1.3   // B2B focused
    };
    
    // Calculate weighted platform multiplier
    const avgMultiplier = selectedPlatforms.length > 0 
      ? selectedPlatforms.reduce((sum, platform) => 
          sum + (platformMultipliers[platform as keyof typeof platformMultipliers] || 1), 0
        ) / selectedPlatforms.length
      : 1;
    
    // More sophisticated growth calculation
    const baseGrowthRate = Math.min(followers * 0.08, 5000); // Cap base growth
    const contentBoost = posts * 15 * avgMultiplier;
    const platformDiversityBonus = selectedPlatforms.length > 1 ? 1.2 : 1;
    
    const totalGrowth = (baseGrowthRate + contentBoost) * platformDiversityBonus;
    
    return Math.round(Math.min(totalGrowth, 50000)); // Cap at 50k for realism
  };

  const estimatedGrowth = calculateGrowth();

  // Recommended plan based on inputs
  const getRecommendedPlan = () => {
    if (followers > 10000 || posts > 30 || selectedPlatforms.length > 2) return 'team';
    if (followers > 1000 || posts > 10 || selectedPlatforms.length > 1) return 'pro';
    return 'lite';
  };

  const recommendedPlan = getRecommendedPlan();

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-lightning-DEFAULT pt-16">
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
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' 
                    ? 'bg-[#8D5AFF] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'yearly' 
                    ? 'bg-[#8D5AFF] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'}`}
                >
                  Yearly
                  <span className="ml-1 text-xs bg-[#5afcc0] text-black px-2 py-0.5 rounded-full">
                    Save 20%
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12 relative"
        >
          {pricingTiers.map((tier: PricingTier, index: number) => {
            // Handle Team tier pricing display
            const priceDisplay = () => {
              if (tier.id === 'team' && billingCycle === 'yearly') {
                return '$6000';
              }
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
                  
                  {/* Display annual savings if yearly billing is selected */}
                  {billingCycle === 'yearly' && (
                    <div className="text-[#5afcc0] text-sm mb-4">Save 20% with annual billing</div>
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
                      onClick={() => {
                        // Redirect to Stripe for paid plans, dashboard for free plans
                        if (tier.stripePriceId) {
                          window.location.href = `/api/checkout?price_id=${tier.stripePriceId}`;
                        } else {
                          window.location.href = '/dashboard';
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-medium transition-all cursor-pointer ${tier.isPopular
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

        {/* Calculator */}
        <div className="mt-28 mb-32 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Calculate Your <span className="text-[#8D5AFF]">Investment Return</span></h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              See how our AI-powered platform delivers measurable ROI based on your social media accounts and content strategy.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-[#8D5AFF]/10 rounded-full p-3">
                <Calculator className="w-6 h-6 text-[#8D5AFF]" />
              </div>
              <h3 className="text-xl font-semibold text-white">ROI Calculator</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-white/70 mb-2 font-medium">How many creators do you need?</label>
                <div className="flex">
                  <input 
                    type="number" 
                    value={followers} 
                    onChange={handleFollowersChange}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-l-lg focus:outline-none focus:border-blitz-blue/50 text-lightning-DEFAULT"
                  />
                  <div className="bg-black/20 border border-l-0 border-white/10 rounded-r-lg px-4 flex items-center text-white/70">
                    creators
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-white/70 mb-2 font-medium">Average videos of your clips</label>
                <div className="flex">
                  <input 
                    type="number" 
                    value={posts} 
                    onChange={handlePostsChange}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-l-lg focus:outline-none focus:border-blitz-blue/50 text-lightning-DEFAULT"
                  />
                  <div className="bg-black/20 border border-l-0 border-white/10 rounded-r-lg px-4 flex items-center text-white/70">
                    weekly
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <label className="block text-white/70 mb-2 font-medium">Select platforms (you can choose multiple)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {platformOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => togglePlatform(option.id)}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all ${selectedPlatforms.includes(option.id)
                      ? 'border-blitz-blue/50 bg-blitz-blue/5 text-lightning-DEFAULT' 
                      : 'border-white/10 bg-black/20 text-white/70 hover:text-white/90 hover:border-white/20'}`}
                  >
                    <span className="text-blitz-blue">{option.icon}</span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <h4 className="text-white/70 mb-1 text-sm">Selected platforms</h4>
                <div className="text-lg font-bold text-lightning-DEFAULT">
                  {selectedPlatforms.length > 0 
                    ? selectedPlatforms.map(id => platformOptions.find(p => p.id === id)?.label).join(', ')
                    : 'None selected'
                  }
                </div>
              </div>
              
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <h4 className="text-white/70 mb-1 text-sm">We recommend</h4>
                <div className="text-lg font-bold text-lightning-DEFAULT">
                  {pricingTiers.find(p => p.id === recommendedPlan)?.name}
                </div>
              </div>
              
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <h4 className="text-white/70 mb-1 text-sm">Est. growth per month</h4>
                <div className="text-lg font-bold text-[#8D5AFF]">+{estimatedGrowth.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="text-center">
              <Link 
                href={`#${recommendedPlan}`} 
                className="inline-flex items-center px-8 py-3 bg-[#8D5AFF] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#8D5AFF]/20 transition-all"
              >
                <span>Select {pricingTiers.find(p => p.id === recommendedPlan)?.name}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>

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
                href="mailto:support@clipscommerce.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 bg-[#8D5AFF] text-white rounded-xl font-medium hover:bg-[#8D5AFF]/90 transition-all"
              >
                <Mail className="mr-2 h-4 w-4" />
                Get in Touch
              </motion.a>
              <motion.a
                href="tel:+1-555-0123"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 border border-white/20 text-white rounded-xl font-medium hover:bg-white/5 transition-all"
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
