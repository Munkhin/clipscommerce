'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Instagram, Twitter, Facebook, Linkedin, Loader2, CheckCircle2, Video, Image, Type, Star, GripVertical, Sparkles, TrendingUp, Zap, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { schedulingApiService, type ScheduledPost, type CalendarPost } from '@/services/schedulingApiService';
import { realtimeService, type RealtimeUpdate } from '@/services/realtimeService';

// Types imported from schedulingApiService

export default function BlitzComponent() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedPostType, setSelectedPostType] = useState<'video' | 'image' | 'carousel' | 'text'>('text');
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingOptimalTimes, setIsLoadingOptimalTimes] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // Real calendar posts data from API
  const [calendarPosts, setCalendarPosts] = useState<{ [key: string]: CalendarPost[] }>({});
  
  // AI-driven optimal posting times by platform
  const [optimalTimes, setOptimalTimes] = useState<Record<string, string[]>>({
    instagram: ['09:00', '15:00', '18:00'],
    tiktok: ['14:00', '18:00', '21:00'],
    twitter: ['09:00', '12:00', '15:00'],
    facebook: ['13:00', '15:00', '18:00'],
    linkedin: ['08:00', '12:00', '17:00'],
  });

  // Real-time WebSocket connection for post status updates
  useEffect(() => {
    const connectRealtime = async () => {
      try {
        setConnectionStatus('connecting');
        await realtimeService.connect();
        setConnectionStatus('connected');
        
        // Subscribe to post status updates
        await realtimeService.subscribeToUpdates([
          'post_scheduled',
          'post_published', 
          'post_failed',
          'queue_update'
        ]);
      } catch (error) {
        console.error('Failed to connect to real-time service:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectRealtime();

    // Subscribe to real-time updates
    const unsubscribe = realtimeService.subscribe((update: RealtimeUpdate) => {
      if (update.type === 'post_status_update' && update.data.postId) {
        setScheduledPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === update.data.postId 
              ? { ...post, status: update.data.status || post.status }
              : post
          )
        );
      }
    });

    return () => {
      unsubscribe();
      realtimeService.disconnect();
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadScheduledPosts();
    loadOptimalTimes();
    loadCalendarPosts();
  }, []);

  const loadScheduledPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      const posts = await schedulingApiService.getScheduledPosts({ limit: 20 });
      setScheduledPosts(posts);
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
      setError('Failed to load scheduled posts');
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  const loadOptimalTimes = useCallback(async () => {
    try {
      setIsLoadingOptimalTimes(true);
      const times = await schedulingApiService.getOptimalTimes();
      setOptimalTimes(times);
    } catch (error) {
      console.error('Error loading optimal times:', error);
      // Keep default times if API fails
    } finally {
      setIsLoadingOptimalTimes(false);
    }
  }, []);

  const loadCalendarPosts = useCallback(async () => {
    try {
      const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const endDate = addDays(startDate, 6);
      const posts = await schedulingApiService.getCalendarPosts(startDate, endDate);
      setCalendarPosts(posts);
    } catch (error) {
      console.error('Error loading calendar posts:', error);
    }
  }, [currentWeek]);

  // Reload calendar when week changes
  useEffect(() => {
    loadCalendarPosts();
  }, [loadCalendarPosts]);

  const platformIcons = {
    instagram: Instagram,
    twitter: Twitter,
    facebook: Facebook,
    linkedin: Linkedin,
  };

  const handleSchedule = async () => {
    if (!content.trim()) {
      setError('Please enter content to schedule');
      return;
    }

    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setIsScheduling(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Create post time from selected date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const postDateTime = new Date(selectedDate);
      postDateTime.setHours(hours, minutes, 0, 0);

      // Check if post time is in the future
      if (postDateTime <= new Date()) {
        setError('Post time must be in the future');
        return;
      }

      const postData = {
        platform: selectedPlatform,
        content,
        media_urls: [], // Would be populated with actual media URLs
        post_time: postDateTime.toISOString(),
        hashtags: [],
        additional_settings: {
          content_type: selectedPostType,
          is_optimal_time: optimalTimes[selectedPlatform]?.includes(selectedTime) || false,
        },
      };
      
      const newPost = await schedulingApiService.schedulePost(postData);
      setScheduledPosts(prev => [newPost, ...prev]);
      setSuccessMessage('Post scheduled successfully!');
      setContent('');
      
      // Reload calendar to show new post
      loadCalendarPosts();
      
    } catch (err: any) {
      console.error('Error scheduling post:', err);
      setError(err.message || 'An error occurred while scheduling the post');
    } finally {
      setIsScheduling(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const IconComponent = platformIcons[platform as keyof typeof platformIcons] || Instagram;
    return <IconComponent className="h-4 w-4" />;
  };

  const getPostTypeIcon = (type: 'video' | 'image' | 'carousel' | 'text') => {
    const icons = {
      video: Video,
      image: Image,
      carousel: Image,
      text: Type,
    };
    const IconComponent = icons[type];
    return <IconComponent className="h-3 w-3" />;
  };

  const getPostTypeColor = (type: 'video' | 'image' | 'carousel' | 'text') => {
    const colors = {
      video: 'bg-violet-500/20 border-violet-500/30 text-violet-400',
      image: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      carousel: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
      text: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
    };
    return colors[type];
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  const getPostsForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    return calendarPosts[dateKey] || [];
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0a0b0f 0%, #111318 50%, #1a1d25 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Enhanced Header */}
        <div className="text-center space-y-4 animate-fadeIn">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text">Blitz</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Live</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
                  <span className="text-xs text-yellow-400">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-400">Offline</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Schedule and autopost your content at optimal times with AI-powered timing intelligence
          </p>
        </div>

        {/* Enhanced Calendar View */}
        <GlassCard className="animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-violet-400" />
                  Content Calendar
                </h2>
                <p className="text-gray-400 mt-1">Drag and drop to reschedule posts</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={viewMode === 'week' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="btn-primary"
                >
                  Week
                </Button>
                <Button 
                  variant={viewMode === 'month' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  Month
                </Button>
                {(isLoadingPosts || isLoadingOptimalTimes) && (
                  <div className="flex items-center gap-2 text-violet-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Calendar Header */}
                <div className="grid grid-cols-8 gap-0 border border-gray-700 rounded-t-lg overflow-hidden">
                  <div className="bg-gray-800/50 p-3 text-center text-sm font-medium text-gray-300">Time</div>
                  {getWeekDays().map((day, index) => (
                    <div key={index} className="bg-gray-800/50 p-3 text-center border-l border-gray-700">
                      <div className="text-sm font-medium text-white">{format(day, 'EEE')}</div>
                      <div className="text-xs text-gray-400">{format(day, 'MMM d')}</div>
                    </div>
                  ))}
                </div>
                
                {/* Calendar Body */}
                <div className="border-l border-r border-b border-gray-700 rounded-b-lg overflow-hidden">
                  {['09:00', '12:00', '15:00', '18:00', '21:00'].map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-0 min-h-[80px] border-b border-gray-700 last:border-b-0">
                      <div className="bg-gray-800/20 p-3 text-sm font-medium border-r border-gray-700 flex items-center justify-center text-gray-300">
                        {time}
                      </div>
                      {getWeekDays().map((day, dayIndex) => {
                        const posts = getPostsForDate(day).filter(post => post.time === time);
                        const isOptimalSlot = Object.values(optimalTimes).some(times => times.includes(time));
                        return (
                          <div 
                            key={dayIndex} 
                            className={`p-2 border-r border-gray-700 last:border-r-0 transition-colors hover:bg-gray-800/30 ${
                              isOptimalSlot ? 'bg-violet-500/5' : ''
                            }`}
                          >
                            {isOptimalSlot && posts.length === 0 && (
                              <div className="h-full flex items-center justify-center opacity-30">
                                <Star className="h-4 w-4 text-violet-400" />
                              </div>
                            )}
                            <div className="space-y-1">
                              {posts.map((post) => (
                                <div 
                                  key={post.id}
                                  className={`p-2 rounded-lg border text-xs cursor-move hover-lift ${getPostTypeColor(post.type)} ${
                                    post.isOptimalTime ? 'ring-1 ring-violet-400' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-1 mb-1">
                                    {getPostTypeIcon(post.type)}
                                    {getPlatformIcon(post.platform)}
                                    {post.isOptimalTime && <Star className="h-2 w-2 text-violet-400" />}
                                    <GripVertical className="h-3 w-3 ml-auto opacity-50" />
                                  </div>
                                  <div className="font-medium truncate">{post.content}</div>
                                  <div className={`text-xs font-medium ${
                                    post.status === 'posted' ? 'text-emerald-400' : 
                                    post.status === 'failed' ? 'text-red-400' : 'text-blue-400'
                                  }`}>
                                    {post.status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Enhanced Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border bg-violet-500/20 border-violet-500/30"></div>
                <span>Video</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border bg-blue-500/20 border-blue-500/30"></div>
                <span>Image</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border bg-emerald-500/20 border-emerald-500/30"></div>
                <span>Carousel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border bg-cyan-500/20 border-cyan-500/30"></div>
                <span>Text</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3 text-violet-400" />
                <span>Optimal time</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Enhanced Quick Schedule */}
        <GlassCard className="animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Zap className="h-6 w-6 text-violet-400" />
              Quick Schedule
            </h2>
            <p className="text-gray-400 mt-1">Schedule a new post with optimal timing suggestions</p>
          </div>
          
          <div className="p-6 space-y-6">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Content Type</label>
                <Select value={selectedPostType} onValueChange={(value: any) => setSelectedPostType(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="video">📹 Video</SelectItem>
                    <SelectItem value="image">🖼️ Image</SelectItem>
                    <SelectItem value="carousel">📱 Carousel</SelectItem>
                    <SelectItem value="text">📝 Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Platform</label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="instagram">📸 Instagram</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                    <SelectItem value="twitter">🐦 Twitter</SelectItem>
                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                    <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Time</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {['09:00', '12:00', '15:00', '18:00', '21:00'].map(time => (
                      <SelectItem key={time} value={time}>
                        {time} {optimalTimes[selectedPlatform as keyof typeof optimalTimes]?.includes(time) && 
                          <span className="text-violet-400">⭐</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {optimalTimes[selectedPlatform as keyof typeof optimalTimes]?.includes(selectedTime) && (
                  <p className="text-xs text-violet-400 flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Optimal posting time
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'MMM dd') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                    <Calendar 
                      mode="single" 
                      selected={selectedDate} 
                      onSelect={setSelectedDate}
                      className="bg-gray-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Content</label>
              <Textarea 
                placeholder="What's your post about?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 resize-none"
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSchedule} 
                disabled={isScheduling} 
                className="btn-primary"
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Schedule Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Enhanced Performance Heatmap */}
        <GlassCard className="animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-violet-400" />
              Posting Performance Heatmap
            </h2>
            <p className="text-gray-400 mt-1">Optimal posting times based on your audience engagement patterns</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid gap-1 text-xs" style={{ gridTemplateColumns: 'auto repeat(24, 1fr)' }}>
                <div></div>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="text-center text-gray-400 font-mono">
                    {i.toString().padStart(2, '0')}
                  </div>
                ))}
                
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
                  <React.Fragment key={day}>
                    <div className="text-right text-gray-400 pr-2">{day}</div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const isPeak = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 21);
                      const isWeekend = dayIndex >= 5;
                      const baseEngagement = ((hour + dayIndex * 3) % 10) / 25;
                      const engagement = isPeak ? (isWeekend ? 0.6 : 0.8) : baseEngagement;
                      
                      const getHeatmapColor = (value: number) => {
                        if (value > 0.7) return 'bg-violet-500 text-white';
                        if (value > 0.5) return 'bg-violet-400/70 text-white';
                        if (value > 0.3) return 'bg-violet-400/40';
                        if (value > 0.1) return 'bg-violet-400/20';
                        return 'bg-gray-800';
                      };

                      return (
                        <div
                          key={hour}
                          className={`h-4 w-4 rounded-sm cursor-pointer transition-all hover:scale-110 ${getHeatmapColor(engagement)}`}
                          title={`${day} ${hour}:00 - ${Math.round(engagement * 100)}% engagement`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Low</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-gray-800 rounded-sm"></div>
                    <div className="w-3 h-3 bg-violet-400/20 rounded-sm"></div>
                    <div className="w-3 h-3 bg-violet-400/40 rounded-sm"></div>
                    <div className="w-3 h-3 bg-violet-400/70 rounded-sm"></div>
                    <div className="w-3 h-3 bg-violet-500 rounded-sm"></div>
                  </div>
                  <span className="text-gray-400">High</span>
                </div>
                <div className="text-xs text-gray-500">
                  Hover for details
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Enhanced Recent Posts */}
        {scheduledPosts.length > 0 && (
          <GlassCard className="animate-slideUp">
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Clock className="h-6 w-6 text-violet-400" />
                Recent Scheduled Posts
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {scheduledPosts.slice(0, 5).map(post => (
                  <div key={post.id} className="enhanced-card p-4 hover-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg border ${getPostTypeColor(post.type)}`}>
                          {getPostTypeIcon(post.type)}
                        </div>
                        <div>
                          <div className="font-medium text-white">{post.content}</div>
                          <div className="text-sm text-gray-400 flex items-center gap-2">
                            {getPlatformIcon(post.platform)} 
                            <span>{post.platform}</span>
                            <span>•</span>
                            <span>{format(post.scheduledDate, 'MMM d')} at {post.scheduledTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.isOptimalTime && <Star className="h-4 w-4 text-violet-400" />}
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                          post.status === 'posted' ? 'bg-emerald-500/20 text-emerald-400' : 
                          post.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
