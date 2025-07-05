import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { VideoEditOperation } from '@/app/api/videos/edit/route';

export interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
  timeRemaining?: string;
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
  fileSize?: number;
}

export class FFmpegProcessor {
  private ffmpegPath: string;
  private tempDir: string;

  constructor() {
    // In production, these would be properly configured
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.tempDir = process.env.TEMP_DIR || '/tmp/video-processing';
  }

  async processVideo(
    inputPath: string,
    operations: VideoEditOperation[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    try {
      // Ensure temp directory exists
      await this.ensureTempDir();

      // Generate unique output filename
      const outputFilename = `processed_${Date.now()}.mp4`;
      const outputPath = path.join(this.tempDir, outputFilename);

      // Build FFmpeg command
      const ffmpegArgs = await this.buildFFmpegCommand(inputPath, outputPath, operations);
      
      onProgress?.({
        stage: 'initialization',
        progress: 5,
        message: 'Starting video processing...'
      });

      // Execute FFmpeg command
      const result = await this.executeFFmpeg(ffmpegArgs, onProgress);
      
      if (!result.success) {
        return result;
      }

      // Get output file stats
      const stats = await fs.stat(outputPath);
      const duration = await this.getVideoDuration(outputPath);

      return {
        success: true,
        outputPath,
        duration,
        fileSize: stats.size
      };

    } catch (error) {
      console.error('Error processing video:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  private async buildFFmpegCommand(
    inputPath: string,
    outputPath: string,
    operations: VideoEditOperation[]
  ): Promise<string[]> {
    const args: string[] = ['-i', inputPath];
    
    // Video filters array
    const videoFilters: string[] = [];
    const audioFilters: string[] = [];
    
    // Process operations in order
    for (const operation of operations) {
      switch (operation.type) {
        case 'trim':
          if (operation.parameters.startTime !== undefined && operation.parameters.endTime !== undefined) {
            args.push('-ss', operation.parameters.startTime.toString());
            args.push('-to', operation.parameters.endTime.toString());
          }
          break;

        case 'crop':
          if (operation.parameters.width && operation.parameters.height) {
            const { x = 0, y = 0, width, height } = operation.parameters;
            videoFilters.push(`crop=${width}:${height}:${x}:${y}`);
          }
          break;

        case 'rotate':
          if (operation.parameters.degrees !== undefined) {
            const radians = (operation.parameters.degrees * Math.PI) / 180;
            videoFilters.push(`rotate=${radians}`);
          }
          break;

        case 'filter':
          const filter = this.buildVideoFilter(operation.parameters);
          if (filter) {
            videoFilters.push(filter);
          }
          break;

        case 'speed':
          if (operation.parameters.speedMultiplier !== undefined) {
            const speed = operation.parameters.speedMultiplier;
            videoFilters.push(`setpts=PTS/${speed}`);
            audioFilters.push(`atempo=${speed}`);
          }
          break;

        case 'volume':
          if (operation.parameters.volumeLevel !== undefined) {
            const volume = operation.parameters.volumeLevel / 100;
            audioFilters.push(`volume=${volume}`);
          }
          break;
      }
    }

    // Add video filters if any
    if (videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','));
    }

    // Add audio filters if any
    if (audioFilters.length > 0) {
      args.push('-af', audioFilters.join(','));
    }

    // Output settings
    args.push(
      '-c:v', 'libx264',     // Video codec
      '-preset', 'medium',    // Encoding preset (balance of speed/quality)
      '-crf', '23',          // Constant Rate Factor (quality)
      '-c:a', 'aac',         // Audio codec
      '-b:a', '128k',        // Audio bitrate
      '-movflags', '+faststart', // Web optimization
      '-y',                  // Overwrite output file
      outputPath
    );

    return args;
  }

  private buildVideoFilter(parameters: any): string | null {
    const { filterType, intensity = 50 } = parameters;
    
    switch (filterType) {
      case 'blur':
        const blurRadius = (intensity / 100) * 10;
        return `boxblur=${blurRadius}:${blurRadius}`;
      
      case 'sharpen':
        const sharpenAmount = (intensity / 100) * 2;
        return `unsharp=5:5:${sharpenAmount}:5:5:0.0`;
      
      case 'brightness':
        const brightness = (intensity - 50) / 50; // -1 to 1
        return `eq=brightness=${brightness}`;
      
      case 'contrast':
        const contrast = 1 + (intensity - 50) / 50; // 0 to 2
        return `eq=contrast=${contrast}`;
      
      case 'saturation':
        const saturation = 1 + (intensity - 50) / 50; // 0 to 2
        return `eq=saturation=${saturation}`;
      
      default:
        return null;
    }
  }

  private async executeFFmpeg(
    args: string[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegPath, args);
      
      let stderr = '';
      let lastProgress = 0;

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        
        // Parse FFmpeg progress output
        const progressMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (progressMatch && onProgress) {
          const [, hours, minutes, seconds] = progressMatch;
          const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          
          // Estimate progress (this is simplified - in production you'd need video duration)
          const estimatedProgress = Math.min(lastProgress + 10, 90);
          lastProgress = estimatedProgress;
          
          onProgress({
            stage: 'processing',
            progress: estimatedProgress,
            message: `Processing video... ${progressMatch[0]}`
          });
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          onProgress?.({
            stage: 'completed',
            progress: 100,
            message: 'Video processing completed'
          });
          
          resolve({ success: true });
        } else {
          console.error('FFmpeg error:', stderr);
          resolve({
            success: false,
            error: `FFmpeg process failed with code ${code}: ${stderr}`
          });
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('FFmpeg spawn error:', error);
        resolve({
          success: false,
          error: `Failed to start FFmpeg: ${error.message}`
        });
      });
    });
  }

  private async getVideoDuration(videoPath: string): Promise<number | undefined> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        videoPath
      ]);

      let stdout = '';
      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            const duration = parseFloat(info.format?.duration);
            resolve(isNaN(duration) ? undefined : duration);
          } catch (error) {
            resolve(undefined);
          }
        } else {
          resolve(undefined);
        }
      });

      ffprobe.on('error', () => {
        resolve(undefined);
      });
    });
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch (error) {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to cleanup file:', filePath, error);
    }
  }

  // Utility method to download video from URL
  async downloadVideo(videoUrl: string): Promise<string> {
    const filename = `input_${Date.now()}.mp4`;
    const inputPath = path.join(this.tempDir, filename);

    // In production, you'd implement proper video download logic
    // For now, we'll assume local file paths or implement a simple download
    
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(buffer));
      
      return inputPath;
    } catch (error) {
      throw new Error(`Video download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility method to upload processed video
  async uploadVideo(filePath: string, originalFilename: string): Promise<string> {
    // In production, you'd implement upload to your storage service (S3, GCS, etc.)
    // For now, we'll return a placeholder URL
    
    const uploadedFilename = `processed_${Date.now()}_${originalFilename}`;
    const publicUrl = `https://your-storage-bucket.com/videos/${uploadedFilename}`;
    
    // Simulate upload process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return publicUrl;
  }
}

// Singleton instance
export const ffmpegProcessor = new FFmpegProcessor();