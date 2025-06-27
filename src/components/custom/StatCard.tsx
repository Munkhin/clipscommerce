'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: ReactNode;
  value: string | number | ReactNode;
  label: string;
  highlight?: boolean;
}

export function StatCard({ icon, value, label, highlight = false }: StatCardProps) {
  return (
    <motion.div
      className={`p-6 rounded-xl backdrop-blur-sm border ${
        highlight 
          ? 'bg-gradient-to-br from-dominator-magenta/10 to-dominator-blue/10 border-dominator-magenta/30 shadow-lg shadow-dominator-magenta/10'
          : 'bg-dominator-dark/30 border-dominator-dark/30'
      }`}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${
          highlight 
            ? 'bg-gradient-to-br from-dominator-magenta to-dominator-blue text-white'
            : 'bg-dominator-dark/50 text-dominator-magenta'
        }`}>
          {icon}
        </div>
        <span className={`text-2xl font-bold ${
          highlight ? 'bg-gradient-to-r from-dominator-magenta to-dominator-blue bg-clip-text text-transparent' : 'text-white'
        }`}>
          {value}
        </span>
      </div>
      <p className="text-sm text-dominator-light/70">{label}</p>
    </motion.div>
  );
}
