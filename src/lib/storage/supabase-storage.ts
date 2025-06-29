import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import { StorageError } from '@supabase/storage-js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type BucketName = 'avatars' | 'videos' | 'thumbnails' | 'documents' | 'temp';

export interface FileUploadOptions {
  bucket: BucketName;
  file: File | Buffer;
  fileName?: string;
  userId?: string;
  optimize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  tags?: string[];
  expiresIn?: number; // seconds
}

export interface FileMetadata {
  id: string;
  user_id: string;
  bucket_id: string;
  file_path: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_hash?: string;
  optimized: boolean;
  optimization_metadata?: any;
  upload_session_id?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface OptimizationResult {
  optimized: boolean;
  originalSize: number;
  newSize: number;
  compression: number;
  metadata: any;
}

export class SupabaseStorageService {
  private supabase;
  
  constructor(isServer = false) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Upload file with validation and optimization
   */
  async uploadFile(options: FileUploadOptions): Promise<{
    url: string;
    path: string;
    metadata: FileMetadata;
  }> {
    const { bucket, file, fileName, userId, optimize = false, maxWidth, maxHeight, quality = 80, tags = [], expiresIn } = options;

    // Get current user if not provided
    const currentUserId = userId || (await this.getCurrentUserId());
    if (!currentUserId) {
      throw new Error('User must be authenticated to upload files');
    }

    // Convert File to Buffer if needed
    let fileBuffer: Buffer;
    let originalName: string;
    let mimeType: string;
    let fileSize: number;

    if (file instanceof File) {
      fileBuffer = Buffer.from(await file.arrayBuffer());
      originalName = fileName || file.name;
      mimeType = file.type;
      fileSize = file.size;
    } else {
      fileBuffer = file;
      originalName = fileName || 'unnamed';
      mimeType = this.detectMimeType(fileBuffer);
      fileSize = fileBuffer.length;
    }

    // Validate file
    await this.validateFile(bucket, fileBuffer, mimeType, fileSize);

    // Generate file hash for deduplication
    const fileHash = this.generateFileHash(fileBuffer);

    // Check for existing file with same hash
    const existingFile = await this.findFileByHash(currentUserId, bucket, fileHash);
    if (existingFile) {
      return {
        url: this.getPublicUrl(bucket, existingFile.file_path),
        path: existingFile.file_path,
        metadata: existingFile
      };
    }

    // Optimize file if requested and applicable
    let processedBuffer = fileBuffer;
    let optimizationResult: OptimizationResult | undefined;

    if (optimize && this.isImageFile(mimeType)) {
      const result = await this.optimizeImage(fileBuffer, { maxWidth, maxHeight, quality });
      processedBuffer = result.buffer;
      optimizationResult = result.metadata;
    }

    // Generate unique file path
    const fileExtension = this.getFileExtension(originalName) || this.getExtensionFromMimeType(mimeType);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = `${currentUserId}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, processedBuffer, {
        contentType: mimeType,
        cacheControl: this.getCacheControl(bucket),
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Save file metadata
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    
    const metadata = await this.saveFileMetadata({
      user_id: currentUserId,
      bucket_id: bucket,
      file_path: data.path,
      original_name: originalName,
      file_size: processedBuffer.length,
      mime_type: mimeType,
      file_hash: fileHash,
      optimized: !!optimizationResult,
      optimization_metadata: optimizationResult,
      tags,
      expires_at: expiresAt
    });

    return {
      url: this.getPublicUrl(bucket, data.path),
      path: data.path,
      metadata
    };
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: FileUploadOptions[]): Promise<Array<{
    url: string;
    path: string;
    metadata: FileMetadata;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      files.map(options => this.uploadFile(options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: '',
          path: '',
          metadata: {} as FileMetadata,
          error: result.reason.message || 'Upload failed'
        };
      }
    });
  }

  /**
   * Delete file
   */
  async deleteFile(bucket: BucketName, filePath: string, userId?: string): Promise<void> {
    const currentUserId = userId || (await this.getCurrentUserId());
    if (!currentUserId) {
      throw new Error('User must be authenticated to delete files');
    }

    // Check if user owns the file
    const metadata = await this.getFileMetadata(bucket, filePath);
    if (metadata && metadata.user_id !== currentUserId) {
      throw new Error('Unauthorized: Cannot delete file owned by another user');
    }

    // Delete from storage
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    // Delete metadata
    await this.deleteFileMetadata(bucket, filePath);
  }

  /**
   * Get file URL with caching headers
   */
  getPublicUrl(bucket: BucketName, filePath: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(bucket: BucketName, filePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Optimize image (server-side placeholder - actual optimization should be done client-side)
   */
  private async optimizeImage(buffer: Buffer, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }): Promise<{ buffer: Buffer; metadata: OptimizationResult }> {
    const originalSize = buffer.length;

    // For server-side, we'll skip optimization and return the original
    // Client-side optimization should be done using the ImageOptimizer class
    console.warn('Server-side image optimization skipped. Use client-side ImageOptimizer for better results.');

    return {
      buffer,
      metadata: {
        optimized: false,
        originalSize,
        newSize: originalSize,
        compression: 0,
        metadata: { 
          note: 'Server-side optimization disabled. Use client-side optimization before upload.' 
        }
      }
    };
  }

  /**
   * Validate file
   */
  private async validateFile(bucket: BucketName, buffer: Buffer, mimeType: string, size: number): Promise<void> {
    const limits = this.getBucketLimits(bucket);

    // Check file size
    if (size > limits.maxSize) {
      throw new Error(`File too large. Maximum size for ${bucket} is ${this.formatBytes(limits.maxSize)}`);
    }

    // Check mime type
    if (!limits.allowedTypes.includes(mimeType)) {
      throw new Error(`File type not allowed. Allowed types for ${bucket}: ${limits.allowedTypes.join(', ')}`);
    }

    // Additional validation for images (server-side basic validation)
    if (this.isImageFile(mimeType)) {
      // Basic file header validation
      if (buffer.length < 10) {
        throw new Error('Invalid image file: file too small');
      }

      // Check basic image file headers
      const header = buffer.subarray(0, 10);
      const isValidImage = 
        (header[0] === 0xFF && header[1] === 0xD8) || // JPEG
        (header[0] === 0x89 && header[1] === 0x50) || // PNG
        (header[6] === 0x4A && header[7] === 0x46) || // JFIF
        (header.toString('ascii', 0, 6) === 'GIF87a') ||
        (header.toString('ascii', 0, 6) === 'GIF89a');

      if (!isValidImage) {
        throw new Error('Invalid image file format');
      }
      
      // Note: Detailed dimension validation should be done client-side before upload
      // for better user experience and to avoid unnecessary upload traffic
    }
  }

  /**
   * Get bucket limits and configuration
   */
  private getBucketLimits(bucket: BucketName) {
    const limits = {
      avatars: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxWidth: 2048,
        maxHeight: 2048,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      },
      videos: {
        maxSize: 100 * 1024 * 1024, // 100MB
        maxWidth: 4096,
        maxHeight: 4096,
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
      },
      thumbnails: {
        maxSize: 5 * 1024 * 1024, // 5MB
        maxWidth: 1920,
        maxHeight: 1080,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      },
      documents: {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxWidth: Infinity,
        maxHeight: Infinity,
        allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      },
      temp: {
        maxSize: 20 * 1024 * 1024, // 20MB
        maxWidth: 4096,
        maxHeight: 4096,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
      }
    };

    return limits[bucket];
  }

  /**
   * Get cache control headers
   */
  private getCacheControl(bucket: BucketName): string {
    const cacheSettings = {
      avatars: '3600', // 1 hour
      videos: '86400', // 1 day
      thumbnails: '7200', // 2 hours
      documents: '3600', // 1 hour
      temp: '300' // 5 minutes
    };

    return cacheSettings[bucket];
  }

  /**
   * File metadata operations
   */
  private async saveFileMetadata(metadata: Omit<FileMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<FileMetadata> {
    const { data, error } = await this.supabase
      .from('file_metadata')
      .insert(metadata)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }

    return data;
  }

  async getFileMetadata(bucket: BucketName, filePath: string): Promise<FileMetadata | null> {
    const { data, error } = await this.supabase
      .from('file_metadata')
      .select('*')
      .eq('bucket_id', bucket)
      .eq('file_path', filePath)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }

    return data;
  }

  private async deleteFileMetadata(bucket: BucketName, filePath: string): Promise<void> {
    const { error } = await this.supabase
      .from('file_metadata')
      .delete()
      .eq('bucket_id', bucket)
      .eq('file_path', filePath);

    if (error) {
      throw new Error(`Failed to delete file metadata: ${error.message}`);
    }
  }

  private async findFileByHash(userId: string, bucket: BucketName, hash: string): Promise<FileMetadata | null> {
    const { data, error } = await this.supabase
      .from('file_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('bucket_id', bucket)
      .eq('file_hash', hash)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find file by hash: ${error.message}`);
    }

