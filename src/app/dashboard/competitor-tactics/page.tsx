"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Users, Eye, Heart, ExternalLink, Copy, Target, Brain, BarChart3 } from "lucide-react";
import GlassCard from '@/components/ui/GlassCard';

interface CompetitorContent {
  id: string;
  title: string;
  views: string;
  engagement: string;
  url: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  thumbnail?: string;
  embedPreview?: string;
}

interface CompetitorData {
  id: string;
  name: string;
  handle: string;
  followers: string;
  engagement: string;
  avgViews: string;
  topContent: CompetitorContent[];
  tactics: string[];
  hooks: string[];
}

export default function CompetitorTacticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);

  useEffect(() => {
    loadTopCompetitors();
  }, []);

  const loadTopCompetitors = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call to fetch competitor data based on user's niche.
      // The API should return data similar to the mockCompetitors structure,
      // including real, dynamically generated content URLs for top performers.
      await new Promise((res) => setTimeout(res, 2000)); 
      
      const dynamicCompetitors: CompetitorData[] = [
        // This array should be populated by the API call, not hardcoded.
        // Example structure for reference:
        {
          id: "1",
          name: "Dynamic TechGuru Pro",
          handle: "@dynamic_techguru",
          followers: "1.5M",
          engagement: "9.0%",
          avgViews: "150K",
          topContent: [
            { 
              id: "dyn1", 
              title: "Dynamically Generated Tech Trend Analysis", 
              views: "3.0M", 
              engagement: "15.0%",
              url: "https://www.example.com/dynamic-tech-video-1", // This URL should be dynamic
              platform: "tiktok"
            },
            { 
              id: "dyn2", 
              title: "Future of AI in 2024", 
              views: "2.5M", 
              engagement: "13.5%",
              url: "https://www.example.com/dynamic-ai-video-2", // This URL should be dynamic
              platform: "youtube"
            }
          ],
          tactics: ["Dynamic posting schedules", "AI-driven content generation", "Hyper-targeted audience engagement"],
          hooks: ["The future of [niche] is here...", "This [tool/strategy] will revolutionize your [area]"]
        },
        // ... more dynamically generated competitors
      ];
      
      setCompetitors(dynamicCompetitors);
    } catch (err: any) {
      setError("Failed to load competitor data dynamically. Please check your niche settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTopCompetitors();
  };

  const getPlatformColor = (platform: 'tiktok' | 'instagram' | 'youtube') => {
    const colors = {
      tiktok: 'from-pink-500 to-red-500',
      instagram: 'from-purple-500 to-pink-500',
      youtube: 'from-red-500 to-red-600'
    };
    return colors[platform];
  };

  const getPlatformIcon = (platform: 'tiktok' | 'instagram' | 'youtube') => {
    return platform === 'tiktok' ? '🎵' : platform === 'instagram' ? '📸' : '📺';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0a0b0f 0%, #111318 50%, #1a1d25 100%)'
      }}>
        <GlassCard className="p-8 text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 mx-auto text-violet-400" />
          <h3 className="text-xl font-semibold text-white">Analyzing Top Competitors</h3>
          <p className="text-gray-400">Scanning viral content in your niche...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0a0b0f 0%, #111318 50%, #1a1d25 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fadeIn">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text">Competitor Analysis</h1>
            <p className="text-xl text-gray-400 mt-2">Top 5 performing competitors in your niche with real content links</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={loading} 
            className="btn-primary flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {error && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          </div>
        )}

        {/* Competitor Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {competitors.map((competitor) => (
            <GlassCard key={competitor.id} className="hover-lift animate-slideUp">
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{competitor.name}</h2>
                    <p className="text-violet-400 text-lg">{competitor.handle}</p>
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{competitor.followers}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Heart className="h-4 w-4" />
                      <span>{competitor.engagement} avg</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400">
                      <Eye className="h-4 w-4" />
                      <span>{competitor.avgViews} avg views</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Top Performing Content */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-violet-400" />
                    Top Performing Content
                  </h3>
                  <div className="space-y-3">
                    {competitor.topContent.map((content) => (
                      <GlassCard key={content.id} className="p-4 hover-lift">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg">{getPlatformIcon(content.platform)}</span>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getPlatformColor(content.platform)} text-white`}>
                                {content.platform}
                              </div>
                            </div>
                            <h4 className="font-medium text-white mb-1">{content.title}</h4>
                            <div className="text-sm text-gray-400">
                              {content.views} views • {content.engagement} engagement
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                              onClick={() => window.open(content.url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>

                {/* Winning Tactics */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-400" />
                    Winning Tactics
                  </h3>
                  <div className="space-y-2">
                    {competitor.tactics.map((tactic, index) => (
                      <div key={index} className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-sm text-gray-300 hover:border-emerald-500/30 transition-colors">
                        • {tactic}
                      </div>
                    ))}
                  </div>
                </div>

                {/* High-Converting Hooks */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    High-Converting Hooks
                  </h3>
                  <div className="space-y-2">
                    {competitor.hooks.map((hook, index) => (
                      <div key={index} className="group relative p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-sm text-gray-300 hover:border-purple-500/30 transition-colors">
                        <span>"{hook}"</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                          onClick={() => navigator.clipboard.writeText(hook)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Enhanced Insights Summary */}
        <GlassCard className="animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="h-6 w-6 text-violet-400" />
              Key Insights Across Top Performers
            </h2>
            <p className="text-gray-400 mt-1">Patterns and strategies from the most successful content creators</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="p-6 hover-lift">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-400" />
                  Common Patterns
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Post consistently during peak hours (6-8 PM)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Use trending audio within 2 hours of release</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Focus on transformation/before-after content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Engage actively in first hour after posting</span>
                  </li>
                </ul>
              </GlassCard>

              <GlassCard className="p-6 hover-lift">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Hook Formulas
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>"How I [achieved result] in [timeframe]"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>"[Number] things that will change your [area]"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>"I tested [number] [things] so you don't have to"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>"The [secret/mistake] they don't want you to know"</span>
                  </li>
                </ul>
              </GlassCard>

              <GlassCard className="p-6 hover-lift">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Content Types
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Tutorial/How-to (highest engagement)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Behind-the-scenes content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Before/after transformations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Tool/app reviews and comparisons</span>
                  </li>
                </ul>
              </GlassCard>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
} 