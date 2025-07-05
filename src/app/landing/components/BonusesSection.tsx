"use client";

import { motion } from "framer-motion";
import { Video, FileText, Users, Clock } from "lucide-react";

export default function BonusesSection() {
  const bonuses = [
    {
      icon: Video,
      title: "The Viral E-commerce Playbook",
      description: "A step-by-step video course showing how to use the platform to generate sales.",
      value: 499,
      highlight: false
    },
    {
      icon: FileText,
      title: "Top 100 Viral Video Templates for 2025",
      description: "A library of proven, fill-in-the-blank video scripts that convert.",
      value: 299,
      highlight: false
    },
    {
      icon: Users,
      title: "Private 'Scale Secrets' Community Access",
      description: "Exclusive access to a private group with experts and other successful sellers.",
      value: 500,
      highlight: true,
      limitedTime: true
    }
  ];
  return (
    <section className="relative py-16 md:py-24 bg-black text-white overflow-hidden">
      {/* Add animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black opacity-90"></div>
      
      <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl md:text-4xl font-bold mb-3 text-[#5afcc0]">
            Get Lifetime Access to Bonuses Worth $1,298
          </h3>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Included for free when you sign up for the Pro Power-Up Bundle today.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {bonuses.map((bonus, i) => (
            <motion.div
              key={bonus.title}
              className={`${bonus.highlight ? 'bg-gradient-to-br from-[#18181b] to-[#27272a] border border-[#5afcc0]/20' : 'bg-[#18181b]'} 
                rounded-xl p-8 flex flex-col items-center shadow-xl relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              {/* Add glow effect for highlighted items */}
              {bonus.highlight && (
                <div className="absolute inset-0 bg-[#5afcc0]/5 blur-xl rounded-full -z-10"></div>
              )}
              
              {/* Limited time tag */}
              {bonus.limitedTime && (
                <div className="absolute top-3 right-3 bg-[#8D5AFF] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <Clock className="h-3 w-3" />
                  <span>LIMITED TIME</span>
                </div>
              )}
              
              <div className={`${bonus.highlight ? 'bg-[#5afcc0]/10' : 'bg-[#5afcc0]/5'} p-3 rounded-full mb-4`}>
                <bonus.icon className="h-8 w-8 text-[#5afcc0]" />
              </div>
              
              <div className="text-center">
                <h4 className="font-bold text-xl mb-1 text-white">{bonus.title}</h4>
                <p className="text-neutral-300 text-center text-sm leading-relaxed">{bonus.description}</p>
              </div>
              
              {/* Add subtle indicator for premium content */}
              <div className="mt-4 bg-[#5afcc0]/10 px-3 py-1 rounded-full text-xs font-medium text-[#5afcc0]">
                  ${bonus.value} Value
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
