import { BucketName, SupabaseStorageService } from './supabase-storage';

export interface FileUploadConfig {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  validateDimensions?: boolean;
  autoOptimize?: boolean;
  generateThumbnails?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export class FileUploadUtils {
  private storageService: SupabaseStorageService;

  constructor(storageService: SupabaseStorageService) {
    this.storageService = storageService;
  }

  /**
   * Validate multiple files before upload
   */
  validateFiles(files: FileList | File[], bucket: BucketName, config?: FileUploadConfig): FileValidationResult {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check number of files
    if (config?.maxFiles && fileArray.length > config.maxFiles) {
      errors.push(`Too many files. Maximum allowed: ${config.maxFiles}`);
    }

    // Validate each file
    fileArray.forEach((file, index) => {
      const fileValidation = this.validateSingleFile(file, bucket, config);
      
      fileValidation.errors.forEach(error => {
        errors.push(`File ${index + 1} (${file.name}): ${error}`);
      });
      
      fileValidation.warnings.forEach(warning => {
        warnings.push(`File ${index + 1} (${file.name}): ${warning}`);
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single file
   */
  validateSingleFile(file: File, bucket: BucketName, config?: FileUploadConfig): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    const maxSize = config?.maxFileSize || this.getDefaultMaxSize(bucket);
    if (file.size > maxSize) {
      errors.push(`File too large (${this.formatBytes(file.size)}). Maximum: ${this.formatBytes(maxSize)}`);
    }

    // Check file type
    const allowedTypes = config?.allowedTypes || this.getDefaultAllowedTypes(bucket);
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type not allowed (${file.type}). Allowed: ${allowedTypes.join(', ')}`);
    }

    // Check file name
    if (!this.isValidFileName(file.name)) {
      errors.push('Invalid file name. Use only letters, numbers, and basic punctuation.');
    }

    // Warn about large files that might be slow to upload
    if (file.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('Large file may take longer to upload');
    }

    // Warn about non-optimized images
    if (this.isImageFile(file.type) && !config?.autoOptimize) {
      warnings.push('Consider enabling auto-optimization for better performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Upload files with progress tracking
   */
  async uploadWithProgress(
    files: FileList | File[],
    bucket: BucketName,
    config?: FileUploadConfig,
    onProgress?: (progress: UploadProgress[]) => void
  ): Promise<Array<{
    file: File;
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
  }>> {
    const fileArray = Array.from(files);
    const progressArray: UploadProgress[] = fileArray.map(file => ({
      loaded: 0,
      total: file.size,
      percentage: 0,
      file,
      status: 'pending'
    }));

    // Initial progress callback
    onProgress?.(progressArray);

    const results = await Promise.allSettled(
      fileArray.map(async (file, index) => {
        try {
          // Update status to uploading
          progressArray[index].status = 'uploading';
          onProgress?.(progressArray);

          // Simulate progress for visual feedback
          const progressInterval = setInterval(() => {
            if (progressArray[index].percentage < 90) {
              progressArray[index].percentage += Math.random() * 10;
              progressArray[index].loaded = (progressArray[index].percentage / 100) * file.size;
              onProgress?.(progressArray);
            }
          }, 100);

          const result = await this.storageService.uploadFile({
            bucket,
            file,
            optimize: config?.autoOptimize,
            tags: [`upload-${Date.now()}`]
          });

          clearInterval(progressInterval);

          // Complete progress
          progressArray[index].status = 'completed';
          progressArray[index].percentage = 100;
          progressArray[index].loaded = file.size;
          onProgress?.(progressArray);

          return {
            file,
            success: true,
            url: result.url,
            path: result.path
          };
        } catch (error) {
          // Update status to error
          progressArray[index].status = 'error';
          progressArray[index].error = error instanceof Error ? error.message : 'Unknown error';
          onProgress?.(progressArray);

          return {
            file,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          file: fileArray[index],
          success: false,
          error: result.reason.message || 'Upload failed'
        };
      }
    });
  }

  /**
   * Create file input with drag and drop
   */
  createFileInput(options: {
    bucket: BucketName;
    config?: FileUploadConfig;
    onSelect?: (files: File[]) => void;
    onDrop?: (files: File[]) => void;
    onValidationError?: (errors: string[]) => void;
  }) {
    const { bucket, config, onSelect, onDrop, onValidationError } = options;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = (config?.maxFiles || 1) > 1;
    
    if (config?.allowedTypes) {
      input.accept = config.allowedTypes.join(',');
    }

    input.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        const validation = this.validateFiles(files, bucket, config);
        if (validation.valid) {
          onSelect?.(Array.from(files));
        } else {
          onValidationError?.(validation.errors);
        }
      }
    });

    return {
      input,
      click: () => input.click(),
      setupDropZone: (element: HTMLElement) => {
        element.addEventListener('dragover', (event) => {
          event.preventDefault();
          element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', () => {
          element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (event) => {
          event.preventDefault();
          element.classList.remove('drag-over');
          
          const files = Array.from(event.dataTransfer?.files || []);
          if (files.length > 0) {
            const validation = this.validateFiles(files, bucket, config);
            if (validation.valid) {
              onDrop?.(files);
            } else {
              onValidationError?.(validation.errors);
            }
          }
        });
      }
    };
  }

  /**
   * Generate thumbnail for video files
   */
  async generateVideoThumbnail(videoFile: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.addEventListener('loadedmetadata', () => {
        // Set canvas size to video size (or scaled down)
        const maxWidth = 400;
        const maxHeight = 300;
        const aspectRatio = video.videoWidth / video.videoHeight;

        if (video.videoWidth > maxWidth || video.videoHeight > maxHeight) {
          if (aspectRatio > 1) {
            canvas.width = maxWidth;
            canvas.height = maxWidth / aspectRatio;
          } else {
            canvas.height = maxHeight;
            canvas.width = maxHeight * aspectRatio;
          }
        } else {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Seek to 1 second or 10% of video length
        video.currentTime = Math.min(1, video.duration * 0.1);
      });

      video.addEventListener('seeked', () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);

        // Cleanup
        URL.revokeObjectURL(video.src);
      });

      video.addEventListener('error', () => {
        reject(new Error('Failed to load video'));
      });

      // Load video
      video.src = URL.createObjectURL(videoFile);
      video.load();
    });
  }

  /**
   * Compress image before upload
   */
  async compressImage(file: File, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: string;
  } = {}): Promise<File> {
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, format = 'image/jpeg' } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (aspectRatio > 1) {
            width = maxWidth;
            height = maxWidth / aspectRatio;
          } else {
            height = maxHeight;
            width = maxHeight * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: format,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, format, quality);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get file preview URL
   */
  getFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isImageFile(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      } else if (this.isVideoFile(file.type)) {
        // For videos, create object URL
        resolve(URL.createObjectURL(file));
      } else {
        reject(new Error('File type not supported for preview'));
      }
    });
  }

  /**
   * Utility methods
   */
  private getDefaultMaxSize(bucket: BucketName): number {
    const sizes = {
      avatars: 10 * 1024 * 1024, // 10MB
      videos: 100 * 1024 * 1024, // 100MB
      thumbnails: 5 * 1024 * 1024, // 5MB
      documents: 50 * 1024 * 1024, // 50MB
      temp: 20 * 1024 * 1024 // 20MB
    };
    return sizes[bucket];
  }

  private getDefaultAllowedTypes(bucket: BucketName): string[] {
    const types = {
      avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
      thumbnails: ['image/jpeg', 'image/png', 'image/webp'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      temp: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
    };
    return types[bucket];
  }

  private isValidFileName(fileName: string): boolean {
    // Check for valid characters and reasonable length
    const validPattern = /^[a-zA-Z0-9._\-\s()[\]]+$/;
    return validPattern.test(fileName) && fileName.length <= 255;
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileUploadUtils = new FileUploadUtils(new SupabaseStorageService());