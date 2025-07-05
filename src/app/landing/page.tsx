'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import NavigationBar from '@/app/landing/components/NavigationBar';
import HeroSection from '@/app/landing/components/HeroSection';
import ValueStatementSection from '@/app/landing/components/ValueStatementSection';
import FeaturesSection from '@/app/landing/components/FeaturesSection';
import BonusesSection from '@/app/landing/components/BonusesSection';
import EnterpriseSection from '@/app/landing/components/EnterpriseSection';
import DifferentiatorSection from '@/app/landing/components/DifferentiatorSection';
import FinalCTASection from '@/app/landing/components/FinalCTASection';
import ProblemSolutionSection from '@/app/landing/components/ProblemSolutionSection';
import ResultsSection from '@/app/landing/components/ResultsSection';
import TestimonialsSection from '@/app/landing/components/TestimonialsSection';
import Footer from '@/app/landing/components/Footer';
import UrgencyOfferSection from '@/app/landing/components/UrgencyOfferSection';

export default function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/sign-up');
  };

  const handleDemo = () => {
    // Scroll to the features section or open a demo modal
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-black text-white relative">
      {/* Structured Data - Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "ClipsCommerce",
            "url": "https://clipscommerce.com",
            "logo": "https://clipscommerce.com/images/logo.png",
            "description": "AI-powered short-form content creation platform for e-commerce sellers",
            "sameAs": [
              "https://twitter.com/clipscommerce",
              "https://linkedin.com/company/clipscommerce"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+1-555-012-3456",
              "contactType": "Customer Service",
              "email": "hello@clipscommerce.com"
            },
            "foundingDate": "2024",
            "founders": [
              {
                "@type": "Person",
                "name": "ClipsCommerce Team"
              }
            ],
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "US"
            }
          })
        }}
      />
      
      {/* Enhanced Grid Background */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:60px_60px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-[#0A0A0A] opacity-90"></div>
      </div>
      <div className="relative z-10">
        <NavigationBar />
      <main className="bg-gradient-to-b from-black to-[#0A0A0A] min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <HeroSection onGetStarted={handleGetStarted} onDemo={handleDemo} />
        </motion.div>
        
        <UrgencyOfferSection />

        {/* Section Divider */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16">
          <div className="h-px bg-gradient-to-r from-transparent via-storm-light/15 to-transparent my-12 md:my-16"></div>
        </div>
        
        {/* New Landing Sections */}
        <ValueStatementSection />
        <FeaturesSection onGetStarted={handleGetStarted} />
        <BonusesSection />
        <EnterpriseSection />
        <DifferentiatorSection />
        <FinalCTASection onGetStarted={handleGetStarted} />
      </main>
      
      <motion.footer
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <Footer />
      </motion.footer>
      </div>
    </div>
  );
}
