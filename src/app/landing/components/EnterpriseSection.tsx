"use client";

import { motion } from "framer-motion";
import { BarChart2, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function EnterpriseSection() {
  return (
    <section className="relative py-16 md:py-24 bg-black text-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <motion.h3
          className="text-2xl md:text-4xl font-bold mb-10 text-white text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Scale <span className="text-[#8D5AFF]">Faster</span> – Solo or Team
        </motion.h3>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <motion.div className="bg-[#18181b] rounded-xl p-8 shadow-xl flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <BarChart2 className="h-10 w-10 text-[#5afcc0] mb-4" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[#5afcc0] mb-2">150%</span>
              <span className="text-lg">boost in organic reach/month</span>
            </div>
          </motion.div>
          <motion.div className="bg-[#18181b] rounded-xl p-8 shadow-xl flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <TrendingUp className="h-10 w-10 text-[#5afcc0] mb-4" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[#5afcc0] mb-2">2 – 5X</span>
              <span className="text-lg">revenue/month</span>
            </div>
          </motion.div>
          <motion.div className="bg-[#18181b] rounded-xl p-8 shadow-xl flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <BarChart2 className="h-10 w-10 text-[#5afcc0] mb-4" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[#5afcc0] mb-2">1000+</span>
              <span className="text-lg">hours saved/year</span>
            </div>
          </motion.div>
        </div>
        
        {/* Team CTA added */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Link href="/landing/team">
            <button className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-lg shadow-[#8D5AFF]/20 transition-all duration-300 inline-flex items-center">
              Part of a team? Check out the team page
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
