'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle } from 'lucide-react';

export default function UrgencyOfferSection() {
  const [mounted, setMounted] = useState(false);

  // Set a target end date for the offer
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14); // Offer ends in 14 days

  const calculateTimeLeft = () => {
    const difference = +endDate - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [remainingSpots, setRemainingSpots] = useState(17);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Simulate spots being taken
    const spotTimer = setInterval(() => {
      setRemainingSpots(prev => (prev > 3 ? prev - 1 : prev));
    }, 3600000); // Decrease every hour

    return () => {
      clearInterval(timer);
      clearInterval(spotTimer);
    };
  }, []);

  if (!mounted) {
    return null; // Or a static placeholder
  }

  return (
    <section className="py-12 bg-black border-y-2 border-indigo-500">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 md:p-8 shadow-lg shadow-indigo-500/20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="md:flex-1">
              <div className="flex items-center mb-3">
                <AlertTriangle className="text-indigo-400 mr-2 h-6 w-6" />
                <h3 className="font-bold text-2xl text-white">The Pro Power-Up Bundle Is Ending Soon</h3>
              </div>
              <p className="text-neutral-300 mb-4 text-lg">
                Founder pricing disappears with our next feature rollout—lock in your rate and get <span className="font-bold text-white">lifetime access to bonuses worth $1,297</span> today.
              </p>

              <div className="flex items-center mb-2">
                <Users className="text-indigo-400 mr-2 h-5 w-5" />
                <span className="font-medium text-neutral-200">Only <span className="text-indigo-400 font-bold animate-pulse">{remainingSpots} spots</span> left at this price</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                We limit new users to ensure quality support and onboarding for all customers.
              </p>
            </div>

            <div className="bg-black border border-neutral-700 p-4 rounded-md w-full md:w-auto">
              <div className="flex items-center mb-2">
                <Clock className="text-indigo-400 mr-2 h-5 w-5" />
                <span className="font-medium text-neutral-300">Special offer ends in:</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {(Object.keys(timeLeft) as Array<keyof typeof timeLeft>).map((interval) => (
                  <div key={interval} className="bg-neutral-800 px-3 py-2 rounded-md">
                    <div className="text-2xl font-bold text-white">
                      {String(timeLeft[interval]).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-neutral-500 capitalize">{interval}</div>
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
