'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';

import NavigationBar from '@/app/landing/components/NavigationBar';

export default function DemoPage() {
  const [currentYear, setCurrentYear] = useState(2024); // Default fallback year
  const [currentStep, setCurrentStep] = useState(1);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  useEffect(() => {
    // Set the actual year only on client side to prevent hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  // Demo steps
  const demoSteps = [
    {
      title: "Connect Your Accounts",
      description: "Seamlessly link your social media accounts with just a few clicks"
    },
    {
      title: "Upload Your Content",
      description: "Upload long-form videos or connect your existing content library"
    },
    {
      title: "AI Processing",
      description: "Our AI analyzes your content and audience to find the best viral moments"
    },
    {
      title: "Review & Approve",
      description: "Review AI-generated clips, captions, and hashtags before posting"
    },
    {
      title: "Schedule & Post",
      description: "Set your posting schedule or let our AI determine the optimal times"
    }
  ];
  
  const handleDemoStepClick = (step: number) => {
    setCurrentStep(step);
  };
  
  const toggleVideoPlay = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };
  
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
              See SocialSchedule in Action
            </motion.h1>
            <motion.p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              Watch how our platform transforms your content into viral social posts
            </motion.p>
            
            <Link href="/pricing" className="bg-[#5afcc0] hover:bg-[#5afcc0]/90 text-black px-8 py-4 rounded-lg font-bold inline-block shadow-lg transition-all">
              Start free trial
            </Link>
            <p className="text-white/40 text-sm mt-4">10-day guarantee • No credit card required</p>
          </motion.div>
        </motion.div>
        
        {/* Demo Video Section */}
        <section className="mb-24 max-w-6xl mx-auto">
          <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
            {/* Video Player (placeholder) */}
            <div className="aspect-video bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {!isVideoPlaying ? (
                  <button 
                    onClick={toggleVideoPlay}
                    className="w-20 h-20 rounded-full bg-[#8D5AFF] flex items-center justify-center shadow-xl shadow-[#8D5AFF]/20"
                  >
                    <Play className="h-8 w-8 text-white ml-1" />
                  </button>
                ) : (
                  <div className="w-full h-full bg-black/70 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-white mb-4">Demo video would play here</p>
                      <button 
                        onClick={toggleVideoPlay}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                      >
                        Stop Demo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Demo Steps Navigation */}
            <div className="p-6">
              <div className="flex overflow-x-auto space-x-2 pb-4">
                {demoSteps.map((step, index) => (
                  <button
                    key={`step-${index + 1}`}
                    onClick={() => handleDemoStepClick(index + 1)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg ${
                      currentStep === index + 1
                        ? 'bg-[#8D5AFF] text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    } transition-all flex items-center`}
                  >
                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">
                      {index + 1}
                    </span>
                    {step.title}
                  </button>
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="text-xl font-medium text-white mb-2">
                  {demoSteps[currentStep - 1].title}
                </h3>
                <p className="text-white/70">
                  {demoSteps[currentStep - 1].description}
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Preview */}
        <section className="mb-24">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold mb-12 text-[#8D5AFF] text-center"
          >
            Key Features
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "AI Content Analysis",
                description: "Our advanced AI analyzes your long-form content to identify moments with the highest viral potential based on audience engagement patterns."
              },
              {
                title: "Multi-Platform Optimization",
                description: "Automatically optimize content format, aspect ratio, and duration for each social platform to maximize engagement."
              },
              {
                title: "Smart Scheduling",
                description: "AI-powered posting schedule that analyzes when your specific audience is most active and likely to engage."
              },
              {
                title: "Performance Analytics",
                description: "Comprehensive analytics dashboard showing content performance, audience growth, and engagement metrics across all platforms."
              },
              {
                title: "Caption & Hashtag Generator",
                description: "AI generates platform-specific captions and hashtags to maximize reach and engagement for each post."
              },
              {
                title: "Batch Processing",
                description: "Upload multiple videos at once and let our AI handle the rest, saving you hours of work."
              }
            ].map((feature, index) => (
              <motion.div
                key={`feature-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 border border-white/10 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-[#5afcc0]/10 rounded-lg flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-[#5afcc0]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* Demo Request Form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Request a Live Demo</h2>
              <p className="text-white/70 mb-6">
                Get a personalized walkthrough of SocialSchedule with one of our product specialists.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "See the platform in action with your content",
                  "Get your specific questions answered",
                  "Learn about custom enterprise solutions",
                  "Discover best practices for your industry"
                ].map((item, idx) => (
                  <li key={`demo-benefit-${idx}`} className="flex items-start">
                    <Check className="h-5 w-5 text-[#5afcc0] mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-white/80 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-black/50 p-8">
              <form className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8D5AFF]"
                    placeholder="Your name" 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8D5AFF]"
                    placeholder="you@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Company</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8D5AFF]"
                    placeholder="Your company" 
                  />
                </div>
                <button 
                  type="button"
                  className="w-full bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white py-3 rounded-lg font-medium shadow-lg shadow-[#8D5AFF]/20 transition-all"
                >
                  Schedule Demo
                </button>
              </form>
            </div>
          </div>
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