    return data;
  }

  /**
   * Utility methods
   */
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user?.id || null;
  }

  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private getFileExtension(fileName: string): string | null {
    const match = fileName.match(/\.[^.]+$/);
    return match ? match[0] : null;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt'
    };

    return extensions[mimeType] || '';
  }

  private detectMimeType(buffer: Buffer): string {
    // Simple magic number detection
    const header = buffer.subarray(0, 12);
    
    if (header[0] === 0xFF && header[1] === 0xD8) return 'image/jpeg';
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return 'image/png';
    if (header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    if (header.subarray(0, 6).toString() === 'GIF87a' || header.subarray(0, 6).toString() === 'GIF89a') return 'image/gif';
    if (header.subarray(4, 12).toString() === 'ftypmp4') return 'video/mp4';
    if (header.subarray(0, 4).toString() === '%PDF') return 'application/pdf';
    
    return 'application/octet-stream';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup operations
   */
  async cleanupExpiredFiles(userId?: string): Promise<number> {
    const currentUserId = userId || (await this.getCurrentUserId());
    if (!currentUserId) {
      throw new Error('User must be authenticated');
    }

    // Get expired files
    const { data: expiredFiles, error } = await this.supabase
      .from('file_metadata')
      .select('*')
      .eq('user_id', currentUserId)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw new Error(`Failed to get expired files: ${error.message}`);
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      return 0;
    }

    // Delete files from storage and metadata
    const deletionPromises = expiredFiles.map(file =>
      this.deleteFile(file.bucket_id as BucketName, file.file_path, currentUserId)
    );

    await Promise.allSettled(deletionPromises);
    return expiredFiles.length;
  }

  /**
   * Get user's file usage statistics
   */
  async getUserFileStats(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byBucket: Record<BucketName, { count: number; size: number }>;
  }> {
    const currentUserId = userId || (await this.getCurrentUserId());
    if (!currentUserId) {
      throw new Error('User must be authenticated');
    }

    const { data: files, error } = await this.supabase
      .from('file_metadata')
      .select('bucket_id, file_size')
      .eq('user_id', currentUserId);

    if (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }

    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byBucket: {} as Record<BucketName, { count: number; size: number }>
    };

    if (files) {
      stats.totalFiles = files.length;
      stats.totalSize = files.reduce((sum, file) => sum + file.file_size, 0);

      // Group by bucket
      files.forEach(file => {
        const bucket = file.bucket_id as BucketName;
        if (!stats.byBucket[bucket]) {
          stats.byBucket[bucket] = { count: 0, size: 0 };
        }
        stats.byBucket[bucket].count++;
        stats.byBucket[bucket].size += file.file_size;
      });
    }

    return stats;
  }
}

// Export singleton instances
export const storageService = new SupabaseStorageService();
export const serverStorageService = new SupabaseStorageService(true);