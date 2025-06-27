'use client';

import { useState, useEffect } from 'react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Play, 
  Pause, 
  Settings, 
  Users, 
  Calendar, 
  BarChart3,
  Sparkles,
  Rocket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileVideo,
  Hash,
  MessageSquare,
  Mail,
  Globe,
  Filter,
  Search,
  Plus,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Workflow
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface ContentAutomationJob {
  id: string;
  name: string;
  type: 'video_processing' | 'auto_posting' | 'report_generation';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  videosTotal: number;
  videosProcessed: number;
  clientsAffected: number;
  startedAt: Date;
  estimatedCompletion?: Date;
  results?: {
    descriptionsGenerated: number;
    hashtagsGenerated: number;
    postsScheduled: number;
    reportsGenerated: number;
    emailsSent: number;
  };
}

export default function OperationsPage() {
  const { totalClientCount } = useTeamMode();
  const [activeTab, setActiveTab] = useState('content-automation');
  const [searchQuery, setSearchQuery] = useState('');
  const [automationJobs, setAutomationJobs] = useState<ContentAutomationJob[]>([]);

  // Mock automation jobs
  useEffect(() => {
    setAutomationJobs([
      {
        id: 'job-1',
        name: 'Fashion & Beauty Batch Processing',
        type: 'video_processing',
        status: 'processing',
        progress: 78,
        videosTotal: 2847,
        videosProcessed: 2221,
        clientsAffected: 234,
        startedAt: new Date(Date.now() - 1000 * 60 * 45),
        estimatedCompletion: new Date(Date.now() + 1000 * 60 * 15),
        results: {
          descriptionsGenerated: 2221,
          hashtagsGenerated: 2221,
          postsScheduled: 0,
          reportsGenerated: 0,
          emailsSent: 0
        }
      },
      {
        id: 'job-2',
        name: 'Weekly Auto-Posting Schedule',
        type: 'auto_posting',
        status: 'completed',
        progress: 100,
        videosTotal: 15670,
        videosProcessed: 15670,
        clientsAffected: 1247,
        startedAt: new Date(Date.now() - 1000 * 60 * 120),
        results: {
          descriptionsGenerated: 0,
          hashtagsGenerated: 0,
          postsScheduled: 15670,
          reportsGenerated: 0,
          emailsSent: 0
        }
      },
      {
        id: 'job-3',
        name: 'Client Performance Reports',
        type: 'report_generation',
        status: 'processing',
        progress: 65,
        videosTotal: 0,
        videosProcessed: 0,
        clientsAffected: 3420,
        startedAt: new Date(Date.now() - 1000 * 60 * 30),
        estimatedCompletion: new Date(Date.now() + 1000 * 60 * 20),
        results: {
          descriptionsGenerated: 0,
          hashtagsGenerated: 0,
          postsScheduled: 0,
          reportsGenerated: 2223,
          emailsSent: 2223
        }
      }
    ]);
  }, []);

  const getJobIcon = (type: string) => {
    switch (type) {
      case 'video_processing': return Sparkles;
      case 'auto_posting': return Calendar;
      case 'report_generation': return BarChart3;
      default: return Zap;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-mint bg-mint/10 border-mint/20';
      case 'processing': return 'text-info bg-info/10 border-info/20';
      case 'queued': return 'text-warning bg-warning/10 border-warning/20';
      case 'failed': return 'text-coral bg-coral/10 border-coral/20';
      default: return 'text-secondaryText bg-muted/10 border-border';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatETA = (date?: Date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m remaining`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h remaining`;
    return `${Math.floor(diffInMinutes / 1440)}d remaining`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Mock stats
  const operationsStats = {
    videosInQueue: 45680,
    activeJobs: 12,
    completedToday: 23456,
    clientsProcessed: 8934,
    postsScheduled: 67890,
    reportsGenerated: 3420,
    emailsSent: 12340,
    avgProcessingTime: '2.3m'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        
        <div className="relative px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 backdrop-blur-sm">
                    <Workflow className="h-8 w-8 text-blue-300" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                      Operations Center
                    </h1>
                    <p className="text-gray-300">
                      Managing content automation for {formatNumber(totalClientCount)} clients
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10 backdrop-blur-sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
                <Button className="bg-gradient-to-r from-mint to-lavender text-black font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  New Workflow
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80 p-4 text-center">
          <FileVideo className="h-6 w-6 mx-auto mb-2 text-mint" />
          <div className="text-xl font-bold text-creative">{formatNumber(operationsStats.videosInQueue)}</div>
          <div className="text-xs text-secondaryText">Videos in Queue</div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-info" />
            <div className="text-xl font-bold text-creative">{operationsStats.activeJobs}</div>
            <div className="text-xs text-secondaryText">Active Jobs</div>
          </div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-mint" />
            <div className="text-xl font-bold text-creative">{formatNumber(operationsStats.completedToday)}</div>
            <div className="text-xs text-secondaryText">Completed Today</div>
          </div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-lavender" />
            <div className="text-xl font-bold text-creative">{formatNumber(operationsStats.clientsProcessed)}</div>
            <div className="text-xs text-secondaryText">Clients Processed</div>
          </div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-coral" />
            <div className="text-xl font-bold text-creative">{formatNumber(operationsStats.postsScheduled)}</div>
            <div className="text-xs text-secondaryText">Posts Scheduled</div>
          </div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-info" />
            <div className="text-xl font-bold text-creative">{formatNumber(operationsStats.reportsGenerated)}</div>
            <div className="text-xs text-secondaryText">Reports Generated</div>
          </div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <Mail className="h-6 w-6 mx-auto mb-2 text-warning" />
            <div className="text-xl font-bold text-creative">{formatNumber(operationsStats.emailsSent)}</div>
            <div className="text-xs text-secondaryText">Emails Sent</div>
          </div>
        </GlassCard>

        <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
          <div className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-mint" />
            <div className="text-xl font-bold text-creative">{operationsStats.avgProcessingTime}</div>
            <div className="text-xs text-secondaryText">Avg Processing</div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content-automation">Content Automation</TabsTrigger>
          <TabsTrigger value="content-ideation">Content Ideation</TabsTrigger>
          <TabsTrigger value="performance-tracking">Performance Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="content-automation" className="space-y-6">
          {/* Content Automation Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-creative">Content Automation</h2>
              <p className="text-secondaryText">Process thousands of videos with AI-powered descriptions and hashtags</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondaryText" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Bulk Upload Section */}
          <GlassCard className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
            <div>
              <div className="flex items-center space-x-2 text-creative">
                <Upload className="h-5 w-5" />
                <span>Bulk Video Upload</span>
              </div>
              <p className="text-secondaryText">
                Upload thousands of videos for automated processing
              </p>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-mint/50 transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-secondaryText" />
                <h3 className="text-lg font-medium text-creative mb-2">Drop videos here or click to upload</h3>
                <p className="text-secondaryText mb-4">
                  Supports MP4, MOV, AVI files. Maximum 10GB per batch.
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button className="bg-mint/20 text-mint hover:bg-mint/30">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                  <Button variant="outline">
                    <Globe className="h-4 w-4 mr-2" />
                    Import from URL
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-creative">Auto-Generated Content</p>
                  <ul className="text-secondaryText space-y-1">
                    <li>• AI-powered descriptions</li>
                    <li>• Trending hashtags</li>
                    <li>• Platform optimization</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-creative">Brand Voice Matching</p>
                  <ul className="text-secondaryText space-y-1">
                    <li>• Client-specific tone</li>
                    <li>• Industry keywords</li>
                    <li>• Custom templates</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-creative">Automated Scheduling</p>
                  <ul className="text-secondaryText space-y-1">
                    <li>• Optimal posting times</li>
                    <li>• Platform-specific formats</li>
                    <li>• Client preferences</li>
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Active Jobs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-creative">Active Automation Jobs</h3>
            <div className="space-y-4">
              {automationJobs.map((job) => {
                const IconComponent = getJobIcon(job.type);
                return (
                  <GlassCard key={job.id} className="border-border/50 bg-gradient-to-br from-panel to-panel/80">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-mint/10 border border-mint/20">
                            <IconComponent className="h-5 w-5 text-mint" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-creative">{job.name}</h4>
                            <p className="text-sm text-secondaryText">
                              {job.clientsAffected} clients • Started {formatTimeAgo(job.startedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-secondaryText">Progress</span>
                            <span className="font-medium text-creative">
                              {job.progress}% • {job.estimatedCompletion ? formatETA(job.estimatedCompletion) : 'Completed'}
                            </span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>

                        {job.type === 'video_processing' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-secondaryText">Videos Processed</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.videosProcessed)} / {formatNumber(job.videosTotal)}
                              </p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Descriptions</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.results?.descriptionsGenerated || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Hashtags</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.results?.hashtagsGenerated || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Clients</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.clientsAffected)}
                              </p>
                            </div>
                          </div>
                        )}

                        {job.type === 'auto_posting' && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-secondaryText">Posts Scheduled</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.results?.postsScheduled || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Platforms</p>
                              <p className="font-semibold text-creative">5 platforms</p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Clients</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.clientsAffected)}
                              </p>
                            </div>
                          </div>
                        )}

                        {job.type === 'report_generation' && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-secondaryText">Reports Generated</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.results?.reportsGenerated || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Emails Sent</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.results?.emailsSent || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-secondaryText">Clients</p>
                              <p className="font-semibold text-creative">
                                {formatNumber(job.clientsAffected)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content-ideation" className="space-y-6">
          <div className="text-center py-12">
            <Rocket className="h-16 w-16 mx-auto mb-4 text-secondaryText" />
            <h3 className="text-xl font-semibold text-creative mb-2">Content Ideation Module</h3>
            <p className="text-secondaryText mb-6">
              Generate personalized reports and content ideas for thousands of clients
            </p>
            <Button className="bg-gradient-to-r from-lavender to-coral text-black">
              <Plus className="h-4 w-4 mr-2" />
              Configure Ideation Workflow
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="performance-tracking" className="space-y-6">
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-secondaryText" />
            <h3 className="text-xl font-semibold text-creative mb-2">Performance Tracking Module</h3>
            <p className="text-secondaryText mb-6">
              Monitor client performance and generate AI-powered improvement recommendations
            </p>
            <Button className="bg-gradient-to-r from-coral to-info text-black">
              <Plus className="h-4 w-4 mr-2" />
              Configure Tracking Workflow
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 