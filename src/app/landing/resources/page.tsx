'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Video, ArrowRight, ChevronDown, Star, Target, Users, Heart, Zap, Book, TrendingUp, Camera, Gift, Lightbulb } from 'lucide-react';
import NavigationBar from '@/app/landing/components/NavigationBar';
import Footer from '@/app/landing/components/Footer';
import Link from 'next/link';

interface Template {
  id: number;
  title: string;
  overview: string;
  icon: React.ReactNode;
  branches: Branch[];
  hook: string;
  script: string;
  visuals: string;
  audio: string;
  examples: Example[];
  engagement: string;
  color: string;
}

interface Branch {
  name: string;
  description: string;
}

interface Example {
  type: string;
  details: {
    hook: string;
    script: string;
    visuals: string;
    audio: string;
  };
}

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const templates: Template[] = [
    {
      id: 1,
      title: "Transformation Story Template",
      overview: "Showcases a journey from a starting point to a remarkable outcome.",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "from-purple-500 to-pink-500",
      branches: [
        { name: "Physical Transformations", description: "Fitness journeys (e.g., weight loss, muscle gain), beauty makeovers (e.g., skincare, hair transformations)" },
        { name: "Health Transformations", description: "Mental health improvements, recovery stories (e.g., addiction, injury)" },
        { name: "Skill Transformations", description: "Career growth (e.g., intern to executive), creative skills (e.g., beginner to artist)" },
        { name: "Lifestyle Transformations", description: "Minimalism adoption, financial independence" }
      ],
      hook: "Before-and-after visual with \"From [start] to [result] in [time]!\"",
      script: "\"I started at [problem]. After [solution], I achieved [result]. You can too.\"",
      visuals: "Before state, process clips, after state.",
      audio: "Reflective to uplifting music with a voiceover.",
      examples: [
        {
          type: "Fitness (Weight Loss)",
          details: {
            hook: "\"Lost 40 lbs in 4 months!\"",
            script: "\"I was exhausted. This diet changed everything.\"",
            visuals: "Before (sluggish), process (meal prep), after (energetic).",
            audio: "Upbeat pop."
          }
        },
        {
          type: "Mental Health",
          details: {
            hook: "\"From anxiety to calm in 60 days!\"",
            script: "\"Meditation turned it around.\"",
            visuals: "Stressed, breathing, peaceful.",
            audio: "Soft piano."
          }
        }
      ],
      engagement: "+25% with relatable storytelling."
    },
    {
      id: 2,
      title: "Quick Guide Template",
      overview: "Delivers fast, actionable steps for a task.",
      icon: <Zap className="h-6 w-6" />,
      color: "from-blue-500 to-cyan-500",
      branches: [
        { name: "Culinary Guides", description: "Recipes, meal prep" },
        { name: "Creative Guides", description: "DIY projects, art tutorials" },
        { name: "Self-Care Guides", description: "Beauty routines, wellness hacks" },
        { name: "Practical Guides", description: "Organization, tech fixes" }
      ],
      hook: "End result with \"Do this [result] in [time]!\"",
      script: "\"Struggling with [task]? Here's how in [time].\"",
      visuals: "Finished product, fast-motion steps, result again.",
      audio: "Light music with task sounds or voiceover.",
      examples: [
        {
          type: "Recipe (Pasta)",
          details: {
            hook: "\"5-minute Alfredo!\"",
            script: "\"No time? This sauce rocks.\"",
            visuals: "Dish, boiling, plating.",
            audio: "Cheerful tune."
          }
        },
        {
          type: "DIY (Shelf)",
          details: {
            hook: "\"Build this in 10 minutes!\"",
            script: "\"Upgrade fast.\"",
            visuals: "Shelf, cutting, decorating.",
            audio: "Upbeat beat."
          }
        }
      ],
      engagement: "+30% with concise steps."
    },
    {
      id: 3,
      title: "Product Reveal Template",
      overview: "Highlights unboxing or reviewing a product.",
      icon: <Gift className="h-6 w-6" />,
      color: "from-green-500 to-emerald-500",
      branches: [
        { name: "Tech Reveals", description: "Gadgets, software" },
        { name: "Style Reveals", description: "Fashion, accessories" },
        { name: "Beauty Reveals", description: "Makeup, skincare" },
        { name: "Niche Reveals", description: "Books, home goods" }
      ],
      hook: "Package with \"Unveiling [product]: Worth it?\"",
      script: "\"Hey [audience], revealing [product]. Let's see.\"",
      visuals: "Packaging, unboxing, features, demo.",
      audio: "Genre-specific music with voiceover.",
      examples: [
        {
          type: "Tech (Headphones)",
          details: {
            hook: "\"Unboxing viral earbuds!\"",
            script: "\"Good as they say?\"",
            visuals: "Box, earbuds, test.",
            audio: "Electronic beat."
          }
        },
        {
          type: "Fashion (Jacket)",
          details: {
            hook: "\"Fall jacket unboxing!\"",
            script: "\"Stylish? Let's see.\"",
            visuals: "Package, fabric, try-on.",
            audio: "Trendy pop."
          }
        }
      ],
      engagement: "+20% with suspense."
    },
    {
      id: 4,
      title: "Experience Teaser Template",
      overview: "Promotes a place, event, or experience.",
      icon: <Camera className="h-6 w-6" />,
      color: "from-orange-500 to-red-500",
      branches: [
        { name: "Travel Experiences", description: "Destinations, getaways" },
        { name: "Event Experiences", description: "Festivals, concerts" },
        { name: "Local Experiences", description: "Restaurants, shops" },
        { name: "Adventure Experiences", description: "Hiking, surfing" }
      ],
      hook: "Stunning visual with \"Ready for [experience]?\"",
      script: "\"Looking for [benefit]? Explore [place/event].\"",
      visuals: "Wide shot, highlights, call-to-action.",
      audio: "Thematic music with ambient sounds or voiceover.",
      examples: [
        {
          type: "Destination (Beach)",
          details: {
            hook: "\"Hawaii awaits!\"",
            script: "\"Sun and serenity – ready?\"",
            visuals: "Ocean, surfing, sunset.",
            audio: "Island vibes."
          }
        },
        {
          type: "Festival (Music)",
          details: {
            hook: "\"Feel this fest!\"",
            script: "\"Epic nights – join us!\"",
            visuals: "Crowd, lights, performers.",
            audio: "EDM."
          }
        }
      ],
      engagement: "+35% with immersive appeal."
    },
    {
      id: 5,
      title: "Solution Hack Template",
      overview: "Shares clever tips for everyday problems.",
      icon: <Lightbulb className="h-6 w-6" />,
      color: "from-yellow-500 to-orange-500",
      branches: [
        { name: "Financial Hacks", description: "Money-saving, budgeting" },
        { name: "Efficiency Hacks", description: "Time-saving, workflow" },
        { name: "Wellness Hacks", description: "Stress relief, sleep" },
        { name: "Household Hacks", description: "Cleaning, organization" }
      ],
      hook: "Problem/tool with \"Fix [issue] with this hack!\"",
      script: "\"Tired of [problem]? This [solution] saves [resource].\"",
      visuals: "Issue, hack demo, outcome.",
      audio: "Upbeat music with effects or voiceover.",
      examples: [
        {
          type: "Money-Saving",
          details: {
            hook: "\"Cut grocery bill!\"",
            script: "\"Use this app.\"",
            visuals: "Receipt, scan, lower total.",
            audio: "Cheerful tune."
          }
        },
        {
          type: "Stress Relief",
          details: {
            hook: "\"Calm in 60 seconds!\"",
            script: "\"Breathe like this.\"",
            visuals: "Tense, demo, relaxed.",
            audio: "Soft melody."
          }
        }
      ],
      engagement: "+28% with practical tips."
    },
    {
      id: 6,
      title: "Skill Tutorial Template",
      overview: "Teaches a specific skill or technique.",
      icon: <Book className="h-6 w-6" />,
      color: "from-indigo-500 to-purple-500",
      branches: [
        { name: "Animal Skills", description: "Pet tricks, behavior" },
        { name: "Academic Skills", description: "Math, language" },
        { name: "Physical Skills", description: "Sports, dance" },
        { name: "Creative Skills", description: "Drawing, music" }
      ],
      hook: "Mastered skill with \"Learn [skill] in [time]!\"",
      script: "\"Master [skill] with these [number] steps.\"",
      visuals: "Final skill, step-by-step demos, result.",
      audio: "Playful/focused music with voiceover.",
      examples: [
        {
          type: "Pet Trick",
          details: {
            hook: "\"Dog rolls in 5 minutes!\"",
            script: "\"Fun trick – here's how.\"",
            visuals: "Roll, lure, success.",
            audio: "Playful tune."
          }
        },
        {
          type: "Math Lesson",
          details: {
            hook: "\"Fractions in 3 steps!\"",
            script: "\"Math made easy.\"",
            visuals: "Problem, solving, answer.",
            audio: "Calm music."
          }
        }
      ],
      engagement: "+40% with clear instruction."
    }
  ];

  const toggleTemplate = (id: number) => {
    setExpandedTemplate(expandedTemplate === id ? null : id);
  };
  
  return (
    <div className="min-h-screen bg-black text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8D5AFF]/10 to-[#5afcc0]/10"></div>
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(141,90,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(141,90,255,0.03)_1px,transparent_1px)] [background-size:60px_60px]"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Content Creation <span className="text-[#5afcc0]">Resources</span>
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Comprehensive templates, guides, and tools to help you create viral content that converts.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="py-8 border-b border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex justify-center">
            <div className="flex bg-white/5 rounded-xl p-2">
              {[
                { id: 'templates', label: 'Content Templates', icon: <FileText className="h-4 w-4" /> },
                { id: 'guides', label: 'Strategy Guides', icon: <Target className="h-4 w-4" /> },
                { id: 'tools', label: 'Creator Tools', icon: <Video className="h-4 w-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-[#8D5AFF] text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      {activeTab === 'templates' && (
        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-4xl font-bold mb-4">Viral Content Templates</h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                Six proven templates that drive engagement, sales, and audience growth. Each template includes branches, examples, and optimization tips.
              </p>
            </motion.div>

            <div className="space-y-8">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Template Header */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => toggleTemplate(template.id)}
                  >
                    <div className={`bg-gradient-to-r ${template.color} p-6`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/20 p-3 rounded-xl">
                            {template.icon}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">{template.title}</h3>
                            <p className="text-white/90">{template.overview}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-white/90 text-sm">Engagement Boost</div>
                            <div className="text-white font-bold">{template.engagement.split(' ')[0]}</div>
                          </div>
                          <ChevronDown 
                            className={`h-6 w-6 text-white transition-transform ${
                              expandedTemplate === template.id ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedTemplate === template.id && (
                    <div className="p-8">
                      {/* Branches */}
                      <div className="mb-8">
                        <h4 className="text-xl font-bold mb-4 text-[#8D5AFF]">Content Branches</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {template.branches.map((branch, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-4">
                              <h5 className="font-semibold text-white mb-2">{branch.name}</h5>
                              <p className="text-white/70 text-sm">{branch.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Template Structure */}
                      <div className="mb-8">
                        <h4 className="text-xl font-bold mb-4 text-[#5afcc0]">Template Structure</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="bg-white/5 rounded-lg p-4">
                              <h5 className="font-semibold text-orange-400 mb-2">Hook</h5>
                              <p className="text-white/80">{template.hook}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4">
                              <h5 className="font-semibold text-blue-400 mb-2">Script</h5>
                              <p className="text-white/80">{template.script}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-white/5 rounded-lg p-4">
                              <h5 className="font-semibold text-green-400 mb-2">Visuals</h5>
                              <p className="text-white/80">{template.visuals}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4">
                              <h5 className="font-semibold text-purple-400 mb-2">Audio</h5>
                              <p className="text-white/80">{template.audio}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Examples */}
                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-4 text-[#5afcc0]">Real Examples</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                          {template.examples.map((example, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-6 border border-white/10">
                              <h5 className="font-bold text-white mb-4">{example.type}</h5>
                              <div className="space-y-3">
                                <div>
                                  <span className="text-orange-400 font-medium">Hook: </span>
                                  <span className="text-white/80">{example.details.hook}</span>
                                </div>
                                <div>
                                  <span className="text-blue-400 font-medium">Script: </span>
                                  <span className="text-white/80">{example.details.script}</span>
                                </div>
                                <div>
                                  <span className="text-green-400 font-medium">Visuals: </span>
                                  <span className="text-white/80">{example.details.visuals}</span>
                                </div>
                                <div>
                                  <span className="text-purple-400 font-medium">Audio: </span>
                                  <span className="text-white/80">{example.details.audio}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Engagement Result */}
                      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-green-400" />
                          <span className="font-semibold text-green-400">Engagement Result: </span>
                          <span className="text-white">{template.engagement}</span>
                        </div>
                      </div>
              </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* CTA Section */}
              <motion.div
              className="mt-20 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="bg-gradient-to-r from-[#8D5AFF]/10 to-[#5afcc0]/10 border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-4">Not specific or tailored enough?</h3>
                <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                  Check out our tailored content idea generator that is even more comprehensive and personalized than these templates.
                </p>
                <Link href="/dashboard">
                  <motion.button
                    className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 flex items-center mx-auto group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Try Our AI Content Generator
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </motion.button>
                </Link>
              </div>
              </motion.div>
          </div>
        </section>
      )}

      {/* Strategy Guides Placeholder */}
      {activeTab === 'guides' && (
        <section className="py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-8">Strategy Guides</h2>
            <p className="text-xl text-white/70 mb-8">Coming soon! Comprehensive guides for content strategy, audience growth, and monetization.</p>
            <Link href="/dashboard">
              <button className="bg-[#8D5AFF] text-white px-8 py-4 rounded-xl font-bold">
                Get Early Access
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Creator Tools Placeholder */}
      {activeTab === 'tools' && (
        <section className="py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-8">Creator Tools</h2>
            <p className="text-xl text-white/70 mb-8">Advanced tools for content creation, analytics, and optimization coming soon!</p>
            <Link href="/dashboard">
              <button className="bg-[#8D5AFF] text-white px-8 py-4 rounded-xl font-bold">
                Access Tools Now
              </button>
                </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
