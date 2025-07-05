'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, stagger, useAnimate } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Check, Star } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onDemo: () => void;
}

export default function HeroSection({ onGetStarted, onDemo }: HeroSectionProps) {
  return (
    <section className="relative bg-black pt-44 pb-28 md:pt-52 md:pb-36 overflow-hidden">
      {/* Background grid lines */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            backgroundPosition: 'center top 30%'
          }} 
        />
      </div>
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-black to-[#0A0A0A]" aria-hidden="true" />
      <div className="absolute bottom-20 -right-20 w-[32rem] h-[32rem] bg-blitz-purple/25 rounded-full filter blur-[180px]" aria-hidden="true" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main headline with supporting text */}
          <motion.div 
            className="relative mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-[#5afcc0] text-sm uppercase tracking-normal mb-6 font-medium">
              THE ONLY ALL-IN-ONE AI SHORT-FORM MARKETING PLATFORM
            </div>
            <div className="relative pb-6 mb-4">
              <h1 className="whitespace-nowrap text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight">
                The future of short-form marketing
              </h1>
              <div className="absolute bottom-0 left-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-1/2" aria-hidden="true" />
            </div>
            <div className="relative">
              <p className="text-xl text-[#E5E7EB] max-w-3xl mx-auto font-light tracking-wide mb-2">
                From Inspiration to Optimization — All in One Platform
              </p>
              <div className="absolute -bottom-2 left-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent transform -translate-x-1/2" aria-hidden="true" />
            </div>
          </motion.div>

          {/* CTA buttons with decorative border */}
          <motion.div 
            className="flex flex-col items-center justify-center gap-4 mb-16 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="absolute -inset-4 border-l border-t border-white/10 rounded-tl-lg" aria-hidden="true" />
            <Link href="/sign-up" passHref>
              <motion.button
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-10 py-5 rounded-lg font-bold text-lg shadow-xl shadow-purple-500/30 transform transition-all"
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px -5px rgba(141, 90, 255, 0.5)' }}
                whileTap={{ scale: 0.98 }}
                aria-label="Get the Pro Power-Up Bundle"
              >
                <span className="flex items-center justify-center">
                  Get The Pro Power-Up Bundle
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              </motion.button>
            </Link>
            <Link href="#pricing" passHref>
              <a className="text-sm text-neutral-400 hover:text-white underline transition-colors">
                No thanks, I'll pass on the free bonuses and pay the same price later.
              </a>
            </Link>
          </motion.div>

          {/* Key differentiators bullets */}
          <motion.div 
            className="flex flex-col md:flex-row justify-center gap-8 md:gap-14 text-left max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              'AI creates content that converts browsers into buyers',
              'Post at perfect times for maximum revenue impact',
              'Outperform competitors with data-driven content strategy'
            ].map((benefit, index) => (
              <motion.div 
                key={index} 
                className="flex items-start"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + (index * 0.15) }}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="rounded-full p-1 bg-[#28A745]/15">
                    <Check className="h-5 w-5 text-[#28A745]" />
                  </div>
                </div>
                <p className="ml-3 text-[#E5E7EB] font-medium">{benefit}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Hero image or screenshot */}
        <motion.div 
          className="mt-20 max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-storm-light/20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="relative h-[400px] md:h-[550px] border border-storm-light/20 rounded-xl overflow-hidden">
            <Image
              src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png"
              alt="ClipsCommerce dashboard screenshot"
              fill
              style={{ objectFit: 'cover' }}
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
