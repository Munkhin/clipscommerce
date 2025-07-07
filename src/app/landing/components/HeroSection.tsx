'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onDemo: () => void;
}

export default function HeroSection({ onGetStarted, onDemo }: HeroSectionProps) {
  return (
    <section className="relative bg-background pt-44 pb-28 md:pt-52 md:pb-36 overflow-hidden">
      {/* Background grid lines */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            backgroundPosition: 'center top 30%'
          }} 
        />
      </div>
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-background to-card" aria-hidden="true" />
      <div className="absolute bottom-20 -right-20 w-[32rem] h-[32rem] bg-primary/25 rounded-full filter blur-[180px]" aria-hidden="true" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main headline with supporting text */}
          <motion.div 
            className="relative mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-accent text-sm uppercase tracking-normal mb-6 font-medium">
              THE ONLY ALL-IN-ONE AI SHORT-FORM MARKETING PLATFORM
            </div>
            <div className="relative pb-6 mb-4">
              <h1 className="whitespace-nowrap text-5xl sm:text-6xl font-bold text-foreground leading-tight tracking-tight gradient-text">
                The future of short-form marketing
              </h1>
              <div className="absolute bottom-0 left-1/2 w-48 h-px bg-gradient-to-r from-transparent via-border to-transparent transform -translate-x-1/2" aria-hidden="true" />
            </div>
          </motion.div>

          {/* CTA buttons with decorative border */}
          <motion.div 
            className="flex flex-col items-center justify-center gap-4 mb-16 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="absolute -inset-4 border-l border-t border-border rounded-tl-lg" aria-hidden="true" />
            <Link href="/sign-up">
              <motion.button
                className="bg-primary-gradient text-primary-foreground px-10 py-5 rounded-lg font-bold text-lg shadow-xl transform transition-all touch-target"
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px -5px hsl(var(--primary) / 0.5)' }}
                whileTap={{ scale: 0.98 }}
                aria-label="Get Started with ClipsCommerce"
              >
                <span className="flex items-center justify-center">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Hero image or screenshot */}
        <motion.div 
          className="mt-20 max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden enhanced-card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="relative h-[400px] md:h-[550px] border border-border rounded-xl overflow-hidden">
            <Image
              src="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png"
              alt="ClipsCommerce dashboard screenshot showing AI-powered short-form marketing tools"
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
