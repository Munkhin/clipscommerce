'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccessibilityHelpers } from '@/lib/accessibility/accessibilityAuditor';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Users, 
  Zap, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  Eye,
  Heart,
  Share2,
  DollarSign,
  Target,
  Gauge,
  Link as LinkIcon,
  Info,
  Brain,
  Lightbulb,
  Sparkles,
  ArrowRight,
  TrendingUp as TrendUp,
  Bot,
  Wand2,
  ChevronRight,
  Star,
  Rocket,
  Shield,
  Layers
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { CircularScore } from '@/components/ui/circular-score';
import Link from 'next/link';
import { MiniTrendChart } from '@/components/ui/mini-trend-chart';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeDirection: 'up' | 'down' | 'neutral';
  unit: string;
  target?: number;
  status: 'good' | 'warning' | 'critical';
  category?: 'key' | 'niche' | 'ab_test' | 'predictive' | 'other';
  detailsLink?: string;
  icon?: React.ElementType;
  trendData?: Array<{ name: string; value: number }>;
}

interface ClientPerformanceData {
  clientId: string;
  clientName: string;
  engagement: number;
  reach: number;
  conversions: number;
  revenue: number;
  trendsData: {
    date: string;
    engagement: number;
    reach: number;
    revenue: number;
  }[];
}

interface SystemHealth {
  apiLatency: number;
  uptime: number;
  processingQueue: number;
  activeWorkflows: number;
  errorRate: number;
}

interface AIRecommendation {
  id: string;
  type: 'optimization' | 'prediction' | 'alert' | 'opportunity' | 'automation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    metric: string;
    expectedChange: number;
    confidence: number;
  };
  action: {
    type: 'workflow' | 'setting' | 'content' | 'schedule' | 'manual';
    label: string;
    automated?: boolean;
  };
  affectedClients: number;
  estimatedROI?: number;
  timeframe: string;
  category: string;
  icon: React.ElementType;
}

