'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, 
  Clock, 
  Send, 
  Pause,
  Play,
  Settings,
  TrendingUp,
  Users,
  Globe,
  Zap,
  Target,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  Upload
} from 'lucide-react';

interface PostingSchedule {
  id: string;
  videoId: string;
  videoName: string;
  clientId: string;
  clientName: string;
  platforms: {
    platform: string;
    enabled: boolean;
    scheduledTime: Date;
    optimalTime: Date;
    customCaption?: string;
    hashtags: string[];
    status: 'scheduled' | 'posted' | 'failed' | 'cancelled';
  }[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  scheduledBy: string;
}

interface OptimalTimingData {
  platform: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23
  engagementScore: number;
  audienceSize: number;
  competitionLevel: number;
}

interface PlatformSettings {
  platform: string;
  enabled: boolean;
  defaultHashtags: string[];
  captionTemplate: string;
  postingFrequency: 'low' | 'medium' | 'high';
  optimalTimingEnabled: boolean;
  customSchedule?: {
    days: number[];
    times: string[];
  };
}

export function AutoPostingScheduler() {
  const [schedules, setSchedules] = useState<PostingSchedule[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings[]>([
    {
      platform: 'instagram',
      enabled: true,
      defaultHashtags: ['#content', '#marketing', '#business'],
      captionTemplate: '{title}\n\n{description}\n\n{hashtags}',
      postingFrequency: 'medium',
      optimalTimingEnabled: true
    },
    {
      platform: 'tiktok',
      enabled: true,
      defaultHashtags: ['#viral', '#trending', '#fyp'],
      captionTemplate: '{title} {hashtags}',
      postingFrequency: 'high',
      optimalTimingEnabled: true
    },
    {
      platform: 'twitter',
      enabled: true,
      defaultHashtags: ['#content', '#business'],
      captionTemplate: '{title}\n\n{description}',
      postingFrequency: 'medium',
      optimalTimingEnabled: true
    },
    {
      platform: 'linkedin',
      enabled: false,
      defaultHashtags: ['#professional', '#business', '#networking'],
      captionTemplate: '{title}\n\n{description}\n\n{hashtags}',
      postingFrequency: 'low',
      optimalTimingEnabled: true
    }
  ]);

  const [optimalTiming, setOptimalTiming] = useState<OptimalTimingData[]>([
    // Mock optimal timing data
    { platform: 'instagram', dayOfWeek: 1, hour: 14, engagementScore: 95, audienceSize: 85, competitionLevel: 60 },
    { platform: 'instagram', dayOfWeek: 3, hour: 19, engagementScore: 92, audienceSize: 90, competitionLevel: 70 },
    { platform: 'tiktok', dayOfWeek: 2, hour: 18, engagementScore: 98, audienceSize: 95, competitionLevel: 80 },
    { platform: 'tiktok', dayOfWeek: 5, hour: 20, engagementScore: 96, audienceSize: 88, competitionLevel: 75 },
    { platform: 'twitter', dayOfWeek: 1, hour: 9, engagementScore: 88, audienceSize: 75, competitionLevel: 65 },
    { platform: 'twitter', dayOfWeek: 4, hour: 15, engagementScore: 85, audienceSize: 80, competitionLevel: 70 },
  ]);

  const [activeTab, setActiveTab] = useState('schedule');
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');

  // Generate optimal posting schedule for videos
  const generateOptimalSchedule = (videos: any[]) => {
    const newSchedules: PostingSchedule[] = videos.map((video, index) => {
      const platforms = platformSettings
        .filter(setting => setting.enabled)
        .map(setting => {
          const optimalTime = getOptimalTime(setting.platform, index);
          return {
            platform: setting.platform,
            enabled: true,
            scheduledTime: optimalTime,
            optimalTime: optimalTime,
            hashtags: setting.defaultHashtags,
            status: 'scheduled' as const
          };
        });

      return {
        id: `schedule_${Date.now()}_${index}`,
        videoId: video.id,
        videoName: video.name,
        clientId: video.clientId || 'default',
        clientName: video.clientName || 'Default Client',
        platforms,
        priority: index < 10 ? 'high' : 'normal',
        createdAt: new Date(),
        scheduledBy: 'auto-scheduler'
      };
    });

    setSchedules(prev => [...prev, ...newSchedules]);
  };

  // Get optimal posting time for a platform
  const getOptimalTime = (platform: string, offset: number = 0) => {
    const platformTiming = optimalTiming.filter(t => t.platform === platform);
    if (platformTiming.length === 0) {
      // Default to current time + offset
      const now = new Date();
      now.setHours(now.getHours() + offset);
      return now;
    }

    // Get best timing slot
    const bestTiming = platformTiming.reduce((best, current) => 
      current.engagementScore > best.engagementScore ? current : best
    );

    // Calculate next occurrence of this day/time
    const now = new Date();
    const targetDate = new Date();
    
    // Find next occurrence of the optimal day
    const daysUntilTarget = (bestTiming.dayOfWeek - now.getDay() + 7) % 7;
    targetDate.setDate(now.getDate() + daysUntilTarget + Math.floor(offset / 7) * 7);
    targetDate.setHours(bestTiming.hour, 0, 0, 0);
    
    // Add offset for spacing multiple posts
    targetDate.setHours(targetDate.getHours() + (offset % 24));
    
    return targetDate;
  };

  // Start scheduling process
  const startScheduling = async () => {
    setIsScheduling(true);
    
    // Simulate scheduling process
    for (let i = 0; i < schedules.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setSchedules(prev => prev.map((schedule, index) => 
        index === i 
          ? {
              ...schedule,
              platforms: schedule.platforms.map(p => ({ ...p, status: 'posted' as const }))
            }
          : schedule
      ));
    }
    
    setIsScheduling(false);
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return '📷';
      case 'tiktok': return '🎵';
      case 'twitter': return '🐦';
      case 'linkedin': return '💼';
      case 'facebook': return '👥';
      case 'youtube': return '📺';
      default: return '🌐';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-info/20 text-info border-info';
      case 'posted': return 'bg-mint/20 text-mint border-mint';
      case 'failed': return 'bg-coral/20 text-coral border-coral';
      case 'cancelled': return 'bg-muted/20 text-muted-foreground border-muted';
      default: return 'bg-warning/20 text-warning border-warning';
    }
  };

  // Calculate scheduling stats
  const schedulingStats = {
    totalPosts: schedules.reduce((sum, s) => sum + s.platforms.length, 0),
    scheduledPosts: schedules.reduce((sum, s) => sum + s.platforms.filter(p => p.status === 'scheduled').length, 0),
    postedPosts: schedules.reduce((sum, s) => sum + s.platforms.filter(p => p.status === 'posted').length, 0),
    failedPosts: schedules.reduce((sum, s) => sum + s.platforms.filter(p => p.status === 'failed').length, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-creative">Auto Posting Scheduler</h2>
          <p className="text-muted-foreground">
            Optimize posting times across platforms for maximum engagement
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{schedulingStats.totalPosts} posts</span>
          </Badge>
          
          <Button
            onClick={startScheduling}
            disabled={isScheduling || schedulingStats.scheduledPosts === 0}
            className="bg-mint text-background hover:bg-mint/90"
          >
            <Send className="h-4 w-4 mr-2" />
            {isScheduling ? 'Scheduling...' : 'Start Scheduling'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-info" />
            <div className="text-2xl font-bold">{schedulingStats.scheduledPosts}</div>
            <div className="text-sm text-muted-foreground">Scheduled</div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-mint" />
            <div className="text-2xl font-bold">{schedulingStats.postedPosts}</div>
            <div className="text-sm text-muted-foreground">Posted</div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-coral" />
            <div className="text-2xl font-bold">{schedulingStats.failedPosts}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-lavender" />
            <div className="text-2xl font-bold">
              {schedulingStats.totalPosts > 0 ? Math.round((schedulingStats.postedPosts / schedulingStats.totalPosts) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="optimal-timing">Optimal Timing</TabsTrigger>
          <TabsTrigger value="platforms">Platform Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Posting Schedule</span>
              </CardTitle>
              <CardDescription>
                Manage and monitor scheduled posts across all platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.length > 0 ? (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{schedule.videoName}</h4>
                          <p className="text-sm text-muted-foreground">{schedule.clientName}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={
                            schedule.priority === 'high' ? 'border-coral text-coral' : 'border-muted'
                          }>
                            {schedule.priority} priority
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {schedule.platforms.map((platform, index) => (
                          <div key={index} className="p-3 rounded border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getPlatformIcon(platform.platform)}</span>
                                <span className="text-sm font-medium capitalize">{platform.platform}</span>
                              </div>
                              <Badge className={getStatusColor(platform.status)}>
                                {platform.status}
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1 mb-1">
                                <Clock className="h-3 w-3" />
                                <span>{platform.scheduledTime.toLocaleString()}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {platform.hashtags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="bg-muted px-1 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No posts scheduled</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate content to start scheduling posts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimal-timing" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Optimal Posting Times</span>
              </CardTitle>
              <CardDescription>
                AI-analyzed best times for maximum engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['instagram', 'tiktok', 'twitter', 'linkedin'].map((platform) => {
                  const platformData = optimalTiming.filter(t => t.platform === platform);
                  
                  return (
                    <div key={platform} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getPlatformIcon(platform)}</span>
                        <h4 className="font-medium capitalize">{platform}</h4>
                      </div>
                      
                      <div className="space-y-2">
                        {platformData.map((timing, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div>
                              <div className="text-sm font-medium">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][timing.dayOfWeek]} at {timing.hour}:00
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Audience: {timing.audienceSize}% • Competition: {timing.competitionLevel}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-mint">{timing.engagementScore}%</div>
                              <div className="text-xs text-muted-foreground">Engagement</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Platform Settings</span>
              </CardTitle>
              <CardDescription>
                Configure posting preferences for each platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {platformSettings.map((setting, index) => (
                <div key={setting.platform} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getPlatformIcon(setting.platform)}</span>
                      <h4 className="font-medium capitalize">{setting.platform}</h4>
                    </div>
                    
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={(enabled) => {
                        setPlatformSettings(prev => prev.map((s, i) => 
                          i === index ? { ...s, enabled } : s
                        ));
                      }}
                    />
                  </div>
                  
                  {setting.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Posting Frequency</Label>
                        <Select 
                          value={setting.postingFrequency} 
                          onValueChange={(frequency) => {
                            setPlatformSettings(prev => prev.map((s, i) => 
                              i === index ? { ...s, postingFrequency: frequency as any } : s
                            ));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low (1-2 posts/day)</SelectItem>
                            <SelectItem value="medium">Medium (3-5 posts/day)</SelectItem>
                            <SelectItem value="high">High (6+ posts/day)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={setting.optimalTimingEnabled}
                          onCheckedChange={(optimalTimingEnabled) => {
                            setPlatformSettings(prev => prev.map((s, i) => 
                              i === index ? { ...s, optimalTimingEnabled } : s
                            ));
                          }}
                        />
                        <Label className="text-sm">Use optimal timing</Label>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">Default Hashtags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {setting.defaultHashtags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Scheduling Analytics</span>
              </CardTitle>
              <CardDescription>
                Performance insights and optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Platform Performance</h4>
                  {['instagram', 'tiktok', 'twitter'].map((platform) => (
                    <div key={platform} className="flex items-center justify-between p-3 rounded bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getPlatformIcon(platform)}</span>
                        <span className="capitalize">{platform}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {Math.floor(Math.random() * 20) + 80}%
                        </div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Optimization Tips</h4>
                  <div className="space-y-2">
                    <div className="p-3 rounded bg-info/10 border border-info/20">
                      <p className="text-sm font-medium text-info">Best Time Detected</p>
                      <p className="text-xs text-muted-foreground">
                        Tuesday 2:00 PM shows 23% higher engagement for Instagram
                      </p>
                    </div>
                    <div className="p-3 rounded bg-warning/10 border border-warning/20">
                      <p className="text-sm font-medium text-warning">Frequency Adjustment</p>
                      <p className="text-xs text-muted-foreground">
                        Consider reducing TikTok posting frequency to avoid audience fatigue
                      </p>
                    </div>
                    <div className="p-3 rounded bg-mint/10 border border-mint/20">
                      <p className="text-sm font-medium text-mint">Hashtag Optimization</p>
                      <p className="text-xs text-muted-foreground">
                        #trending and #viral show 15% better performance this week
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}