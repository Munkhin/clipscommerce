'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Shield, Lock, CreditCard, CheckCircle } from 'lucide-react';

export default function RiskReversalFooter() {
  const [currentYear, setCurrentYear] = useState(2024); // Default fallback year
  
  useEffect(() => {
    // Set the actual year only on client side to prevent hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-black py-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Signals */}
        <motion.div 
          className="flex flex-wrap justify-center gap-8 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {[
            { icon: Shield, text: "10-Day Results Guarantee" },
            { icon: Lock, text: "Enterprise-Grade Security" },
            { icon: CreditCard, text: "Secure Payment Processing" },
            { icon: CheckCircle, text: "Trusted by 10,000+ Creators" },
            { icon: CheckCircle, text: "SOC-2–Compliant Hosting" }
          ].map((item, index) => (
            <div key={index} className="flex items-center">
              <item.icon className="h-5 w-5 text-indigo-400 mr-2" />
              <span className="text-neutral-300 font-medium">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Payment Methods */}
        <motion.div 
          className="flex justify-center mb-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-neutral-900 px-6 py-3 rounded-md border border-neutral-800 flex items-center gap-4">
            <span className="text-sm text-neutral-400 whitespace-nowrap">Secure Payment Methods:</span>
            <div className="flex gap-3 items-center">
              {/* In a real implementation, use actual payment processor logos */}
              <div className="h-8 w-12 bg-neutral-800 rounded-md flex items-center justify-center">
                <span className="text-xs text-neutral-400">Visa</span>
              </div>
              <div className="h-8 w-12 bg-neutral-800 rounded-md flex items-center justify-center">
                <span className="text-xs text-neutral-400">MC</span>
              </div>
              <div className="h-8 w-12 bg-neutral-800 rounded-md flex items-center justify-center">
                <span className="text-xs text-neutral-400">Amex</span>
              </div>
              <div className="h-8 w-12 bg-neutral-800 rounded-md flex items-center justify-center">
                <span className="text-xs text-neutral-400">PayPal</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer Links */}
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {[
            {
              title: "Product",
              links: ["Features", "Pricing", "Testimonials", "How It Works", "FAQ"]
            },
            {
              title: "Resources",
              links: ["Blog", "Guides", "Support Center", "API Documentation", "Webinars"]
            },
            {
              title: "Company",
              links: ["About Us", "Careers", "Press", "Partners", "Contact Us"]
            },
            {
              title: "Legal",
              links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR Compliance", "Security"]
            }
          ].map((section, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + (index * 0.1) }}
            >
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link href="#" className="text-neutral-400 hover:text-indigo-400 transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Copyright */}
        <div className="border-t border-neutral-800 pt-6 flex flex-col md:flex-row justify-between items-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className="text-neutral-500 text-sm">
              © {currentYear} SocialSchedule. All rights reserved.
            </p>
          </motion.div>
          
          <motion.div
            className="flex gap-4 mt-4 md:mt-0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {/* Social Media Links */}
            {["Twitter", "Facebook", "Instagram", "LinkedIn"].map((platform, index) => (
              <Link key={index} href="#" className="text-neutral-500 hover:text-indigo-400 transition-colors">
                {platform}
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
