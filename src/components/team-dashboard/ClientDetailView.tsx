'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CircularScore } from '@/components/ui/circular-score';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  Share2,
  Calendar,
  DollarSign,
  Users,
  Activity,
  MoreHorizontal,
  ExternalLink,
  Video,
  Brain,
  Mail,
  Lightbulb,
  Edit3,
  Save,
  X,
  Clock,
  Target,
  BarChart3,
  FileText,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';

export interface ClientDetailViewProps {
  clientId: string;
  onBack: () => void;
}

export function ClientDetailView({ clientId, onBack }: ClientDetailViewProps) {
  const { clients } = useTeamMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  
  const client = clients.find(c => c.id === clientId);
  
  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-mint/20 text-mint border-mint';
      case 'paused': return 'bg-lavender/20 text-lavender border-lavender';
      case 'needs_attention': return 'bg-coral/20 text-coral border-coral';
      default: return 'bg-muted/20 text-muted-foreground border-muted';
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-info/20 text-info border-info';
      case 'completed': return 'bg-mint/20 text-mint border-mint';
      case 'error': return 'bg-coral/20 text-coral border-coral';
      default: return 'bg-muted/20 text-muted-foreground border-muted';
    }
  };

  // Mock detailed analytics data
  const weeklyMetrics = {
    views: 125450,
    viewsChange: 12.5,
    engagement: 8.7,
    engagementChange: -2.1,
    followers: 45280,
    followersChange: 3.8,
    revenue: 15420,
    revenueChange: 28.3
  };

  const recentPosts = [
    { id: 1, title: 'Product Demo Video', platform: 'TikTok', views: 12500, engagement: 9.2, posted: '2 hours ago' },
    { id: 2, title: 'Behind the Scenes', platform: 'Instagram', views: 8340, engagement: 7.8, posted: '1 day ago' },
    { id: 3, title: 'Customer Testimonial', platform: 'YouTube', views: 5620, engagement: 11.1, posted: '3 days ago' },
  ];

  const upcomingPosts = [
    { id: 1, title: 'Weekly Update', platform: 'TikTok', scheduledFor: 'Today 6:00 PM' },
    { id: 2, title: 'Product Launch', platform: 'Instagram', scheduledFor: 'Tomorrow 9:00 AM' },
    { id: 3, title: 'Tutorial Video', platform: 'YouTube', scheduledFor: 'Friday 2:00 PM' },
  ];

  // Mock automation results data
  const automationResults = {
    videoProcessing: [
      {
        id: 'video-1',
        name: 'Product Demo Q4 2024.mp4',
        status: 'completed',
        generatedContent: {
          title: 'Revolutionary Product Demo - See the Future Today!',
          description: 'Discover how our latest innovation transforms your daily workflow with cutting-edge technology.',
          hashtags: ['#Innovation', '#TechDemo', '#ProductLaunch', '#FutureTech', '#Workflow'],
          platforms: ['TikTok', 'Instagram', 'YouTube']
        },
        brandVoice: 'Professional & Innovative',
        processedAt: new Date('2024-01-15T10:30:00')
      },
      {
        id: 'video-2',
        name: 'Behind the Scenes Content.mp4',
        status: 'processing',
        progress: 73,
        brandVoice: 'Casual & Authentic',
        processedAt: new Date('2024-01-15T11:15:00')
      }
    ],
    postingSchedule: [
      {
        id: 'schedule-1',
        videoId: 'video-1',
        platforms: {
          TikTok: { time: '6:00 PM', engagement: 94, audience: 'Peak' },
          Instagram: { time: '7:30 PM', engagement: 87, audience: 'High' },
          YouTube: { time: '2:00 PM', engagement: 91, audience: 'Peak' }
        },
        status: 'scheduled'
      }
    ]
  };

  const feedbackReports = [
    {
      id: 'feedback-1',
      videoTitle: 'Product Demo Video',
      tone: 'professional',
      score: 8.7,
      insights: [
        'Strong opening hook captures attention effectively',
        'Product benefits clearly communicated',
        'Call-to-action could be more prominent'
      ],
      recommendations: [
        'Consider adding customer testimonials',
        'Optimize thumbnail for higher click-through rate',
        'Include more visual demonstrations'
      ],
      generatedAt: new Date('2024-01-15T09:00:00'),
      status: 'sent'
    },
    {
      id: 'feedback-2',
      videoTitle: 'Behind the Scenes Content',
      tone: 'casual',
      score: 9.2,
      insights: [
        'Authentic storytelling resonates well',
        'Good use of natural lighting',
        'Team personality shines through'
      ],
      recommendations: [
        'Add more behind-the-scenes moments',
        'Include team member introductions',
        'Show more of the creative process'
      ],
      generatedAt: new Date('2024-01-14T14:30:00'),
      status: 'viewed'
    }
  ];

  const contentIdeas = [
    {
      id: 'idea-1',
      title: 'AI-Powered Workflow Automation',
      category: 'trending',
      difficulty: 'medium',
      trendScore: 94,
      estimatedViews: 25000,
      keywords: ['AI', 'automation', 'productivity', 'workflow'],
      platforms: ['TikTok', 'LinkedIn', 'YouTube'],
      status: 'approved'
    },
    {
      id: 'idea-2',
      title: 'Customer Success Story Series',
      category: 'evergreen',
      difficulty: 'easy',
      trendScore: 78,
      estimatedViews: 15000,
      keywords: ['success', 'testimonial', 'case study', 'results'],
      platforms: ['Instagram', 'LinkedIn', 'YouTube'],
      status: 'in-production'
    }
  ];

  const startEditing = (itemId: string, currentData: any) => {
    setEditingItem(itemId);
    setEditingData(currentData);
  };

  const saveEdit = () => {
    // In a real app, this would save to the backend
    console.log('Saving edit:', editingData);
    setEditingItem(null);
    setEditingData({});
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingData({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hover:bg-muted"
            aria-label="Back to Clients"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-creative">{client.name}</h1>
            <p className="text-muted-foreground">{client.industry}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
          <Badge className={`border ${getStatusColor(client.status)}`}>
            {client.status.replace('_', ' ')}
          </Badge>
          <Badge className={`border ${getWorkflowStatusColor(client.workflowStatus)}`}>
            {client.workflowStatus}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Views</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{weeklyMetrics.views.toLocaleString()}</div>
              <div className={`text-xs flex items-center ${weeklyMetrics.viewsChange > 0 ? 'text-mint' : 'text-coral'}`}>
                {weeklyMetrics.viewsChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(weeklyMetrics.viewsChange)}% this week
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Engagement</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{weeklyMetrics.engagement}%</div>
              <div className={`text-xs flex items-center ${weeklyMetrics.engagementChange > 0 ? 'text-mint' : 'text-coral'}`}>
                {weeklyMetrics.engagementChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(weeklyMetrics.engagementChange)}% this week
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Followers</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{weeklyMetrics.followers.toLocaleString()}</div>
              <div className={`text-xs flex items-center ${weeklyMetrics.followersChange > 0 ? 'text-mint' : 'text-coral'}`}>
                {weeklyMetrics.followersChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(weeklyMetrics.followersChange)}% this week
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">${weeklyMetrics.revenue.toLocaleString()}</div>
              <div className={`text-xs flex items-center ${weeklyMetrics.revenueChange > 0 ? 'text-mint' : 'text-coral'}`}>
                {weeklyMetrics.revenueChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(weeklyMetrics.revenueChange)}% this week
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-creative">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <CircularScore value={Math.round(client.avgEngagement * 10)} size={120} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Overall Performance Score</p>
                  <p className="text-lg font-semibold text-creative">{Math.round(client.avgEngagement * 10)}/100</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Content Quality</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>Posting Consistency</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>Audience Engagement</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-creative">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-mint" />
                      <span className="text-sm">Accelerate workflow completed</span>
                    </div>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-lavender" />
                      <span className="text-sm">3 posts scheduled for today</span>
                    </div>
                    <span className="text-xs text-muted-foreground">4 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-info" />
                      <span className="text-sm">Engagement rate increased by 12%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">1 day ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Posts */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-creative">Recent Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{post.platform}</span>
                          <span>{post.views.toLocaleString()} views</span>
                          <span>{post.engagement}% engagement</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{post.posted}</p>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Posts */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-creative">Upcoming Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{post.platform}</span>
                          <span>{post.scheduledFor}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-creative">Active Workflows</CardTitle>
              <CardDescription>Manage automated workflows for this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Accelerate', 'Blitz', 'Cycle'].map((workflow, index) => (
                  <div key={workflow} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium">{workflow}</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflow === 'Accelerate' && 'Content optimization pipeline'}
                        {workflow === 'Blitz' && 'Automated posting scheduler'}
                        {workflow === 'Cycle' && 'Performance analytics & improvements'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={index === 1 ? 'bg-mint/20 text-mint' : 'bg-muted/20 text-muted-foreground'}>
                        {index === 1 ? 'Active' : 'Idle'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {index === 1 ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-creative">Detailed Analytics</CardTitle>
              <CardDescription>In-depth performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Detailed analytics charts would be rendered here</p>
                  <p className="text-sm">Integration with charting library required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Processing Results */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-mint" />
                  Video Processing Results
                </CardTitle>
                <CardDescription>AI-generated content from bulk video processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automationResults.videoProcessing.map((video) => (
                    <div key={video.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{video.name}</h4>
                          <Badge className={video.status === 'completed' ? 'bg-mint/20 text-mint' : 'bg-info/20 text-info'}>
                            {video.status}
                          </Badge>
                        </div>
                        {video.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startEditing(video.id, video.generatedContent)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>

                      {video.status === 'processing' && (
                        <div className="space-y-2">
                          <Progress value={video.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">{video.progress}% complete</p>
                        </div>
                      )}

                      {video.status === 'completed' && video.generatedContent && (
                        <div className="space-y-3">
                          {editingItem === video.id ? (
                            <div className="space-y-3">
                              <div>
                                <label htmlFor="video-title" className="text-sm font-medium">Title</label>
                                <Input 
                                  id="video-title"
                                  value={editingData.title || ''} 
                                  onChange={(e) => setEditingData({...editingData, title: e.target.value})}
                                />
                              </div>
                              <div>
                                <label htmlFor="video-description" className="text-sm font-medium">Description</label>
                                <Textarea 
                                  id="video-description"
                                  value={editingData.description || ''} 
                                  onChange={(e) => setEditingData({...editingData, description: e.target.value})}
                                />
                              </div>
                              <div>
                                <label htmlFor="video-hashtags" className="text-sm font-medium">Hashtags</label>
                                <Input 
                                  id="video-hashtags"
                                  value={editingData.hashtags?.join(', ') || ''} 
                                  onChange={(e) => setEditingData({...editingData, hashtags: e.target.value.split(', ')})}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEdit}>
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={cancelEdit}>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium">Title:</span>
                                <p className="text-sm">{video.generatedContent.title}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Description:</span>
                                <p className="text-sm text-muted-foreground">{video.generatedContent.description}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Hashtags:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {video.generatedContent.hashtags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Posting Schedule */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-lavender" />
                  Auto Posting Schedule
                </CardTitle>
                <CardDescription>Optimized posting times for maximum engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automationResults.postingSchedule.map((schedule) => (
                    <div key={schedule.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Video Posting Schedule</h4>
                        <Badge className="bg-lavender/20 text-lavender">
                          {schedule.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {Object.entries(schedule.platforms).map(([platform, data]) => (
                          <div key={platform} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div>
                              <span className="font-medium">{platform}</span>
                              <p className="text-sm text-muted-foreground">
                                {data.time} • {data.audience} audience
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{data.engagement}%</div>
                              <div className="text-xs text-muted-foreground">engagement</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-coral" />
                Feedback Reports
              </CardTitle>
              <CardDescription>AI-generated feedback reports with tone adaptation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedbackReports.map((report) => (
                  <div key={report.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{report.videoTitle}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">
                            {report.tone} tone
                          </Badge>
                          <Badge className={report.status === 'sent' ? 'bg-mint/20 text-mint' : 'bg-info/20 text-info'}>
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-coral">{report.score}/10</div>
                        <div className="text-xs text-muted-foreground">feedback score</div>
                      </div>
                    </div>

                    {editingItem === report.id ? (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="feedback-tone" className="text-sm font-medium">Tone</label>
                          <Select 
                            value={editingData.tone || report.tone}
                            onValueChange={(value) => setEditingData({...editingData, tone: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label htmlFor="feedback-insights" className="text-sm font-medium">Key Insights</label>
                          <Textarea 
                            id="feedback-insights"
                            value={editingData.insights?.join('\n') || report.insights.join('\n')} 
                            onChange={(e) => setEditingData({...editingData, insights: e.target.value.split('\n')})}
                          />
                        </div>
                        <div>
                          <label htmlFor="feedback-recommendations" className="text-sm font-medium">Recommendations</label>
                          <Textarea 
                            id="feedback-recommendations"
                            value={editingData.recommendations?.join('\n') || report.recommendations.join('\n')} 
                            onChange={(e) => setEditingData({...editingData, recommendations: e.target.value.split('\n')})}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-3 w-3 mr-1" />
                            Save & Resend
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium">Key Insights:</span>
                          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                            {report.insights.map((insight, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 text-mint mt-0.5 flex-shrink-0" />
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Recommendations:</span>
                          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                            {report.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Target className="h-3 w-3 text-coral mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startEditing(report.id, report)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit Report
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-info" />
                Content Ideas
              </CardTitle>
              <CardDescription>AI-generated content ideas and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentIdeas.map((idea) => (
                  <div key={idea.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{idea.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">
                            {idea.category}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {idea.difficulty}
                          </Badge>
                          <Badge className={idea.status === 'approved' ? 'bg-mint/20 text-mint' : 'bg-info/20 text-info'}>
                            {idea.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-info">{idea.trendScore}</div>
                        <div className="text-xs text-muted-foreground">trend score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-sm font-medium">Estimated Views:</span>
                        <p className="text-sm text-muted-foreground">{idea.estimatedViews.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Platforms:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {idea.platforms.map((platform, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-sm font-medium">Keywords:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {idea.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            #{keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Customize
                      </Button>
                      <Button variant="outline" size="sm">
                        <Zap className="h-3 w-3 mr-1" />
                        Generate Content
                      </Button>
                      {idea.status === 'approved' && (
                        <Button size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Start Production
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 