'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PlatformOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

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

interface ROICalculatorProps {
  pricingTiers: PricingTier[];
}

export default function ROICalculator({ pricingTiers }: ROICalculatorProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok']);
  const [followers, setFollowers] = useState<number>(0);
  const [posts, setPosts] = useState<number>(0);

  const handleFollowersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setFollowers(value);
  };

  const handlePostsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setPosts(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = parseInt((e.target as HTMLInputElement).value) || 0;
    if (e.key === 'ArrowDown' && currentValue <= 0) {
      e.preventDefault();
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
      const currentSet = new Set(prev);
      if (currentSet.has(platformId)) {
        currentSet.delete(platformId);
      } else {
        currentSet.add(platformId);
      }
      return Array.from(currentSet);
    });
  };

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
    // Calculate a score based on input values
    let score = 0;
    
    // Scoring based on creators/followers
    if (followers >= 10000) score += 3;
    else if (followers >= 5000) score += 2;
    else if (followers >= 1000) score += 1;
    
    // Scoring based on weekly posts
    if (posts >= 30) score += 3;
    else if (posts >= 15) score += 2;
    else if (posts >= 10) score += 1;
    
    // Scoring based on platform diversity
    if (selectedPlatforms.length >= 3) score += 2;
    else if (selectedPlatforms.length >= 2) score += 1;
    
    // Return recommendation based on total score
    if (score >= 4) return 'team';
    if (score >= 2) return 'pro';
    return 'lite';
  };

  const recommendedPlan = getRecommendedPlan();

  return (
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
                onKeyDown={handleKeyDown}
                min="0"
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
                onKeyDown={handleKeyDown}
                min="0"
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
                className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all min-h-[44px] min-w-[44px] ${selectedPlatforms.includes(option.id)
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
            className="inline-flex items-center px-8 py-3 bg-[#8D5AFF] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#8D5AFF]/20 transition-all min-h-[44px] min-w-[44px]"
          >
            <span>Select {pricingTiers.find(p => p.id === recommendedPlan)?.name}</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}