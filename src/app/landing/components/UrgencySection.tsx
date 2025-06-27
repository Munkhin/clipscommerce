'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle } from 'lucide-react';

export default function UrgencySection() {
  const [mounted, setMounted] = useState(false);
  
  // For the countdown timer
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  // Simulated remaining spots
  const [remainingSpots, setRemainingSpots] = useState(17);

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Countdown timer effect - only start after mounting
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted]);

  return (
    <section className="py-12 bg-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="bg-neutral-900 border border-neutral-800 rounded-md p-6 md:p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="md:flex-1">
              <div className="flex items-center mb-3">
                <AlertTriangle className="text-indigo-400 mr-2 h-5 w-5" />
                <h3 className="font-bold text-xl text-white">Early-Bird Pricing Ends Soon</h3>
              </div>
              <p className="text-neutral-400 mb-4">
                Founder pricing disappears with our next AI rollout—lock in your rate today.
              </p>
              
              <div className="flex items-center mb-2">
                <Users className="text-indigo-400 mr-2 h-5 w-5" />
                <span className="font-medium text-neutral-300">Only <span className="text-indigo-400 font-bold">{remainingSpots} spots</span> left at current pricing</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                We limit new users to ensure quality support for all customers
              </p>
            </div>
            
            <div className="bg-black border border-neutral-800 p-4 rounded-md w-full md:w-auto">
              <div className="flex items-center mb-2">
                <Clock className="text-indigo-400 mr-2 h-5 w-5" />
                <span className="font-medium text-neutral-300">Special pricing ends in:</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { value: timeLeft.days, label: 'Days' },
                  { value: timeLeft.hours, label: 'Hours' },
                  { value: timeLeft.minutes, label: 'Mins' },
                  { value: timeLeft.seconds, label: 'Secs' }
                ].map((item, index) => (
                  <div key={index} className="bg-neutral-800 px-3 py-2 rounded-md">
                    <div className="text-2xl font-bold text-white">
                      {item.value < 10 ? `0${item.value}` : item.value}
                    </div>
                    <div className="text-xs text-neutral-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
