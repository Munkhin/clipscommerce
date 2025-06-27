import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Cpu,
  Database,
  HardDrive,
  Network,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
  BarChart3,
  Gauge,
  Lightbulb,
  Wrench,
  Shield,
  Rocket,
  Brain,
  Eye,
  Timer,
  Server,
  Monitor,
  Play,
  Pause
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  category: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'application';
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  lastUpdated: Date;
  history: number[];
}

interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'resource' | 'scaling' | 'caching' | 'database';
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
  status: 'pending' | 'in-progress' | 'completed' | 'dismissed';
  createdAt: Date;
  implementedAt?: Date;
}

interface ResourceUsage {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'disk' | 'network';
  current: number;
  peak: number;
  average: number;
  limit: number;
  efficiency: number;
  cost: number;
  recommendations: string[];
}

interface PerformanceAlert {
  id: string;
  type: 'performance' | 'resource' | 'threshold' | 'anomaly';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

const PerformanceOptimizer: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedEffort, setSelectedEffort] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [autoOptimization, setAutoOptimization] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [automationStatus, setAutomationStatus] = useState<'idle' | 'running' | 'paused' | 'error'>('idle');
  const [automationProgress, setAutomationProgress] = useState(0);
  const [automationLog, setAutomationLog] = useState<string[]>([]);
  const [lastAutomationRun, setLastAutomationRun] = useState<Date | null>(null);

  // Initialize with sample data
  useEffect(() => {
    const sampleMetrics: PerformanceMetric[] = [
      {
        id: 'cpu-usage',
        name: 'CPU Usage',
        category: 'cpu',
        currentValue: 67.5,
        targetValue: 70,
        unit: '%',
        trend: 'up',
        status: 'warning',
        lastUpdated: new Date(),
        history: [45, 52, 58, 61, 65, 67.5]
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        category: 'memory',
        currentValue: 78.2,
        targetValue: 80,
        unit: '%',
        trend: 'stable',
        status: 'warning',
        lastUpdated: new Date(),
        history: [72, 75, 77, 78, 78.5, 78.2]
      },
      {
        id: 'response-time',
        name: 'Response Time',
        category: 'application',
        currentValue: 245,
        targetValue: 200,
        unit: 'ms',
        trend: 'down',
        status: 'good',
        lastUpdated: new Date(),
        history: [320, 280, 260, 250, 248, 245]
      },
      {
        id: 'db-connections',
        name: 'Database Connections',
        category: 'database',
        currentValue: 85,
        targetValue: 100,
        unit: 'connections',
        trend: 'up',
        status: 'good',
        lastUpdated: new Date(),
        history: [65, 70, 75, 80, 82, 85]
      }
    ];

    const sampleSuggestions: OptimizationSuggestion[] = [
      {
        id: '1',
        title: 'Implement Redis Caching',
        description: 'Add Redis caching layer to reduce database queries and improve response times',
        category: 'caching',
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        estimatedImprovement: '40% faster response times',
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: '2',
        title: 'Optimize Database Queries',
        description: 'Review and optimize slow database queries, add missing indexes',
        category: 'database',
        priority: 'high',
        impact: 'medium',
        effort: 'high',
        estimatedImprovement: '25% reduction in query time',
        status: 'in-progress',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        title: 'Enable Gzip Compression',
        description: 'Enable gzip compression for API responses to reduce bandwidth usage',
        category: 'performance',
        priority: 'medium',
        impact: 'medium',
        effort: 'low',
        estimatedImprovement: '60% reduction in response size',
        status: 'pending',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: '4',
        title: 'Scale Video Processing Workers',
        description: 'Add more worker instances to handle video processing queue',
        category: 'scaling',
        priority: 'critical',
        impact: 'high',
        effort: 'low',
        estimatedImprovement: '3x faster processing',
        status: 'pending',
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    const sampleResourceUsage: ResourceUsage[] = [
      {
        id: 'cpu',
        name: 'CPU Cores',
        type: 'cpu',
        current: 67.5,
        peak: 89.2,
        average: 58.3,
        limit: 100,
        efficiency: 73.2,
        cost: 245.50,
        recommendations: ['Consider auto-scaling', 'Optimize CPU-intensive tasks']
      },
      {
        id: 'memory',
        name: 'Memory',
        type: 'memory',
        current: 78.2,
        peak: 92.1,
        average: 71.5,
        limit: 100,
        efficiency: 81.7,
        cost: 189.30,
        recommendations: ['Monitor memory leaks', 'Implement memory pooling']
      },
      {
        id: 'storage',
        name: 'Storage',
        type: 'disk',
        current: 45.8,
        peak: 67.3,
        average: 42.1,
        limit: 100,
        efficiency: 68.9,
        cost: 156.80,
        recommendations: ['Archive old data', 'Implement data compression']
      },
      {
        id: 'bandwidth',
        name: 'Network Bandwidth',
        type: 'network',
        current: 34.2,
        peak: 78.9,
        average: 28.7,
        limit: 100,
        efficiency: 45.3,
        cost: 98.70,
        recommendations: ['Optimize data transfer', 'Use CDN for static assets']
      }
    ];

    const sampleAlerts: PerformanceAlert[] = [
      {
        id: '1',
        type: 'threshold',
        severity: 'warning',
        message: 'CPU usage approaching threshold',
        component: 'Application Server',
        value: 67.5,
        threshold: 70,
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        acknowledged: false,
        resolved: false
      },
      {
        id: '2',
        type: 'performance',
        severity: 'error',
        message: 'Response time degradation detected',
        component: 'API Gateway',
        value: 450,
        threshold: 300,
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        acknowledged: true,
        resolved: false
      }
    ];

    setMetrics(sampleMetrics);
    setSuggestions(sampleSuggestions);
    setResourceUsage(sampleResourceUsage);
    setAlerts(sampleAlerts);
  }, []);

  // Simulate real-time metric updates
  useEffect(() => {
    if (!monitoringEnabled) return;

    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        const change = (Math.random() - 0.5) * 5;
        const newValue = Math.max(0, Math.min(100, metric.currentValue + change));
        const newHistory = [...metric.history.slice(-5), newValue];
        
        let status: 'good' | 'warning' | 'critical' = 'good';
        if (newValue >= metric.targetValue * 0.9) status = 'warning';
        if (newValue >= metric.targetValue) status = 'critical';

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (newValue > metric.currentValue + 1) trend = 'up';
        if (newValue < metric.currentValue - 1) trend = 'down';

        return {
          ...metric,
          currentValue: newValue,
          status,
          trend,
          history: newHistory,
          lastUpdated: new Date()
        };
      }));

      setResourceUsage(prev => prev.map(resource => ({
        ...resource,
        current: Math.max(0, Math.min(100, resource.current + (Math.random() - 0.5) * 3)),
        efficiency: Math.max(0, Math.min(100, resource.efficiency + (Math.random() - 0.5) * 2))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [monitoringEnabled]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'border-blue-500 bg-blue-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'error': return 'border-orange-500 bg-orange-50';
      case 'critical': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cpu': return <Cpu className="h-4 w-4" />;
      case 'memory': return <Database className="h-4 w-4" />;
      case 'disk': return <HardDrive className="h-4 w-4" />;
      case 'network': return <Network className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'application': return <Monitor className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const implementSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.map(suggestion => 
      suggestion.id === suggestionId 
        ? { ...suggestion, status: 'in-progress' as const }
        : suggestion
    ));
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.map(suggestion => 
      suggestion.id === suggestionId 
        ? { ...suggestion, status: 'dismissed' as const }
        : suggestion
    ));
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const categoryMatch = selectedCategory === 'all' || suggestion.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || suggestion.priority === selectedPriority;
    const impactMatch = selectedImpact === 'all' || suggestion.impact === selectedImpact;
    const effortMatch = selectedEffort === 'all' || suggestion.effort === selectedEffort;
    const searchMatch = suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        suggestion.description.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && priorityMatch && impactMatch && effortMatch && searchMatch;
  }).sort((a, b) => {
    if (sortBy === 'createdAt') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else if (sortBy === 'priority') {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    } else if (sortBy === 'impact') {
      const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Optimizer</h2>
          <p className="text-muted-foreground">
            Monitor performance metrics and optimize system resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {metrics.filter(m => m.status === 'good').length} Healthy
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {alerts.filter(a => !a.acknowledged).length} Alerts
          </Badge>
          <Button 
            variant={monitoringEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setMonitoringEnabled(!monitoringEnabled)}
          >
            {monitoringEnabled ? <Eye className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="suggestions">Optimization</TabsTrigger>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(metric.category)}
                      <span className="font-medium text-sm">{metric.name}</span>
                    </div>
                    {getTrendIcon(metric.trend)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                        {metric.currentValue.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">{metric.unit}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Target: {metric.targetValue}{metric.unit}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusBadgeColor(metric.status)} text-white text-xs`}
                      >
                        {metric.status}
                      </Badge>
                    </div>
                    
                    <Progress 
                      value={(metric.currentValue / metric.targetValue) * 100} 
                      className="h-2" 
                    />
                    
                    <div className="text-xs text-muted-foreground">
                      Updated: {metric.lastUpdated.toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mr-2" />
                Performance trend charts would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="scaling">Scaling</SelectItem>
                <SelectItem value="caching">Caching</SelectItem>
                <SelectItem value="database">Database</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedImpact} onValueChange={setSelectedImpact}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impacts</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEffort} onValueChange={setSelectedEffort}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by effort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Efforts</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="text" 
              placeholder="Search suggestions..." 
              className="w-full md:w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest First</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="impact">Impact</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm">Auto Optimization:</span>
              <Button 
                variant={autoOptimization ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoOptimization(!autoOptimization)}
              >
                {autoOptimization ? <Rocket className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredSuggestions.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(suggestion.category)}
                        <h3 className="font-semibold">{suggestion.title}</h3>
                        <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {suggestion.category}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Impact:</span>
                          <div className={`font-medium capitalize ${getPriorityColor(suggestion.impact)}`}>{suggestion.impact}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Effort:</span>
                          <div className="font-medium capitalize">{suggestion.effort}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Improvement:</span>
                          <div className="font-bold">{suggestion.estimatedImprovement}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Created: {suggestion.createdAt.toLocaleString()}</span>
                        {suggestion.implementedAt && (
                          <>
                            <span>•</span>
                            <span>Implemented: {suggestion.implementedAt.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {suggestion.status === 'pending' && (
                        <>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => implementSuggestion(suggestion.id)}
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Implement
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => dismissSuggestion(suggestion.id)}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                      {suggestion.status === 'in-progress' && (
                        <Badge variant="secondary" className="bg-blue-500 text-white">
                          In Progress
                        </Badge>
                      )}
                      {suggestion.status === 'completed' && (
                        <Badge variant="secondary" className="bg-green-500 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {resourceUsage.map((resource) => (
              <Card key={resource.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(resource.type)}
                        <h3 className="font-semibold">{resource.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">${resource.cost.toFixed(2)}/month</div>
                        <div className="text-xs text-muted-foreground">Cost</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current:</span>
                        <div className="font-medium">{resource.current.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Peak:</span>
                        <div className="font-medium">{resource.peak.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Average:</span>
                        <div className="font-medium">{resource.average.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Usage</span>
                          <span>{resource.current.toFixed(1)}%</span>
                        </div>
                        <Progress value={resource.current} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Efficiency</span>
                          <span>{resource.efficiency.toFixed(1)}%</span>
                        </div>
                        <Progress value={resource.efficiency} className="h-2" />
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Recommendations:</span>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {resource.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Resource Optimization Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">$689.30</div>
                  <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">67.3%</div>
                  <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">$156.20</div>
                  <p className="text-sm text-muted-foreground">Potential Savings</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">23%</div>
                  <p className="text-sm text-muted-foreground">Cost Reduction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Performance Alerts</h3>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Configure Thresholds
            </Button>
          </div>

          <div className="grid gap-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'error' ? 'text-orange-500' :
                            alert.severity === 'warning' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`} />
                          <span className="font-medium">{alert.component}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {alert.type}
                          </Badge>
                        </div>
                        
                        <p className="text-sm">{alert.message}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Value: {alert.value}</span>
                          <span>Threshold: {alert.threshold}</span>
                          <span>Time: {alert.timestamp.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!alert.acknowledged && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                        {alert.acknowledged && !alert.resolved && (
                          <Badge variant="secondary" className="bg-blue-500 text-white">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-muted-foreground">No active alerts</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All performance metrics are within normal ranges
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-purple-500" />
                Automated Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Optimization Enabled</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply optimization suggestions based on defined rules.
                  </p>
                </div>
                <Button
                  variant={autoOptimization ? "default" : "outline"}
                  onClick={() => setAutoOptimization(!autoOptimization)}
                >
                  {autoOptimization ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Current Status</h4>
                  <p className="text-sm text-muted-foreground">Last run: {lastAutomationRun ? lastAutomationRun.toLocaleString() : 'N/A'}</p>
                </div>
                <Badge className={automationStatus === 'running' ? 'bg-blue-500 text-white' : automationStatus === 'error' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'}>
                  {automationStatus === 'running' ? 'Running' : automationStatus === 'paused' ? 'Paused' : automationStatus === 'error' ? 'Error' : 'Idle'}
                </Badge>
              </div>

              {automationStatus === 'running' && (
                <Progress value={automationProgress} className="h-2" />
              )}

              <div className="flex gap-2">
                <Button onClick={() => setAutomationStatus('running')} disabled={automationStatus === 'running'}>
                  <Play className="h-4 w-4 mr-2" /> Run Automation
                </Button>
                <Button variant="outline" onClick={() => setAutomationStatus('paused')} disabled={automationStatus !== 'running'}>
                  <Pause className="h-4 w-4 mr-2" /> Pause Automation
                </Button>
                <Button variant="outline" onClick={() => setAutomationStatus('idle')} disabled={automationStatus === 'idle'}>
                  Stop Automation
                </Button>
              </div>

              <div>
                <h4 className="font-medium mb-2">Automation History</h4>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto text-sm bg-muted/20">
                  {automationLog.length > 0 ? (
                    automationLog.map((log, index) => (
                      <p key={index} className="text-muted-foreground">{log}</p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No automation activity yet.</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setAutomationLog([])}>
                  Clear Logs
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" /> Dry Run
                </Button>
                <Button variant="destructive" disabled={automationStatus === 'running' || automationStatus === 'paused'}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Rollback Last Change
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceOptimizer; 