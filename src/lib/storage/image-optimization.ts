/**
 * Client-side image optimization utilities
 * Note: This doesn't use Sharp as it's not available in the browser
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface ImageOptimizationResult {
  file: File;
  originalSize: number;
  newSize: number;
  compressionRatio: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export class ImageOptimizer {
  /**
   * Optimize an image file in the browser
   */
  static async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<ImageOptimizationResult> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg',
      maintainAspectRatio = true
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          const originalWidth = width;
          const originalHeight = height;

          if (maintainAspectRatio && (width > maxWidth || height > maxHeight)) {
            const aspectRatio = width / height;
            
            if (aspectRatio > 1) {
              // Landscape
              width = Math.min(width, maxWidth);
              height = width / aspectRatio;
              
              if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
              }
            } else {
              // Portrait or square
              height = Math.min(height, maxHeight);
              width = height * aspectRatio;
              
              if (width > maxWidth) {
                width = maxWidth;
                height = width / aspectRatio;
              }
            }
          } else if (!maintainAspectRatio) {
            width = Math.min(width, maxWidth);
            height = Math.min(height, maxHeight);
          }

          // Set canvas size
          canvas.width = Math.floor(width);
          canvas.height = Math.floor(height);

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to blob
          const mimeType = format === 'png' ? 'image/png' : 
                          format === 'webp' ? 'image/webp' : 'image/jpeg';
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create optimized image'));
              return;
            }

            // Create new file
            const optimizedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now()
            });

            const originalSize = file.size;
            const newSize = optimizedFile.size;
            const compressionRatio = ((originalSize - newSize) / originalSize) * 100;

            resolve({
              file: optimizedFile,
              originalSize,
              newSize,
              compressionRatio,
              dimensions: {
                width: canvas.width,
                height: canvas.height
              }
            });
          }, mimeType, format === 'png' ? undefined : quality);

        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Load image
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail from image
   */
  static async generateThumbnail(
    file: File,
    size: { width: number; height: number } = { width: 300, height: 300 }
  ): Promise<File> {
    const result = await this.optimizeImage(file, {
      maxWidth: size.width,
      maxHeight: size.height,
      quality: 0.7,
      format: 'jpeg',
      maintainAspectRatio: true
    });

    // Rename to indicate it's a thumbnail
    const thumbnailFile = new File([result.file], `thumb_${file.name}`, {
      type: result.file.type,
      lastModified: Date.now()
    });

    return thumbnailFile;
  }

  /**
   * Batch optimize multiple images
   */
  static async optimizeImages(
    files: File[],
    options: ImageOptimizationOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<ImageOptimizationResult[]> {
    const results: ImageOptimizationResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.optimizeImage(files[i], options);
        results.push(result);
        onProgress?.(i + 1, files.length);
      } catch (error) {
        console.error(`Failed to optimize ${files[i].name}:`, error);
        // Add original file as fallback
        results.push({
          file: files[i],
          originalSize: files[i].size,
          newSize: files[i].size,
          compressionRatio: 0,
          dimensions: { width: 0, height: 0 }
        });
        onProgress?.(i + 1, files.length);
      }
    }

    return results;
  }

  /**
   * Check if file is an image
   */
  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Get image dimensions
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert image to different format
   */
  static async convertFormat(
    file: File,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality = 0.8
  ): Promise<File> {
    const result = await this.optimizeImage(file, {
      format: targetFormat,
      quality: targetFormat === 'png' ? undefined : quality,
      maxWidth: Infinity,
      maxHeight: Infinity
    });

    return result.file;
  }

  /**
   * Create progressive JPEG (simulated by higher quality)
   */
  static async createProgressiveJpeg(file: File): Promise<File> {
    return this.convertFormat(file, 'jpeg', 0.9);
  }

  /**
   * Estimate compression savings
   */
  static async estimateCompression(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<{
    estimatedSize: number;
    estimatedSavings: number;
    estimatedSavingsPercent: number;
  }> {
    // This is an estimation based on typical compression ratios
    const { quality = 0.8, format = 'jpeg' } = options;
    
    let compressionFactor = 1;
    
    if (format === 'jpeg') {
      compressionFactor = quality * 0.3 + 0.1; // JPEG typically compresses to 10-40% of original
    } else if (format === 'webp') {
      compressionFactor = quality * 0.25 + 0.05; // WebP typically compresses better
    } else if (format === 'png') {
      compressionFactor = 0.7; // PNG compression is lossless but less effective
    }

    const estimatedSize = Math.floor(file.size * compressionFactor);
    const estimatedSavings = file.size - estimatedSize;
    const estimatedSavingsPercent = (estimatedSavings / file.size) * 100;

    return {
      estimatedSize,
      estimatedSavings,
      estimatedSavingsPercent
    };
  }

  /**
   * Validate image file
   */
  static async validateImage(file: File): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: {
      width: number;
      height: number;
      size: number;
      type: string;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if it's actually an image
    if (!this.isImageFile(file)) {
      errors.push('File is not an image');
      return { valid: false, errors, warnings };
    }

    try {
      const dimensions = await this.getImageDimensions(file);
      
      // Check file size (example limits)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        errors.push(`Image too large (${this.formatBytes(file.size)}). Maximum: ${this.formatBytes(maxSize)}`);
      }

      // Check dimensions
      const maxDimension = 8192;
      if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
        errors.push(`Image dimensions too large (${dimensions.width}x${dimensions.height}). Maximum: ${maxDimension}x${maxDimension}`);
      }

      // Warnings for large files
      if (file.size > 10 * 1024 * 1024) {
        warnings.push('Large image file may benefit from compression');
      }

      if (dimensions.width > 4096 || dimensions.height > 4096) {
        warnings.push('High resolution image may be resized for web usage');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          width: dimensions.width,
          height: dimensions.height,
          size: file.size,
          type: file.type
        }
      };

    } catch (error) {
      errors.push('Failed to process image file');
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Format file size in human readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}