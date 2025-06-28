// src/components/autopost-modal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AutopostModalProps {
  onSuccess: () => void;
}

export function AutopostModal({ onSuccess }: AutopostModalProps) {
  const [platform, setPlatform] = useState('');
  const [content, setContent] = useState('');
  const [postTime, setPostTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/autopost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          content,
          post_time: new Date(postTime).toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Your post has been scheduled.',
        });
        onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to schedule your post. Please try again.',
        });
      }
    } catch (error) {
      console.error('Failed to schedule post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new Autopost</DialogTitle>
          <DialogDescription>
            Schedule a new post to your social media accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="platform" className="text-right">
              Platform
            </Label>
            <Input
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="col-span-3"
              placeholder="e.g., twitter, instagram"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="content" className="text-right">
              Content
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="col-span-3"
              placeholder="What's on your mind?"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="post-time" className="text-right">
              Post Time
            </Label>
            <Input
              id="post-time"
              type="datetime-local"
              value={postTime}
              onChange={(e) => setPostTime(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Scheduling...' : 'Schedule Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
