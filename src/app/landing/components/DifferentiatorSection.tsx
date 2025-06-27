"use client";

import { motion } from "framer-motion";
import { CheckCircle, DollarSign } from "lucide-react";

export default function DifferentiatorSection() {
  // Value breakdown of all offerings
  const offerings = [
    {
      name: "Accelerate - Content Optimization Engine",
      value: 1200,
      highlight: "24/7 AI optimization & competitor analysis"
    },
    {
      name: "Blitz - Precise Automated Posting",
      value: 1400,
      highlight: "Targeted audience algorithm & automated scheduling"
    },
    {
      name: "Cycle - Viral Cycle of Improvements",
      value: 1100,
      highlight: "Continuous analytics & performance optimization"
    },
    {
      name: "Hook Generator Bonus",
      value: 499,
      highlight: "Niche-specific scroll-stopping hooks"
    },
    {
      name: "Template Generator Bonus",
      value: 399,
      highlight: "High-converting content templates"
    },
    {
      name: "Personalized AI Model (Limited Time)",
      value: 799,
      highlight: "Brand voice learning & unique content creation"
    }
  ];

  const totalValue = offerings.reduce((sum, offering) => sum + offering.value, 0);

  return (
    <section className="relative py-16 md:py-24 bg-black text-white overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(90,252,192,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(90,252,192,0.03)_1px,transparent_1px)] [background-size:60px_60px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-[#0A0A0A] opacity-95"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl md:text-4xl font-bold mb-3 text-[#8D5AFF]">
            What You'd Pay Separately
          </h3>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Our end-to-end solution covers the complete content lifecycle
          </p>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {offerings.map((offering, i) => (
            <motion.div 
              key={offering.name}
              className="bg-[#18181b]/50 backdrop-blur-sm border border-[#8D5AFF]/10 rounded-lg p-5 flex items-start"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <div className="bg-[#8D5AFF]/10 p-2 rounded-full mr-4">
                <CheckCircle className="h-6 w-6 text-[#8D5AFF]" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-semibold text-white">{offering.name}</h4>
                  <div className="bg-[#5afcc0]/10 px-2 py-0.5 rounded-full text-[#5afcc0] font-bold text-xs whitespace-nowrap mt-1">
                    ${offering.value} value
                  </div>
                </div>
                <p className="text-sm text-neutral-300">{offering.highlight}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div
          className="bg-gradient-to-r from-[#18181b] to-[#27272a] border border-[#8D5AFF]/20 rounded-xl p-8 text-center shadow-xl relative overflow-hidden mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="absolute inset-0 bg-[#8D5AFF]/5 blur-xl rounded-full -z-10"></div>
          
          <h3 className="text-3xl font-bold mb-3 text-white">
            ${totalValue.toLocaleString()} <span className="text-xl">Total Value</span>
          </h3>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px bg-[#8D5AFF]/20 flex-1 max-w-[100px]"></div>
            <p className="text-2xl font-bold text-[#5afcc0]">
              Yours for only $600 <span className="text-sm font-normal">annually</span>
            </p>
            <div className="h-px bg-[#8D5AFF]/20 flex-1 max-w-[100px]"></div>
          </div>
          
          <p className="text-neutral-300 text-sm">
            That's less than ${Math.round(600 / totalValue * 100)}% of the total value!
          </p>
        </motion.div>
      </div>
    </section>
  );
}
