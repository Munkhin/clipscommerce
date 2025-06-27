'use client';

import NavigationBar from '@/app/landing/components/NavigationBar';
import Footer from '@/app/landing/components/Footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Video, TrendingUp, Users, BarChart3, Zap, CheckCircle, ArrowRight, Star, Target, Rocket, DollarSign } from 'lucide-react';

export default function SolutionsPage() {
  const solutions = [
    {
      id: 'ecommerce',
      title: 'E-commerce Solutions',
      subtitle: 'Boost your online sales with AI-powered content',
      description: 'Transform your e-commerce business with automated social media content that drives sales. Our AI analyzes your products and creates viral content optimized for conversion across all major platforms.',
      icon: ShoppingCart,
      features: [
        'Product-focused content generation with AI optimization',
        'Sales-optimized captions and hashtags that convert',
        'Automated posting schedules for peak engagement',
        'E-commerce analytics integration and tracking',
        'ROI tracking and comprehensive reporting',
        'Multi-platform support (TikTok, Instagram, Facebook)',
        'A/B testing for content optimization',
        'Inventory-based content suggestions'
      ],
      benefits: [
        'Increase sales by up to 300%',
        'Save 15+ hours per week',
        'Reach 10x more potential customers',
        'Automated conversion optimization'
      ],
      stats: [
        { label: 'Average Sales Increase', value: '300%' },
        { label: 'Time Saved Weekly', value: '15hrs' },
        { label: 'Conversion Rate Boost', value: '125%' },
        { label: 'ROI Improvement', value: '450%' }
      ],
      ctaText: 'Start Selling More',
      gradient: 'from-purple-600 to-indigo-600',
      price: 'Starting at $49/month'
    },
    {
      id: 'content-marketing',
      title: 'Short-form Content Marketing',
      subtitle: 'Scale your content creation effortlessly',
      description: 'Perfect for creators, agencies, and brands who want to dominate short-form content. Generate viral content ideas, optimize for each platform, and track performance across all channels with advanced analytics.',
      icon: Video,
      features: [
        'Viral content idea generation using trend analysis',
        'Platform-specific optimization for each social network',
        'Advanced trending hashtag analysis and suggestions',
        'Comprehensive content performance tracking',
        'Team collaboration tools and workflow management',
        'Brand voice consistency across all content',
        'Content calendar and scheduling automation',
        'Competitor analysis and insights'
      ],
      benefits: [
        'Create 50+ posts in minutes',
        'Boost engagement by 250%',
        'Streamline team workflows',
        'Maintain brand consistency'
      ],
      stats: [
        { label: 'Content Creation Speed', value: '10x' },
        { label: 'Engagement Increase', value: '250%' },
        { label: 'Time to Market', value: '-80%' },
        { label: 'Team Efficiency', value: '300%' }
      ],
      ctaText: 'Scale Your Content',
      gradient: 'from-[#8D5AFF] to-[#5afcc0]',
      price: 'Starting at $29/month'
    }
  ];

  const stats = [
    { value: '1,200+', label: 'Businesses Transformed' },
    { value: '5M+', label: 'Posts Generated' },
    { value: '300%', label: 'Average Sales Increase' },
    { value: '15hrs', label: 'Time Saved Weekly' }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "E-commerce Manager",
      company: "Fashion Forward",
      content: "ClipsCommerce helped us increase our TikTok sales by 400% in just 8 weeks. The AI-generated content is incredibly engaging.",
      rating: 5,
      result: "+400% sales"
    },
    {
      name: "Mike Rodriguez",
      role: "Content Creator",
      company: "Tech Reviewer",
      content: "I went from posting twice a week to daily content that actually converts. My follower count tripled in 3 months.",
      rating: 5,
      result: "3x followers"
    },
    {
      name: "Jennifer Park",
      role: "Marketing Director",
      company: "Wellness Brand",
      content: "The time we save on content creation now goes into strategy. Our engagement rates have never been higher.",
      rating: 5,
      result: "+280% engagement"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8D5AFF]/10 to-[#5afcc0]/10"></div>
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(141,90,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(141,90,255,0.03)_1px,transparent_1px)] [background-size:60px_60px]"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center bg-[#8D5AFF]/10 border border-[#8D5AFF]/30 rounded-full px-4 py-2 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Rocket className="h-4 w-4 text-[#8D5AFF] mr-2" />
              <span className="text-sm font-medium text-[#8D5AFF]">Transform Your Business Today</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Solutions That <span className="text-[#5afcc0]">Sell</span>
            </h1>
            <p className="text-xl text-white/80 mb-8">
              AI-powered content strategies tailored for your business model. 
              Whether you're selling products or growing your brand, we have the perfect solution.
            </p>
            
            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  <div className="text-3xl md:text-4xl font-bold text-[#5afcc0] mb-2">{stat.value}</div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="space-y-32">
            {solutions.map((solution, index) => (
              <motion.div
                key={solution.id}
                className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                {/* Content */}
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <div className="mb-6">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${solution.gradient} bg-opacity-10 mb-4`}>
                      <solution.icon className="h-8 w-8 text-[#5afcc0]" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-4xl md:text-5xl font-bold">{solution.title}</h2>
                      <span className="bg-[#8D5AFF]/10 text-[#8D5AFF] px-3 py-1 rounded-full text-sm font-medium">
                        {solution.price}
                      </span>
                    </div>
                    <p className="text-xl text-[#8D5AFF] font-medium mb-6">{solution.subtitle}</p>
                    <p className="text-lg text-white/80 leading-relaxed">{solution.description}</p>
                  </div>

                  {/* Performance Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {solution.stats.map((stat, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-[#5afcc0] mb-1">{stat.value}</div>
                        <div className="text-sm text-white/70">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Benefits */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 text-[#5afcc0]">Key Benefits</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {solution.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center text-white/90">
                          <TrendingUp className="h-4 w-4 text-[#5afcc0] mr-3 flex-shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link href="/dashboard">
                    <motion.button
                      className={`bg-gradient-to-r ${solution.gradient} text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 flex items-center group`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {solution.ctaText}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </motion.button>
                  </Link>
                </div>

                {/* Enhanced Features Card */}
                <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-500">
                    <h3 className="text-2xl font-bold mb-6 text-white">Complete Feature Set</h3>
                    <div className="space-y-4">
                      {solution.features.map((feature, i) => (
                        <motion.div
                          key={i}
                          className="flex items-start"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                          <CheckCircle className="h-5 w-5 text-[#5afcc0] mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-white/90">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white/5">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Trusted by Industry Leaders</h2>
            <p className="text-xl text-white/70">See how businesses are transforming their results</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/80 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{testimonial.name}</h4>
                    <p className="text-sm text-white/60">{testimonial.role}</p>
                    <p className="text-sm text-white/60">{testimonial.company}</p>
                  </div>
                  <div className="bg-[#5afcc0]/10 text-[#5afcc0] px-3 py-1 rounded-full text-sm font-medium">
                    {testimonial.result}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20"></div>
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Join thousands of businesses already using ClipsCommerce to boost their sales and streamline their content creation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/dashboard">
                <motion.button
                  className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 flex items-center group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </Link>
              
              <Link href="/landing/team">
                <motion.button
                  className="border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Pricing
                </motion.button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/60">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-[#5afcc0] mr-2" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-[#5afcc0] mr-2" />
                <span>14-day money-back guarantee</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-[#5afcc0] mr-2" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
} 