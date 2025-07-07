'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { 
  Lightbulb, 
  TrendingUp, 
  Eye, 
  Target, 
  Brain, 
  BarChart3, 
  Users, 
  Clock, 
  Zap, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Filter,
  Star,
  Hash,
  Video,
  Music,
  Globe
} from 'lucide-react';

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  category: 'trending' | 'evergreen' | 'seasonal' | 'competitor-inspired' | 'ai-generated';
  platform: 'tiktok' | 'instagram' | 'youtube' | 'multi-platform';
  engagementPrediction: number;
  trendScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  hashtags: string[];
  suggestedMusic?: string;
  references: string[];
  createdAt: Date;
  status: 'new' | 'approved' | 'in-production' | 'completed';
  clientMatch: string[];
}

export interface TrendAnalysis {
  id: string;
  keyword: string;
  platform: string;
  volume: number;
  growth: number;
  competition: number;
  relevanceScore: number;
  peakTimes: string[];
  relatedTrends: string[];
  expectedDuration: number; // days
  source: 'api' | 'ai-detected' | 'competitor-analysis';
}

export interface CompetitorInsight {
  id: string;
  competitorName: string;
  platform: string;
  contentType: string;
  performanceMetrics: {
    views: number;
    engagement: number;
    shares: number;
  };
  contentElements: {
    hashtags: string[];
    musicUsed?: string;
    visualStyle: string;
    captionStyle: string;
  };
  adaptation: {
    whatToImitate: string[];
    whatToImprove: string[];
    uniqueAngle: string;
  };
  analysisDate: Date;
}

export interface ContentCalendar {
  id: string;
  date: Date;
  ideas: ContentIdea[];
  theme: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string[];
  status: 'planned' | 'in-progress' | 'completed';
}

