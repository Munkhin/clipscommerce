'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Sparkles, Clock, TrendingUp } from 'lucide-react';

interface FinalCTASectionProps {
  onGetStarted: () => void;
}

export default function FinalCTASection({ onGetStarted }: FinalCTASectionProps) {
  const benefits = [
    {
      icon: TrendingUp,
      text: "Start seeing results in as little as 10 days"
    },
    {
      icon: Sparkles,
      text: "AI-optimized content for maximum sales potential"
    },
    {
      icon: CheckCircle,
      text: "Risk-free with our 10-day results guarantee"
    },
    {
      icon: Clock,
      text: "Save 10+ hours per week with automated workflows"
    }
  ];

  return (
    <section className="py-16 md:py-32 bg-gradient-to-b from-neutral-900 to-black text-white relative overflow-hidden">
      {/* Enhanced background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(141,90,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(141,90,255,0.03)_1px,transparent_1px)] [background-size:60px_60px]"></div>
        <div className="absolute inset-0 bg-neutral-900/90"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            className="inline-flex items-center bg-[#8D5AFF]/10 border border-[#8D5AFF]/30 rounded-full px-4 py-2 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <span className="animate-pulse mr-2 h-2 w-2 rounded-full bg-[#8D5AFF]"></span>
            <span className="text-sm font-medium text-[#8D5AFF]">Join 10,000+ creators already earning more</span>
          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#5afcc0] to-[#8D5AFF] whitespace-nowrap"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Your Competition Is Already Using AI
          </motion.h2>
          
          <motion.p 
            className="text-lg text-white/90 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Don't get left behind. Start turning your content into cash today.
          </motion.p>
          
          <motion.div 
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 mb-10 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Price comparison */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                  <span className="text-[#5afcc0]">$5,397</span> Total Value
                </h3>
                <p className="text-white/60">Everything you need to succeed</p>
              </div>
              
              <div className="flex items-center">
                <div className="h-px w-16 bg-[#8D5AFF]/30 hidden md:block"></div>
                <div className="bg-[#8D5AFF]/20 p-2 rounded-full mx-4">
                  <ArrowRight className="h-6 w-6 text-[#8D5AFF]" />
                </div>
                <div className="h-px w-16 bg-[#8D5AFF]/30 hidden md:block"></div>
              </div>
              
              <div className="text-center md:text-right">
                <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                  Only <span className="text-[#5afcc0]">$600</span> Annually
                </h3>
                <p className="text-white/60">Save over 89% today</p>
              </div>
            </div>
            
            {/* Benefits */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {benefits.map((benefit, i) => (
                <motion.div 
                  key={i}
                  className="flex items-start"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.3 + (i * 0.1) }}
                >
                  <div className="bg-[#5afcc0]/10 p-2 rounded-full mr-3 flex-shrink-0">
                    <benefit.icon className="h-5 w-5 text-[#5afcc0]" />
                  </div>
                  <span className="text-white/80">{benefit.text}</span>
                </motion.div>
              ))}
            </div>
            
            {/* CTA button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex justify-center"
            >
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:from-[#8D5AFF]/90 hover:to-[#5afcc0]/90 text-white px-10 py-5 rounded-xl text-xl font-bold flex items-center shadow-lg shadow-[#8D5AFF]/20 transition-all duration-300"
                style={{
                  boxShadow: '0 10px 25px -5px rgba(141, 90, 255, 0.4)'
                }}
              >
                <span>Get Started Today</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/50"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-[#5afcc0] mr-2" />
              <span>No credit card required to start</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-[#5afcc0] mr-2" />
              <span>10-day results guarantee</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-[#5afcc0] mr-2" />
              <span>Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
