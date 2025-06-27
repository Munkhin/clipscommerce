'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoginPromptPopupProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export function LoginPromptPopup({ isOpen, onClose, feature }: LoginPromptPopupProps) {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/auth/sign-in?redirect=/dashboard');
  };

  const handleSignUp = () => {
    router.push('/auth/sign-up?redirect=/dashboard');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-gradient-to-br from-background to-card rounded-2xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close popup"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-[#8D5AFF]/20 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-[#8D5AFF]" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Sign In to Test Features
                </h2>
                <p className="text-muted-foreground">
                  Create an account or sign in to unlock personalized analytics and AI-powered tools.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogin}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#8D5AFF] text-white rounded-lg font-medium hover:bg-[#8D5AFF]/90 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                <button
                  onClick={handleSignUp}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-foreground rounded-lg font-medium hover:bg-white/5 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started Free
                </button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Try all features once for free after signing up
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 