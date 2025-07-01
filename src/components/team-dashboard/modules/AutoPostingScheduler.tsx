'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { 
  Calendar as CalendarIcon,
  Clock, 
  Target, 
  Brain, 
  TrendingUp, 
  Users, 
  Globe, 
  Play, 
  Pause, 
  Settings, 
  BarChart3,
  Zap,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Timer,
  RefreshCw
} from 'lucide-react';

export interface PostingSchedule {
  id: string;
  clientId: string;
  clientName: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  scheduledTime: Date;
  content: {
    videoId: string;
    title: string;
    description: string;
    hashtags: string[];
  };
  status: 'scheduled' | 'posting' | 'posted' | 'failed' | 'paused';
  engagementPrediction: number;
  optimalScore: number;
  timeZone: string;
}

export interface ClientPreferences {
  id: string;
  name: string;
  timeZone: string;
  targetAudience: {
    ageGroup: string;
    demographics: string[];
    interests: string[];
  };
  postingFrequency: {
    tiktok: number; // posts per day
    instagram: number;
    youtube: number;
  };
  optimalTimes: {
    [platform: string]: {
      dayOfWeek: number;
      hour: number;
      minute: number;
      score: number;
    }[];
  };
  brandVoice: string;
  restrictedHours: {
    start: string;
    end: string;
  };
}

export interface PlatformAnalytics {
  platform: string;
  bestPostingTimes: {
    hour: number;
    engagementRate: number;
    confidence: number;
  }[];
  audienceActivity: {
    dayOfWeek: string;
    hourlyActivity: number[];
  }[];
  competitorAnalysis: {
    avgPostingTime: string;
    engagementTrends: number[];
  };
}

