"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef, useMemo, useState } from "react";
import Link from "next/link";

interface ParticleProps {
  id: number;
  controls: ReturnType<typeof useAnimation>;
  baseDuration: number;
  baseXOffset: number;
}

interface FloatingParticlesProps {
  count: number;
  isInView: boolean;
}

const Particle = ({ id, controls, baseDuration, baseXOffset }: ParticleProps) => {
  // Initialize with deterministic values to prevent hydration mismatch
  const [particleProperties, setParticleProperties] = useState(() => ({
    size: 4, // Default size
    duration: baseDuration,
    delay: 0,
    left: 50, // Default center position
    startY: 100,
    opacity: 0.2,
    color: "#5afcc0",
    xOffset: baseXOffset * 0.5,
  }));

  // Set random values only on client-side after hydration
  useEffect(() => {
    setParticleProperties({
      size: Math.random() * 6 + 2,
      duration: baseDuration * (0.7 + Math.random() * 0.6),
      delay: Math.random() * 2,
      left: Math.random() * 100,
      startY: 100 + Math.random() * 20,
      opacity: Math.random() * 0.3 + 0.1,
      color: Math.random() > 0.5 ? "#5afcc0" : "#ffffff",
      xOffset: baseXOffset * (0.3 + Math.random() * 0.4),
    });
  }, [baseDuration, baseXOffset]);

  const particleStyle: React.CSSProperties = useMemo(() => ({
    width: `${particleProperties.size}px`,
    height: `${particleProperties.size}px`,
    backgroundColor: particleProperties.color,
    left: `${particleProperties.left}%`,
    top: `${particleProperties.startY}%`,
    zIndex: 0,
    position: 'absolute',
    borderRadius: '50%',
    willChange: 'transform, opacity',
    pointerEvents: 'none',
  }), [particleProperties]);
  
  return (
    <motion.div
      style={particleStyle}
      animate={controls}
      custom={{
        duration: particleProperties.duration,
        delay: particleProperties.delay,
        xOffset: particleProperties.xOffset,
        opacity: particleProperties.opacity
      }}
      variants={{
        hidden: {
          y: 0,
          x: 0,
          opacity: 0,
          transition: { 
            duration: 0.5,
            ease: 'easeOut'
          }
        },
        visible: (custom) => ({
          y: -150,
          x: custom.xOffset,
          opacity: [0, custom.opacity, 0],
          transition: {
            duration: custom.duration,
            delay: custom.delay,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.3, 1],
          },
        }),
      }}
    />
  );
};

const FloatingParticles = ({ count = 15, isInView }: FloatingParticlesProps) => {
  const controls = useAnimation();
  const particles = useMemo(() => Array.from({ length: count }), [count]);
  const baseDuration = 6;
  const baseXOffset = 30;
  const isAnimating = useRef(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!isInView) {
      controls.start("hidden");
      isAnimating.current = false;
      return;
    }
    
    if (!isAnimating.current && mounted) {
      isAnimating.current = true;
      
      // Initial animation
      controls.start("visible");
      
      // Continuous animation - only start on client side
      const animateParticles = () => {
        controls.start((i) => ({
          y: -150,
          opacity: [0, 0.2, 0],
          transition: {
            duration: baseDuration * (0.7 + (mounted ? Math.random() * 0.6 : 0.3)), // Use deterministic value until mounted
            ease: [0.16, 1, 0.3, 1],
            repeat: Infinity,
            repeatType: 'loop',
            repeatDelay: 0.5
          },
        }));
      };
      
      const timer = setTimeout(animateParticles, 1500);
      
      return () => {
        clearTimeout(timer);
        isAnimating.current = false;
      };
    }
  }, [isInView, controls, baseDuration, mounted]);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_: unknown, i: number) => (
        <Particle 
          key={`particle-${i}`}
          id={i}
          controls={controls}
          baseDuration={baseDuration}
          baseXOffset={baseXOffset}
        />
      ))}
    </div>
  );
};

export default function ValueStatementSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
  
  return (
    <section 
      ref={ref}
      className="relative py-24 md:py-32 bg-black text-white overflow-hidden"
    >
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 z-0" style={{
        background: 'radial-gradient(circle at center, rgba(10,10,10,0.9) 0%, rgba(0,0,0,0.95) 100%)',
      }} />
      
      {/* Floating particles */}
      <FloatingParticles count={20} isInView={isInView} />
      
      <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 relative z-10 text-center">
        <motion.h2
          className="text-4xl md:text-6xl font-bold mb-6 text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Stop creating content that gets likes.<br />Start creating content that gets <span className="text-[#5afcc0] text-5xl md:text-7xl font-extrabold inline-block px-2">SALES</span>.
        </motion.h2>
        <Link href="/dashboard">
          <button className="mt-8 bg-[#8D5AFF] text-white px-10 py-5 rounded-lg font-bold text-lg shadow-xl shadow-[#8D5AFF]/30 hover:bg-[#8D5AFF]/90 transition-all">
            Get Started
          </button>
        </Link>
      </div>
    </section>
  );
}
