'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';

export default function PricingPage() {
  const [currentYear, setCurrentYear] = useState(2024);
  const [isAnnual, setIsAnnual] = useState(false);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for individual creators and small accounts",
      price: isAnnual ? 19 : 29,
      originalPrice: isAnnual ? null : null,
      features: [
        "Up to 10 videos per month",
        "Basic AI content analysis",
        "2 social media accounts",
        "Standard templates",
        "Email support",
        "Basic analytics"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional",
      description: "For growing creators and businesses",
      price: isAnnual ? 49 : 79,
      originalPrice: isAnnual ? 79 : null,
      features: [
        "Up to 50 videos per month",
        "Advanced AI optimization",
        "5 social media accounts",
        "Premium templates",
        "Priority support",
        "Advanced analytics",
        "Custom branding",
        "Bulk processing"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      description: "For agencies and large organizations",
      price: isAnnual ? 149 : 199,
      originalPrice: isAnnual ? 199 : null,
      features: [
        "Unlimited videos",
        "White-label solution",
        "Unlimited accounts",
        "Custom integrations",
        "24/7 dedicated support",
        "Custom analytics",
        "Team collaboration",
        "API access",
        "Custom workflows"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="bg-black min-h-screen text-white">
      <Header />
      
      <div className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-black to-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Simple, <span className="text-[#8D5AFF]">Transparent</span> Pricing
              </h1>
              <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
                Choose the perfect plan for your content creation needs. All plans include our 
                core AI features and come with a 14-day free trial.
              </p>
              
              {/* Billing Toggle */}
              <div className="inline-flex items-center bg-[#18181b] rounded-lg p-1 mb-16">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-md transition-all ${
                    !isAnnual 
                      ? 'bg-[#8D5AFF] text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-4 py-2 rounded-md transition-all ${
                    isAnnual 
                      ? 'bg-[#8D5AFF] text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Annual
                  <span className="ml-2 px-2 py-0.5 bg-[#5afcc0] text-black text-xs rounded-full">
                    Save 35%
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  className={`relative bg-[#18181b] rounded-xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 ${
                    plan.popular ? 'ring-2 ring-[#8D5AFF] scale-105' : ''
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-[#8D5AFF] text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-white/70 mb-6">{plan.description}</p>
                    
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-white/60 ml-2">/{isAnnual ? 'year' : 'month'}</span>
                    </div>
                    
                    {plan.originalPrice && (
                      <div className="text-white/40 line-through text-sm">
                        ${plan.originalPrice}/{isAnnual ? 'year' : 'month'}
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-[#5afcc0] mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-white/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.cta === 'Contact Sales' ? '/contact' : '/sign-up'}>
                    <button className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 inline-flex items-center justify-center ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:shadow-lg hover:shadow-[#8D5AFF]/20 text-white'
                        : 'bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white'
                    }`}>
                      {plan.cta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-[#0A0A0A] to-black">
          <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-16">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-white/80">
                Everything you need to know about our pricing and plans.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  question: "Can I change my plan anytime?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
                },
                {
                  question: "What's included in the free trial?",
                  answer: "All plans include a 14-day free trial with full access to all features of your chosen plan."
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked."
                },
                {
                  question: "Is there a setup fee?",
                  answer: "No, there are no setup fees or hidden charges. You only pay for your chosen plan."
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  className="bg-[#18181b] rounded-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                  <p className="text-white/70">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 text-center">
            <motion.div
              className="bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 border border-white/10 rounded-xl p-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are already transforming their content 
                with ClipsCommerce. Start your free trial today.
              </p>
              
              <Link href="/sign-up">
                <button className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:shadow-lg hover:shadow-[#8D5AFF]/20 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 inline-flex items-center">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">© {currentYear} ClipsCommerce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}