'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, TrendingUp, Star, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import NavigationBar from '@/app/landing/components/NavigationBar';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  platform: string;
  followers: string;
  growth: string;
  imageSrc?: string;
}

export default function ResultsPage() {
  const [currentYear, setCurrentYear] = useState(2024); // Default fallback year
  
  useEffect(() => {
    // Set the actual year only on client side to prevent hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Testimonials data
  const testimonials: Testimonial[] = [
    {
      name: "Alex Johnson",
      role: "Content Creator",
      content: "SocialSchedule completely transformed my TikTok presence. The AI-optimized clips consistently perform 3x better than my manual posts. I've gained 50,000 new followers in just 45 days!",
      platform: "TikTok",
      followers: "285k",
      growth: "+128%"
    },
    {
      name: "Sarah Martinez",
      role: "E-commerce Business Owner",
      content: "The ROI from using SocialSchedule has been incredible. Not only do we save 15 hours a week on content creation, but our conversion rates from social traffic have increased by 37%.",
      platform: "Instagram",
      followers: "124k",
      growth: "+73%"
    },
    {
      name: "Marcus Chen",
      role: "Digital Marketing Agency",
      content: "We manage social accounts for 12 clients, and SocialSchedule has become our secret weapon. The ability to maintain consistent brand voice across platforms while optimizing for each one is game-changing.",
      platform: "Multiple",
      followers: "1.2M+",
      growth: "+92%"
    }
  ];
  
  // Stats data
  const stats = [
    {
      title: "Average Follower Growth",
      value: "73%",
      description: "within first 90 days",
      icon: <Users className="h-6 w-6 text-[#5afcc0]" />
    },
    {
      title: "Engagement Increase",
      value: "218%",
      description: "compared to manual posting",
      icon: <Star className="h-6 w-6 text-[#5afcc0]" />
    },
    {
      title: "Time Saved Weekly",
      value: "15hrs",
      description: "on content management",
      icon: <BarChart3 className="h-6 w-6 text-[#5afcc0]" />
    },
    {
      title: "Sales Conversion",
      value: "+41%",
      description: "from optimized content",
      icon: <TrendingUp className="h-6 w-6 text-[#5afcc0]" />
    }
  ];
  
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
              Real Results
            </motion.h1>
            <motion.p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              See how creators and businesses are transforming their social presence with SocialSchedule
            </motion.p>
            
            {/* 10-day guarantee badge */}
            <div className="bg-[#5afcc0]/10 border border-[#5afcc0]/30 rounded-full px-6 py-3 inline-flex items-center">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-[#5afcc0] border-dashed flex items-center justify-center mr-3"
              >
                <span className="text-[#5afcc0] font-bold">10</span>
              </motion.div>
              <span className="text-[#5afcc0] font-medium">Day Results Guarantee</span>
            </div>
          </motion.div>
        </motion.div>
        
        {/* Stats Section */}
        <section className="mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-center mb-16 text-[#8D5AFF]"
          >
            Platform Performance
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={`stat-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:border-[#8D5AFF]/30 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-[#5afcc0]/10 rounded-lg flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
                <h3 className="text-sm font-medium text-white/60 mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-xs text-white/50">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-center mb-16 text-[#8D5AFF]"
          >
            Success Stories
          </motion.h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={`testimonial-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 border border-white/10 rounded-xl overflow-hidden"
              >
                {/* Testimonial header with platform info */}
                <div className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-white">{testimonial.platform}</h3>
                      <p className="text-xs text-white/70">{testimonial.followers} followers</p>
                    </div>
                    <div className="bg-black rounded-lg px-3 py-1 text-[#5afcc0] font-medium flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" /> {testimonial.growth}
                    </div>
                  </div>
                </div>
                
                {/* Testimonial content */}
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-white/80 italic mb-6">"{testimonial.content}"</p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#8D5AFF]/20 rounded-full flex items-center justify-center mr-3">
                        {testimonial.imageSrc ? (
                          <Image 
                            src={testimonial.imageSrc} 
                            alt={testimonial.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-[#8D5AFF] font-bold">
                            {testimonial.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{testimonial.name}</h4>
                        <p className="text-xs text-white/60">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* Case Studies Section */}
        <section className="mb-24">
          <div className="flex justify-between items-center mb-12">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-[#8D5AFF]"
            >
              Case Studies
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link href="/resources" className="text-white/60 hover:text-white flex items-center">
                View all case studies <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <motion.div 
                key={`case-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-black/30 border border-white/10 rounded-xl overflow-hidden hover:border-[#5afcc0]/30 transition-all"
              >
                <div className="h-48 bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-[#0A0A0A] rounded-full p-4 shadow-xl">
                      <TrendingUp className="h-8 w-8 text-[#5afcc0]" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Case Study {i}</h3>
                    <span className="text-xs bg-[#5afcc0]/10 text-[#5afcc0] px-2 py-1 rounded">
                      {i === 1 ? "E-commerce" : "SaaS"}
                    </span>
                  </div>
                  <p className="text-white/70 mb-6">
                    How a {i === 1 ? "fashion brand" : "software company"} increased their social engagement by over 200% in just 6 weeks.
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] text-xs px-2 py-1 rounded">TikTok</span>
                      <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] text-xs px-2 py-1 rounded">Instagram</span>
                    </div>
                    <Link href="/coming-soon" className="text-[#8D5AFF] flex items-center text-sm">
                      Read case study <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 border border-white/10 rounded-xl p-12 text-center max-w-5xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white mb-6">Ready to see results for yourself?</h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-8">
            Join thousands of creators and businesses who have transformed their social media presence with SocialSchedule.
          </p>
          <Link href="/dashboard" className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-bold inline-block shadow-lg shadow-[#8D5AFF]/30 transition-all">
            Get started today
          </Link>
          <p className="text-white/40 text-sm mt-4">10-day results guarantee</p>
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
