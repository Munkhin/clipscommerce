'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Star } from 'lucide-react';

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "SocialSchedule helped me turn my Shopify store's social content into a consistent sales machine. The AI-optimized posts generate 73% more conversions than our manual efforts.",
      author: "Emily Parker",
      role: "Fashion Brand Owner",
      avatar: "/avatars/emily.jpg", // You would add actual avatar images
      platform: "Instagram",
      highlight: "73% increase in conversions"
    },
    {
      quote: "The Blitz feature automatically posts when our customers are most likely to buy. Our product sales directly from social media have increased by 215% in just two months.",
      author: "Alex Chen",
      role: "E-commerce Entrepreneur",
      avatar: "/avatars/alex.jpg",
      platform: "TikTok Shop",
      highlight: "215% increase in sales"
    },
    {
      quote: "The competitor Scan feature saves me hours of research. I can see exactly what's working for top sellers in my niche and adapt those strategies for my own products.",
      author: "Marcus Johnson",
      role: "Supplement Store Owner",
      avatar: "/avatars/marcus.jpg",
      platform: "YouTube Shorts",
      highlight: "10 hours saved per week"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-storm-darker to-storm-darkest" id="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Real Results from <span className="text-[#5afcc0]">Real Businesses</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            See how businesses like yours are turning their social media into profitable revenue streams.
          </p>
        </motion.div>

        <div className="relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 -z-10 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3b82f6,transparent_70%)]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                className="group p-8 rounded-xl border border-storm-light/10 bg-storm-light/5 backdrop-blur-sm hover:border-blitz-blue/50 transition-all duration-300 shadow-lg hover:shadow-blitz-blue/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
                whileHover={{ y: -8 }}
              >
                {/* Stars */}
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-blitz-yellow fill-current" />
                  ))}
                </div>
                
                {/* Quote */}
                <p className="text-lightning-dim/90 mb-6 italic">"{testimonial.quote}"</p>
                
                {/* Author */}
                <div className="flex items-center mt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blitz-blue/20 to-blitz-purple/20 mr-4 relative overflow-hidden border border-storm-light/20 flex-shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center text-blitz-blue font-bold">
                      {testimonial.author.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-lightning-DEFAULT">{testimonial.author}</p>
                    <p className="text-lightning-dim/60">{testimonial.role}</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-storm-light/10">
                  <div className="flex items-center font-medium mb-2">
                    <span className="bg-gradient-to-r from-blitz-blue/10 to-blitz-purple/10 text-blitz-blue px-3 py-1.5 rounded-full text-sm font-medium">
                      {testimonial.highlight}
                    </span>
                  </div>
                  <p className="text-sm text-lightning-dim/60">Platform: <span className="text-lightning-dim/90">{testimonial.platform}</span></p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-lg text-lightning-dim/80">
            <span className="font-semibold text-lightning-DEFAULT">These are just a few examples.</span> We have thousands of success stories from sellers just like you.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