export function PerformanceMonitoringDashboard() {
  const { clients, totalClientCount } = useTeamMode();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('engagement');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedOverviewCategory, setSelectedOverviewCategory] = useState<'all' | 'key' | 'niche' | 'ab_test' | 'predictive' | 'other'>('all');

  // Mock AI recommendations data
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([
    {
      id: 'rec-1',
      type: 'optimization',
      priority: 'high',
      title: 'Optimize Posting Schedule for 847 Clients',
      description: 'AI analysis shows 847 clients could increase engagement by 23% by shifting posting times to peak audience activity windows.',
      impact: {
        metric: 'engagement',
        expectedChange: 23,
        confidence: 94
      },
      action: {
        type: 'workflow',
        label: 'Auto-optimize Schedules',
        automated: true
      },
      affectedClients: 847,
      estimatedROI: 156000,
      timeframe: '2-3 weeks',
      category: 'Content Timing',
      icon: Clock
    },
    {
      id: 'rec-2',
      type: 'prediction',
      priority: 'high',
      title: 'Churn Risk Alert: 23 High-Value Clients',
      description: 'Predictive model identifies 23 high-value clients at 78% risk of churning within 30 days based on engagement patterns.',
      impact: {
        metric: 'retention',
        expectedChange: -15,
        confidence: 87
      },
      action: {
        type: 'workflow',
        label: 'Launch Retention Campaign',
        automated: false
      },
      affectedClients: 23,
      estimatedROI: 89000,
      timeframe: 'Immediate',
      category: 'Client Retention',
      icon: Shield
    },
    {
      id: 'rec-3',
      type: 'opportunity',
      priority: 'medium',
      title: 'Brand Voice Optimization Opportunity',
      description: 'Clients using "Professional & Innovative" brand voice show 31% higher conversion rates. 234 clients could benefit from voice adjustment.',
      impact: {
        metric: 'conversions',
        expectedChange: 31,
        confidence: 91
      },
      action: {
        type: 'workflow',
        label: 'Update Brand Voices',
        automated: true
      },
      affectedClients: 234,
      estimatedROI: 78000,
      timeframe: '1-2 weeks',
      category: 'Brand Voice',
      icon: Brain
    },
    {
      id: 'rec-4',
      type: 'automation',
      priority: 'medium',
      title: 'Scale Feedback Automation',
      description: 'Current feedback generation covers 67% of clients. Scaling to 100% could improve client satisfaction by 18% and reduce churn.',
      impact: {
        metric: 'satisfaction',
        expectedChange: 18,
        confidence: 85
      },
      action: {
        type: 'workflow',
        label: 'Enable Full Automation',
        automated: true
      },
      affectedClients: 412,
      estimatedROI: 124000,
      timeframe: '3-4 weeks',
      category: 'Automation Scale',
      icon: Bot
    },
    {
      id: 'rec-5',
      type: 'optimization',
      priority: 'low',
      title: 'Content Ideation Frequency Adjustment',
      description: 'Clients receiving weekly content ideas show 12% better content consistency. Consider increasing ideation frequency for 156 clients.',
      impact: {
        metric: 'consistency',
        expectedChange: 12,
        confidence: 79
      },
      action: {
        type: 'setting',
        label: 'Adjust Frequency',
        automated: false
      },
      affectedClients: 156,
      estimatedROI: 34000,
      timeframe: '2-3 weeks',
      category: 'Content Strategy',
      icon: Lightbulb
    }
  ]);

  // Mock performance data
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([
    {
      id: 'total_engagement',
      name: 'Total Engagement',
      value: 8.7,
      change: 12.3,
      changeDirection: 'up',
      unit: '%',
      target: 10,
      status: 'good',
      category: 'key',
      icon: TrendingUp,
      trendData: [
        { name: 'W1', value: 7.5 },
        { name: 'W2', value: 7.8 },
        { name: 'W3', value: 8.1 },
        { name: 'W4', value: 8.5 },
        { name: 'W5', value: 8.3 },
        { name: 'W6', value: 8.7 },
      ]
    },
    {
      id: 'avg_reach',
      name: 'Average Reach',
      value: 245600,
      change: -3.2,
      changeDirection: 'down',
      unit: '',
      target: 300000,
      status: 'warning',
      category: 'key',
      icon: Users,
      trendData: [
        { name: 'M1', value: 220000 },
        { name: 'M2', value: 235000 },
        { name: 'M3', value: 250000 },
        { name: 'M4', value: 240000 },
        { name: 'M5', value: 260000 },
        { name: 'M6', value: 245600 },
      ]
    },
    {
      id: 'conversion_rate',
      name: 'Conversion Rate',
      value: 3.4,
      change: 8.7,
      changeDirection: 'up',
      unit: '%',
      target: 5,
      status: 'good',
      category: 'key',
      icon: Zap
    },
    {
      id: 'total_revenue',
      name: 'Total Revenue',
      value: 1250000,
      change: 15.2,
      changeDirection: 'up',
      unit: '$',
      target: 1500000,
      status: 'good',
      category: 'key',
      icon: DollarSign,
      trendData: [
        { name: 'Q1', value: 950000 },
        { name: 'Q2', value: 1100000 },
        { name: 'Q3', value: 1050000 },
        { name: 'Q4', value: 1250000 },
      ]
    },
    {
      id: 'niche_fashion_conversion',
      name: 'Fashion Niche Conversion',
      value: 4.1,
      change: 5.0,
      changeDirection: 'up',
      unit: '%',
      target: 4.5,
      status: 'good',
      category: 'niche',
      icon: Info,
      detailsLink: '/dashboard/analytics/niche/fashion',
      trendData: [
        { name: 'Jan', value: 3.5 },
        { name: 'Feb', value: 3.8 },
        { name: 'Mar', value: 3.9 },
        { name: 'Apr', value: 4.2 },
        { name: 'May', value: 4.0 },
        { name: 'Jun', value: 4.1 },
      ]
    },
    {
      id: 'ab_test_cta_button',
      name: 'A/B Test: New CTA Button',
      value: 15.0,
      change: 2.5,
      changeDirection: 'up',
      unit: '% uplift',
      status: 'good',
      category: 'ab_test',
      icon: BarChart3,
      detailsLink: '/dashboard/ab-tests/cta-button-test'
    },
    {
      id: 'predictive_churn_risk',
      name: 'Predicted Churn Risk',
      value: 7.8,
      change: -1.2,
      changeDirection: 'down',
      unit: '%',
      status: 'warning',
      category: 'predictive',
      icon: AlertTriangle,
      detailsLink: '/dashboard/analytics/predictive/churn'
    }
  ]);

  // Mock client performance data
  const [clientPerformanceData, setClientPerformanceData] = useState<ClientPerformanceData[]>([
    {
      clientId: 'client-1',
      clientName: 'TechFlow Solutions',
      engagement: 9.2,
      reach: 45600,
      conversions: 234,
      revenue: 15600,
      trendsData: [
        { date: '2025-01-14', engagement: 8.5, reach: 42000, revenue: 14200 },
        { date: '2025-01-15', engagement: 8.8, reach: 43500, revenue: 14800 },
        { date: '2025-01-16', engagement: 9.1, reach: 44200, revenue: 15200 },
        { date: '2025-01-17', engagement: 9.0, reach: 45000, revenue: 15400 },
        { date: '2025-01-18', engagement: 9.2, reach: 45600, revenue: 15600 },
      ]
    },
    {
      clientId: 'client-2',
      clientName: 'Creative Studio Plus',
      engagement: 7.8,
      reach: 38200,
      conversions: 189,
      revenue: 12400,
      trendsData: [
        { date: '2025-01-14', engagement: 8.2, reach: 39000, revenue: 13000 },
        { date: '2025-01-15', engagement: 8.0, reach: 38800, revenue: 12800 },
        { date: '2025-01-16', engagement: 7.9, reach: 38500, revenue: 12600 },
        { date: '2025-01-17', engagement: 7.7, reach: 38000, revenue: 12300 },
        { date: '2025-01-18', engagement: 7.8, reach: 38200, revenue: 12400 },
      ]
    }
  ]);

  // Mock system health data
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    apiLatency: 145,
    uptime: 99.97,
    processingQueue: 23,
    activeWorkflows: 47,
    errorRate: 0.03
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-mint bg-mint/10 border-mint/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'critical': return 'text-coral bg-coral/10 border-coral/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Activity;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '$') {
      return `$${value.toLocaleString()}`;
    } else if (unit === '%') {
      return `${value}%`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-coral bg-coral/10 border-coral/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-info bg-info/10 border-info/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getRecommendationTypeColor = (type: string) => {
    switch (type) {
      case 'optimization': return 'text-mint bg-mint/10 border-mint/20';
      case 'prediction': return 'text-coral bg-coral/10 border-coral/20';
      case 'alert': return 'text-warning bg-warning/10 border-warning/20';
      case 'opportunity': return 'text-info bg-info/10 border-info/20';
      case 'automation': return 'text-lavender bg-lavender/10 border-lavender/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const executeRecommendation = (recommendation: AIRecommendation) => {
    // In a real app, this would trigger the appropriate action
    console.log('Executing recommendation:', recommendation.id);
    
    // Simulate automation execution
    if (recommendation.action.automated) {
      // Show success message or update UI
      alert(`Automated action "${recommendation.action.label}" has been initiated for ${recommendation.affectedClients} clients.`);
    } else {
      // Navigate to manual action page or show configuration
      alert(`Manual action required: ${recommendation.action.label}`);
    }
  };

  const filteredMetrics = selectedOverviewCategory === 'all' 
    ? metrics 
    : metrics.filter(metric => metric.category === selectedOverviewCategory);

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In a real app, this would fetch fresh data
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-creative">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time analytics and AI-powered insights for {totalClientCount.toLocaleString()} clients
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Live
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            {aiRecommendations.filter(r => r.priority === 'high').length} AI Insights
          </Badge>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="clients">Client Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Category:</span>
            <Select value={selectedOverviewCategory} onValueChange={(value: any) => setSelectedOverviewCategory(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="key">Key Metrics</SelectItem>
                <SelectItem value="niche">Niche Analytics</SelectItem>
                <SelectItem value="ab_test">A/B Tests</SelectItem>
                <SelectItem value="predictive">Predictive</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredMetrics.map((metric) => {
              const IconComponent = metric.icon || Activity;
              const TrendIconComponent = getTrendIcon(metric.changeDirection);
              
              return (
                <Card key={metric.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                      <p className="text-2xl font-bold">{formatValue(metric.value, metric.unit)}</p>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center space-x-1 ${
                          metric.changeDirection === 'up' ? 'text-mint' : 
                          metric.changeDirection === 'down' ? 'text-coral' : 'text-muted-foreground'
                        }`}>
                          <TrendIconComponent className="h-3 w-3" />
                          <span className="text-xs font-medium">{Math.abs(metric.change)}%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">vs last period</span>
                      </div>

                      {metric.target && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress to target</span>
                            <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                          </div>
                          <Progress value={(metric.value / metric.target) * 100} className="h-1" />
                        </div>
                      )}

                      {metric.trendData && (
                        <div className="mt-2">
                          <MiniTrendChart data={metric.trendData} />
                        </div>
                      )}

                      {metric.detailsLink && (
                        <Link href={metric.detailsLink}>
                          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6" aria-live="polite">
          {/* AI Insights Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Automated recommendations based on performance analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {aiRecommendations.length} Active Insights
              </Badge>
              <Button variant="outline" size="sm">
                <Wand2 className="h-3 w-3 mr-1" />
                Refresh Analysis
              </Button>
            </div>
          </div>

          {/* Priority Recommendations */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              High Priority Recommendations
            </h4>
            
            {aiRecommendations
              .filter(rec => rec.priority === 'high')
              .map((recommendation) => {
                const IconComponent = recommendation.icon;
                
                return (
                  <Card key={recommendation.id} className="border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg ${getRecommendationTypeColor(recommendation.type)}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{recommendation.title}</h4>
                              <Badge className={getPriorityColor(recommendation.priority)}>
                                {recommendation.priority} priority
                              </Badge>
                              <Badge className={getRecommendationTypeColor(recommendation.type)}>
                                {recommendation.type}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {recommendation.description}
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Impact:</span>
                                <div className="font-medium text-mint">
                                  +{recommendation.impact.expectedChange}% {recommendation.impact.metric}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Confidence:</span>
                                <div className="font-medium">{recommendation.impact.confidence}%</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Affected Clients:</span>
                                <div className="font-medium">{recommendation.affectedClients.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Est. ROI:</span>
                                <div className="font-medium text-mint">
                                  ${recommendation.estimatedROI?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Timeframe: {recommendation.timeframe}</span>
                              <span>•</span>
                              <span>Category: {recommendation.category}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => executeRecommendation(recommendation)}
                            className={recommendation.action.automated ? 'bg-primary' : 'bg-secondary'}
                          >
                            {recommendation.action.automated && <Bot className="h-3 w-3 mr-1" />}
                            {recommendation.action.label}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                          {recommendation.action.automated && (
                            <Badge variant="outline" className="text-xs justify-center">
                              <Zap className="h-2 w-2 mr-1" />
                              Auto-executable
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Other Recommendations */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-info" />
              Additional Opportunities
            </h4>
            
            <div className="grid gap-4">
              {aiRecommendations
                .filter(rec => rec.priority !== 'high')
                .map((recommendation) => {
                  const IconComponent = recommendation.icon;
                  
                  return (
                    <Card key={recommendation.id} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${getRecommendationTypeColor(recommendation.type)}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <h5 className="font-medium">{recommendation.title}</h5>
                              <p className="text-sm text-muted-foreground">
                                +{recommendation.impact.expectedChange}% {recommendation.impact.metric} • {recommendation.affectedClients} clients
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(recommendation.priority)}>
                              {recommendation.priority}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => executeRecommendation(recommendation)}
                            >
                              {recommendation.action.automated && <Bot className="h-3 w-3 mr-1" />}
                              {recommendation.action.label}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>

          {/* AI Performance Summary */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                AI Recommendation Performance
              </CardTitle>
              <CardDescription>
                Track the impact of implemented AI recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-mint">94%</div>
                  <div className="text-sm text-muted-foreground">Average Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-info">$2.3M</div>
                  <div className="text-sm text-muted-foreground">Total ROI Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-lavender">847</div>
                  <div className="text-sm text-muted-foreground">Recommendations Implemented</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          {/* Client Performance Table */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Top Performing Clients</CardTitle>
              <CardDescription>Client performance metrics for the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientPerformanceData.map((client) => (
                  <div key={client.clientId} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-medium">{client.clientName}</h4>
                        <p className="text-sm text-muted-foreground">Client ID: {client.clientId}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <div className="text-lg font-bold">{client.engagement}%</div>
                        <div className="text-xs text-muted-foreground">Engagement</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{client.reach.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Reach</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{client.conversions}</div>
                        <div className="text-xs text-muted-foreground">Conversions</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">${client.revenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <Badge className="bg-mint/20 text-mint border-mint">Good</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">API Latency</p>
                  <p className="text-2xl font-bold">{systemHealth.apiLatency}ms</p>
                  <p className="text-xs text-muted-foreground">Average response time</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <Badge className="bg-mint/20 text-mint border-mint">Excellent</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold">{systemHealth.uptime}%</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <Badge className="bg-info/20 text-info border-info">Normal</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Processing Queue</p>
                  <p className="text-2xl font-bold">{systemHealth.processingQueue}</p>
                  <p className="text-xs text-muted-foreground">Jobs pending</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <Badge className="bg-mint/20 text-mint border-mint">Active</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                  <p className="text-2xl font-bold">{systemHealth.activeWorkflows}</p>
                  <p className="text-xs text-muted-foreground">Currently running</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <Badge className="bg-mint/20 text-mint border-mint">Low</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold">{systemHealth.errorRate}%</p>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Historical performance data and trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Trend charts would be rendered here</p>
                  <p className="text-sm">Integration with charting library required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 