'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [
  {
    id: 1,
    name: 'Sarah K.',
    handle: '@sarahcreates',
    role: 'Content Creator',
    image: '/avatars/creator1.jpg',
    content: 'Went from 5K to 250K followers in 6 months using SocialSchedule. The AI timing is like having a cheat code for the algorithm!',
    rating: 5
  },
  {
    id: 2,
    name: 'Mike R.',
    handle: '@mikethegrowthguy',
    role: 'Marketing Director',
    image: '/avatars/creator2.jpg',
    content: 'Our engagement rates tripled after implementing SocialSchedule. The AI optimization is next-level.',
    rating: 5
  },
  {
    id: 3,
    name: 'Aisha B.',
    handle: '@aishasocial',
    role: 'Social Media Manager',
    image: '/avatars/creator3.jpg',
    content: 'The time saved on content planning and scheduling is insane. I manage 3x more accounts with half the effort.',
    rating: 5
  },
  {
    id: 4,
    name: 'David L.',
    handle: '@davidleads',
    role: 'CEO, Growth Agency',
    image: '/avatars/creator4.jpg',
    content: 'Our clients are seeing 2-3x more reach and engagement. This tool pays for itself in the first week.',
    rating: 5
  }
];

export function SocialProofCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 8000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const currentTestimonial = testimonials[currentIndex];

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-dominator-light/20'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto h-64">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 p-8 bg-dominator-dark/70 rounded-2xl border border-dominator-dark/30 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dominator-magenta/50">
                <div className="w-full h-full bg-dominator-dark/50 flex items-center justify-center text-2xl">
                  {currentTestimonial.name.charAt(0)}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-dominator-magenta text-white rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-lg">{currentTestimonial.name}</h4>
              <p className="text-dominator-light/80 text-sm">
                {currentTestimonial.handle} • {currentTestimonial.role}
              </p>
              <div className="flex mt-1">
                {renderStars(currentTestimonial.rating)}
              </div>
            </div>
          </div>
          <p className="text-lg italic">"{currentTestimonial.content}"</p>
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > currentIndex ? 1 : -1);
                  setCurrentIndex(i);
                }}
                className={`w-3 h-3 rounded-full transition-all ${i === currentIndex ? 'bg-dominator-magenta w-8' : 'bg-dominator-light/30'}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
