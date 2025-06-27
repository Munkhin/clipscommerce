'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import Link from 'next/link';

import NavigationBar from '@/app/landing/components/NavigationBar';

export default function ComingSoonPage() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen text-lightning-DEFAULT pt-16">
      <NavigationBar />
      
      <div className="container mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-[#8D5AFF]/10 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CalendarClock className="h-12 w-12 text-[#8D5AFF]" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white mb-6"
          >
            Coming Soon
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-white/70 mb-12"
          >
            We're working hard to bring you this feature. It will be available soon!
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-16"
          >
            <Link 
              href="/" 
              className="inline-flex items-center text-[#5afcc0] hover:text-[#5afcc0]/80 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </motion.div>
          
          {/* Animation */}
          <motion.div 
            className="relative h-32 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div 
              className="absolute top-0 left-1/2 w-6 h-6 rounded-full bg-[#5afcc0]"
              animate={{
                y: [0, 20, 0],
                x: [0, -50, -100, -150, -100, -50, 0, 50, 100, 150, 100, 50, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div 
              className="absolute top-0 left-1/2 w-4 h-4 rounded-full bg-[#8D5AFF]"
              animate={{
                y: [0, 40, 0],
                x: [0, 50, 100, 150, 100, 50, 0, -50, -100, -150, -100, -50, 0],
                scale: [1, 0.8, 1],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
          </motion.div>
          
          {/* Subscribe for updates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 p-8 bg-black/40 border border-white/10 rounded-xl"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Get notified when we launch</h3>
            <p className="text-white/60 mb-6">Subscribe to our newsletter to be the first to know when this feature goes live.</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8D5AFF]"
              />
              <button className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-6 py-3 rounded-lg font-medium transition-all">
                Notify Me
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Simple Footer */}
      <div className="border-t border-white/10 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <p className="text-white/40 text-sm">© {new Date().getFullYear()} SocialSchedule. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