export function AutoPostingScheduler() {
  const [schedules, setSchedules] = useState<PostingSchedule[]>([]);
  const [clientPreferences, setClientPreferences] = useState<ClientPreferences[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [aiOptimization, setAiOptimization] = useState(true);
  const [autoScheduling, setAutoScheduling] = useState(true);
  const [bulkSchedulingMode, setBulkSchedulingMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Initialize sample data
  useEffect(() => {
    const sampleClients: ClientPreferences[] = [
      {
        id: 'client-1',
        name: 'TechCorp Inc.',
        timeZone: 'America/New_York',
        targetAudience: {
          ageGroup: '25-35',
          demographics: ['tech professionals', 'entrepreneurs'],
          interests: ['technology', 'innovation', 'startups']
        },
        postingFrequency: {
          tiktok: 3,
          instagram: 2,
          youtube: 1
        },
        optimalTimes: {
          tiktok: [
            { dayOfWeek: 1, hour: 9, minute: 0, score: 85 },
            { dayOfWeek: 1, hour: 18, minute: 30, score: 92 },
            { dayOfWeek: 3, hour: 12, minute: 15, score: 78 }
          ],
          instagram: [
            { dayOfWeek: 2, hour: 11, minute: 0, score: 88 },
            { dayOfWeek: 4, hour: 15, minute: 30, score: 91 }
          ],
          youtube: [
            { dayOfWeek: 6, hour: 14, minute: 0, score: 95 }
          ]
        },
        brandVoice: 'Professional & Innovative',
        restrictedHours: {
          start: '22:00',
          end: '06:00'
        }
      },
      {
        id: 'client-2',
        name: 'Lifestyle Brand Co.',
        timeZone: 'America/Los_Angeles',
        targetAudience: {
          ageGroup: '18-30',
          demographics: ['lifestyle enthusiasts', 'young professionals'],
          interests: ['wellness', 'fashion', 'travel']
        },
        postingFrequency: {
          tiktok: 5,
          instagram: 4,
          youtube: 2
        },
        optimalTimes: {
          tiktok: [
            { dayOfWeek: 2, hour: 7, minute: 30, score: 89 },
            { dayOfWeek: 2, hour: 19, minute: 0, score: 94 },
            { dayOfWeek: 4, hour: 16, minute: 45, score: 87 }
          ]
        },
        brandVoice: 'Casual & Inspiring',
        restrictedHours: {
          start: '23:00',
          end: '05:00'
        }
      }
    ];

    const sampleSchedules: PostingSchedule[] = Array.from({ length: 50 }, (_, i) => {
      const client = sampleClients[i % sampleClients.length];
      const platforms = ['tiktok', 'instagram', 'youtube'] as const;
      const platform = platforms[i % platforms.length];
      const baseTime = new Date();
      baseTime.setHours(baseTime.getHours() + (i * 2));

      return {
        id: `schedule-${i + 1}`,
        clientId: client.id,
        clientName: client.name,
        platform,
        scheduledTime: baseTime,
        content: {
          videoId: `video-${i + 1}`,
          title: `Engaging ${platform} content #${i + 1}`,
          description: `AI-optimized description for ${client.name}`,
          hashtags: ['#trending', '#viral', '#content']
        },
        status: ['scheduled', 'posting', 'posted', 'failed'][Math.floor(Math.random() * 4)] as any,
        engagementPrediction: Math.random() * 100,
        optimalScore: Math.random() * 100,
        timeZone: client.timeZone
      };
    });

    const sampleAnalytics: PlatformAnalytics[] = [
      {
        platform: 'tiktok',
        bestPostingTimes: [
          { hour: 7, engagementRate: 4.2, confidence: 89 },
          { hour: 12, engagementRate: 3.8, confidence: 92 },
          { hour: 18, engagementRate: 5.1, confidence: 95 },
          { hour: 21, engagementRate: 4.7, confidence: 88 }
        ],
        audienceActivity: [
          {
            dayOfWeek: 'Monday',
            hourlyActivity: Array.from({ length: 24 }, (_, i) => Math.random() * 100)
          }
        ],
        competitorAnalysis: {
          avgPostingTime: '18:30',
          engagementTrends: [3.2, 3.8, 4.1, 4.5, 4.2]
        }
      }
    ];

    setClientPreferences(sampleClients);
    setSchedules(sampleSchedules);
    setPlatformAnalytics(sampleAnalytics);
    setSelectedClient(sampleClients[0].id);
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const clientMatch = selectedClient === '' || schedule.clientId === selectedClient;
      const platformMatch = selectedPlatform === 'all' || schedule.platform === selectedPlatform;
      return clientMatch && platformMatch;
    });
  }, [schedules, selectedClient, selectedPlatform]);

  const generateOptimalSchedule = useCallback(async (clientId: string, videoIds: string[]) => {
    if (!aiOptimization) {
      toast({
        title: "AI optimization disabled",
        description: "Enable AI optimization to generate optimal schedules",
        variant: "destructive"
      });
      return;
    }

    const client = clientPreferences.find(c => c.id === clientId);
    if (!client) return;

    toast({
      title: "Generating optimal schedule",
      description: `Analyzing audience data and engagement patterns for ${client.name}`,
    });

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newSchedules: PostingSchedule[] = videoIds.map((videoId, index) => {
      const platforms = ['tiktok', 'instagram', 'youtube'] as const;
      const platform = platforms[index % platforms.length];
      
      // Get optimal time for this platform
      const optimalTimes = client.optimalTimes[platform] || [];
      const bestTime = optimalTimes.length > 0 
        ? optimalTimes.reduce((best, current) => current.score > best.score ? current : best)
        : { dayOfWeek: 1, hour: 12, minute: 0, score: 50 };

      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + Math.floor(index / 3)); // Spread over multiple days
      scheduleDate.setHours(bestTime.hour, bestTime.minute, 0, 0);

      return {
        id: `schedule-${Date.now()}-${index}`,
        clientId,
        clientName: client.name,
        platform,
        scheduledTime: scheduleDate,
        content: {
          videoId,
          title: `AI-optimized content for ${platform}`,
          description: `Optimized for ${client.targetAudience.ageGroup} audience`,
          hashtags: client.targetAudience.interests.map(interest => `#${interest}`)
        },
        status: 'scheduled' as const,
        engagementPrediction: bestTime.score + Math.random() * 10,
        optimalScore: bestTime.score,
        timeZone: client.timeZone
      };
    });

    setSchedules(prev => [...prev, ...newSchedules]);
    
    toast({
      title: "Schedule generated",
      description: `Created ${newSchedules.length} optimized posting schedules`,
    });
  }, [clientPreferences, aiOptimization]);

  const pauseSchedule = useCallback((scheduleId: string) => {
    setSchedules(prev => prev.map(s =>
      s.id === scheduleId && s.status === 'scheduled'
        ? { ...s, status: 'paused' }
        : s
    ));
    toast({
      title: 'Post Paused',
      description: 'The scheduled post has been paused.'
    });
  }, []);

  const reschedulePost = useCallback((scheduleId: string, newTime: Date) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, scheduledTime: newTime }
        : schedule
    ));
    toast({
      title: "Post rescheduled",
      description: `Post has been rescheduled to ${newTime.toLocaleString()}`,
    });
  }, []);

  const getStatusIcon = (status: PostingSchedule['status']) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'posting': return <Loader2 className="w-4 h-4 text-green-500 animate-spin" />;
      case 'posted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOptimalScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'tiktok': return 'bg-black text-white';
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'youtube': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Auto-Posting Scheduler</h2>
          <p className="text-muted-foreground">
            AI-powered optimal timing with cross-platform scheduling management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Brain className="w-4 h-4 mr-1" />
            AI Optimized
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {filteredSchedules.length} Scheduled
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {schedules.filter(s => s.status === 'scheduled').length}
            </div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {schedules.filter(s => s.status === 'posted').length}
            </div>
            <p className="text-sm text-muted-foreground">Posted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {schedules.filter(s => s.status === 'posting').length}
            </div>
            <p className="text-sm text-muted-foreground">Posting Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {schedules.filter(s => s.status === 'failed').length}
            </div>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {schedules.reduce((sum, s) => sum + s.engagementPrediction, 0) / schedules.length | 0}%
            </div>
            <p className="text-sm text-muted-foreground">Avg Engagement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scheduler" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scheduler">Smart Scheduler</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="analytics">Platform Analytics</TabsTrigger>
          <TabsTrigger value="preferences">Client Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scheduling Controls */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Intelligent Scheduling
                </CardTitle>
                <CardDescription>
                  Generate optimal posting schedules using AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientPreferences.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Platform Filter</Label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="All platforms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI Optimization</Label>
                      <p className="text-sm text-muted-foreground">
                        Use machine learning for optimal timing
                      </p>
                    </div>
                    <Switch
                      checked={aiOptimization}
                      onCheckedChange={setAiOptimization}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Scheduling</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically schedule new content
                      </p>
                    </div>
                    <Switch
                      checked={autoScheduling}
                      onCheckedChange={setAutoScheduling}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Bulk Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Schedule multiple videos at once
                      </p>
                    </div>
                    <Switch
                      checked={bulkSchedulingMode}
                      onCheckedChange={setBulkSchedulingMode}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={() => generateOptimalSchedule(selectedClient, ['video1', 'video2', 'video3'])}
                    disabled={!selectedClient || !aiOptimization}
                    className="w-full"
                    size="lg"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Optimal Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Next 24 Hours
                </CardTitle>
                <CardDescription>
                  Upcoming scheduled posts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredSchedules
                    .filter(s => s.status === 'scheduled')
                    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
                    .slice(0, 5)
                    .map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getPlatformColor(schedule.platform) + ' text-xs'}>
                              {schedule.platform}
                            </Badge>
                            <span className="text-sm font-medium">{schedule.clientName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {schedule.scheduledTime.toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getOptimalScoreColor(schedule.optimalScore) + ' text-xs'}>
                          {Math.round(schedule.optimalScore)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scheduled Posts List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Scheduled Posts
              </CardTitle>
              <CardDescription>
                All scheduled posts with optimization scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredSchedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(schedule.status)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{schedule.content.title}</span>
                          <Badge className={getPlatformColor(schedule.platform) + ' text-xs'}>
                            {schedule.platform}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.clientName} • {schedule.scheduledTime.toLocaleString()}
                        </p>
                        <div className="flex gap-1">
                          {schedule.content.hashtags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-sm font-medium">
                          {Math.round(schedule.engagementPrediction)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                      </div>
                      <Badge className={getOptimalScoreColor(schedule.optimalScore)}>
                        {Math.round(schedule.optimalScore)}% Optimal
                      </Badge>
                      {schedule.status === 'scheduled' && (
                        <Button size="sm" variant="outline" aria-label="Pause" title="Pause" onClick={() => pauseSchedule(schedule.id)}>
                          <Pause className="w-3 h-3" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Schedule Calendar
              </CardTitle>
              <CardDescription>
                Visual calendar view of all scheduled posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </div>
                <div className="lg:col-span-2">
                  <h4 className="font-semibold mb-3">
                    Posts for {selectedDate.toLocaleDateString()}
                  </h4>
                  <div className="space-y-2">
                    {filteredSchedules
                      .filter(s => s.scheduledTime.toDateString() === selectedDate.toDateString())
                      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
                      .map((schedule) => (
                        <div key={schedule.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getPlatformColor(schedule.platform) + ' text-xs'}>
                                {schedule.platform}
                              </Badge>
                              <span className="font-medium">{schedule.content.title}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {schedule.scheduledTime.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {schedule.clientName}
                          </p>
                        </div>
                      ))}
                    {filteredSchedules.filter(s => s.scheduledTime.toDateString() === selectedDate.toDateString()).length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No posts scheduled for this date
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                Performance insights and optimal posting times
              </CardDescription>
            </CardHeader>
            <CardContent>
              {platformAnalytics.map((analytics) => (
                <div key={analytics.platform} className="space-y-4 mb-6">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge className={getPlatformColor(analytics.platform)}>
                      {analytics.platform}
                    </Badge>
                    Best Posting Times
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {analytics.bestPostingTimes.map((time, index) => (
                      <Card key={index} className="p-3">
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {String(time.hour).padStart(2, '0')}:00
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {time.engagementRate}% engagement
                          </div>
                          <Progress value={time.confidence} className="mt-2 h-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {time.confidence}% confidence
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Client Preferences
              </CardTitle>
              <CardDescription>
                Configure posting preferences for each client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {clientPreferences.map((client) => (
                  <Card key={client.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{client.name}</h4>
                        <Badge variant="outline">{client.timeZone}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Posting Frequency</Label>
                          <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-sm">
                              <span>TikTok:</span>
                              <span>{client.postingFrequency.tiktok}/day</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Instagram:</span>
                              <span>{client.postingFrequency.instagram}/day</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>YouTube:</span>
                              <span>{client.postingFrequency.youtube}/day</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Target Audience</Label>
                          <div className="space-y-2 mt-2">
                            <div className="text-sm">
                              <span className="font-medium">Age:</span> {client.targetAudience.ageGroup}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {client.targetAudience.interests.map((interest, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Restrictions</Label>
                          <div className="text-sm mt-2">
                            No posting: {client.restrictedHours.start} - {client.restrictedHours.end}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
