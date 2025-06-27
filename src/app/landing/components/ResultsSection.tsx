'use client';

import { motion } from 'framer-motion';

export default function ResultsSection() {
  const stats = [
    { value: '$3.2M+', label: 'Revenue Attributed' },
    { value: '58%', label: 'Avg. Conversion Lift' },
    { value: '72h', label: 'Time to First Checkout' },
    { value: '12K+', label: 'Active Sellers' }
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-storm-dark to-storm-darker border-y border-storm-light/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-lightning-DEFAULT mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Real Sales Results for E-Commerce Sellers
          </motion.h2>
          
          <motion.p 
            className="text-xl text-lightning-dim/80 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Our platform is driving actual product sales, not just views and likes
          </motion.p>
        </div>

        <div className="relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 -z-10 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3b82f6,transparent_70%)]" />
          </div>
          
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={index} 
                className="group p-6 rounded-xl border border-storm-light/10 bg-storm-light/5 backdrop-blur-sm hover:border-blitz-blue/50 transition-all duration-300 shadow-lg hover:shadow-blitz-blue/10"
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 119, 255, 0.1)' }}
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blitz-blue to-blitz-purple bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-lightning-dim/80 font-medium group-hover:text-lightning-DEFAULT transition-colors">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div 
          className="mt-16 text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-lg text-lightning-dim/80">
            <span className="font-semibold text-lightning-DEFAULT">These aren't just vanity metrics.</span> Our platform focuses exclusively on revenue-generating actions and sales conversion.
          </p>
          <p className="text-lg text-lightning-dim/80 mt-4">
            Why settle for likes when you could be generating actual income?
          </p>
        </motion.div>
      </div>
    </section>
  );
}
