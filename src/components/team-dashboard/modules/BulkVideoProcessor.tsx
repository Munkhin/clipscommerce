'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Download, 
  Upload, 
  FileVideo, 
  Server, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Filter,
  Loader2,
  BarChart3,
  Eye,
  Settings
} from 'lucide-react';

interface VideoFile {
  id: string;
  name: string;
  size: number;
  duration?: number;
  thumbnail?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  clientId: string;
  clientName: string;
  platform: string;
  processingStartTime?: Date;
  processingEndTime?: Date;
  errorMessage?: string;
  outputUrl?: string;
}

interface ProcessingQueue {
  id: string;
  name: string;
  videos: VideoFile[];
  status: 'idle' | 'processing' | 'paused' | 'completed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  concurrentLimit: number;
  createdAt: Date;
  estimatedCompletion?: Date;
}

interface ProcessingStats {
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  avgProcessingTime: number;
  successRate: number;
  throughputPerHour: number;
}

export function BulkVideoProcessor() {
  const [queues, setQueues] = useState<ProcessingQueue[]>([]);
  const [currentQueue, setCurrentQueue] = useState<string>('');
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalVideos: 0,
    completedVideos: 0,
    failedVideos: 0,
    avgProcessingTime: 0,
    successRate: 0,
    throughputPerHour: 0
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [maxConcurrent, setMaxConcurrent] = useState(10);
  const [autoRetry, setAutoRetry] = useState(true);
  const [retryCount, setRetryCount] = useState(3);

  // Initialize sample data
  useEffect(() => {
    const sampleVideos: VideoFile[] = Array.from({ length: 2500 }, (_, i) => ({
      id: `video-${i + 1}`,
      name: `video_${String(i + 1).padStart(4, '0')}.mp4`,
      size: Math.random() * 100 * 1024 * 1024, // Random size up to 100MB
      duration: Math.random() * 300 + 30, // 30-330 seconds
      status: ['queued', 'processing', 'completed', 'failed'][Math.floor(Math.random() * 4)] as any,
      progress: Math.random() * 100,
      clientId: `client-${Math.floor(Math.random() * 50) + 1}`,
      clientName: `Client ${Math.floor(Math.random() * 50) + 1}`,
      platform: ['tiktok', 'instagram', 'youtube'][Math.floor(Math.random() * 3)],
      processingStartTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    }));

    const sampleQueues: ProcessingQueue[] = [
      {
        id: 'queue-1',
        name: 'High Priority Batch',
        videos: sampleVideos.slice(0, 500),
        status: 'processing',
        priority: 'high',
        concurrentLimit: 10,
        createdAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000)
      },
      {
        id: 'queue-2',
        name: 'Standard Processing',
        videos: sampleVideos.slice(500, 1500),
        status: 'processing',
        priority: 'normal',
        concurrentLimit: 8,
        createdAt: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        id: 'queue-3',
        name: 'Background Processing',
        videos: sampleVideos.slice(1500),
        status: 'idle',
        priority: 'low',
        concurrentLimit: 5,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    setQueues(sampleQueues);
    setCurrentQueue(sampleQueues[0].id);

    // Calculate stats
    const totalVideos = sampleVideos.length;
    const completedVideos = sampleVideos.filter(v => v.status === 'completed').length;
    const failedVideos = sampleVideos.filter(v => v.status === 'failed').length;
    
    setProcessingStats({
      totalVideos,
      completedVideos,
      failedVideos,
      avgProcessingTime: 45, // seconds
      successRate: totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0,
      throughputPerHour: 120 // videos per hour
    });
  }, []);

  const currentQueueData = useMemo(() => 
    queues.find(q => q.id === currentQueue),
    [queues, currentQueue]
  );

  const filteredVideos = useMemo(() => {
    if (!currentQueueData) return [];
    
    return currentQueueData.videos.filter(video => {
      const statusMatch = filterStatus === 'all' || video.status === filterStatus;
      const clientMatch = filterClient === 'all' || video.clientId === filterClient;
      return statusMatch && clientMatch;
    });
  }, [currentQueueData, filterStatus, filterClient]);

  const startQueue = useCallback((queueId: string) => {
    setQueues(prev => prev.map(queue => 
      queue.id === queueId 
        ? { ...queue, status: 'processing' as const }
        : queue
    ));
    toast({
      title: "Queue started",
      description: "Video processing has begun",
    });
  }, []);

  const pauseQueue = useCallback((queueId: string) => {
    setQueues(prev => prev.map(queue => 
      queue.id === queueId 
        ? { ...queue, status: 'paused' as const }
        : queue
    ));
    toast({
      title: "Queue paused",
      description: "Video processing has been paused",
    });
  }, []);

  const stopQueue = useCallback((queueId: string) => {
    setQueues(prev => prev.map(queue => 
      queue.id === queueId 
        ? { ...queue, status: 'idle' as const }
        : queue
    ));
    toast({
      title: "Queue stopped",
      description: "Video processing has been stopped",
    });
  }, []);

  const retryFailedVideos = useCallback((queueId: string) => {
    setQueues(prev => prev.map(queue => 
      queue.id === queueId 
        ? {
            ...queue,
            videos: queue.videos.map(video => 
              video.status === 'failed' 
                ? { ...video, status: 'queued' as const, progress: 0, errorMessage: undefined }
                : video
            )
          }
        : queue
    ));
    toast({
      title: "Retry initiated",
      description: "Failed videos have been queued for retry",
    });
  }, []);

  const removeCompletedVideos = useCallback((queueId: string) => {
    setQueues(prev => prev.map(queue => 
      queue.id === queueId 
        ? {
            ...queue,
            videos: queue.videos.filter(video => video.status !== 'completed')
          }
        : queue
    ));
    toast({
      title: "Completed videos removed",
      description: "All completed videos have been cleared from the queue",
    });
  }, []);

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'queued': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bulk Video Processor</h2>
          <p className="text-muted-foreground">
            Process thousands of videos simultaneously with enterprise-grade scalability
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Server className="w-4 h-4 mr-1" />
          {processingStats.totalVideos.toLocaleString()} Videos
        </Badge>
      </div>

      {/* Processing Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {processingStats.completedVideos.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {processingStats.failedVideos.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {processingStats.successRate.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {processingStats.avgProcessingTime}s
            </div>
            <p className="text-sm text-muted-foreground">Avg Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {processingStats.throughputPerHour}
            </div>
            <p className="text-sm text-muted-foreground">Videos/Hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-600">
              {maxConcurrent}
            </div>
            <p className="text-sm text-muted-foreground">Concurrent</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queues" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queues">Processing Queues</TabsTrigger>
          <TabsTrigger value="videos">Video Details</TabsTrigger>
          <TabsTrigger value="settings">Queue Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Processing Queues
              </CardTitle>
              <CardDescription>
                Manage and monitor bulk video processing queues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queues.map((queue) => {
                  const completedCount = queue.videos.filter(v => v.status === 'completed').length;
                  const failedCount = queue.videos.filter(v => v.status === 'failed').length;
                  const processingCount = queue.videos.filter(v => v.status === 'processing').length;
                  const progress = queue.videos.length > 0 ? (completedCount / queue.videos.length) * 100 : 0;

                  return (
                    <Card key={queue.id} className={`p-4 ${currentQueue === queue.id ? 'ring-2 ring-blue-500' : ''}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold cursor-pointer" onClick={() => setCurrentQueue(queue.id)}>
                                {queue.name}
                              </h4>
                              <Badge className={getPriorityColor(queue.priority)}>
                                {queue.priority}
                              </Badge>
                              <Badge variant={queue.status === 'processing' ? 'default' : 'outline'}>
                                {queue.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                {queue.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {queue.videos.length.toLocaleString()} videos • 
                              {processingCount} processing • 
                              {completedCount} completed • 
                              {failedCount} failed
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {queue.status === 'idle' && (
                              <Button size="sm" onClick={() => startQueue(queue.id)}>
                                <Play className="w-4 h-4 mr-1" />
                                Start
                              </Button>
                            )}
                            {queue.status === 'processing' && (
                              <Button size="sm" variant="outline" onClick={() => pauseQueue(queue.id)}>
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                            )}
                            {(queue.status === 'processing' || queue.status === 'paused') && (
                              <Button size="sm" variant="destructive" onClick={() => stopQueue(queue.id)}>
                                <Square className="w-4 h-4 mr-1" />
                                Stop
                              </Button>
                            )}
                            {failedCount > 0 && (
                              <Button size="sm" variant="outline" onClick={() => retryFailedVideos(queue.id)}>
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Retry Failed
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{completedCount} / {queue.videos.length}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {queue.estimatedCompletion && (
                          <p className="text-xs text-muted-foreground">
                            Estimated completion: {queue.estimatedCompletion.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo className="w-5 h-5" />
                Video Details
                {currentQueueData && (
                  <Badge variant="outline" className="ml-2">
                    {filteredVideos.length} of {currentQueueData.videos.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Detailed view of individual video processing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Label>Queue:</Label>
                  <Select value={currentQueue} onValueChange={setCurrentQueue}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {queues.map((queue) => (
                        <SelectItem key={queue.id} value={queue.id}>
                          {queue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Video List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredVideos.slice(0, 100).map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(video.status)}
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{video.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(video.size)}</span>
                          {video.duration && <span>• {formatDuration(video.duration)}</span>}
                          <span>• {video.clientName}</span>
                          <span>• {video.platform}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {video.status === 'processing' && (
                        <div className="w-24">
                          <Progress value={video.progress} className="h-1" />
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {video.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredVideos.length > 100 && (
                  <div className="text-center py-4 text-muted-foreground">
                    Showing first 100 of {filteredVideos.length.toLocaleString()} videos
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Processing Settings
              </CardTitle>
              <CardDescription>
                Configure processing parameters for optimal performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="concurrent">Max Concurrent Videos</Label>
                    <Input
                      id="concurrent"
                      type="number"
                      value={maxConcurrent}
                      onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
                      min="1"
                      max="50"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of videos to process simultaneously
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="retry-count">Retry Attempts</Label>
                    <Input
                      id="retry-count"
                      type="number"
                      value={retryCount}
                      onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                      min="0"
                      max="10"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of times to retry failed videos
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-retry failed videos</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically retry failed processing
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoRetry}
                      onChange={(e) => setAutoRetry(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Settings
                  </Button>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
