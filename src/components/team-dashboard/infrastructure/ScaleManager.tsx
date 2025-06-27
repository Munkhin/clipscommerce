import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Server, 
  Activity, 
  Users, 
  Database,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Settings,
  RefreshCw,
  Zap,
  Shield,
  BarChart3,
  Monitor,
  Gauge,
  Timer,
  Target,
  Layers
} from 'lucide-react';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkThroughput: number;
  activeConnections: number;
  queueSize: number;
  processingRate: number;
  errorRate: number;
  uptime: number;
}

interface ScaleOperation {
  id: string;
  type: 'video_processing' | 'report_generation' | 'email_sending' | 'content_analysis';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  clientCount: number;
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  timestamp: Date;
  resolved: boolean;
}

const ScaleManager: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkThroughput: 0,
    activeConnections: 0,
    queueSize: 0,
    processingRate: 0,
    errorRate: 0,
    uptime: 0
  });

  const [operations, setOperations] = useState<ScaleOperation[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [autoScaling, setAutoScaling] = useState(true);
  const [maxConcurrency, setMaxConcurrency] = useState(100);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        diskUsage: Math.max(0, Math.min(100, prev.diskUsage + (Math.random() - 0.5) * 2)),
        networkThroughput: Math.max(0, prev.networkThroughput + (Math.random() - 0.5) * 50),
        activeConnections: Math.max(0, prev.activeConnections + Math.floor((Math.random() - 0.5) * 20)),
        queueSize: Math.max(0, prev.queueSize + Math.floor((Math.random() - 0.5) * 10)),
        processingRate: Math.max(0, prev.processingRate + (Math.random() - 0.5) * 5),
        errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 0.5)),
        uptime: prev.uptime + 1
      }));

      // Generate alerts based on metrics
      setAlerts(prev => {
        const newAlerts = [...prev];
        
        // CPU alert
        if (metrics.cpuUsage > 85 && !prev.some(a => a.component === 'CPU' && !a.resolved)) {
          newAlerts.push({
            id: `cpu-${Date.now()}`,
            type: 'warning',
            message: `High CPU usage detected: ${metrics.cpuUsage.toFixed(1)}%`,
            component: 'CPU',
            timestamp: new Date(),
            resolved: false
          });
        }

        // Memory alert
        if (metrics.memoryUsage > 90 && !prev.some(a => a.component === 'Memory' && !a.resolved)) {
          newAlerts.push({
            id: `memory-${Date.now()}`,
            type: 'critical',
            message: `Critical memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
            component: 'Memory',
            timestamp: new Date(),
            resolved: false
          });
        }

        return newAlerts.slice(-10); // Keep only last 10 alerts
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [metrics]);

  // Initialize with sample operations
  useEffect(() => {
    const sampleOperations: ScaleOperation[] = [
      {
        id: '1',
        type: 'video_processing',
        status: 'processing',
        priority: 'high',
        clientCount: 1250,
        progress: 67,
        startTime: new Date(Date.now() - 45 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000),
        resourceUsage: { cpu: 75, memory: 60, network: 45 }
      },
      {
        id: '2',
        type: 'report_generation',
        status: 'queued',
        priority: 'medium',
        clientCount: 850,
        progress: 0,
        startTime: new Date(),
        resourceUsage: { cpu: 0, memory: 0, network: 0 }
      },
      {
        id: '3',
        type: 'email_sending',
        status: 'completed',
        priority: 'low',
        clientCount: 2100,
        progress: 100,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() - 30 * 60 * 1000),
        resourceUsage: { cpu: 0, memory: 0, network: 0 }
      }
    ];

    setOperations(sampleOperations);

    // Initialize metrics with realistic values
    setMetrics({
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 78,
      networkThroughput: 125,
      activeConnections: 1847,
      queueSize: 23,
      processingRate: 15.7,
      errorRate: 0.3,
      uptime: 2847
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
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

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'error': return 'border-orange-500 bg-orange-50';
      case 'critical': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const scaleUp = () => {
    setMaxConcurrency(prev => Math.min(500, prev + 50));
  };

  const scaleDown = () => {
    setMaxConcurrency(prev => Math.max(50, prev - 50));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scale Manager</h2>
          <p className="text-muted-foreground">
            Monitor and manage large-scale operations for thousands of clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {metrics.activeConnections} Active
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatUptime(metrics.uptime)}
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="scaling">Auto Scaling</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Metrics */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">CPU Usage</p>
                    <p className={`text-2xl font-bold ${getMetricColor(metrics.cpuUsage, { warning: 70, critical: 85 })}`}>
                      {metrics.cpuUsage.toFixed(1)}%
                    </p>
                  </div>
                  <Cpu className="h-8 w-8 text-muted-foreground" />
                </div>
                <Progress value={metrics.cpuUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Memory Usage</p>
                    <p className={`text-2xl font-bold ${getMetricColor(metrics.memoryUsage, { warning: 75, critical: 90 })}`}>
                      {metrics.memoryUsage.toFixed(1)}%
                    </p>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <Progress value={metrics.memoryUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Disk Usage</p>
                    <p className={`text-2xl font-bold ${getMetricColor(metrics.diskUsage, { warning: 80, critical: 95 })}`}>
                      {metrics.diskUsage.toFixed(1)}%
                    </p>
                  </div>
                  <HardDrive className="h-8 w-8 text-muted-foreground" />
                </div>
                <Progress value={metrics.diskUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Network</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.networkThroughput.toFixed(1)} MB/s
                    </p>
                  </div>
                  <Network className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{metrics.activeConnections}</div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{metrics.queueSize}</div>
                  <p className="text-sm text-muted-foreground">Queue Size</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{metrics.processingRate.toFixed(1)}/s</div>
                  <p className="text-sm text-muted-foreground">Processing Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getMetricColor(metrics.errorRate, { warning: 2, critical: 5 })}`}>
                    {metrics.errorRate.toFixed(2)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mr-2" />
                Real-time performance charts would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Large-Scale Operations</h3>
            <div className="flex items-center gap-2">
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Monitor
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {operations.map((operation) => (
              <Card key={operation.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold capitalize">
                          {operation.type.replace('_', ' ')}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(operation.status)} text-white`}
                        >
                          {operation.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(operation.priority)}>
                          {operation.priority} priority
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Clients:</span>
                          <div className="font-medium">{operation.clientCount.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <div className="font-medium">{operation.startTime.toLocaleTimeString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Progress:</span>
                          <div className="font-medium">{operation.progress}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ETA:</span>
                          <div className="font-medium">
                            {operation.estimatedCompletion 
                              ? operation.estimatedCompletion.toLocaleTimeString()
                              : 'Calculating...'
                            }
                          </div>
                        </div>
                      </div>

                      {operation.status === 'processing' && (
                        <div className="space-y-2">
                          <Progress value={operation.progress} className="w-full" />
                          <div className="grid md:grid-cols-3 gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              <span>CPU: {operation.resourceUsage.cpu}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              <span>Memory: {operation.resourceUsage.memory}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Network className="h-3 w-3" />
                              <span>Network: {operation.resourceUsage.network}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {operation.status === 'processing' && (
                        <Button variant="outline" size="sm">
                          <Timer className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Monitor className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scaling" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Auto Scaling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable Auto Scaling</div>
                    <p className="text-sm text-muted-foreground">
                      Automatically adjust resources based on demand
                    </p>
                  </div>
                  <Button 
                    variant={autoScaling ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScaling(!autoScaling)}
                  >
                    {autoScaling ? <CheckCircle2 className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Concurrency</label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={scaleDown}>-</Button>
                    <Input 
                      type="number" 
                      value={maxConcurrency} 
                      onChange={(e) => setMaxConcurrency(parseInt(e.target.value) || 100)}
                      className="text-center"
                    />
                    <Button variant="outline" size="sm" onClick={scaleUp}>+</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scale Triggers</label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>CPU Threshold:</span>
                      <span>75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Threshold:</span>
                      <span>80%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Queue Size:</span>
                      <span>50 items</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Resource Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Video Processing</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Report Generation</span>
                      <span>25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Email Automation</span>
                      <span>10%</span>
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Content Analysis</span>
                      <span>5%</span>
                    </div>
                    <Progress value={5} className="h-2" />
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Allocation
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Scaling History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mr-2" />
                Scaling history chart would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">System Alerts</h3>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Configure Alerts
            </Button>
          </div>

          <div className="grid gap-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${getAlertColor(alert.type)}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {alert.type === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {alert.type === 'error' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                          {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          <span className="font-medium">{alert.component}</span>
                          <Badge variant="outline" className="text-xs">
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!alert.resolved && (
                          <Button variant="outline" size="sm">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
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
                      All systems are operating normally
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScaleManager; 