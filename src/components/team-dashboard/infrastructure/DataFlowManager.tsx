import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Database, 
  RefreshCw, 
  Zap,
  Activity,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Network,
  Server,
  Layers,
  GitBranch,
  Sync,
  Download,
  Upload,
  Filter,
  Settings,
  BarChart3,
  TrendingUp,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'cache' | 'stream';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: Date;
  recordCount: number;
  dataSize: number; // in MB
  syncFrequency: string;
  errorCount: number;
  latency: number; // in ms
}

interface DataFlow {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: 'active' | 'paused' | 'error' | 'completed';
  recordsProcessed: number;
  totalRecords: number;
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  throughput: number; // records per second
  errorRate: number;
  transformations: string[];
}

interface CacheStatus {
  id: string;
  name: string;
  type: 'redis' | 'memory' | 'disk';
  size: number; // in MB
  hitRate: number;
  missRate: number;
  evictionRate: number;
  keyCount: number;
  lastCleared: Date;
  ttl: number; // in seconds
}

interface SyncOperation {
  id: string;
  type: 'full' | 'incremental' | 'real-time';
  source: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  recordsSync: number;
  totalRecords: number;
  startTime: Date;
  duration?: number;
  conflicts: number;
  resolved: number;
}

const DataFlowManager: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataFlows, setDataFlows] = useState<DataFlow[]>([]);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus[]>([]);
  const [syncOperations, setSyncOperations] = useState<SyncOperation[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [autoSync, setAutoSync] = useState(true);
  const [realTimeSync, setRealTimeSync] = useState(false);

  // Initialize with sample data
  useEffect(() => {
    const sampleDataSources: DataSource[] = [
      {
        id: 'main-db',
        name: 'Main Database',
        type: 'database',
        status: 'connected',
        lastSync: new Date(Date.now() - 5 * 60 * 1000),
        recordCount: 2847592,
        dataSize: 1247.5,
        syncFrequency: 'Every 5 minutes',
        errorCount: 0,
        latency: 45
      },
      {
        id: 'video-api',
        name: 'Video Processing API',
        type: 'api',
        status: 'syncing',
        lastSync: new Date(Date.now() - 2 * 60 * 1000),
        recordCount: 156789,
        dataSize: 892.3,
        syncFrequency: 'Real-time',
        errorCount: 2,
        latency: 120
      },
      {
        id: 'analytics-cache',
        name: 'Analytics Cache',
        type: 'cache',
        status: 'connected',
        lastSync: new Date(Date.now() - 30 * 1000),
        recordCount: 45678,
        dataSize: 234.7,
        syncFrequency: 'Every 30 seconds',
        errorCount: 0,
        latency: 15
      },
      {
        id: 'client-files',
        name: 'Client File Storage',
        type: 'file',
        status: 'error',
        lastSync: new Date(Date.now() - 30 * 60 * 1000),
        recordCount: 89234,
        dataSize: 5678.9,
        syncFrequency: 'Hourly',
        errorCount: 5,
        latency: 0
      }
    ];

    const sampleDataFlows: DataFlow[] = [
      {
        id: 'flow-1',
        name: 'Video Processing Pipeline',
        source: 'video-api',
        destination: 'main-db',
        status: 'active',
        recordsProcessed: 1247,
        totalRecords: 1500,
        progress: 83,
        startTime: new Date(Date.now() - 45 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 8 * 60 * 1000),
        throughput: 15.7,
        errorRate: 0.2,
        transformations: ['Video Analysis', 'Metadata Extraction', 'Quality Check']
      },
      {
        id: 'flow-2',
        name: 'Client Data Sync',
        source: 'main-db',
        destination: 'analytics-cache',
        status: 'active',
        recordsProcessed: 45678,
        totalRecords: 45678,
        progress: 100,
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        throughput: 76.1,
        errorRate: 0,
        transformations: ['Data Aggregation', 'Cache Formatting']
      }
    ];

    const sampleCacheStatus: CacheStatus[] = [
      {
        id: 'redis-main',
        name: 'Main Redis Cache',
        type: 'redis',
        size: 512.7,
        hitRate: 94.2,
        missRate: 5.8,
        evictionRate: 0.3,
        keyCount: 156789,
        lastCleared: new Date(Date.now() - 24 * 60 * 60 * 1000),
        ttl: 3600
      },
      {
        id: 'memory-cache',
        name: 'In-Memory Cache',
        type: 'memory',
        size: 128.3,
        hitRate: 87.5,
        missRate: 12.5,
        evictionRate: 2.1,
        keyCount: 23456,
        lastCleared: new Date(Date.now() - 6 * 60 * 60 * 1000),
        ttl: 1800
      }
    ];

    const sampleSyncOperations: SyncOperation[] = [
      {
        id: 'sync-1',
        type: 'incremental',
        source: 'main-db',
        target: 'analytics-cache',
        status: 'running',
        progress: 67,
        recordsSync: 15678,
        totalRecords: 23456,
        startTime: new Date(Date.now() - 15 * 60 * 1000),
        conflicts: 3,
        resolved: 2
      },
      {
        id: 'sync-2',
        type: 'full',
        source: 'video-api',
        target: 'main-db',
        status: 'completed',
        progress: 100,
        recordsSync: 89234,
        totalRecords: 89234,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        duration: 45,
        conflicts: 0,
        resolved: 0
      }
    ];

    setDataSources(sampleDataSources);
    setDataFlows(sampleDataFlows);
    setCacheStatus(sampleCacheStatus);
    setSyncOperations(sampleSyncOperations);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update data flows
      setDataFlows(prev => prev.map(flow => {
        if (flow.status === 'active' && flow.progress < 100) {
          const newProgress = Math.min(100, flow.progress + Math.random() * 2);
          const newRecordsProcessed = Math.floor((newProgress / 100) * flow.totalRecords);
          
          return {
            ...flow,
            progress: newProgress,
            recordsProcessed: newRecordsProcessed,
            throughput: flow.throughput + (Math.random() - 0.5) * 5
          };
        }
        return flow;
      }));

      // Update sync operations
      setSyncOperations(prev => prev.map(sync => {
        if (sync.status === 'running' && sync.progress < 100) {
          const newProgress = Math.min(100, sync.progress + Math.random() * 3);
          const newRecordsSync = Math.floor((newProgress / 100) * sync.totalRecords);
          
          return {
            ...sync,
            progress: newProgress,
            recordsSync: newRecordsSync
          };
        }
        return sync;
      }));

      // Update cache hit rates
      setCacheStatus(prev => prev.map(cache => ({
        ...cache,
        hitRate: Math.max(70, Math.min(99, cache.hitRate + (Math.random() - 0.5) * 2)),
        size: Math.max(0, cache.size + (Math.random() - 0.5) * 10)
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': case 'active': case 'completed': return 'bg-green-500';
      case 'syncing': case 'running': case 'pending': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': case 'failed': case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'api': return <Network className="h-4 w-4" />;
      case 'file': return <HardDrive className="h-4 w-4" />;
      case 'cache': return <Zap className="h-4 w-4" />;
      case 'stream': return <Activity className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  const formatDataSize = (sizeInMB: number) => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const triggerSync = (sourceId: string) => {
    const newSync: SyncOperation = {
      id: `sync-${Date.now()}`,
      type: 'incremental',
      source: sourceId,
      target: 'main-db',
      status: 'pending',
      progress: 0,
      recordsSync: 0,
      totalRecords: Math.floor(Math.random() * 10000) + 1000,
      startTime: new Date(),
      conflicts: 0,
      resolved: 0
    };
    
    setSyncOperations(prev => [newSync, ...prev]);
  };

  const clearCache = (cacheId: string) => {
    setCacheStatus(prev => prev.map(cache => 
      cache.id === cacheId 
        ? { ...cache, size: 0, keyCount: 0, lastCleared: new Date() }
        : cache
    ));
  };

  const filteredDataSources = dataSources.filter(source => {
    const typeMatch = selectedSource === 'all' || source.type === selectedSource;
    const statusMatch = selectedStatus === 'all' || source.status === selectedStatus;
    return typeMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Flow Manager</h2>
          <p className="text-muted-foreground">
            Monitor and manage data flows, caching, and synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {dataFlows.filter(f => f.status === 'active').length} Active Flows
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Sync className="h-3 w-3" />
            {syncOperations.filter(s => s.status === 'running').length} Syncing
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="flows">Data Flows</TabsTrigger>
          <TabsTrigger value="cache">Cache Status</TabsTrigger>
          <TabsTrigger value="sync">Synchronization</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="cache">Cache</SelectItem>
                <SelectItem value="stream">Stream</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="syncing">Syncing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="disconnected">Disconnected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredDataSources.map((source) => (
              <Card key={source.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(source.type)}
                        <h3 className="font-semibold">{source.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(source.status)} text-white`}
                        >
                          {source.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {source.type}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Records:</span>
                          <div className="font-medium">{source.recordCount.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data Size:</span>
                          <div className="font-medium">{formatDataSize(source.dataSize)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Sync:</span>
                          <div className="font-medium">{source.lastSync.toLocaleTimeString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Latency:</span>
                          <div className="font-medium">
                            {source.latency > 0 ? `${source.latency}ms` : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{source.syncFrequency}</span>
                        </div>
                        {source.errorCount > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{source.errorCount} errors</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => triggerSync(source.id)}
                        disabled={source.status === 'syncing'}
                      >
                        <Sync className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Data Flows</h3>
            <Button variant="outline" size="sm">
              <GitBranch className="h-4 w-4 mr-2" />
              Create Flow
            </Button>
          </div>

          <div className="grid gap-4">
            {dataFlows.map((flow) => (
              <Card key={flow.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{flow.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`${getStatusColor(flow.status)} text-white`}
                          >
                            {flow.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{flow.source}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{flow.destination}</span>
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="font-medium">{flow.progress.toFixed(1)}%</div>
                        <div className="text-muted-foreground">
                          {flow.recordsProcessed.toLocaleString()}/{flow.totalRecords.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {flow.status === 'active' && (
                      <Progress value={flow.progress} className="w-full" />
                    )}

                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Throughput:</span>
                        <div className="font-medium">{flow.throughput.toFixed(1)}/s</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Error Rate:</span>
                        <div className="font-medium">{flow.errorRate.toFixed(2)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <div className="font-medium">{flow.startTime.toLocaleTimeString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ETA:</span>
                        <div className="font-medium">
                          {flow.estimatedCompletion 
                            ? flow.estimatedCompletion.toLocaleTimeString()
                            : 'Calculating...'
                          }
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm text-muted-foreground">Transformations:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {flow.transformations.map((transform, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {transform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cache Performance</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Monitor
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {cacheStatus.map((cache) => (
              <Card key={cache.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        <h3 className="font-semibold">{cache.name}</h3>
                        <Badge variant="outline" className="capitalize">
                          {cache.type}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => clearCache(cache.id)}
                      >
                        Clear
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <div className="font-medium">{formatDataSize(cache.size)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Keys:</span>
                        <div className="font-medium">{cache.keyCount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hit Rate:</span>
                        <div className="font-medium text-green-600">{cache.hitRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Miss Rate:</span>
                        <div className="font-medium text-red-600">{cache.missRate.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Hit Rate</span>
                          <span>{cache.hitRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={cache.hitRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Cache Usage</span>
                          <span>{((cache.size / 1024) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(cache.size / 1024) * 100} className="h-2" />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last cleared: {cache.lastCleared.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Synchronization Operations</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Auto Sync:</span>
                <Button 
                  variant={autoSync ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoSync(!autoSync)}
                >
                  {autoSync ? <CheckCircle2 className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Real-time:</span>
                <Button 
                  variant={realTimeSync ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRealTimeSync(!realTimeSync)}
                >
                  {realTimeSync ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {syncOperations.map((sync) => (
              <Card key={sync.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sync className="h-4 w-4" />
                          <span className="font-semibold capitalize">{sync.type} Sync</span>
                          <Badge 
                            variant="secondary" 
                            className={`${getStatusColor(sync.status)} text-white`}
                          >
                            {sync.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{sync.source}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{sync.target}</span>
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="font-medium">{sync.progress.toFixed(1)}%</div>
                        <div className="text-muted-foreground">
                          {sync.recordsSync.toLocaleString()}/{sync.totalRecords.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {sync.status === 'running' && (
                      <Progress value={sync.progress} className="w-full" />
                    )}

                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <div className="font-medium">{sync.startTime.toLocaleTimeString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <div className="font-medium">
                          {sync.duration 
                            ? formatDuration(sync.duration)
                            : formatDuration(Math.floor((Date.now() - sync.startTime.getTime()) / 60000))
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conflicts:</span>
                        <div className="font-medium">{sync.conflicts}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Resolved:</span>
                        <div className="font-medium">{sync.resolved}</div>
                      </div>
                    </div>

                    {sync.conflicts > 0 && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{sync.conflicts - sync.resolved} unresolved conflicts</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataFlowManager; 