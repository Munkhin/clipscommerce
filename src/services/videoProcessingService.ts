import { createClient } from '@/lib/supabase/client';
import { VideoEditOperation } from '@/app/api/videos/edit/route';

export interface VideoProcessingJob {
  editId: string;
  videoId: string;
  userId: string;
  videoUrl: string;
  operations: VideoEditOperation[];
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedTime?: string;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
  error?: string;
}

export class VideoProcessingService {
  private supabase;
  private activeJobs = new Map<string, VideoProcessingJob>();

  constructor() {
    this.supabase = createClient();
  }

  async startProcessing(editId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get edit details
      const { data: edit, error: editError } = await this.supabase
        .from('video_edits')
        .select(`
          *,
          user_videos!inner(video_url, title, file_size)
        `)
        .eq('id', editId)
        .single();

      if (editError || !edit) {
        return { success: false, error: 'Edit record not found' };
      }

      // Create processing job
      const job: VideoProcessingJob = {
        editId,
        videoId: edit.video_id,
        userId: edit.user_id,
        videoUrl: edit.user_videos.video_url,
        operations: edit.operations,
        status: 'processing',
        progress: 0,
        startTime: new Date()
      };

      this.activeJobs.set(editId, job);

      // Update status in database
      await this.supabase
        .from('video_edits')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', editId);

      // Start background processing
      this.processVideoOperations(job);

      return { success: true };
    } catch (error) {
      console.error('Error starting video processing:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start processing' 
      };
    }
  }

  async getProcessingStatus(editId: string): Promise<VideoProcessingJob | null> {
    // Check active jobs first
    const activeJob = this.activeJobs.get(editId);
    if (activeJob) {
      return activeJob;
    }

    // Query database for completed/failed jobs
    const { data: edit, error } = await this.supabase
      .from('video_edits')
      .select('*')
      .eq('id', editId)
      .single();

    if (error || !edit) {
      return null;
    }

    return {
      editId: edit.id,
      videoId: edit.video_id,
      userId: edit.user_id,
      videoUrl: '', // Not needed for status
      operations: edit.operations,
      status: edit.status,
      progress: edit.status === 'completed' ? 100 : 0,
      error: edit.error_message
    };
  }

  async cancelProcessing(editId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const job = this.activeJobs.get(editId);
      if (job) {
        job.status = 'cancelled';
        this.activeJobs.delete(editId);
      }

      await this.supabase
        .from('video_edits')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', editId);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling processing:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel processing' 
      };
    }
  }

  private async processVideoOperations(job: VideoProcessingJob): Promise<void> {
    const { ffmpegProcessor } = await import('@/lib/video/ffmpegProcessor');
    let inputPath: string | null = null;
    let outputPath: string | null = null;

    try {
      // Update progress periodically
      const updateProgress = async (stage: string, progress: number, message: string) => {
        job.progress = progress;
        await this.updateJobProgress(job.editId, stage, progress, message);
      };

      await updateProgress('initialization', 0, 'Initializing video processing...');

      // Download video from URL
      await updateProgress('download', 5, 'Downloading video for processing...');
      inputPath = await ffmpegProcessor.downloadVideo(job.videoUrl);

      await updateProgress('analysis', 10, 'Analyzing video operations...');

      // Process video with FFmpeg
      const result = await ffmpegProcessor.processVideo(
        inputPath,
        job.operations,
        (progress) => {
          // Map FFmpeg progress to our overall progress (10% to 85%)
          const overallProgress = 10 + (progress.progress * 0.75);
          this.updateJobProgress(job.editId, progress.stage, overallProgress, progress.message);
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Video processing failed');
      }

      outputPath = result.outputPath!;

      // Upload processed video
      await updateProgress('upload', 90, 'Uploading processed video...');
      const uploadedUrl = await ffmpegProcessor.uploadVideo(outputPath, `edited_${job.videoId}.mp4`);

      // Generate preview/thumbnail
      await updateProgress('finalization', 95, 'Generating preview...');
      const previewUrl = await this.generatePreview(outputPath);

      await updateProgress('completed', 100, 'Video processing completed successfully');

      // Mark as completed
      job.status = 'completed';
      job.endTime = new Date();
      job.progress = 100;

      const processingTimeSeconds = Math.floor((job.endTime.getTime() - job.startTime!.getTime()) / 1000);

      await this.supabase
        .from('video_edits')
        .update({
          status: 'completed',
          progress: 100,
          processing_time_seconds: processingTimeSeconds,
          completed_at: job.endTime.toISOString(),
          updated_at: new Date().toISOString(),
          preview_url: previewUrl || `${uploadedUrl}?preview=true`,
          output_url: uploadedUrl
        })
        .eq('id', job.editId);

      this.activeJobs.delete(job.editId);

    } catch (error) {
      console.error('Error processing video operations:', error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Processing failed';

      await this.supabase
        .from('video_edits')
        .update({
          status: 'failed',
          error_message: job.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.editId);

      this.activeJobs.delete(job.editId);
    } finally {
      // Cleanup temporary files
      if (inputPath) {
        await ffmpegProcessor.cleanup(inputPath).catch(console.warn);
      }
      if (outputPath) {
        await ffmpegProcessor.cleanup(outputPath).catch(console.warn);
      }
    }
  }

  private async processOperation(
    job: VideoProcessingJob, 
    operation: VideoEditOperation, 
    baseProgress: number
  ): Promise<void> {
    // In a real implementation, this would use FFmpeg or similar
    // to actually process the video operations
    
    switch (operation.type) {
      case 'trim':
        await this.processTrim(job, operation);
        break;
      case 'crop':
        await this.processCrop(job, operation);
        break;
      case 'rotate':
        await this.processRotate(job, operation);
        break;
      case 'filter':
        await this.processFilter(job, operation);
        break;
      case 'speed':
        await this.processSpeed(job, operation);
        break;
      case 'volume':
        await this.processVolume(job, operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async processTrim(job: VideoProcessingJob, operation: VideoEditOperation): Promise<void> {
    const { startTime, endTime } = operation.parameters;
    console.log(`Processing trim operation: ${startTime}s to ${endTime}s for video ${job.videoId}`);
    
    // Simulate FFmpeg trim command:
    // ffmpeg -i input.mp4 -ss ${startTime} -to ${endTime} -c copy output.mp4
    await this.delay(2000);
  }

  private async processCrop(job: VideoProcessingJob, operation: VideoEditOperation): Promise<void> {
    const { x, y, width, height } = operation.parameters;
    console.log(`Processing crop operation: ${width}x${height} at (${x},${y}) for video ${job.videoId}`);
    
    // Simulate FFmpeg crop command:
    // ffmpeg -i input.mp4 -filter:v "crop=${width}:${height}:${x}:${y}" output.mp4
    await this.delay(3000);
  }

  private async processRotate(job: VideoProcessingJob, operation: VideoEditOperation): Promise<void> {
    const { degrees } = operation.parameters;
    console.log(`Processing rotate operation: ${degrees} degrees for video ${job.videoId}`);
    
    // Simulate FFmpeg rotate command:
    // ffmpeg -i input.mp4 -vf "rotate=${degrees}*PI/180" output.mp4
    await this.delay(2500);
  }

  private async processFilter(job: VideoProcessingJob, operation: VideoEditOperation): Promise<void> {
    const { filterType, intensity } = operation.parameters;
    console.log(`Processing filter operation: ${filterType} at ${intensity}% for video ${job.videoId}`);
    
    // Simulate FFmpeg filter commands based on type
    const filterCommands: Record<string, string> = {
      blur: `boxblur=${intensity/10}`,
      sharpen: `unsharp=5:5:${intensity/50}:5:5:0.0`,
      brightness: `eq=brightness=${(intensity-50)/50}`,
      contrast: `eq=contrast=${1 + (intensity-50)/50}`,
      saturation: `eq=saturation=${1 + (intensity-50)/50}`
    };
    
    const command = filterCommands[filterType || ''] || '';
    console.log(`FFmpeg filter: ${command}`);
    
    await this.delay(4000);
  }

  private async processSpeed(job: VideoProcessingJob, operation: VideoEditOperation): Promise<void> {
    const { speedMultiplier } = operation.parameters;
    console.log(`Processing speed operation: ${speedMultiplier}x for video ${job.videoId}`);
    
    // Simulate FFmpeg speed command:
    // ffmpeg -i input.mp4 -filter:v "setpts=PTS/${speedMultiplier}" -filter:a "atempo=${speedMultiplier}" output.mp4
    await this.delay(5000);
  }

  private async processVolume(job: VideoProcessingJob, operation: VideoEditOperation): Promise<void> {
    const { volumeLevel } = operation.parameters;
    console.log(`Processing volume operation: ${volumeLevel}% for video ${job.videoId}`);
    
    // Simulate FFmpeg volume command:
    // ffmpeg -i input.mp4 -filter:a "volume=${volumeLevel/100}" output.mp4
    await this.delay(1500);
  }

  private async finalizeVideo(job: VideoProcessingJob): Promise<void> {
    console.log(`Finalizing video processing for ${job.videoId}`);
    
    // In real implementation, this would:
    // 1. Combine all operations into final output
    // 2. Upload to storage
    // 3. Generate thumbnails
    // 4. Update video metadata
    
    await this.delay(2000);
  }

  private async updateJobProgress(
    editId: string, 
    stage: string, 
    progress: number, 
    message: string
  ): Promise<void> {
    // Update active job
    const job = this.activeJobs.get(editId);
    if (job) {
      job.progress = progress;
    }

    // You could implement real-time updates here using WebSockets or Server-Sent Events
    console.log(`Job ${editId} - ${stage}: ${progress}% - ${message}`);
  }

  private async generatePreview(videoPath: string): Promise<string | null> {
    try {
      // In a real implementation, you'd generate a thumbnail or preview clip
      // For now, we'll return a placeholder preview URL
      const previewName = `preview_${Date.now()}.jpg`;
      const previewUrl = `https://your-storage-bucket.com/previews/${previewName}`;
      
      // Simulate preview generation
      await this.delay(1000);
      
      return previewUrl;
    } catch (error) {
      console.warn('Failed to generate preview:', error);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to get all active jobs (for monitoring)
  getActiveJobs(): VideoProcessingJob[] {
    return Array.from(this.activeJobs.values());
  }

  // Utility method to get processing statistics
  async getProcessingStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data: stats } = await this.supabase
      .from('video_edits')
      .select('status');

    if (!stats) {
      return { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };
    }

    const counts = stats.reduce((acc, edit) => {
      acc[edit.status] = (acc[edit.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: stats.length,
      queued: counts.queued || 0,
      processing: counts.processing || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0
    };
  }
}

// Singleton instance
export const videoProcessingService = new VideoProcessingService();