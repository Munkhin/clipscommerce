'use client';

import { motion } from 'framer-motion';
import { XCircle, CheckCircle } from 'lucide-react';

export default function ProblemSolutionSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-storm-darker to-storm-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-lightning-DEFAULT mb-4">
            Stop Creating Content That Only Gets Views
          </h2>
          <p className="text-xl text-lightning-dim/80 max-w-3xl mx-auto">
            Our platform is specifically built for{' '}
            <span className="font-semibold text-lightning-DEFAULT">sellers</span>, not just creators.
          </p>
        </div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, staggerChildren: 0.2 }}
        >
          {/* Problem Side */}
          <motion.div 
            className="p-8 rounded-xl border border-red-900/30 bg-storm-light/5 backdrop-blur-sm shadow-lg"
            whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)' }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-6">
              <XCircle className="h-8 w-8 text-red-400/90 mr-3" />
              <h3 className="text-xl md:text-2xl font-bold text-lightning-DEFAULT">
                Generic Creator Tools
              </h3>
            </div>
            
            <ul className="space-y-4">
              {[
                'Chase likes, not sales',
                'Use generic templates that don\'t sell',
                'Offer weak or no store integration',
                'Post whenever, hoping for the best',
                'Ignore competitor product tactics',
              ].map((item, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <XCircle className="h-5 w-5 text-red-400/80 mr-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <p className="text-lightning-dim/90 group-hover:text-lightning-DEFAULT transition-colors">
                    {item}
                  </p>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Solution Side */}
          <motion.div 
            className="p-8 rounded-xl border border-emerald-900/30 bg-storm-light/5 backdrop-blur-sm shadow-lg"
            whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.1)' }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-6">
              <CheckCircle className="h-8 w-8 text-emerald-400/90 mr-3" />
              <h3 className="text-xl md:text-2xl font-bold text-lightning-DEFAULT">
                SocialSchedule for Sellers
              </h3>
            </div>
            
            <ul className="space-y-4">
              {[
                'Pinpoint buyer behavior and sell',
                'Reflect your brand voice automatically',
                'Sync orders for dollar-level ROI',
                'Fire posts at proven buying windows',
                'Steal winning tactics from rivals instantly',
              ].map((item, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CheckCircle className="h-5 w-5 text-emerald-400/80 mr-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <p className="text-lightning-dim/90 group-hover:text-lightning-DEFAULT transition-colors">
                    {item}
                  </p>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
