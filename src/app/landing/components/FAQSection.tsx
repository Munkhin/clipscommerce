'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimate, stagger } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection() {
  const [scope, animate] = useAnimate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "How does SocialSchedule increase my sales?",
      answer: "SocialSchedule uses AI to optimize your content for maximum engagement and conversions. Our platform analyzes your products, target audience, and competitors to create and schedule content that drives traffic directly to your product listings. The Viral Blitz Cycle ensures your best-performing content gets amplified across platforms, resulting in more traffic and sales."
    },
    {
      question: "How long until I see results?",
      answer: "Most e-commerce sellers see initial sales increases within the first 14 days. Our comprehensive approach allows for quick implementation and fast results. That's why we offer our 14-day guarantee - if you don't see measurable sales increases in that time period, your next month is free."
    },
    {
      question: "Do I need to create my own content?",
      answer: "No! SocialSchedule generates optimized content for you based on your products and brand voice. Our AI analyzes your best-performing content and creates variations that maintain your unique selling proposition while maximizing engagement. You can review and approve all content before it goes live."
    },
    {
      question: "Which platforms does SocialSchedule support?",
      answer: "We support all major social media platforms including TikTok, Instagram, YouTube Shorts, Facebook, Pinterest, and LinkedIn. Our system specializes in short-form video optimization but works equally well with images and text content across all platforms."
    },
    {
      question: "Can I integrate my e-commerce platform?",
      answer: "Yes! SocialSchedule integrates directly with Shopify, WooCommerce, Amazon, Etsy, and most major e-commerce platforms. This allows for direct attribution tracking, product syncing, and automatic updating of inventory status in your promotional content."
    },
    {
      question: "What makes SocialSchedule different from other scheduling tools?",
      answer: "Unlike generic scheduling tools, SocialSchedule is specifically designed for e-commerce sellers with direct revenue generation in mind. Our Viral Blitz Cycle, competitive intelligence, and sales-focused content optimization are all built specifically to drive product sales, not just engagement."
    }
  ];

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  useEffect(() => {
    if (scope.current) {
      animate(
        'div',
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(0.1), duration: 0.5 }
      );
    }
  }, [scope, animate]);

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-[#0A0A0A] to-[#0F1014]" id="faq">
      <div className="container mx-auto px-6 sm:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.span 
            className="inline-block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500] uppercase tracking-wider mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Questions & Answers
          </motion.span>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-extrabold text-[#8B5CF6] mb-8 leading-[1.1] tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Frequently Asked Questions
          </motion.h2>
          
          <motion.p 
            className="text-xl md:text-2xl text-[#E5E7EB] max-w-2xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Everything you need to know about turning your content into sales
          </motion.p>
        </div>
        
        <div ref={scope} className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="w-full border-2 border-storm-light/15 rounded-xl overflow-hidden bg-gradient-to-br from-[#1A1A1A] to-[#0F1014] hover:border-[#1E90FF]/40 transition-all duration-300 group shadow-lg hover:shadow-xl hover:shadow-[#1E90FF]/10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              whileHover={{ 
                y: -2,
                boxShadow: '0 10px 25px -5px rgba(0, 119, 255, 0.1)'
              }}
            >
              <button
                className="relative flex items-center justify-between w-full p-6 text-left group-hover:bg-storm-darker/30 transition-colors duration-200"
                onClick={() => toggleQuestion(index)}
              >
                <h3 className="text-lg md:text-xl font-medium text-white pr-10 leading-relaxed">
                  {faq.question}
                </h3>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#1E90FF]/15 to-[#9370DB]/15 flex items-center justify-center transition-all duration-300 ${openIndex === index ? 'bg-[#1E90FF]/25' : ''} group-hover:bg-[#1E90FF]/20`}>
                  <ChevronDown 
                    className={`w-4 h-4 text-[#1E90FF] transition-all duration-300 ease-in-out ${openIndex === index ? 'transform rotate-180' : ''}`} 
                  />
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: -10 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -10 }}
                    transition={{ 
                      duration: 0.4, 
                      ease: [0.4, 0.0, 0.2, 1],
                      opacity: { duration: 0.3 }
                    }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-8 -mt-2 text-[#E5E7EB]/90 border-t border-storm-light/10">
                      <div className="border-l-2 border-[#1E90FF]/50 pl-5 py-3 mt-3">
                        <p className="text-base leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
