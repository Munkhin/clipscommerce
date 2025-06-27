'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileVideo,
  Zap,
  Activity,
  Timer,
  Users,
  Settings,
  RefreshCw
} from 'lucide-react';

interface ProcessingJob {
  id: string;
  videoId: string;
  videoName: string;
  clientId?: string;
  clientName?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  error?: string;
  retryCount: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface ProcessingQueue {
  id: string;
  name: string;
  jobs: ProcessingJob[];
  status: 'idle' | 'running' | 'paused' | 'completed';
  concurrentJobs: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  estimatedCompletion?: Date;
}

interface BulkVideoProcessorProps {
  videos?: any[];
  onProcessingComplete?: (results: any[]) => void;
  onProgressUpdate?: (progress: number) => void;
}

export function BulkVideoProcessor({ 
  videos = [], 
  onProcessingComplete,
  onProgressUpdate 
}: BulkVideoProcessorProps) {
  const [queue, setQueue] = useState<ProcessingQueue>({
    id: 'main-queue',
    name: 'Main Processing Queue',
    jobs: [],
    status: 'idle',
    concurrentJobs: 4,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 2000 // 2 seconds average
  });

  const [activeJobs, setActiveJobs] = useState<ProcessingJob[]>([]);
  const [processingStats, setProcessingStats] = useState({
    videosPerMinute: 0,
    totalProcessingTime: 0,
    successRate: 100,
    queueLength: 0
  });

  // Initialize queue when videos change
  useEffect(() => {
    if (videos.length > 0) {
      const jobs: ProcessingJob[] = videos.map((video, index) => ({
        id: `job_${Date.now()}_${index}`,
        videoId: video.id,
        videoName: video.name,
        clientId: video.clientId,
        clientName: video.clientName,
        status: 'queued',
        progress: 0,
        estimatedDuration: 2000 + Math.random() * 3000, // 2-5 seconds
        retryCount: 0,
        priority: index < 10 ? 'high' : 'normal' // First 10 are high priority
      }));

      setQueue(prev => ({
        ...prev,
        jobs,
        totalJobs: jobs.length,
        status: 'idle'
      }));
    }
  }, [videos]);

  // Start processing
  const startProcessing = async () => {
    if (queue.jobs.length === 0) return;

    setQueue(prev => ({ ...prev, status: 'running' }));
    
    // Process jobs in batches based on concurrentJobs setting
    const queuedJobs = queue.jobs.filter(job => job.status === 'queued');
    
    for (let i = 0; i < queuedJobs.length; i += queue.concurrentJobs) {
      const batch = queuedJobs.slice(i, i + queue.concurrentJobs);
      
      // Process batch concurrently
      await Promise.all(
        batch.map(job => processJob(job))
      );
    }

    setQueue(prev => ({ ...prev, status: 'completed' }));
    
    if (onProcessingComplete) {
      const results = queue.jobs.filter(job => job.status === 'completed');
      onProcessingComplete(results);
    }
  };

  // Process individual job
  const processJob = async (job: ProcessingJob) => {
    // Update job status to processing
    updateJobStatus(job.id, 'processing', 0);
    setActiveJobs(prev => [...prev, job]);

    try {
      // Simulate processing with progress updates
      const steps = 10;
      for (let step = 0; step <= steps; step++) {
        await new Promise(resolve => setTimeout(resolve, job.estimatedDuration / steps));
        const progress = (step / steps) * 100;
        updateJobStatus(job.id, 'processing', progress);
        
        if (onProgressUpdate) {
          const overallProgress = calculateOverallProgress();
          onProgressUpdate(overallProgress);
        }
      }

      // Complete job
      updateJobStatus(job.id, 'completed', 100);
      setActiveJobs(prev => prev.filter(j => j.id !== job.id));
      
    } catch (error) {
      // Handle job failure
      updateJobStatus(job.id, 'failed', 0, error instanceof Error ? error.message : 'Unknown error');
      setActiveJobs(prev => prev.filter(j => j.id !== job.id));
    }
  };

  // Update job status
  const updateJobStatus = (
    jobId: string, 
    status: ProcessingJob['status'], 
    progress: number, 
    error?: string
  ) => {
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status, 
              progress,
              error,
              startedAt: status === 'processing' && !job.startedAt ? new Date() : job.startedAt,
              completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
            }
          : job
      ),
      completedJobs: prev.jobs.filter(j => j.status === 'completed').length,
      failedJobs: prev.jobs.filter(j => j.status === 'failed').length
    }));
  };

  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (queue.totalJobs === 0) return 0;
    const totalProgress = queue.jobs.reduce((sum, job) => sum + job.progress, 0);
    return totalProgress / queue.totalJobs;
  };

  // Pause processing
  const pauseProcessing = () => {
    setQueue(prev => ({ ...prev, status: 'paused' }));
    // In a real implementation, you'd pause active jobs
  };

  // Resume processing
  const resumeProcessing = () => {
    setQueue(prev => ({ ...prev, status: 'running' }));
    // Continue processing remaining jobs
  };

  // Stop processing
  const stopProcessing = () => {
    setQueue(prev => ({ ...prev, status: 'idle' }));
    setActiveJobs([]);
    // Reset all processing jobs to queued
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.map(job => 
        job.status === 'processing' ? { ...job, status: 'queued', progress: 0 } : job
      )
    }));
  };

  // Retry failed jobs
  const retryFailedJobs = () => {
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.map(job => 
        job.status === 'failed' 
          ? { ...job, status: 'queued', progress: 0, error: undefined, retryCount: job.retryCount + 1 }
          : job
      )
    }));
  };

  // Get status color
  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued': return 'bg-warning/20 text-warning border-warning';
      case 'processing': return 'bg-info/20 text-info border-info';
      case 'completed': return 'bg-mint/20 text-mint border-mint';
      case 'failed': return 'bg-coral/20 text-coral border-coral';
      case 'paused': return 'bg-muted/20 text-muted-foreground border-muted';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued': return <Clock className="h-3 w-3" />;
      case 'processing': return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      case 'failed': return <AlertCircle className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
    }
  };

  const overallProgress = calculateOverallProgress();
  const queuedJobs = queue.jobs.filter(job => job.status === 'queued').length;
  const processingJobs = queue.jobs.filter(job => job.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Queue Overview */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Processing Queue</span>
              </CardTitle>
              <CardDescription>
                {queue.name} - {queue.totalJobs} total jobs
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={
                queue.status === 'running' ? 'bg-info/20 text-info border-info' :
                queue.status === 'completed' ? 'bg-mint/20 text-mint border-mint' :
                queue.status === 'paused' ? 'bg-warning/20 text-warning border-warning' :
                'bg-muted/20 text-muted-foreground border-muted'
              }>
                {queue.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-mint">{queue.completedJobs}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{processingJobs}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{queuedJobs}</div>
              <div className="text-sm text-muted-foreground">Queued</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-coral">{queue.failedJobs}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-2">
            {queue.status === 'idle' && (
              <Button
                onClick={startProcessing}
                disabled={queue.totalJobs === 0}
                className="bg-mint text-background hover:bg-mint/90"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Processing
              </Button>
            )}
            
            {queue.status === 'running' && (
              <>
                <Button variant="outline" onClick={pauseProcessing}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button variant="outline" onClick={stopProcessing}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
            
            {queue.status === 'paused' && (
              <>
                <Button onClick={resumeProcessing} className="bg-mint text-background hover:bg-mint/90">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button variant="outline" onClick={stopProcessing}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
            
            {queue.failedJobs > 0 && (
              <Button variant="outline" onClick={retryFailedJobs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed ({queue.failedJobs})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Currently Processing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                  <Loader2 className="h-4 w-4 animate-spin text-info" />
                  <div className="flex-1">
                    <p className="font-medium">{job.videoName}</p>
                    {job.clientName && (
                      <p className="text-sm text-muted-foreground">{job.clientName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{Math.round(job.progress)}%</div>
                    <Progress value={job.progress} className="h-1 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileVideo className="h-5 w-5" />
            <span>Job Queue ({queue.jobs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {queue.jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <p className="font-medium">{job.videoName}</p>
                    {job.clientName && (
                      <p className="text-sm text-muted-foreground">{job.clientName}</p>
                    )}
                    {job.error && (
                      <p className="text-xs text-coral">{job.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {job.status === 'processing' && (
                    <div className="text-right">
                      <div className="text-sm font-medium">{Math.round(job.progress)}%</div>
                      <Progress value={job.progress} className="h-1 w-16" />
                    </div>
                  )}
                  
                  <Badge className={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                  
                  {job.priority === 'high' && (
                    <Badge variant="outline" className="text-xs">
                      High Priority
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {queue.jobs.length === 0 && (
            <div className="text-center py-8">
              <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No jobs in queue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload videos to start processing
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 