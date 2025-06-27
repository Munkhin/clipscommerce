'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowRight } from 'lucide-react';

export function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleMouseOut = (e: MouseEvent) => {
      // Only trigger if the mouse leaves through the top of the page
      if (e.clientY < 50) {
        const hasSeenPopup = sessionStorage.getItem('exitIntentShown');
        if (!hasSeenPopup) {
          setIsOpen(true);
          sessionStorage.setItem('exitIntentShown', 'true');
        }
      }
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => document.removeEventListener('mouseout', handleMouseOut);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Email submitted:', email);
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Close popup after success
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 2000);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-gradient-to-br from-dominator-dark to-dominator-black rounded-2xl p-8 max-w-md w-full border border-dominator-magenta/30 shadow-2xl overflow-hidden"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-dominator-light/50 hover:text-white transition-colors"
              aria-label="Close popup"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-dominator-magenta/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-dominator-magenta" />
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Wait! Don't Go Empty Handed</h3>
              <p className="text-dominator-light/80 mb-6">
                Get our <span className="font-bold text-dominator-magenta">FREE 100 Viral Hook Templates</span> when you sign up today.
              </p>
              
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your best email"
                      className="w-full px-5 py-3 rounded-lg bg-dominator-dark/50 border border-dominator-dark/50 focus:border-dominator-magenta/50 focus:ring-2 focus:ring-dominator-magenta/20 text-white placeholder-dominator-light/50 outline-none transition-all"
                      required
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <ArrowRight className="w-5 h-5 text-dominator-magenta" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-dominator-magenta to-dominator-blue text-black font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      'Get My Free Templates'
                    )}
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Check Your Inbox!</h4>
                  <p className="text-dominator-light/80">Your free templates are on their way to {email}</p>
                </motion.div>
              )}
              
              <p className="text-xs text-dominator-light/50 mt-4">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-dominator-blue via-dominator-magenta to-dominator-blue animate-pulse"></div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