export function ContentIdeationModule() {
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis[]>([]);
  const [competitorInsights, setCompetitorInsights] = useState<CompetitorInsight[]>([]);
  const [contentCalendar, setContentCalendar] = useState<ContentCalendar[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOnlyHigh, setShowOnlyHigh] = useState(false);

  // Initialize sample data
  useEffect(() => {
    const sampleIdeas: ContentIdea[] = [
      {
        id: 'idea-1',
        title: 'Day in the Life: Remote Work Setup',
        description: 'Showcase a productive home office setup with trending desk accessories and productivity hacks',
        category: 'trending',
        platform: 'tiktok',
        engagementPrediction: 87,
        trendScore: 92,
        difficulty: 'easy',
        hashtags: ['#WFH', '#productivity', '#desksetup', '#workfromhome'],
        suggestedMusic: 'Lofi Study Beats',
        references: ['trending desk setup videos', 'productivity influencers'],
        createdAt: new Date(),
        status: 'new',
        clientMatch: ['tech-companies', 'lifestyle-brands']
      },
      {
        id: 'idea-2',
        title: 'Quick Recipe: 15-Minute Gourmet Pasta',
        description: 'Fast-paced cooking video featuring a simple but elegant pasta dish with trending ingredients',
        category: 'evergreen',
        platform: 'instagram',
        engagementPrediction: 78,
        trendScore: 65,
        difficulty: 'medium',
        hashtags: ['#quickrecipes', '#pasta', '#cooking', '#foodie'],
        references: ['popular food accounts', 'trending recipes'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'approved',
        clientMatch: ['food-brands', 'lifestyle-brands']
      },
      {
        id: 'idea-3',
        title: 'Fitness Challenge: 30-Day Transformation',
        description: 'Document a complete fitness journey with before/after, daily workouts, and meal prep',
        category: 'seasonal',
        platform: 'youtube',
        engagementPrediction: 95,
        trendScore: 88,
        difficulty: 'hard',
        hashtags: ['#fitness', '#transformation', '#30daychallenge', '#workout'],
        references: ['fitness influencers', 'transformation videos'],
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        status: 'in-production',
        clientMatch: ['fitness-brands', 'wellness-companies']
      }
    ];

    const sampleTrends: TrendAnalysis[] = [
      {
        id: 'trend-1',
        keyword: 'sustainable living',
        platform: 'tiktok',
        volume: 1250000,
        growth: 45,
        competition: 3.2,
        relevanceScore: 89,
        peakTimes: ['18:00-20:00', '12:00-14:00'],
        relatedTrends: ['zero waste', 'eco friendly', 'sustainable fashion'],
        expectedDuration: 30,
        source: 'ai-detected'
      },
      {
        id: 'trend-2',
        keyword: 'AI productivity',
        platform: 'youtube',
        volume: 890000,
        growth: 78,
        competition: 4.1,
        relevanceScore: 92,
        peakTimes: ['09:00-11:00', '15:00-17:00'],
        relatedTrends: ['chatgpt', 'automation', 'productivity hacks'],
        expectedDuration: 45,
        source: 'api'
      },
      {
        id: 'trend-3',
        keyword: 'micro workouts',
        platform: 'instagram',
        volume: 650000,
        growth: 62,
        competition: 2.8,
        relevanceScore: 85,
        peakTimes: ['06:00-08:00', '19:00-21:00'],
        relatedTrends: ['quick fitness', '5 minute workout', 'busy schedule fitness'],
        expectedDuration: 25,
        source: 'competitor-analysis'
      }
    ];

    const sampleCompetitorInsights: CompetitorInsight[] = [
      {
        id: 'insight-1',
        competitorName: '@FitnessInfluencer',
        platform: 'tiktok',
        contentType: 'Workout Tutorial',
        performanceMetrics: {
          views: 2500000,
          engagement: 125000,
          shares: 45000
        },
        contentElements: {
          hashtags: ['#quickworkout', '#homefitness', '#noequipment'],
          musicUsed: 'Energetic Workout Beat',
          visualStyle: 'Bright, clean lighting with mirror background',
          captionStyle: 'Short, punchy with emoji bullets'
        },
        adaptation: {
          whatToImitate: ['Quick pace', 'Clear instructions', 'Progress tracking'],
          whatToImprove: ['Better lighting', 'More engaging captions', 'Client branding'],
          uniqueAngle: 'Focus on beginners with modifications'
        },
        analysisDate: new Date()
      }
    ];

    setContentIdeas(sampleIdeas);
    setTrendAnalysis(sampleTrends);
    setCompetitorInsights(sampleCompetitorInsights);
  }, []);

  const filteredIdeas = useMemo(() => {
    return contentIdeas.filter(idea => {
      const platformMatch = selectedPlatform === 'all' || idea.platform === selectedPlatform || idea.platform === 'multi-platform';
      const categoryMatch = selectedCategory === 'all' || idea.category === selectedCategory;
      const clientMatch = selectedClient === 'all' || idea.clientMatch.includes(selectedClient);
      const scoreMatch = !showOnlyHigh || idea.engagementPrediction >= 80;
      
      return platformMatch && categoryMatch && clientMatch && scoreMatch;
    });
  }, [contentIdeas, selectedPlatform, selectedCategory, selectedClient, showOnlyHigh]);

  const generateAIIdeas = useCallback(async (clientType: string, platform: string, count: number) => {
    setIsAnalyzing(true);
    
    try {
      toast({
        title: "Generating AI ideas",
        description: `Creating ${count} personalized content ideas for ${clientType} on ${platform}`,
      });

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const aiIdeas: ContentIdea[] = Array.from({ length: count }, (_, i) => ({
        id: `ai-idea-${Date.now()}-${i}`,
        title: `AI-Generated Idea ${i + 1}`,
        description: `Smart content suggestion based on trending topics and audience analysis for ${clientType}`,
        category: 'ai-generated',
        platform: platform as any,
        engagementPrediction: Math.random() * 30 + 70, // 70-100%
        trendScore: Math.random() * 40 + 60, // 60-100
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as any,
        hashtags: ['#trending', '#ai', '#content', '#viral'],
        references: ['AI trend analysis', 'audience insights'],
        createdAt: new Date(),
        status: 'new',
        clientMatch: [clientType]
      }));

      setContentIdeas(prev => [...prev, ...aiIdeas]);
      
      toast({
        title: "AI ideas generated",
        description: `${count} new content ideas ready for review`,
      });
    } catch (error) {
      toast({
        title: "Error generating ideas",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeTrends = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      toast({
        title: "Analyzing trends",
        description: "Scanning social platforms for emerging trends and opportunities",
      });

      // Simulate trend analysis
      await new Promise(resolve => setTimeout(resolve, 2500));

      const newTrends: TrendAnalysis[] = [
        {
          id: `trend-${Date.now()}`,
          keyword: 'sustainable tech',
          platform: 'tiktok',
          volume: Math.floor(Math.random() * 1000000) + 500000,
          growth: Math.floor(Math.random() * 50) + 30,
          competition: Math.random() * 3 + 1,
          relevanceScore: Math.floor(Math.random() * 30) + 70,
          peakTimes: ['14:00-16:00', '20:00-22:00'],
          relatedTrends: ['green tech', 'eco innovation', 'sustainable design'],
          expectedDuration: Math.floor(Math.random() * 30) + 15,
          source: 'ai-detected'
        }
      ];

      setTrendAnalysis(prev => [...prev, ...newTrends]);
      
      toast({
        title: "Trend analysis complete",
        description: "New trends detected and added to your dashboard",
      });
    } catch (error) {
      toast({
        title: "Error analyzing trends",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const approveIdea = useCallback((ideaId: string) => {
    setContentIdeas(prev => prev.map(idea => 
      idea.id === ideaId ? { ...idea, status: 'approved' as const } : idea
    ));
    toast({
      title: "Idea approved",
      description: "Content idea has been approved and added to production queue",
    });
  }, []);

  const rejectIdea = useCallback((ideaId: string) => {
    setContentIdeas(prev => prev.filter(idea => idea.id !== ideaId));
    toast({
      title: "Idea rejected",
      description: "Content idea has been removed from suggestions",
    });
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trending': return 'text-red-600 bg-red-50';
      case 'evergreen': return 'text-green-600 bg-green-50';
      case 'seasonal': return 'text-orange-600 bg-orange-50';
      case 'competitor-inspired': return 'text-purple-600 bg-purple-50';
      case 'ai-generated': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'tiktok': return 'bg-black text-white';
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'youtube': return 'bg-red-600 text-white';
      case 'multi-platform': return 'bg-gradient-to-r from-blue-500 to-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Content Ideation</h2>
          <p className="text-muted-foreground">
            AI-powered content suggestions with trend analysis and competitor insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Brain className="w-4 h-4 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {filteredIdeas.length} Ideas
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {contentIdeas.filter(idea => idea.status === 'new').length}
            </div>
            <p className="text-sm text-muted-foreground">New Ideas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {contentIdeas.filter(idea => idea.status === 'approved').length}
            </div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {contentIdeas.filter(idea => idea.status === 'in-production').length}
            </div>
            <p className="text-sm text-muted-foreground">In Production</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {trendAnalysis.length}
            </div>
            <p className="text-sm text-muted-foreground">Active Trends</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-600">
              {Math.round(contentIdeas.reduce((sum, idea) => sum + idea.engagementPrediction, 0) / contentIdeas.length)}%
            </div>
            <p className="text-sm text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ideas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ideas">Content Ideas</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="competitors">Competitor Insights</TabsTrigger>
          <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI Content Suggestions
              </CardTitle>
              <CardDescription>
                Intelligent content ideas based on trends, audience analysis, and competitor research
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Controls */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Platform:</Label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="multi-platform">Multi-Platform</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Category:</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="trending">Trending</SelectItem>
                        <SelectItem value="evergreen">Evergreen</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="competitor-inspired">Competitor</SelectItem>
                        <SelectItem value="ai-generated">AI Generated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>High Score Only:</Label>
                    <Switch
                      checked={showOnlyHigh}
                      onCheckedChange={setShowOnlyHigh}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => generateAIIdeas('tech-companies', selectedPlatform === 'all' ? 'tiktok' : selectedPlatform, 5)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    Generate AI Ideas
                  </Button>
                  <Button variant="outline" onClick={analyzeTrends} disabled={isAnalyzing}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Analyze Trends
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Ideas
                  </Button>
                </div>
              </div>

              {/* Ideas List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredIdeas.map((idea) => (
                  <Card key={idea.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{idea.title}</h4>
                            <Badge className={getPlatformColor(idea.platform) + ' text-xs'}>
                              {idea.platform}
                            </Badge>
                            <Badge className={getCategoryColor(idea.category)}>
                              {idea.category}
                            </Badge>
                            <Badge className={getDifficultyColor(idea.difficulty)}>
                              {idea.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{idea.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {idea.hashtags.map((hashtag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {hashtag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className={`text-lg font-bold ${getScoreColor(idea.engagementPrediction)}`}>
                                {Math.round(idea.engagementPrediction)}%
                              </div>
                              <p className="text-xs text-muted-foreground">Prediction</p>
                            </div>
                            <div className="text-center">
                              <div className={`text-lg font-bold ${getScoreColor(idea.trendScore)}`}>
                                {Math.round(idea.trendScore)}%
                              </div>
                              <p className="text-xs text-muted-foreground">Trend</p>
                            </div>
                          </div>
                          
                          {idea.status === 'new' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveIdea(idea.id)}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => rejectIdea(idea.id)}>
                                <AlertTriangle className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          
                          {idea.status !== 'new' && (
                            <Badge variant="outline">
                              {idea.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {idea.suggestedMusic && (
                        <div className="flex items-center gap-2 text-sm">
                          <Music className="w-4 h-4" />
                          <span className="text-muted-foreground">Suggested music:</span>
                          <span>{idea.suggestedMusic}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                
                {filteredIdeas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No content ideas match your current filters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trend Analysis
              </CardTitle>
              <CardDescription>
                Real-time trending topics and growth opportunities across platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendAnalysis.map((trend) => (
                  <Card key={trend.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{trend.keyword}</h4>
                            <Badge className={getPlatformColor(trend.platform) + ' text-xs'}>
                              {trend.platform}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {trend.source}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {trend.volume.toLocaleString()} volume • {trend.growth}% growth • Duration: {trend.expectedDuration} days
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(trend.relevanceScore)}`}>
                            {trend.relevanceScore}%
                          </div>
                          <p className="text-xs text-muted-foreground">Relevance</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Peak Times</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {trend.peakTimes.map((time, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Related Trends</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {trend.relatedTrends.slice(0, 3).map((related, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {related}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Competition</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={trend.competition * 20} className="h-2" />
                            <span className="text-xs">{trend.competition}/5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Competitor Insights
              </CardTitle>
              <CardDescription>
                Analysis of competitor content performance and actionable insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competitorInsights.map((insight) => (
                  <Card key={insight.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{insight.competitorName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {insight.contentType} on {insight.platform}
                          </p>
                        </div>
                        <Badge className={getPlatformColor(insight.platform) + ' text-xs'}>
                          {insight.platform}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Performance</p>
                          <div className="space-y-1 text-sm">
                            <div>Views: {insight.performanceMetrics.views.toLocaleString()}</div>
                            <div>Engagement: {insight.performanceMetrics.engagement.toLocaleString()}</div>
                            <div>Shares: {insight.performanceMetrics.shares.toLocaleString()}</div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Content Elements</p>
                          <div className="space-y-1 text-sm">
                            <div>Style: {insight.contentElements.visualStyle}</div>
                            <div>Caption: {insight.contentElements.captionStyle}</div>
                            {insight.contentElements.musicUsed && (
                              <div>Music: {insight.contentElements.musicUsed}</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Adaptation Strategy</p>
                          <div className="space-y-1 text-sm">
                            <div><strong>Imitate:</strong> {insight.adaptation.whatToImitate.join(', ')}</div>
                            <div><strong>Improve:</strong> {insight.adaptation.whatToImprove.join(', ')}</div>
                            <div><strong>Unique Angle:</strong> {insight.adaptation.uniqueAngle}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Hashtags Used</p>
                        <div className="flex flex-wrap gap-1">
                          {insight.contentElements.hashtags.map((hashtag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {hashtag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Organized content planning with approved ideas and production timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Content Calendar Coming Soon</h3>
                <p>Visual calendar interface for content planning and scheduling will be available in the next update.</p>
                <Button className="mt-4" variant="outline">
                  <Star className="w-4 h-4 mr-2" />
                  Request Early Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

