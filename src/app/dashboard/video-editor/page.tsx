'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Video, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  FileVideo,
  Edit3
} from 'lucide-react';

import { VideoEditor } from '@/components/video-editor/VideoEditor';
import { UserVideoService, UserVideo } from '@/services/userVideoService';
import { useVideoProcessing } from '@/hooks/useVideoProcessing';

interface ProcessingStatus {
  editId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage?: string;
  error?: string;
  estimatedTime?: string;
}

export default function VideoEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  
  const [video, setVideo] = useState<UserVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [userVideoService] = useState(() => new UserVideoService());
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  // Use the video processing hook for real-time updates
  const { 
    status: realTimeStatus, 
    cancelProcessing, 
    retryProcessing,
    stopPolling 
  } = useVideoProcessing({
    editId: currentEditId || undefined,
    videoId: videoId || undefined,
    onStatusChange: (status) => {
      setProcessingStatus({
        editId: status.editId,
        status: status.status,
        progress: status.progress,
        stage: status.stage,
        error: status.error,
        estimatedTime: undefined
      });
    },
    onComplete: (status) => {
      toast({
        title: "Video processing completed",
        description: "Your edited video is ready!"
      });
      loadVideo(); // Refresh video data
    },
    onError: (error) => {
      toast({
        title: "Processing failed",
        description: error,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (!videoId) {
      toast({
        title: "No video selected",
        description: "Please select a video to edit",
        variant: "destructive"
      });
      router.push('/dashboard');
      return;
    }

    loadVideo();
  }, [videoId, router]);

  const loadVideo = async () => {
    if (!videoId) return;

    try {
      setIsLoading(true);
      
      // Get current user
      const supabase = userVideoService['supabase'];
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Authentication required",
          description: "Please log in to edit videos",
          variant: "destructive"
        });
        router.push('/sign-in');
        return;
      }

      // Get user videos and find the selected one
      const result = await userVideoService.getUserVideos(user.id);
      
      if (!result.success || !result.data) {
        toast({
          title: "Error loading videos",
          description: result.error || "Failed to load videos",
          variant: "destructive"
        });
        return;
      }

      const selectedVideo = result.data.find(v => v.id === videoId);
      
      if (!selectedVideo) {
        toast({
          title: "Video not found",
          description: "The selected video could not be found",
          variant: "destructive"
        });
        router.push('/dashboard');
        return;
      }

      setVideo(selectedVideo);
    } catch (error) {
      console.error('Error loading video:', error);
      toast({
        title: "Error loading video",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (editedVideo: UserVideo, editId?: string) => {
    setVideo(editedVideo);
    
    // Set the edit ID for real-time tracking
    if (editId) {
      setCurrentEditId(editId);
    }
    
    toast({
      title: "Video processing started",
      description: "Your video is being processed. You can continue working on other videos."
    });
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const pollProcessingStatus = () => {
    const interval = setInterval(async () => {
      if (!videoId) {
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch(`/api/videos/edit?videoId=${videoId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setProcessingStatus({
              editId: result.editId,
              status: result.status,
              progress: result.progress || 0,
              stage: result.stage,
              error: result.error,
              estimatedTime: result.estimatedTime
            });

            // Stop polling if completed or failed
            if (result.status === 'completed' || result.status === 'failed') {
              clearInterval(interval);
              
              if (result.status === 'completed') {
                toast({
                  title: "Video processing completed",
                  description: "Your edited video is ready!"
                });
                
                // Refresh video data
                loadVideo();
              } else {
                toast({
                  title: "Video processing failed",
                  description: result.error || "An error occurred during processing",
                  variant: "destructive"
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling processing status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Clean up interval after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading video editor...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileVideo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Video not found</h3>
          <p className="text-muted-foreground mb-4">
            The requested video could not be found
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Show processing status if video is being processed
  if (video.status === 'processing' && processingStatus) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Video Processing</h1>
            <p className="text-muted-foreground">{video.title}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Processing Status
            </CardTitle>
            <CardDescription>
              Your video is being processed with the applied edits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={
                  processingStatus.status === 'completed' ? 'default' :
                  processingStatus.status === 'failed' ? 'destructive' :
                  'secondary'
                }>
                  {processingStatus.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {processingStatus.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {processingStatus.status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {processingStatus.status}
                </Badge>
                {processingStatus.stage && (
                  <span className="text-sm text-muted-foreground">
                    {processingStatus.stage}
                  </span>
                )}
              </div>
              {processingStatus.estimatedTime && processingStatus.status === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {processingStatus.estimatedTime}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{processingStatus.progress}%</span>
              </div>
              <Progress value={processingStatus.progress} className="h-2" />
            </div>

            {processingStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{processingStatus.error}</p>
              </div>
            )}

            {processingStatus.status === 'completed' && (
              <div className="flex gap-2">
                <Button onClick={() => router.push('/dashboard')}>
                  View in Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Edit Again
                </Button>
              </div>
            )}

            {processingStatus.status === 'processing' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    const result = await cancelProcessing();
                    if (result.success) {
                      toast({
                        title: "Processing cancelled",
                        description: "Video processing has been cancelled"
                      });
                    } else {
                      toast({
                        title: "Cancel failed",
                        description: result.error || "Failed to cancel processing",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  Cancel Processing
                </Button>
              </div>
            )}

            {processingStatus.status === 'failed' && (
              <div className="flex gap-2">
                <Button 
                  onClick={async () => {
                    const result = await retryProcessing();
                    if (result.success) {
                      toast({
                        title: "Processing restarted",
                        description: "Video processing has been restarted"
                      });
                    } else {
                      toast({
                        title: "Retry failed",
                        description: result.error || "Failed to restart processing",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  Retry Processing
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCancel}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Edit3 className="w-6 h-6" />
            Video Editor
          </h1>
          <p className="text-muted-foreground">
            Edit and optimize your video content
          </p>
        </div>
      </div>

      <VideoEditor 
        video={video}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}