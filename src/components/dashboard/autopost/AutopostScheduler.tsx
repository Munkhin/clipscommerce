'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/providers/AuthProvider';
import { AuditLogService } from '@/services/AuditLogService';

export function AutopostScheduler() {
  const { user } = useAuth();
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [postTime, setPostTime] = useState<Date | undefined>(new Date());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const auditLogService = new AuditLogService();

  useEffect(() => {
    async function fetchScheduledPosts() {
      const { data, error } = await supabase
        .from('autopost_schedule')
        .select('*')
        .order('post_time', { ascending: false });

      if (error) {
        console.error('Error fetching scheduled posts:', error);
      } else {
        setScheduledPosts(data as any);
      }
    }

    fetchScheduledPosts();
  }, [supabase]);

  const handleSchedulePost = async () => {
    if (!content || !mediaUrl || !postTime || !user) {
      alert('Please fill out all fields and make sure you are logged in.');
      return;
    }

    const { data, error } = await supabase
      .from('autopost_schedule')
      .insert([
        {
          content,
          media_urls: [mediaUrl],
          post_time: postTime.toISOString(),
          platform: 'tiktok', // Hardcoded for now
          user_id: user.id,
        },
      ]);

    if (error) {
      console.error('Error scheduling post:', error);
    } else {
      await auditLogService.log(user.id, 'create_post', { postId: (data as any)[0].id });
      setScheduledPosts([data, ...scheduledPosts] as any);
      setContent('');
      setMediaUrl('');
      setPostTime(new Date());
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Schedule a New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Textarea
              placeholder="Post content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Input
              placeholder="Media URL"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            <Calendar
              mode="single"
              selected={postTime}
              onSelect={setPostTime}
            />
            <div className="flex gap-2">
              <Button onClick={handleSchedulePost}>Schedule Post</Button>
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Preview</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post Preview</DialogTitle>
                  </DialogHeader>
                  <div>
                    <p>{content}</p>
                    {mediaUrl && <img src={mediaUrl} alt="media preview" className="mt-4" />}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {scheduledPosts.map((post: any) => (
              <li key={post.id} className="mb-4">
                <p>{post.content}</p>
                <p className="text-sm text-gray-500">
                  {new Date(post.post_time).toLocaleString()} - {post.status}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
