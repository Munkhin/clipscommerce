'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowRight, Zap } from 'lucide-react';

interface FloatingCTAProps {
  onClick?: () => void;
  initialY?: number;
  showAfterScroll?: number;
}

export function FloatingCTA({ 
  onClick, 
  initialY = 100, 
  showAfterScroll = 300 
}: FloatingCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [remainingSpots, setRemainingSpots] = useState(3);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > showAfterScroll;
      setScrolledPast(scrolled);
      
      // Only show after initial scroll down and then up a bit
      if (window.scrollY > 100 && window.scrollY < document.body.scrollHeight - window.innerHeight - 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Simulate spots being taken (for demo purposes)
    const spotTimer = setInterval(() => {
      setRemainingSpots(prev => Math.max(0, prev - Math.floor(Math.random() * 2)));
    }, 30000); // Every 30 seconds

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(spotTimer);
    };
  }, [showAfterScroll]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3">
          {/* Main CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: initialY }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: hovered ? 1.05 : 1
            }}
            exit={{ opacity: 0, y: initialY }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            className="relative group"
          >
            <button
              onClick={onClick}
              className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-dominator-magenta to-dominator-blue text-black shadow-lg shadow-dominator-magenta/30 hover:shadow-xl hover:shadow-dominator-magenta/50 transition-all duration-300"
              aria-label="Get Started"
            >
              <Zap className={`w-6 h-6 transition-transform ${hovered ? 'scale-110' : 'scale-100'}`} />
            </button>
            
            {/* Floating label */}
            <motion.div 
              className="absolute right-full top-1/2 -translate-y-1/2 mr-4 px-4 py-2 bg-dominator-dark/90 backdrop-blur-sm rounded-lg border border-dominator-magenta/30 shadow-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: hovered ? 1 : 0,
                x: hovered ? 0 : 20,
                transition: { delay: hovered ? 0.2 : 0 }
              }}
            >
              <div className="text-sm font-medium whitespace-nowrap">
                Only {remainingSpots} spots left!
              </div>
              <div className="absolute right-0 top-1/2 -mr-1 w-2 h-2 -translate-y-1/2 rotate-45 bg-dominator-dark/90 border-r border-b border-dominator-magenta/30"></div>
            </motion.div>
            
            {/* Pulsing ring effect */}
            <motion.div 
              className="absolute inset-0 rounded-full bg-dominator-magenta/20"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'loop',
              }}
            />
          </motion.div>
          
          {/* Back to top button - only show when scrolled past initial section */}
          {scrolledPast && (
            <motion.button
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full bg-dominator-dark/80 backdrop-blur-sm border border-dominator-magenta/20 flex items-center justify-center text-dominator-magenta hover:bg-dominator-magenta/10 transition-colors shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              whileHover={{ y: -3 }}
              aria-label="Back to top"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
