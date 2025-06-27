'use client';

import { motion } from 'framer-motion';
import { Check, Shield, Zap, Award, ThumbsUp, Star } from 'lucide-react';

const badges = [
  { 
    icon: <Shield className="w-5 h-5 text-dominator-blue" />, 
    text: 'Secure Payment',
    subtext: '256-bit SSL encryption'
  },
  { 
    icon: <Zap className="w-5 h-5 text-dominator-magenta" />, 
    text: 'Lightning Fast',
    subtext: '99.9% Uptime'
  },
  { 
    icon: <Award className="w-5 h-5 text-dominator-blue" />, 
    text: 'Award Winning',
    subtext: 'Best AI Tool 2024'
  },
  { 
    icon: <ThumbsUp className="w-5 h-5 text-dominator-magenta" />, 
    text: '30-Day Guarantee',
    subtext: 'No questions asked'
  },
  { 
    icon: <Star className="w-5 h-5 text-yellow-400" />, 
    text: '4.9/5 Rating',
    subtext: 'From 2,314+ reviews'
  },
];

export function TrustBadges() {
  return (
    <div className="w-full py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-dominator-dark/50 border border-dominator-dark/30 hover:border-dominator-magenta/20 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            >
              <div className="w-12 h-12 rounded-full bg-dominator-dark/80 flex items-center justify-center mb-2">
                {badge.icon}
              </div>
              <h4 className="font-bold text-sm md:text-base">{badge.text}</h4>
              <p className="text-xs text-dominator-light/60">{badge.subtext}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
