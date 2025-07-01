import { createClient } from '@/../supabase';

export interface UserVideo {
  id: string;
  title: string;
  thumbnailUrl?: string;
  status: 'uploaded' | 'processing' | 'optimized' | 'error' | 'ready';
  columnId: string;
  videoUrl?: string;
  fileSize?: number;
  duration?: number;
  uploadedAt: string;
  processedAt?: string;
  result?: {
    sentiment?: { score: number; sentiment: string; };
    tone?: { tone: string; confidence: number; };
    hashtags?: string[];
    optimizations?: string[];
    viralityScore?: number;
    engagementPrediction?: number;
  };
  error?: string;
  loading?: boolean;
  uploadProgress?: number;
  processingStage?: 'audio' | 'content' | 'hashtags' | 'optimization';
}

export interface VideoUploadOptions {
  file: File;
  title?: string;
  description?: string;
}

export interface VideoProcessingStatus {
  stage: string;
  progress: number;
  message: string;
}

export class UserVideoService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  async getUserVideos(userId: string): Promise<{
    success: boolean;
    data?: UserVideo[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('user_videos')
        .select(`
          *,
          video_processing_results (
            sentiment_analysis,
            tone_analysis,
            hashtag_recommendations,
            optimization_suggestions,
            virality_score,
            engagement_prediction
          )
        `)
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching user videos:', error);
        }
        return {
          success: false,
          error: 'Failed to fetch videos from database'
        };
      }

      const videos: UserVideo[] = (data || []).map(video => ({
        id: video.id,
        title: video.title || video.filename,
        thumbnailUrl: video.thumbnail_url,
        status: this.mapDatabaseStatus(video.status),
        columnId: this.getColumnId(video.status),
        videoUrl: video.video_url,
        fileSize: video.file_size,
        duration: video.duration,
        uploadedAt: video.uploaded_at,
        processedAt: video.processed_at,
        result: this.mapProcessingResults(video.video_processing_results?.[0]),
        error: video.error_message,
        loading: video.status === 'processing',
        processingStage: video.processing_stage
      }));

      return {
        success: true,
        data: videos
      };

    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in getUserVideos:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async uploadVideo(userId: string, options: VideoUploadOptions): Promise<{
    success: boolean;
    videoId?: string;
    error?: string;
  }> {
    try {
      const { file, title, description } = options;
      
      // Validate file
      if (!this.isValidVideoFile(file)) {
        return {
          success: false,
          error: 'Invalid file type. Please upload MP4, MOV, or AVI files.'
        };
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        return {
          success: false,
          error: 'File size exceeds 100MB limit.'
        };
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}.${fileExtension}`;

      // Upload to storage
      const { error: uploadError } = await this.supabase.storage
        .from('videos')
        .upload(filename, file);

      if (uploadError) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Storage upload error:', uploadError);
        }
        return {
          success: false,
          error: 'Failed to upload video file'
        };
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('videos')
        .getPublicUrl(filename);

      // Create database record
      const { data: videoRecord, error: dbError } = await this.supabase
        .from('user_videos')
        .insert({
          user_id: userId,
          title: title || file.name,
          filename: file.name,
          video_url: publicUrl,
          file_size: file.size,
          status: 'uploaded',
          uploaded_at: new Date().toISOString(),
          description
        })
        .select()
        .single();

      if (dbError) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Database insert error:', dbError);
        }
        // Clean up uploaded file
        await this.supabase.storage.from('videos').remove([filename]);
        return {
          success: false,
          error: 'Failed to save video record'
        };
      }

      // Start processing
      this.startVideoProcessing(videoRecord.id);

      return {
        success: true,
        videoId: videoRecord.id
      };

    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in uploadVideo:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async updateVideoStatus(videoId: string, status: string, error?: string): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'optimized') {
        updateData.processed_at = new Date().toISOString();
      }

      if (error) {
        updateData.error_message = error;
      }

      await this.supabase
        .from('user_videos')
        .update(updateData)
        .eq('id', videoId);

    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating video status:', error);
      }
    }
  }

  async deleteVideo(videoId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get video record to find file path
      const { data: video, error: fetchError } = await this.supabase
        .from('user_videos')
        .select('video_url, user_id')
        .eq('id', videoId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !video) {
        return {
          success: false,
          error: 'Video not found'
        };
      }

      // Extract filename from URL
      const urlParts = video.video_url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const fullPath = `${video.user_id}/${filename}`;

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('videos')
        .remove([fullPath]);

      if (storageError) {
        // Log warning in development only
        if (process.env.NODE_ENV === 'development') {
          console.warn('Storage deletion warning:', storageError);
        }
        // Continue with database deletion even if storage fails
      }

      // Delete processing results
      await this.supabase
        .from('video_processing_results')
        .delete()
        .eq('video_id', videoId);

      // Delete video record
      const { error: dbError } = await this.supabase
        .from('user_videos')
        .delete()
        .eq('id', videoId)
        .eq('user_id', userId);

      if (dbError) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Database deletion error:', dbError);
        }
        return {
          success: false,
          error: 'Failed to delete video record'
        };
      }

      return { success: true };

    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in deleteVideo:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed'
      };
    }
  }

  async retryVideoProcessing(videoId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Reset video status
      await this.updateVideoStatus(videoId, 'processing');
      
      // Start processing again
      this.startVideoProcessing(videoId);

      return { success: true };

    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error retrying video processing:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed'
      };
    }
  }

  private async startVideoProcessing(videoId: string): Promise<void> {
    try {
      // This would typically trigger a background job or webhook
      // For now, we'll make an API call to start processing
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        throw new Error(`Processing start failed: ${response.statusText}`);
      }

    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error starting video processing:', error);
      }
      await this.updateVideoStatus(videoId, 'error', 'Failed to start processing');
    }
  }

  private isValidVideoFile(file: File): boolean {
    const validTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/avi'];
    return validTypes.includes(file.type);
  }

  private mapDatabaseStatus(dbStatus: string): UserVideo['status'] {
    const statusMap: Record<string, UserVideo['status']> = {
      'uploaded': 'uploaded',
      'processing': 'processing',
      'optimized': 'optimized',
      'error': 'error',
      'ready': 'ready'
    };
    return statusMap[dbStatus] || 'uploaded';
  }

  private getColumnId(status: string): string {
    const columnMap: Record<string, string> = {
      'uploaded': 'todo',
      'processing': 'processing',
      'optimized': 'review',
      'ready': 'ready',
      'error': 'todo'
    };
    return columnMap[status] || 'todo';
  }

  private mapProcessingResults(results: Record<string, unknown>): UserVideo['result'] | undefined {
    if (!results) return undefined;

    return {
      sentiment: results.sentiment_analysis ? {
        score: (results.sentiment_analysis as Record<string, unknown>)?.score as number || 0,
        sentiment: (results.sentiment_analysis as Record<string, unknown>)?.label as string || 'neutral'
      } : undefined,
      tone: results.tone_analysis ? {
        tone: (results.tone_analysis as Record<string, unknown>)?.tone as string || 'neutral',
        confidence: (results.tone_analysis as Record<string, unknown>)?.confidence as number || 0
      } : undefined,
      hashtags: (results.hashtag_recommendations as string[]) || [],
      optimizations: (results.optimization_suggestions as string[]) || [],
      viralityScore: results.virality_score as number | undefined,
      engagementPrediction: results.engagement_prediction as number | undefined
    };
  }

  // Subscribe to real-time updates
  subscribeToVideoUpdates(userId: string, callback: (video: UserVideo) => void) {
    const channel = this.supabase
      .channel('video-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_videos',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const video = this.mapDatabaseRecord(payload.new as Record<string, unknown>);
        callback(video);
      })
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  private mapDatabaseRecord(record: Record<string, unknown>): UserVideo {
    return {
      id: String(record.id),
      title: String(record.title || record.filename),
      thumbnailUrl: record.thumbnail_url as string | undefined,
      status: this.mapDatabaseStatus(String(record.status)),
      columnId: this.getColumnId(String(record.status)),
      videoUrl: record.video_url as string | undefined,
      fileSize: record.file_size as number | undefined,
      duration: record.duration as number | undefined,
      uploadedAt: String(record.uploaded_at),
      processedAt: record.processed_at as string | undefined,
      error: record.error_message as string | undefined,
      loading: record.status === 'processing',
      processingStage: record.processing_stage as "content" | "hashtags" | "audio" | "optimization" | undefined
    };
  }
}