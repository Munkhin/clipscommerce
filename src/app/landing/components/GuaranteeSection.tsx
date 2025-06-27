'use client';

import { motion } from 'framer-motion';
import { Shield, Check } from 'lucide-react';

interface GuaranteeSectionProps {
  onGetStarted?: () => void;
}

export default function GuaranteeSection({ onGetStarted }: GuaranteeSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-storm-darkest to-storm-darker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="relative border border-storm-light/10 bg-gradient-to-br from-storm-dark to-storm-darker rounded-2xl p-8 md:p-12 text-center max-w-5xl mx-auto shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 -z-10 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3b82f6,transparent_70%)]" />
          </div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-blitz-blue/10 to-blitz-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-storm-light/10">
            <Shield className="h-12 w-12 text-blitz-blue" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-lightning-DEFAULT mb-6">
            We Pay Your Next Month If Sales Don't Rise
          </h2>
          
          <p className="text-xl text-lightning-dim/80 mb-10 max-w-3xl mx-auto leading-relaxed">
            If you don't see a measurable increase in product sales within 14 days of implementing our system, 
            we'll give you the next month completely free. No questions asked.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {[
              { text: '14-Day Guarantee' },
              { text: 'No Long-Term Contracts' },
              { text: 'Cancel Anytime' }
            ].map((badge, index) => (
              <motion.div 
                key={index}
                className="px-6 py-3 rounded-full border border-storm-light/10 bg-storm-light/5 backdrop-blur-sm group hover:border-blitz-blue/50 transition-all"
                whileHover={{ y: -2, boxShadow: '0 5px 15px -5px rgba(0, 119, 255, 0.1)' }}
              >
                <p className="text-blitz-blue font-medium bg-gradient-to-r from-blitz-blue to-blitz-purple bg-clip-text text-transparent">
                  {badge.text}
                </p>
              </motion.div>
            ))}
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-12 max-w-3xl mx-auto">
            {[
              { text: "No questions asked" },
              { text: "No complicated terms" },
              { text: "Simple, measurable results" },
              { text: "Risk-free trial period" }
            ].map((item, index) => (
              <motion.div 
                key={index}
                className="flex items-center p-4 rounded-xl border border-storm-light/10 bg-storm-light/5 backdrop-blur-sm group hover:border-blitz-blue/50 transition-all"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 + (index * 0.1) }}
                whileHover={{ x: 5 }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blitz-blue/10 to-blitz-purple/10 flex items-center justify-center flex-shrink-0 mr-3 group-hover:shadow-lg group-hover:shadow-blitz-blue/20 transition-all">
                  <Check className="h-4 w-4 text-blitz-blue" />
                </div>
                <span className="text-lightning-dim/90 text-left">{item.text}</span>
              </motion.div>
            ))}
          </div>
          
          {onGetStarted && (
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <motion.button
                onClick={() => window.location.href = '/dashboard'}
                className="relative bg-gradient-to-r from-blitz-blue to-blitz-purple hover:from-blitz-blue/90 hover:to-blitz-purple/90 text-lightning-DEFAULT px-10 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-blitz-blue/20 transition-all duration-300 overflow-hidden group"
                whileHover={{ 
                  scale: 1.03, 
                  boxShadow: '0 10px 25px -5px rgba(0, 119, 255, 0.3)'
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">Get Started Risk-Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blitz-blue/0 via-white/10 to-blitz-purple/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
              <p className="mt-4 text-sm text-lightning-dim/60">
                No long-term contracts. Cancel anytime.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
