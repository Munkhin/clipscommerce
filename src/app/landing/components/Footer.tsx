'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(2024); // Default fallback year
  
  useEffect(() => {
    // Set the actual year only on client side to prevent hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Testimonials', href: '#testimonials' },
        { name: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'E-commerce Guide', href: '#' },
        { name: 'Blog', href: '#' },
        { name: 'Case Studies', href: '#' },
        { name: 'Support', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '#' },
        { name: 'Careers', href: '#' },
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms of Service', href: '#' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-black border-t border-white/10 py-12">
      <div className="container mx-auto px-4">
        {/* Contact Section */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">Get in Touch</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-[#8D5AFF] mr-2" />
              <a href="mailto:cheemunkhin@gmail.com" className="text-white/80 hover:text-white transition-colors">
                cheemunkhin@gmail.com
              </a>
            </div>
          </div>
          
          {/* Social Links */}
          <div className="flex items-center justify-center gap-6">
            <a 
              href="https://twitter.com/clipscommerce" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-[#8D5AFF] transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="https://facebook.com/clipscommerce" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-[#8D5AFF] transition-colors"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="https://instagram.com/clipscommerce" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-[#8D5AFF] transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </motion.div>

        {/* Copyright */}
        <div className="text-center border-t border-white/10 pt-6">
          <p className="text-white/40 text-sm">© {currentYear} ClipsCommerce. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
