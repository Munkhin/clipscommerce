'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Users, BarChart3, Shield, Zap, Settings, Globe } from 'lucide-react';
import Link from 'next/link';
import NavigationBar from '@/app/landing/components/NavigationBar';

export default function TeamPage() {
  const [currentYear, setCurrentYear] = useState(2024);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const teamFeatures = [
    {
      icon: Users,
      title: "Multi-Client Management",
      description: "Manage unlimited client accounts from a single dashboard with role-based permissions"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive reporting across all client accounts with white-label options"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2 compliant with advanced security features and audit trails"
    },
    {
      icon: Zap,
      title: "Workflow Automation",
      description: "Automated content creation and posting workflows for maximum efficiency"
    },
    {
      icon: Settings,
      title: "Custom Integrations",
      description: "API access and custom integrations to fit your existing tech stack"
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "Manage campaigns across multiple time zones and regions seamlessly"
    }
  ];

  const stats = [
    { value: "500+", label: "Team Clients" },
    { value: "3.2M+", label: "Posts Managed" },
    { value: "95%", label: "Client Retention" },
    { value: "24/7", label: "Support Available" }
  ];

  return (
    <div className="bg-black min-h-screen text-white">
      <NavigationBar />
      
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
                Scale Your <span className="text-[#8D5AFF]">Team</span> Operations
              </h1>
              <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
                Empower your team with enterprise-grade tools to manage multiple clients, 
                streamline workflows, and deliver exceptional results at scale.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/team-dashboard">
                  <button className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:shadow-lg hover:shadow-[#8D5AFF]/20 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 inline-flex items-center">
                    Access Team Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </Link>
                <Link href="/landing/demo">
                  <button className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-300">
                    Watch Demo
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gradient-to-b from-[#0A0A0A] to-black">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className="bg-[#18181b] rounded-xl p-6 shadow-xl"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="text-3xl font-bold text-[#5afcc0] mb-2">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Everything Your Team Needs
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Built for agencies, marketing teams, and enterprises who need to deliver 
                exceptional results for multiple clients simultaneously.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-[#18181b] rounded-xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-[#8D5AFF]/10 p-3 rounded-lg w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-[#8D5AFF]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-white/70">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-black to-[#0A0A0A]">
          <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 text-center">
            <motion.div
              className="bg-gradient-to-r from-[#8D5AFF]/20 to-[#5afcc0]/20 border border-white/10 rounded-xl p-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Scale Your Team?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Join hundreds of teams already using ClipsCommerce to manage their clients 
                and deliver exceptional results.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/dashboard">
                  <button className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] hover:shadow-lg hover:shadow-[#8D5AFF]/20 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 inline-flex items-center">
                    View Team Pricing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="bg-[#8D5AFF] hover:bg-[#8D5AFF]/90 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-300">
                    Contact Sales
                  </button>
                </Link>
              </div>
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