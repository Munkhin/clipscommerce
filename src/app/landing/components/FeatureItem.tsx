'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface FeatureItemProps {
  feature: {
    number: number;
    title: string;
    subtitle: string;
    description: string;
    highlights: string[];
    valueIndicator: string;
  };
  isReversed: boolean;
  index: number;
}

export default function FeatureItem({ feature, isReversed, index }: FeatureItemProps) {
  return (
    <motion.div
      id={feature.title.toLowerCase()}
      className="flex flex-col md:flex-row items-center gap-20"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: 0.1 * index }}
      style={{ flexDirection: isReversed ? 'row-reverse' : 'row' }}
    >
      {/* Feature Content */}
      <div className="flex-1 max-w-md">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] text-white font-bold mb-5">
          {feature.number}
        </div>
        <h3 className="text-3xl font-bold mb-3 text-white">{feature.title}</h3>
        <p className="text-lg text-[#a855f7] font-semibold mb-4">{feature.subtitle}</p>
        <p className="text-base text-white mb-6 leading-relaxed">
          {feature.description}
        </p>
        
        <ul className="space-y-2 mb-6">
          {feature.highlights.map((highlight, i) => (
            <li key={i} className="flex items-start">
              <Check className="h-5 w-5 text-[#10b981] mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-white">{highlight}</span>
            </li>
          ))}
        </ul>
        
        <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-full text-sm font-semibold">
          {feature.valueIndicator}
        </div>
      </div>
      
      {/* Demo Area - Removed DashboardMockup */}
      <div className="flex-1">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a855f7] to-transparent"></div>
          <div className="text-center py-12 text-white/60">
            <p>Feature Demo</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
