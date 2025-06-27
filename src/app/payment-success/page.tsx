'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/dashboard');

  useEffect(() => {
    // Check for stored redirect path
    const storedRedirect = localStorage.getItem('post_payment_redirect');
    
    if (storedRedirect) {
      setRedirectPath(storedRedirect);
      localStorage.removeItem('post_payment_redirect');
    }

    // Redirect after 3 seconds
    const timer = setTimeout(() => {
      setIsRedirecting(true);
      router.push(redirectPath);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, redirectPath]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-storm-darker to-storm-darkest flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-8 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-white mb-4"
        >
          Payment Successful!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-white/70 mb-6"
        >
          Thank you for your subscription. You're being redirected to your dashboard.
        </motion.p>

        {isRedirecting ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center text-white/60"
          >
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Redirecting...
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/60 text-sm"
          >
            Redirecting in 3 seconds...
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => {
            setIsRedirecting(true);
            router.push(redirectPath);
          }}
          className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          Continue to Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
} 