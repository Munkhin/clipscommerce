'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart as LineChartComponent } from '@/components/dashboard/charts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, RefreshCw, Lightbulb, TrendingUp, ChevronRight, Target, Award, AlertTriangle, Zap, BarChart3, Brain, LineChart as LineChartIcon } from 'lucide-react';
import { CircularScore } from '@/components/ui/circular-score';
import { ChartWrapper } from '@/components/ui/chart-wrapper';

type ContentIdea = {
  id: string;
  title: string;
  description: string;
  estimated_engagement: number;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  before_after?: {
    before: string;
    after: string;
  };
};

type OptimizationSuggestion = {
  id: string;
  title: string;
  description: string;
  estimated_improvement: number;
  priority: 'high' | 'medium' | 'low';
  category: 'scheduling' | 'optimization';
};

type PerformanceMetric = {
  label: string;
  current: number;
  previous: number;
  target: number;
  trend: 'up' | 'down' | 'neutral';
};

export default function CycleComponent() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  
  // TODO: Replace with actual fetching of optimization suggestions from a backend API.
  const [optimizationSuggestions] = useState<OptimizationSuggestion[]>([
    // { /* ... dynamic data ... */ }
  ]);

  // TODO: Replace with actual fetching of content ideas from a backend API.
  const [contentIdeas] = useState<ContentIdea[]>([
    // { /* ... dynamic data ... */ }
  ]);

  // TODO: Replace with actual fetching of performance metrics from a backend API.
  const performanceMetrics: PerformanceMetric[] = [
    // { /* ... dynamic data ... */ }
  ];

  const handleGenerateIdeas = () => {
    // In a real app, this would call an AI service to generate fresh ideas
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[priority];
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    const icons = {
      high: AlertTriangle,
      medium: Target,
      low: Award,
    };
    return icons[priority];
  };

  const getDifficultyStars = (difficulty: 'easy' | 'medium' | 'hard') => {
    const levels = {
      easy: 1,
      medium: 3,
      hard: 5,
    };
    return '⭐'.repeat(levels[difficulty]);
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0a0b0f 0%, #111318 50%, #1a1d25 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Enhanced Header */}
        <div className="text-center space-y-4 animate-fadeIn">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text">Cycle</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Analyze performance and generate AI-powered improvement strategies
          </p>
        </div>

        {/* Enhanced Performance Analytics */}
        <div className="glass-card animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-violet-400" />
              Performance Overview
            </h2>
            <p className="text-gray-400 mt-1">Track your key metrics with circular progress indicators</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {performanceMetrics.map((metric) => (
                <div key={metric.label} className="text-center space-y-4 group">
                  <div className="relative">
                    <CircularScore 
                      value={metric.current} 
                      size={100}
                      className="mx-auto group-hover:scale-105 transition-transform"
                    />
                    {/* Trend Indicator */}
                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      metric.trend === 'up' ? 'bg-emerald-500 text-white' :
                      metric.trend === 'down' ? 'bg-red-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-white">{metric.label}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-gray-400">Current:</span>
                        <span className="text-white font-medium">{metric.current}%</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="text-gray-500">Previous:</span>
                        <span className="text-gray-400">{metric.previous}%</span>
                        <span className="text-gray-500">Target:</span>
                        <span className="text-violet-400">{metric.target}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced AI Optimization Suggestions */}
        <div className="glass-card animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="h-6 w-6 text-violet-400" />
              AI Optimization Suggestions
            </h2>
            <p className="text-gray-400 mt-1">Direct improvements for scheduling and content optimization</p>
          </div>
          
          <div className="p-6 space-y-4">
            {optimizationSuggestions.map((suggestion) => {
              const PriorityIcon = getPriorityIcon(suggestion.priority);
              return (
                <div key={suggestion.id} className="enhanced-card p-6 hover-lift">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${getPriorityColor(suggestion.priority)}`}>
                          <PriorityIcon className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-white text-lg">{suggestion.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 leading-relaxed">{suggestion.description}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">+{suggestion.estimated_improvement}%</div>
                        <div className="text-xs text-gray-500">improvement</div>
                      </div>
                      <Button className="btn-primary">
                        Apply Fix
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-6 border-t border-gray-700/50 flex justify-end">
            <Button className="btn-primary flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Apply All Optimizations
            </Button>
          </div>
        </div>

        {/* Enhanced Content Ideas */}
        <div className="glass-card animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-violet-400" />
              Content Ideas & Strategies
            </h2>
            <p className="text-gray-400 mt-1">AI-generated suggestions to improve your content strategy and engagement</p>
          </div>
          
          <div className="p-6 space-y-6">
            {contentIdeas.map((idea) => {
              const PriorityIcon = getPriorityIcon(idea.priority);
              return (
                <div key={idea.id} className="enhanced-card p-6 hover-lift">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${getPriorityColor(idea.priority)}`}>
                          <PriorityIcon className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-white text-lg">{idea.title}</h3>
                        <span className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded-full border border-gray-600">
                          {getDifficultyStars(idea.difficulty)} {idea.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-400 leading-relaxed">{idea.description}</p>
                      
                      {/* Enhanced Before/After Section */}
                      {idea.before_after && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-red-400 flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              Before
                            </div>
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-gray-300">
                              {idea.before_after.before}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              After
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-gray-300">
                              {idea.before_after.after}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-violet-400">+{idea.estimated_engagement}%</div>
                        <div className="text-xs text-gray-500">estimated engagement</div>
                      </div>
                      <Button variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                        Use Template
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-6 border-t border-gray-700/50 flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleGenerateIdeas}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Generate New Ideas
            </Button>
            <Button className="btn-primary">
              Save All Ideas
            </Button>
          </div>
        </div>

        {/* Enhanced Analytics Tabs */}
        <div className="glass-card animate-slideUp">
          <Tabs defaultValue="analytics" className="w-full">
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <LineChartIcon className="h-6 w-6 text-violet-400" />
                    Detailed Analytics
                  </h2>
                  <p className="text-gray-400 mt-1">Deep dive into your content performance</p>
                </div>
                <div className="flex items-center gap-4">
                  <TabsList className="bg-gray-800 border border-gray-700">
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">Analytics</TabsTrigger>
                    <TabsTrigger value="trends" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">Trends</TabsTrigger>
                  </TabsList>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <TabsContent value="analytics" className="p-6 space-y-6">
              <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Total Engagement</h3>
                    <div className="text-3xl font-bold text-white">3,427</div>
                    <p className="text-sm text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      +14.5% from previous period
                    </p>
                    <div className="h-[80px] mt-4">
                      <ChartWrapper>
                        <LineChartComponent data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
                
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Audience Growth</h3>
                    <div className="text-3xl font-bold text-white">+258</div>
                    <p className="text-sm text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      +5.3% from previous period
                    </p>
                    <div className="h-[80px] mt-4">
                      <ChartWrapper>
                        <LineChartComponent data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
                
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Conversion Rate</h3>
                    <div className="text-3xl font-bold text-white">2.8%</div>
                    <p className="text-sm text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      +0.4% from previous period
                    </p>
                    <div className="h-[80px] mt-4">
                      <ChartWrapper>
                        <LineChartComponent data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Engagement by Platform</h3>
                    <p className="text-gray-400">Where your content performs best</p>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <BarChart data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
                
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Growth Trends</h3>
                    <p className="text-gray-400">Follower growth over time</p>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <LineChartComponent data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="p-6 space-y-6">
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Trending Topics</h3>
                    <p className="text-gray-400">Popular content themes this week</p>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <BarChart data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
                
                <div className="enhanced-card p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Performance Trends</h3>
                    <p className="text-gray-400">Content performance over time</p>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <LineChartComponent data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                      </ChartWrapper>
                    </div>
                  </div>
                </div>
              </div>

              <div className="enhanced-card p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Competitive Analysis</h3>
                  <p className="text-gray-400">How you compare to similar accounts</p>
                  <div className="h-[300px]">
                    <ChartWrapper>
                      <BarChart data={[{value: 60}, {value: 70}, {value: 50}, {value: 30}, {value:20}, {value:10}, {value:15}]} />
                    </ChartWrapper>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
