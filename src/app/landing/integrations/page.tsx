'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import NavigationBar from '@/app/landing/components/NavigationBar';

interface Integration {
  name: string;
  description: string;
  icon: string;
  category: string;
  comingSoon?: boolean;
}

export default function IntegrationsPage() {
  const [currentYear, setCurrentYear] = useState(2024); // Default fallback year
  
  useEffect(() => {
    // Set the actual year only on client side to prevent hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Integration data
  const integrations: Integration[] = [
    // Social platforms
    {
      name: "TikTok",
      description: "Automatically post and schedule optimized content on TikTok",
      icon: "/icons/tiktok.svg",
      category: "social"
    },
    {
      name: "Instagram",
      description: "Create and schedule reels, stories, and posts",
      icon: "/icons/instagram.svg",
      category: "social"
    },
    {
      name: "YouTube",
      description: "Upload shorts and videos with optimized titles and descriptions",
      icon: "/icons/youtube.svg",
      category: "social"
    },
    {
      name: "Twitter/X",
      description: "Schedule tweets with video content and tracking links",
      icon: "/icons/twitter.svg",
      category: "social",
      comingSoon: true
    },
    // E-commerce
    {
      name: "Shopify",
      description: "Connect product catalog and track conversion from social posts",
      icon: "/icons/shopify.svg",
      category: "ecommerce"
    },
    {
      name: "WooCommerce",
      description: "Sync WordPress store products with social content",
      icon: "/icons/woocommerce.svg",
      category: "ecommerce"
    },
    {
      name: "BigCommerce",
      description: "Integrate product feeds and track social ROI",
      icon: "/icons/bigcommerce.svg",
      category: "ecommerce",
      comingSoon: true
    },
    // Analytics
    {
      name: "Google Analytics",
      description: "Track conversion and performance metrics across platforms",
      icon: "/icons/google-analytics.svg",
      category: "analytics"
    },
    {
      name: "Mixpanel",
      description: "Advanced engagement and conversion metrics for social content",
      icon: "/icons/mixpanel.svg",
      category: "analytics",
      comingSoon: true
    },
    // Automation
    {
      name: "Zapier",
      description: "Connect with 3,000+ apps for custom workflows",
      icon: "/icons/zapier.svg",
      category: "automation"
    },
    {
      name: "Make (Integromat)",
      description: "Build complex social media automation workflows",
      icon: "/icons/make.svg",
      category: "automation"
    },
    {
      name: "Webhook API",
      description: "Custom integration with your own systems via webhooks",
      icon: "/icons/webhook.svg",
      category: "automation"
    }
  ];
  
  // Group integrations by category
  const socialPlatforms = integrations.filter(i => i.category === "social");
  const ecommerce = integrations.filter(i => i.category === "ecommerce");
  const analytics = integrations.filter(i => i.category === "analytics");
  const automation = integrations.filter(i => i.category === "automation");
  
  return (
    <div className="bg-[#0A0A0A] min-h-screen text-lightning-DEFAULT pt-16">
      <NavigationBar />
      
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 max-w-4xl mx-auto"
        >
          <motion.div 
            className="bg-[#0A0A0A] border border-white/5 rounded-xl p-12 text-center relative overflow-hidden shadow-xl"
          >
            <motion.h1 className="text-4xl font-bold text-white mb-6">
              Integrations
            </motion.h1>
            <motion.p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              Connect SocialSchedule with your favorite platforms
            </motion.p>
          </motion.div>
        </motion.div>
        
        {/* Social Platforms */}
        <section className="mb-20">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold mb-8 text-[#8D5AFF] border-b border-white/10 pb-4"
          >
            Social Platforms
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {socialPlatforms.map((integration, index) => (
              <motion.div
                key={`social-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-[#5afcc0]/30 transition-all"
              >
                {integration.comingSoon && (
                  <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] text-xs px-2 py-1 rounded absolute top-3 right-3">
                    Coming Soon
                  </span>
                )}
                <div className="mb-4 h-12 w-12 bg-white/5 rounded-lg flex items-center justify-center">
                  {/* Placeholder for icon */}
                  <div className="text-2xl text-[#5afcc0]">{integration.name.charAt(0)}</div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{integration.name}</h3>
                <p className="text-white/60 text-sm mb-4">
                  {integration.description}
                </p>
                {!integration.comingSoon ? (
                  <Link href="/coming-soon" className="inline-flex items-center text-[#5afcc0] text-sm hover:text-[#5afcc0]/80">
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <button className="text-white/40 text-sm cursor-not-allowed">
                    Learn more <ArrowRight className="h-4 w-4 ml-1 inline" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* E-commerce */}
        <section className="mb-20">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold mb-8 text-[#8D5AFF] border-b border-white/10 pb-4"
          >
            E-commerce
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ecommerce.map((integration, index) => (
              <motion.div
                key={`ecomm-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-[#5afcc0]/30 transition-all"
              >
                {integration.comingSoon && (
                  <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] text-xs px-2 py-1 rounded absolute top-3 right-3">
                    Coming Soon
                  </span>
                )}
                <div className="mb-4 h-12 w-12 bg-white/5 rounded-lg flex items-center justify-center">
                  {/* Placeholder for icon */}
                  <div className="text-2xl text-[#5afcc0]">{integration.name.charAt(0)}</div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{integration.name}</h3>
                <p className="text-white/60 text-sm mb-4">
                  {integration.description}
                </p>
                {!integration.comingSoon ? (
                  <Link href="/coming-soon" className="inline-flex items-center text-[#5afcc0] text-sm hover:text-[#5afcc0]/80">
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <button className="text-white/40 text-sm cursor-not-allowed">
                    Learn more <ArrowRight className="h-4 w-4 ml-1 inline" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* Analytics & Automation */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Analytics */}
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold mb-8 text-[#8D5AFF] border-b border-white/10 pb-4"
              >
                Analytics
              </motion.h2>
              
              <div className="grid grid-cols-1 gap-6">
                {analytics.map((integration, index) => (
                  <motion.div
                    key={`analytics-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-[#5afcc0]/30 transition-all"
                  >
                    {integration.comingSoon && (
                      <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] text-xs px-2 py-1 rounded absolute top-3 right-3">
                        Coming Soon
                      </span>
                    )}
                    <div className="mb-4 h-12 w-12 bg-white/5 rounded-lg flex items-center justify-center">
                      {/* Placeholder for icon */}
                      <div className="text-2xl text-[#5afcc0]">{integration.name.charAt(0)}</div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{integration.name}</h3>
                    <p className="text-white/60 text-sm mb-4">
                      {integration.description}
                    </p>
                    {!integration.comingSoon ? (
                      <Link href="/coming-soon" className="inline-flex items-center text-[#5afcc0] text-sm hover:text-[#5afcc0]/80">
                        Learn more <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    ) : (
                      <button className="text-white/40 text-sm cursor-not-allowed">
                        Learn more <ArrowRight className="h-4 w-4 ml-1 inline" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Automation */}
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold mb-8 text-[#8D5AFF] border-b border-white/10 pb-4"
              >
                Automation
              </motion.h2>
              
              <div className="grid grid-cols-1 gap-6">
                {automation.map((integration, index) => (
                  <motion.div
                    key={`automation-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-[#5afcc0]/30 transition-all"
                  >
                    {integration.comingSoon && (
                      <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] text-xs px-2 py-1 rounded absolute top-3 right-3">
                        Coming Soon
                      </span>
                    )}
                    <div className="mb-4 h-12 w-12 bg-white/5 rounded-lg flex items-center justify-center">
                      {/* Placeholder for icon */}
                      <div className="text-2xl text-[#5afcc0]">{integration.name.charAt(0)}</div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{integration.name}</h3>
                    <p className="text-white/60 text-sm mb-4">
                      {integration.description}
                    </p>
                    {!integration.comingSoon ? (
                      <Link href="/coming-soon" className="inline-flex items-center text-[#5afcc0] text-sm hover:text-[#5afcc0]/80">
                        Learn more <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    ) : (
                      <button className="text-white/40 text-sm cursor-not-allowed">
                        Learn more <ArrowRight className="h-4 w-4 ml-1 inline" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
        
        {/* API Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 border border-white/10 rounded-xl p-12 text-center max-w-5xl mx-auto mb-20"
        >
          <h2 className="text-3xl font-bold text-white mb-6">Custom Integration</h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-8">
            Need a custom integration for your specific workflow? Our developer API makes it easy to connect SocialSchedule to any platform.
          </p>
          <Link href="/api-docs" className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-bold inline-block shadow-lg shadow-[#8D5AFF]/30 transition-all">
            Explore API documentation
          </Link>
        </motion.section>
      </div>
      
      {/* Simple Footer */}
      <div className="border-t border-white/10 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <p className="text-white/40 text-sm">© {currentYear} SocialSchedule. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
