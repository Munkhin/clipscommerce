'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function CountdownTimer({ targetDate }: { targetDate?: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [actualTargetDate, setActualTargetDate] = useState<Date | null>(null);

  // Set target date after hydration to prevent mismatch
  useEffect(() => {
    if (targetDate) {
      setActualTargetDate(targetDate);
    } else {
      // Default to 4 hours from now, but only on client side
      setActualTargetDate(new Date(Date.now() + 4 * 60 * 60 * 1000));
    }
  }, [targetDate]);

  useEffect(() => {
    if (!actualTargetDate) return;

    const timer = setInterval(() => {
      const now = new Date();
      const difference = actualTargetDate.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [actualTargetDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center mx-2">
      <div className="relative w-16 h-16 flex items-center justify-center bg-dominator-dark/80 rounded-lg border border-dominator-magenta/30 shadow-lg">
        <span className="text-2xl font-bold bg-gradient-to-r from-dominator-blue to-dominator-magenta bg-clip-text text-transparent">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="mt-2 text-xs text-dominator-light/60 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <motion.div 
      className="flex justify-center items-center py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <TimeBlock value={timeLeft.hours} label="Hours" />
      <div className="text-2xl font-bold text-dominator-magenta mx-1">:</div>
      <TimeBlock value={timeLeft.minutes} label="Minutes" />
      <div className="text-2xl font-bold text-dominator-magenta mx-1">:</div>
      <TimeBlock value={timeLeft.seconds} label="Seconds" />
    </motion.div>
  );
}
