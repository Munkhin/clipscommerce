'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubscriptionPromptPopupProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  autoRedirect?: boolean;
}

export function SubscriptionPromptPopup({ 
  isOpen, 
  onClose, 
  featureName = 'this feature',
  autoRedirect = false 
}: SubscriptionPromptPopupProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(autoRedirect ? 3 : 0);

  useEffect(() => {
    if (autoRedirect && isOpen && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoRedirect && isOpen && countdown === 0) {
      router.push('/dashboard/subscription');
    }
  }, [autoRedirect, isOpen, countdown, router]);

  const handleSubscribe = () => {
    router.push('/dashboard/subscription');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-gradient-to-br from-background to-card rounded-2xl p-8 max-w-md w-full border border-[#8D5AFF]/30 shadow-2xl"
          >
            {!autoRedirect && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close popup"
              >
                <X className="w-6 h-6" />
              </button>
            )}
            
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-[#8D5AFF]/20 rounded-full flex items-center justify-center">
                <Crown className="w-8 h-8 text-[#8D5AFF]" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Upgrade to Continue
                </h2>
                <p className="text-muted-foreground">
                  You've reached your free usage limit for {featureName}. Upgrade to unlock unlimited access to all features.
                </p>
              </div>
              
              <div className="bg-[#8D5AFF]/10 rounded-lg p-4 border border-[#8D5AFF]/20">
                <div className="flex items-center justify-center gap-2 text-[#8D5AFF] font-medium">
                  <Zap className="w-4 h-4" />
                  <span>Unlimited usage with Pro plan</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubscribe}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#8D5AFF] text-white rounded-lg font-medium hover:bg-[#8D5AFF]/90 transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade Now
                  {autoRedirect && countdown > 0 && (
                    <span className="ml-2 text-sm">({countdown}s)</span>
                  )}
                </button>
                {!autoRedirect && (
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-white/20 text-foreground rounded-lg font-medium hover:bg-white/5 transition-colors"
                  >
                    Maybe Later
                  </button>
                )}
              </div>
              
              {autoRedirect && (
                <p className="text-xs text-muted-foreground">
                  Redirecting to subscription page in {countdown} seconds...
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 