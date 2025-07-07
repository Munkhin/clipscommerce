'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/AuthProvider';
import { Clock, AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2, Edit, Play, Pause } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ScheduledPost {
  id: string;
  content: string;
  media_urls: string[];
  post_time: string;
  platform: string;
  status: 'scheduled' | 'processing' | 'posted' | 'failed' | 'cancelled' | 'retrying';
  retry_count: number;
  max_retries: number;
  last_error?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  hashtags?: string[];
  created_at: string;
  posted_at?: string;
  failed_at?: string;
  next_retry_at?: string;
}

export function AutopostScheduler() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [postTime, setPostTime] = useState<Date | undefined>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [hashtags, setHashtags] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchScheduledPosts();
    }
  }, [user]);

  const fetchScheduledPosts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/autoposting/schedule', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledPosts(data.posts || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch scheduled posts',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scheduled posts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!content || !mediaUrl || !postTime || !user) {
      toast({
        title: 'Validation Error',
        description: 'Please fill out all fields and make sure you are logged in.',
        variant: 'destructive',
      });
      return;
    }

    setIsScheduling(true);
    try {
      const hashtagsArray = hashtags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const response = await fetch('/api/autoposting/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          content,
          media_urls: [mediaUrl],
          post_time: postTime.toISOString(),
          hashtags: hashtagsArray,
          priority,
          max_retries: 3,
          retry_delay: 30000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Log audit event via API
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            action: 'create_post',
            details: { postId: data.scheduled_post.id },
          }),
        });
        
        // Refresh the posts list
        await fetchScheduledPosts();
        
        // Reset form
        setContent('');
        setMediaUrl('');
        setHashtags('');
        setPostTime(new Date());
        setPriority('normal');
        
        toast({
          title: 'Success',
          description: 'Post scheduled successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to schedule post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule post',
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRetryPost = async (postId: string) => {
    try {
      const response = await fetch('/api/autoposting/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schedule_id: postId,
          error_type: 'manual_retry',
          strategy: 'exponential_backoff',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Post retry scheduled',
        });
        await fetchScheduledPosts();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to retry post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error retrying post:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry post',
        variant: 'destructive',
      });
    }
  };

  const handleCancelPost = async (postId: string) => {
    try {
      const response = await fetch(`/api/autoposting/schedule/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Post cancelled',
        });
        await fetchScheduledPosts();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to cancel post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling post:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel post',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'posted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'retrying':
        return <RefreshCw className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'retrying':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule a New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Platform</label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="Post content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-24"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Media URL</label>
              <Input
                placeholder="Media URL"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Hashtags (comma-separated)</label>
              <Input
                placeholder="hashtag1, hashtag2, hashtag3"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Post Time</label>
              <Calendar
                mode="single"
                selected={postTime}
                onSelect={setPostTime}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSchedulePost} 
                disabled={isScheduling}
                className="flex-1"
              >
                {isScheduling ? 'Scheduling...' : 'Schedule Post'}
              </Button>
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Preview</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post Preview</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Platform: {selectedPlatform}</h4>
                      <p className="text-sm text-gray-500">Priority: {priority}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Content:</h4>
                      <p className="whitespace-pre-wrap">{content}</p>
                    </div>
                    {hashtags && (
                      <div>
                        <h4 className="font-medium">Hashtags:</h4>
                        <p className="text-blue-600">{hashtags.split(',').map(tag => `#${tag.trim()}`).join(' ')}</p>
                      </div>
                    )}
                    {mediaUrl && (
                      <div>
                        <h4 className="font-medium">Media:</h4>
                        <img src={mediaUrl} alt="media preview" className="mt-2 max-w-full rounded" />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scheduled Posts</span>
            <Button variant="outline" size="sm" onClick={fetchScheduledPosts} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No scheduled posts yet
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(post.status)}
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                      <Badge className={getPriorityColor(post.priority)}>
                        {post.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {post.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryPost(post.id)}
                          title="Retry post"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      )}
                      {(post.status === 'scheduled' || post.status === 'failed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelPost(post.id)}
                          title="Cancel post"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">{post.platform}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Scheduled: {new Date(post.post_time).toLocaleString()}</p>
                    {post.posted_at && (
                      <p className="text-green-600">Posted: {new Date(post.posted_at).toLocaleString()}</p>
                    )}
                    {post.failed_at && (
                      <p className="text-red-600">Failed: {new Date(post.failed_at).toLocaleString()}</p>
                    )}
                    {post.last_error && (
                      <p className="text-red-600">Error: {post.last_error}</p>
                    )}
                    {post.retry_count > 0 && (
                      <p className="text-orange-600">
                        Retries: {post.retry_count}/{post.max_retries}
                      </p>
                    )}
                    {post.next_retry_at && (
                      <p className="text-orange-600">
                        Next retry: {new Date(post.next_retry_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
