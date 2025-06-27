'use client';

import React, { useState, useEffect } from 'react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { TeamSidebar } from '@/components/team-dashboard/TeamSidebar';
import { TeamHeader } from '@/components/team-dashboard/TeamHeader';
import { TeamAnalyticsOverview } from '@/components/team-dashboard/TeamAnalyticsOverview';
import { PerformanceMonitoringDashboard } from '@/components/team-dashboard/PerformanceMonitoringDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Heart,
  MessageCircle,
  Share,
  Play,
  Globe,
  Zap
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

// Mock analytics data
interface AnalyticsData {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalEngagement: number;
    engagementGrowth: number;
    totalReach: number;
    reachGrowth: number;
    activeClients: number;
    clientGrowth: number;
  };
  platformMetrics: {
    platform: string;
    clients: number;
    revenue: number;
    engagement: number;
    growth: number;
  }[];
  topPerformers: {
    id: string;
    name: string;
    platform: string;
    revenue: number;
    engagement: number;
    followers: number;
    growth: number;
  }[];
  contentMetrics: {
    totalPosts: number;
    avgEngagement: number;
    topContentType: string;
    bestPerformingTime: string;
  };
  recentInsights: {
    id: string;
    type: 'trend' | 'opportunity' | 'alert';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    timestamp: Date;
  }[];
}

const mockAnalyticsData: AnalyticsData = {
  overview: {
    totalRevenue: 2847500,
    revenueGrowth: 15.8,
    totalEngagement: 8.7,
    engagementGrowth: 12.3,
    totalReach: 15600000,
    reachGrowth: 8.9,
    activeClients: 1258,
    clientGrowth: 5.2
  },
  platformMetrics: [
    {
      platform: 'TikTok',
      clients: 542,
      revenue: 1245000,
      engagement: 9.2,
      growth: 18.5
    },
    {
      platform: 'Instagram',
      clients: 456,
      revenue: 987500,
      engagement: 8.1,
      growth: 14.2
    },
    {
      platform: 'YouTube',
      clients: 260,
      revenue: 615000,
      engagement: 8.9,
      growth: 11.7
    }
  ],
  topPerformers: [
    {
      id: '1',
      name: 'Lisa Wang',
      platform: 'Instagram',
      revenue: 22100,
      engagement: 9.2,
      followers: 156000,
      growth: 24.5
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      platform: 'TikTok',
      revenue: 15420,
      engagement: 8.5,
      followers: 125000,
      growth: 19.8
    },
    {
      id: '3',
      name: 'Mike Chen',
      platform: 'Instagram',
      revenue: 8750,
      engagement: 6.2,
      followers: 89000,
      growth: 15.3
    }
  ],
  contentMetrics: {
    totalPosts: 15420,
    avgEngagement: 8.7,
    topContentType: 'Video',
    bestPerformingTime: '7-9 PM'
  },
  recentInsights: [
    {
      id: '1',
      type: 'trend',
      title: 'TikTok Engagement Surge',
      description: 'TikTok engagement rates increased by 18% this week, driven by trending audio clips.',
      impact: 'high',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
    {
      id: '2',
      type: 'opportunity',
      title: 'Instagram Reels Opportunity',
      description: 'Instagram Reels showing 25% higher engagement than regular posts.',
      impact: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6)
    },
    {
      id: '3',
      type: 'alert',
      title: 'YouTube Revenue Dip',
      description: 'YouTube revenue down 5% this week. Consider content strategy review.',
      impact: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12)
    }
  ]
};

