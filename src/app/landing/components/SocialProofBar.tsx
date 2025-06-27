'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SocialProofBar() {
  // Logos for trusted brands (e-commerce platforms)
  const brands = [
    'Shopify', 
    'WooCommerce', 
    'BigCommerce', 
    'Etsy', 
    'Amazon'
  ];
  
  // Key stats focused on seller results
  const stats = [
    { value: '$3.2M+', label: 'Revenue Driven' },
    { value: '12K+', label: 'Active Sellers' },
    { value: '58%', label: 'Avg. Checkout Conversion Lift' }
  ];
  
  return (
    <section className="bg-storm-dark/50 backdrop-blur-sm border-y border-storm-light/10 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="flex flex-col md:flex-row items-center justify-between gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Trusted by e-commerce sellers */}
          <div className="w-full md:w-auto">
            <p className="text-lightning-dim/60 text-xs font-medium uppercase tracking-wider mb-4 text-center md:text-left">TRUSTED BY TOP E-COMMERCE SELLERS ON</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 items-center">
              {brands.map((brand, index) => (
                <div key={index} className="h-8 flex items-center">
                  <div className="bg-storm-light/5 backdrop-blur-sm text-lightning-dim/90 font-medium px-4 py-1.5 rounded-md border border-storm-light/10 hover:border-storm-light/20 transition-all duration-300">
                    {brand}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center px-4">
                <div className="text-2xl font-bold bg-gradient-to-r from-blitz-blue to-blitz-purple bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-lightning-dim/80 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
