import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  Zap,
  Settings,
  BarChart3,
  Timer,
  Activity,
  Database,
  Cpu,
  HardDrive,
  Users,
  FileText,
  Mail,
  Video,
  Brain,
  Target,
  TrendingUp
} from 'lucide-react';

interface BackgroundJob {
  id: string;
  type: 'video_processing' | 'report_generation' | 'email_batch' | 'content_analysis' | 'data_export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  progress: number;
  clientId?: string;
  clientName?: string;
  itemCount: number;
  processedCount: number;
  startTime?: Date;
  endTime?: Date;
  estimatedDuration: number;
  remainingTime?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
  throughput: number;
  successRate: number;
}

interface WorkerStatus {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentJob?: string;
  processedJobs: number;
  uptime: number;
  lastActivity: Date;
  resourceUsage: {
    cpu: number;
    memory: number;
  };
}

const BackgroundProcessor: React.FC = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalJobs: 0,
    pendingJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgProcessingTime: 0,
    throughput: 0,
    successRate: 0
  });
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [maxWorkers, setMaxWorkers] = useState(8);
  const [autoRetry, setAutoRetry] = useState(true);

  // Initialize with sample data
  useEffect(() => {
    const sampleJobs: BackgroundJob[] = [
      {
        id: '1',
        type: 'video_processing',
        status: 'running',
        priority: 'high',
        progress: 73,
        clientId: 'client-1',
        clientName: 'TechCorp Solutions',
        itemCount: 150,
        processedCount: 110,
        startTime: new Date(Date.now() - 45 * 60 * 1000),
        estimatedDuration: 60,
        remainingTime: 12,
        retryCount: 0,
        maxRetries: 3,
        resourceUsage: { cpu: 85, memory: 70, disk: 45 }
      },
      {
        id: '2',
        type: 'report_generation',
        status: 'pending',
        priority: 'normal',
        progress: 0,
        clientId: 'client-2',
        clientName: 'Creative Studios',
        itemCount: 500,
        processedCount: 0,
        estimatedDuration: 30,
        retryCount: 0,
        maxRetries: 3,
        resourceUsage: { cpu: 0, memory: 0, disk: 0 }
      },
      {
        id: '3',
        type: 'email_batch',
        status: 'completed',
        priority: 'low',
        progress: 100,
        itemCount: 2500,
        processedCount: 2500,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 90 * 60 * 1000),
        estimatedDuration: 30,
        retryCount: 0,
        maxRetries: 3,
        resourceUsage: { cpu: 0, memory: 0, disk: 0 }
      },
      {
        id: '4',
        type: 'content_analysis',
        status: 'failed',
        priority: 'normal',
        progress: 45,
        clientId: 'client-3',
        clientName: 'Marketing Pro',
        itemCount: 75,
        processedCount: 34,
        startTime: new Date(Date.now() - 20 * 60 * 1000),
        estimatedDuration: 25,
        errorMessage: 'API rate limit exceeded',
        retryCount: 2,
        maxRetries: 3,
        resourceUsage: { cpu: 0, memory: 0, disk: 0 }
      }
    ];

    const sampleWorkers: WorkerStatus[] = [
      {
        id: 'worker-1',
        status: 'busy',
        currentJob: '1',
        processedJobs: 47,
        uptime: 8640,
        lastActivity: new Date(),
        resourceUsage: { cpu: 85, memory: 70 }
      },
      {
        id: 'worker-2',
        status: 'idle',
        processedJobs: 32,
        uptime: 8640,
        lastActivity: new Date(Date.now() - 5 * 60 * 1000),
        resourceUsage: { cpu: 15, memory: 25 }
      },
      {
        id: 'worker-3',
        status: 'busy',
        currentJob: '5',
        processedJobs: 28,
        uptime: 7200,
        lastActivity: new Date(),
        resourceUsage: { cpu: 65, memory: 55 }
      },
      {
        id: 'worker-4',
        status: 'idle',
        processedJobs: 41,
        uptime: 8640,
        lastActivity: new Date(Date.now() - 2 * 60 * 1000),
        resourceUsage: { cpu: 10, memory: 20 }
      }
    ];

    setJobs(sampleJobs);
    setWorkers(sampleWorkers);

    // Calculate stats
    const stats: QueueStats = {
      totalJobs: sampleJobs.length,
      pendingJobs: sampleJobs.filter(j => j.status === 'pending').length,
      runningJobs: sampleJobs.filter(j => j.status === 'running').length,
      completedJobs: sampleJobs.filter(j => j.status === 'completed').length,
      failedJobs: sampleJobs.filter(j => j.status === 'failed').length,
      avgProcessingTime: 42,
      throughput: 15.7,
      successRate: 94.2
    };
    setQueueStats(stats);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status === 'running') {
          const newProgress = Math.min(100, job.progress + Math.random() * 3);
          const newProcessedCount = Math.floor((newProgress / 100) * job.itemCount);
          
          if (newProgress >= 100) {
            return {
              ...job,
              progress: 100,
              processedCount: job.itemCount,
              status: 'completed' as const,
              endTime: new Date(),
              remainingTime: 0
            };
          }
          
          return {
            ...job,
            progress: newProgress,
            processedCount: newProcessedCount,
            remainingTime: Math.max(0, (job.remainingTime || 0) - 0.5)
          };
        }
        return job;
      }));

      // Update worker activity
      setWorkers(prev => prev.map(worker => ({
        ...worker,
        resourceUsage: {
          cpu: Math.max(0, Math.min(100, worker.resourceUsage.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, worker.resourceUsage.memory + (Math.random() - 0.5) * 5))
        }
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'video_processing': return <Video className="h-4 w-4" />;
      case 'report_generation': return <FileText className="h-4 w-4" />;
      case 'email_batch': return <Mail className="h-4 w-4" />;
      case 'content_analysis': return <Brain className="h-4 w-4" />;
      case 'data_export': return <Database className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'normal': return 'text-blue-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getWorkerStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-green-500';
      case 'busy': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const pauseJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'paused' as const } : job
    ));
  };

  const resumeJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'running' as const } : job
    ));
  };

  const retryJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { 
        ...job, 
        status: 'pending' as const, 
        progress: 0, 
        processedCount: 0,
        retryCount: job.retryCount + 1,
        errorMessage: undefined
      } : job
    ));
  };

  const cancelJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const filteredJobs = jobs.filter(job => {
    const typeMatch = selectedJobType === 'all' || job.type === selectedJobType;
    const statusMatch = selectedStatus === 'all' || job.status === selectedStatus;
    return typeMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Background Processor</h2>
          <p className="text-muted-foreground">
            Manage background jobs and queue processing for large-scale operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {queueStats.runningJobs} Running
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {queueStats.pendingJobs} Queued
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Job Queue</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Queue Stats */}
          <div className="grid md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.totalJobs}</div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{queueStats.pendingJobs}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{queueStats.runningJobs}</div>
                  <p className="text-sm text-muted-foreground">Running</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{queueStats.completedJobs}</div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{queueStats.failedJobs}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={selectedJobType} onValueChange={setSelectedJobType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video_processing">Video Processing</SelectItem>
                <SelectItem value="report_generation">Report Generation</SelectItem>
                <SelectItem value="email_batch">Email Batch</SelectItem>
                <SelectItem value="content_analysis">Content Analysis</SelectItem>
                <SelectItem value="data_export">Data Export</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jobs List */}
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getJobTypeIcon(job.type)}
                        <h3 className="font-semibold capitalize">
                          {job.type.replace('_', ' ')}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(job.status)} text-white`}
                        >
                          {job.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                        {job.clientName && (
                          <Badge variant="outline">{job.clientName}</Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress:</span>
                          <div className="font-medium">
                            {job.processedCount}/{job.itemCount} ({job.progress.toFixed(1)}%)
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">
                            {job.startTime 
                              ? formatDuration(Math.floor((Date.now() - job.startTime.getTime()) / 60000))
                              : 'Not started'
                            }
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Remaining:</span>
                          <div className="font-medium">
                            {job.remainingTime ? formatDuration(job.remainingTime) : 'Calculating...'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Retries:</span>
                          <div className="font-medium">{job.retryCount}/{job.maxRetries}</div>
                        </div>
                      </div>

                      {job.status === 'running' && (
                        <div className="space-y-2">
                          <Progress value={job.progress} className="w-full" />
                          <div className="grid md:grid-cols-3 gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              <span>CPU: {job.resourceUsage.cpu}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              <span>Memory: {job.resourceUsage.memory}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              <span>Disk: {job.resourceUsage.disk}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {job.errorMessage && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{job.errorMessage}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {job.status === 'running' && (
                        <Button variant="outline" size="sm" onClick={() => pauseJob(job.id)}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {job.status === 'paused' && (
                        <Button variant="outline" size="sm" onClick={() => resumeJob(job.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {job.status === 'failed' && job.retryCount < job.maxRetries && (
                        <Button variant="outline" size="sm" onClick={() => retryJob(job.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => cancelJob(job.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Worker Status</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Max Workers:</span>
              <Input 
                type="number" 
                value={maxWorkers} 
                onChange={(e) => setMaxWorkers(parseInt(e.target.value) || 8)}
                className="w-20"
              />
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {workers.map((worker) => (
              <Card key={worker.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{worker.id}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`${getWorkerStatusColor(worker.status)} text-white`}
                        >
                          {worker.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Job:</span>
                          <div className="font-medium">
                            {worker.currentJob || 'None'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Processed:</span>
                          <div className="font-medium">{worker.processedJobs} jobs</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Uptime:</span>
                          <div className="font-medium">{formatUptime(worker.uptime)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Activity:</span>
                          <div className="font-medium">
                            {worker.lastActivity.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>CPU Usage</span>
                            <span>{worker.resourceUsage.cpu.toFixed(1)}%</span>
                          </div>
                          <Progress value={worker.resourceUsage.cpu} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Memory Usage</span>
                            <span>{worker.resourceUsage.memory.toFixed(1)}%</span>
                          </div>
                          <Progress value={worker.resourceUsage.memory} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.avgProcessingTime}m</div>
                  <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.throughput}/min</div>
                  <p className="text-sm text-muted-foreground">Throughput</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStats.successRate}%</div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Processing Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mr-2" />
                Processing trends chart would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Queue Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Concurrent Jobs</label>
                  <Input type="number" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Timeout (minutes)</label>
                  <Input type="number" defaultValue="60" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retry Delay (seconds)</label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto Retry Failed Jobs</div>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed jobs up to max retries
                    </p>
                  </div>
                  <Button 
                    variant={autoRetry ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoRetry(!autoRetry)}
                  >
                    {autoRetry ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPU Limit per Job (%)</label>
                  <Input type="number" defaultValue="80" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Memory Limit per Job (GB)</label>
                  <Input type="number" defaultValue="4" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority Queue Size</label>
                  <Input type="number" defaultValue="100" />
                </div>
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Apply Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackgroundProcessor; 