export default function TeamAnalyticsPage() {
  const { user } = useAuth();
  const { setCurrentTab, totalClientCount, refreshClients } = useTeamMode();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(mockAnalyticsData);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentTab('analytics');
  }, [setCurrentTab]);

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    // In a real app, this would trigger a data refresh
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      refreshClients();
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-mint" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4 text-mint" />;
      case 'opportunity': return <Target className="h-4 w-4 text-blue-500" />;
      case 'alert': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex h-screen bg-background">
      <TeamSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeamHeader />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-creative">Analytics & Insights</h1>
                <p className="text-muted-foreground">
                  Performance analytics for {totalClientCount.toLocaleString()} clients
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
                  {['24h', '7d', '30d', '90d'].map((range) => (
                    <Button
                      key={range}
                      variant={selectedTimeRange === range ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleTimeRangeChange(range)}
                      className="text-xs"
                    >
                      {range}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-mint" />
                  <span className="text-sm font-medium">Total Revenue</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData.overview.totalRevenue)}
                  </div>
                  <div className="flex items-center text-xs text-mint">
                    {getGrowthIcon(analyticsData.overview.revenueGrowth)}
                    <span className="ml-1">+{analyticsData.overview.revenueGrowth}% this month</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Heart className="h-4 w-4 text-coral" />
                  <span className="text-sm font-medium">Avg Engagement</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {analyticsData.overview.totalEngagement}%
                  </div>
                  <div className="flex items-center text-xs text-mint">
                    {getGrowthIcon(analyticsData.overview.engagementGrowth)}
                    <span className="ml-1">+{analyticsData.overview.engagementGrowth}% this month</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="h-4 w-4 text-lavender" />
                  <span className="text-sm font-medium">Total Reach</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {formatNumber(analyticsData.overview.totalReach)}
                  </div>
                  <div className="flex items-center text-xs text-mint">
                    {getGrowthIcon(analyticsData.overview.reachGrowth)}
                    <span className="ml-1">+{analyticsData.overview.reachGrowth}% this month</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium">Active Clients</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {analyticsData.overview.activeClients.toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-mint">
                    {getGrowthIcon(analyticsData.overview.clientGrowth)}
                    <span className="ml-1">+{analyticsData.overview.clientGrowth}% this month</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Platform Performance */}
            <GlassCard className="p-6">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="h-5 w-5" />
                <span className="text-lg font-semibold">Platform Performance</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Revenue and engagement by platform</p>
                <div className="space-y-4">
                  {analyticsData.platformMetrics.map((platform) => (
                    <div key={platform.platform} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <span className="font-semibold text-sm">{platform.platform.slice(0, 2)}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{platform.platform}</h3>
                          <p className="text-sm text-muted-foreground">
                            {platform.clients} clients
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(platform.revenue)}</div>
                          <div className="text-muted-foreground">Revenue</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{platform.engagement}%</div>
                          <div className="text-muted-foreground">Engagement</div>
                        </div>
                        <div className="flex items-center space-x-1 text-mint">
                          {getGrowthIcon(platform.growth)}
                          <span>+{platform.growth}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            </GlassCard>

            {/* Top Performers and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <GlassCard className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5" />
                  <span className="text-lg font-semibold">Top Performers</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">Highest revenue generating clients</p>
                  <div className="space-y-4">
                    {analyticsData.topPerformers.map((performer, index) => (
                      <div key={performer.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-mint/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-mint">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold">{performer.name}</h4>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {performer.platform}
                              </Badge>
                              <span>{formatNumber(performer.followers)} followers</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(performer.revenue)}</div>
                          <div className="flex items-center text-xs text-mint">
                            {getGrowthIcon(performer.growth)}
                            <span className="ml-1">+{performer.growth}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </GlassCard>

              {/* Recent Insights */}
              <GlassCard className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-lg font-semibold">Recent Insights</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">AI-powered analytics insights</p>
                  <div className="space-y-4">
                    {analyticsData.recentInsights.map((insight) => (
                      <div key={insight.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getInsightIcon(insight.type)}
                            <h4 className="font-semibold text-sm">{insight.title}</h4>
                          </div>
                          <Badge className={`text-xs ${getImpactColor(insight.impact)}`}>
                            {insight.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeAgo(insight.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
              </GlassCard>
            </div>

            {/* Analytics Components */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamAnalyticsOverview />
              <PerformanceMonitoringDashboard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 