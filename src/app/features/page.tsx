'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, BarChart3, Users, Shield, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';

export default function FeaturesPage() {
  const [currentYear, setCurrentYear] = useState(2024);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const features = [
    {
      icon: Zap,
      title: "AI-Powered Content Optimization",
      description: "Transform your long-form content into viral social media posts with our advanced AI that analyzes engagement patterns and identifies the most compelling moments.",
      benefits: [
        "Automatic highlight detection",
        "Engagement prediction scoring",
        "Platform-specific optimization",
        "Caption and hashtag generation"
      ]
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics & Insights",
      description: "Get comprehensive performance metrics across all your social media platforms with detailed insights into what content performs best.",
      benefits: [
        "Real-time performance tracking",
        "Audience engagement analysis",
        "Competitor benchmarking",
        "ROI measurement tools"
      ]
    },
    {
      icon: Users,
      title: "Multi-Platform Management",
      description: "Manage all your social media accounts from one unified dashboard with seamless posting and scheduling across platforms.",
      benefits: [
        "Unified content calendar",
        "Cross-platform posting",
        "Bulk content processing",
        "Team collaboration tools"
      ]
    },
    {
      icon: Shield,
      title: "Enterprise-Grade Security",
      description: "Your content and data are protected with bank-level security, ensuring complete privacy and compliance.",
      benefits: [
        "End-to-end encryption",
        "SOC 2 compliance",
        "Role-based access control",
        "Audit trail logging"
      ]
    },
    {
      icon: Globe,
      title: "Global Scale & Performance",
      description: "Built for scale with global CDN distribution and high-performance infrastructure to handle your growing needs.",
      benefits: [
        "99.9% uptime guarantee",
        "Global content delivery",
        "Automatic scaling",
        "24/7 monitoring"
      ]
    }
  ];

  return (
    <div className="bg-black min-h-screen text-white">
      <Header />
      
      <div className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-black to-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Powerful <span className="text-[#8D5AFF]">Features</span> for Content Success
              </h1>
              <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
                Discover all the tools and capabilities that make ClipsCommerce the complete 
                solution for transforming your content into viral social media success.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/sign-up">
                  <button className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:shadow-lg hover:shadow-[#8D5AFF]/20 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 inline-flex items-center">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </Link>
                <Link href="/landing/demo">
                  <button className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-300">
                    Watch Demo
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-[#18181b] rounded-xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-[#8D5AFF]/10 p-3 rounded-lg w-fit mb-6">
                    <feature.icon className="h-8 w-8 text-[#8D5AFF]" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-white/70 mb-6">{feature.description}</p>
                  
                  <ul className="space-y-3">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-[#5afcc0] mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-white/80">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-[#0A0A0A] to-black">
          <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 text-center">
            <motion.div
              className="bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 border border-white/10 rounded-xl p-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Transform Your Content?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of content creators who are already using ClipsCommerce 
                to grow their social media presence and increase engagement.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/sign-up">
                  <button className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:shadow-lg hover:shadow-[#8D5AFF]/20 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 inline-flex items-center">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </Link>
                <Link href="/landing/pricing">
                  <button className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-300">
                    View Pricing
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">© {currentYear} ClipsCommerce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}