'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Users, 
  DollarSign, 
  Zap,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { CircularScore } from '@/components/ui/circular-score';

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changeDirection: 'up' | 'down' | 'neutral';
  unit: string;
  format: 'number' | 'currency' | 'percentage';
  goal?: number;
  category: 'performance' | 'financial' | 'engagement' | 'growth';
}

interface PlatformInsight {
  platform: string;
  clients: number;
  avgEngagement: number;
  totalRevenue: number;
  growthRate: number;
  topPerformer: string;
  trending: 'up' | 'down' | 'stable';
}

interface IndustryBreakdown {
  industry: string;
  clientCount: number;
  percentage: number;
  avgEngagement: number;
  totalRevenue: number;
  color: string;
}

export function TeamAnalyticsOverview() {
  const { totalClientCount } = useTeamMode();
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock analytics data
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([
    {
      id: 'total_clients',
      name: 'Total Clients',
      value: totalClientCount,
      previousValue: 1195234,
      change: 4.4,
      changeDirection: 'up',
      unit: '',
      format: 'number',
      category: 'growth'
    },
    {
      id: 'avg_engagement',
      name: 'Average Engagement',
      value: 8.7,
      previousValue: 8.2,
      change: 6.1,
      changeDirection: 'up',
      unit: '%',
      format: 'percentage',
      goal: 10,
      category: 'performance'
    },
    {
      id: 'total_revenue',
      name: 'Total Revenue',
      value: 2847650,
      previousValue: 2456000,
      change: 15.9,
      changeDirection: 'up',
      unit: '$',
      format: 'currency',
      goal: 3000000,
      category: 'financial'
    },
    {
      id: 'active_workflows',
      name: 'Active Workflows',
      value: 1834,
      previousValue: 1756,
      change: 4.4,
      changeDirection: 'up',
      unit: '',
      format: 'number',
      category: 'performance'
    },
    {
      id: 'conversion_rate',
      name: 'Conversion Rate',
      value: 3.8,
      previousValue: 3.2,
      change: 18.8,
      changeDirection: 'up',
      unit: '%',
      format: 'percentage',
      goal: 5,
      category: 'performance'
    },
    {
      id: 'client_satisfaction',
      name: 'Client Satisfaction',
      value: 94.2,
      previousValue: 92.8,
      change: 1.5,
      changeDirection: 'up',
      unit: '%',
      format: 'percentage',
      goal: 95,
      category: 'engagement'
    }
  ]);

  const [platformInsights, setPlatformInsights] = useState<PlatformInsight[]>([
    {
      platform: 'Instagram',
      clients: 892,
      avgEngagement: 9.2,
      totalRevenue: 1250000,
      growthRate: 12.5,
      topPerformer: 'FashionForward Co.',
      trending: 'up'
    },
    {
      platform: 'TikTok',
      clients: 675,
      avgEngagement: 11.5,
      totalRevenue: 890000,
      growthRate: 18.2,
      topPerformer: 'TechStart Pro',
      trending: 'up'
    },
    {
      platform: 'YouTube',
      clients: 543,
      avgEngagement: 7.8,
      totalRevenue: 650000,
      growthRate: 8.7,
      topPerformer: 'Fitness Hub',
      trending: 'up'
    },
    {
      platform: 'Twitter',
      clients: 432,
      avgEngagement: 6.1,
      totalRevenue: 320000,
      growthRate: -2.1,
      topPerformer: 'NewsBreak Daily',
      trending: 'down'
    },
    {
      platform: 'LinkedIn',
      clients: 321,
      avgEngagement: 5.4,
      totalRevenue: 280000,
      growthRate: 3.2,
      topPerformer: 'B2B Solutions Inc.',
      trending: 'stable'
    }
  ]);

  const [industryBreakdown, setIndustryBreakdown] = useState<IndustryBreakdown[]>([
    {
      industry: 'Technology',
      clientCount: 298,
      percentage: 24.1,
      avgEngagement: 8.9,
      totalRevenue: 850000,
      color: 'bg-mint'
    },
    {
      industry: 'Fashion & Beauty',
      clientCount: 246,
      percentage: 19.8,
      avgEngagement: 10.2,
      totalRevenue: 720000,
      color: 'bg-lavender'
    },
    {
      industry: 'Health & Fitness',
      clientCount: 189,
      percentage: 15.2,
      avgEngagement: 9.5,
      totalRevenue: 560000,
      color: 'bg-coral'
    },
    {
      industry: 'Food & Beverage',
      clientCount: 176,
      percentage: 14.2,
      avgEngagement: 8.1,
      totalRevenue: 480000,
      color: 'bg-info'
    },
    {
      industry: 'Travel & Tourism',
      clientCount: 145,
      percentage: 11.7,
      avgEngagement: 7.8,
      totalRevenue: 390000,
      color: 'bg-warning'
    },
    {
      industry: 'Other',
      clientCount: 186,
      percentage: 15.0,
      avgEngagement: 7.2,
      totalRevenue: 420000,
      color: 'bg-muted'
    }
  ]);

  const formatValue = (value: number, format: string, unit: string) => {
    switch (format) {
      case 'currency':
        return `$${(value / 1000000).toFixed(1)}M`;
      case 'percentage':
        return `${value}${unit}`;
      case 'number':
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getChangeIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <ArrowUpRight className="h-3 w-3 text-mint" />;
      case 'down': return <ArrowDownRight className="h-3 w-3 text-coral" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getChangeColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-mint';
      case 'down': return 'text-coral';
      default: return 'text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return Activity;
      case 'financial': return DollarSign;
      case 'engagement': return Users;
      case 'growth': return TrendingUp;
      default: return BarChart3;
    }
  };

  const filteredMetrics = selectedCategory === 'all' 
    ? metrics 
    : metrics.filter(m => m.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-creative">Team Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights across {totalClientCount.toLocaleString()} clients
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map((metric) => {
            const IconComponent = getCategoryIcon(metric.category);
            
            return (
              <Card key={metric.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {getChangeIcon(metric.changeDirection)}
                      <span className={`text-xs font-medium ${getChangeColor(metric.changeDirection)}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {formatValue(metric.value, metric.format, metric.unit)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      vs. {formatValue(metric.previousValue, metric.format, metric.unit)} last period
                    </div>
                    
                    {metric.goal && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Goal Progress</span>
                          <span className="font-medium">
                            {Math.round((metric.value / metric.goal) * 100)}%
                          </span>
                        </div>
                        <Progress value={(metric.value / metric.goal) * 100} className="h-1" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="platforms" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platforms">Platform Analysis</TabsTrigger>
          <TabsTrigger value="industries">Industry Breakdown</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="space-y-4">
            {platformInsights.map((platform) => (
              <Card key={platform.platform} className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{platform.platform}</h3>
                        <p className="text-sm text-muted-foreground">
                          {platform.clients} active clients
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        platform.trending === 'up' ? 'bg-mint/20 text-mint border-mint' :
                        platform.trending === 'down' ? 'bg-coral/20 text-coral border-coral' :
                        'bg-warning/20 text-warning border-warning'
                      }>
                        {platform.trending === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {platform.trending === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                        {platform.trending === 'stable' && <Minus className="h-3 w-3 mr-1" />}
                        {platform.trending}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <CircularScore 
                        score={platform.avgEngagement} 
                        className="text-mint mb-2"
                        size="sm"
                      />
                      <p className="text-xs text-muted-foreground">Avg Engagement</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        ${(platform.totalRevenue / 1000).toFixed(0)}k
                      </div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-lg font-bold flex items-center justify-center space-x-1 ${
                        platform.growthRate > 0 ? 'text-mint' : 'text-coral'
                      }`}>
                        <span>{platform.growthRate > 0 ? '+' : ''}{platform.growthRate}%</span>
                        {platform.growthRate > 0 ? 
                          <TrendingUp className="h-4 w-4" /> : 
                          <TrendingDown className="h-4 w-4" />
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">Growth Rate</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground truncate">
                        {platform.topPerformer}
                      </div>
                      <p className="text-xs text-muted-foreground">Top Performer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="industries" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Industry Distribution Chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Client Distribution by Industry</CardTitle>
                <CardDescription>Breakdown of clients across different sectors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {industryBreakdown.map((industry) => (
                    <div key={industry.industry} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${industry.color}`}></div>
                          <span className="text-sm font-medium">{industry.industry}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {industry.clientCount} clients ({industry.percentage}%)
                        </div>
                      </div>
                      <Progress value={industry.percentage} className="h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Industry Performance Metrics */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Industry Performance</CardTitle>
                <CardDescription>Engagement and revenue by sector</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {industryBreakdown.map((industry) => (
                    <div key={industry.industry} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <h4 className="font-medium">{industry.industry}</h4>
                        <p className="text-sm text-muted-foreground">
                          {industry.avgEngagement}% avg engagement
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          ${(industry.totalRevenue / 1000).toFixed(0)}k
                        </div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Top Performing Clients</span>
                </CardTitle>
                <CardDescription>Highest engagement rates this {timeRange}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'TechStart Pro', engagement: 15.2, revenue: 85000, trend: 'up' },
                    { name: 'Fashion Forward', engagement: 14.8, revenue: 72000, trend: 'up' },
                    { name: 'Fitness Hub', engagement: 13.9, revenue: 68000, trend: 'up' },
                    { name: 'Gourmet Eats', engagement: 13.1, revenue: 61000, trend: 'neutral' },
                    { name: 'Travel Dreams', engagement: 12.7, revenue: 58000, trend: 'down' }
                  ].map((client, index) => (
                    <div key={client.name} className="flex items-center space-x-3 p-2 rounded">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.engagement}% engagement • ${(client.revenue / 1000).toFixed(0)}k revenue
                        </p>
                      </div>
                      {client.trend === 'up' && <TrendingUp className="h-4 w-4 text-mint" />}
                      {client.trend === 'down' && <TrendingDown className="h-4 w-4 text-coral" />}
                      {client.trend === 'neutral' && <Minus className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Attention Required</span>
                </CardTitle>
                <CardDescription>Clients needing immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Local Bakery', issue: 'Low engagement (2.1%)', severity: 'high' },
                    { name: 'Pet Store Plus', issue: 'Workflow errors (3 failed)', severity: 'medium' },
                    { name: 'Auto Repair Co', issue: 'No posts in 7 days', severity: 'high' },
                    { name: 'Home Decor Hub', issue: 'Declining reach (-15%)', severity: 'medium' },
                    { name: 'Sports Equipment', issue: 'Payment overdue', severity: 'high' }
                  ].map((client) => (
                    <div key={client.name} className="flex items-start space-x-3 p-2 rounded">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        client.severity === 'high' ? 'bg-coral' : 'bg-warning'
                      }`}></div>
                      <div className="flex-1">
                        <p className="font-medium">{client.name}</p>
                        <p className={`text-sm ${
                          client.severity === 'high' ? 'text-coral' : 'text-warning'
                        }`}>
                          {client.issue}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Fix
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>AI-Powered Insights</span>
                </CardTitle>
                <CardDescription>Automated recommendations and insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: 'Optimal Posting Times',
                    insight: 'Tuesday 2:00 PM shows 23% higher engagement across Fashion & Beauty clients',
                    action: 'Update Blitz schedules',
                    impact: 'High'
                  },
                  {
                    title: 'Trending Content Types',
                    insight: 'Short-form video content performing 45% better than images this month',
                    action: 'Adjust content strategy',
                    impact: 'Medium'
                  },
                  {
                    title: 'Platform Opportunity',
                    insight: 'TikTok showing strong growth potential for Technology sector clients',
                    action: 'Expand TikTok presence',
                    impact: 'High'
                  }
                ].map((insight, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant={insight.impact === 'High' ? 'default' : 'secondary'}>
                        {insight.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{insight.insight}</p>
                    <Button size="sm" variant="outline">
                      {insight.action}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Performance Predictions</CardTitle>
                <CardDescription>AI forecasts for next 30 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    metric: 'Average Engagement',
                    current: 8.7,
                    predicted: 9.2,
                    confidence: 87
                  },
                  {
                    metric: 'Total Revenue',
                    current: 2847650,
                    predicted: 3120000,
                    confidence: 78
                  },
                  {
                    metric: 'Client Satisfaction',
                    current: 94.2,
                    predicted: 95.1,
                    confidence: 92
                  }
                ].map((prediction) => (
                  <div key={prediction.metric} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{prediction.metric}</span>
                      <span className="text-xs text-muted-foreground">
                        {prediction.confidence}% confidence
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {prediction.metric.includes('Revenue') ? 
                          `$${(prediction.current / 1000000).toFixed(1)}M` : 
                          `${prediction.current}${prediction.metric.includes('Engagement') || prediction.metric.includes('Satisfaction') ? '%' : ''}`
                        }
                      </span>
                      <TrendingUp className="h-3 w-3 text-mint" />
                      <span className="text-sm font-medium text-mint">
                        {prediction.metric.includes('Revenue') ? 
                          `$${(prediction.predicted / 1000000).toFixed(1)}M` : 
                          `${prediction.predicted}${prediction.metric.includes('Engagement') || prediction.metric.includes('Satisfaction') ? '%' : ''}`
                        }
                      </span>
                    </div>
                    <Progress value={prediction.confidence} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 