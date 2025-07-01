import { createClient } from '../supabase/server';
import { serverStorageService } from './supabase-storage';
import * as cron from 'node-cron';

export class StorageCleanupService {
  private supabase: any;

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles(): Promise<{
    totalCleaned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalCleaned = 0;

    try {
      if (!this.supabase) {
        this.supabase = await createClient();
      }
      // Get all expired files
      const { data: expiredFiles, error } = await this.supabase
        .from('file_metadata')
        .select('*')
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        errors.push(`Failed to fetch expired files: ${error.message}`);
        return { totalCleaned: 0, errors };
      }

      if (!expiredFiles || expiredFiles.length === 0) {
        return { totalCleaned: 0, errors: [] };
      }

      // Group files by bucket for efficient deletion
      const filesByBucket = expiredFiles.reduce((acc: Record<string, any[]>, file: any) => {
        if (!acc[file.bucket_id]) {
          acc[file.bucket_id] = [];
        }
        acc[file.bucket_id].push(file);
        return acc;
      }, {} as Record<string, any[]>);

      // Delete files from each bucket
      for (const [bucketId, files] of Object.entries(filesByBucket)) {
        try {
          // Delete from storage
          const filePaths = (files as any[]).map((f: any) => f.file_path);
          const { error: storageError } = await this.supabase.storage
            .from(bucketId)
            .remove(filePaths);

          if (storageError) {
            errors.push(`Failed to delete files from bucket ${bucketId}: ${storageError.message}`);
            continue;
          }

          // Delete metadata
          const fileIds = (files as any[]).map((f: any) => f.id);
          const { error: metadataError } = await this.supabase
            .from('file_metadata')
            .delete()
            .in('id', fileIds);

          if (metadataError) {
            errors.push(`Failed to delete metadata for bucket ${bucketId}: ${metadataError.message}`);
            continue;
          }

          totalCleaned += (files as any[]).length;
          console.log(`Cleaned up ${(files as any[]).length} expired files from bucket ${bucketId}`);
        } catch (error) {
          errors.push(`Error processing bucket ${bucketId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      errors.push(`General cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { totalCleaned, errors };
  }

  /**
   * Clean up orphaned files (files in storage without metadata)
   */
  async cleanupOrphanedFiles(): Promise<{
    totalCleaned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalCleaned = 0;
    const buckets = ['avatars', 'videos', 'thumbnails', 'documents', 'temp'];

    if (!this.supabase) {
      this.supabase = await createClient();
    }

    for (const bucketId of buckets) {
      try {
        // Get all files in bucket
        const { data: storageFiles, error: storageError } = await this.supabase.storage
          .from(bucketId)
          .list('', { limit: 1000 });

        if (storageError) {
          errors.push(`Failed to list files in bucket ${bucketId}: ${storageError.message}`);
          continue;
        }

        if (!storageFiles || storageFiles.length === 0) {
          continue;
        }

        // Get all file metadata for this bucket
        const { data: metadataFiles, error: metadataError } = await this.supabase
          .from('file_metadata')
          .select('file_path')
          .eq('bucket_id', bucketId);

        if (metadataError) {
          errors.push(`Failed to get metadata for bucket ${bucketId}: ${metadataError.message}`);
          continue;
        }

        const metadataPaths = new Set(metadataFiles?.map((f: any) => f.file_path) || []);
        
        // Find orphaned files (in storage but not in metadata)
        const orphanedFiles = (storageFiles as any[]).filter((file: any) => {
          const filePath = file.name;
          return !metadataPaths.has(filePath) && !file.name.endsWith('/'); // Exclude folders
        });

        if (orphanedFiles.length > 0) {
          const orphanedPaths = orphanedFiles.map((f: any) => f.name);
          
          // Delete orphaned files
          const { error: deleteError } = await this.supabase.storage
            .from(bucketId)
            .remove(orphanedPaths);

          if (deleteError) {
            errors.push(`Failed to delete orphaned files from bucket ${bucketId}: ${deleteError.message}`);
          } else {
            totalCleaned += orphanedFiles.length;
            console.log(`Cleaned up ${orphanedFiles.length} orphaned files from bucket ${bucketId}`);
          }
        }

      } catch (error) {
        errors.push(`Error processing orphaned files in bucket ${bucketId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { totalCleaned, errors };
  }

  /**
   * Clean up large files older than specified days
   */
  async cleanupLargeOldFiles(dayThreshold = 30, sizeThreshold = 50 * 1024 * 1024): Promise<{
    totalCleaned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalCleaned = 0;

    try {
      if (!this.supabase) {
        this.supabase = await createClient();
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dayThreshold);

      // Get large old files
      const { data: largeFiles, error } = await this.supabase
        .from('file_metadata')
        .select('*')
        .gt('file_size', sizeThreshold)
        .lt('created_at', cutoffDate.toISOString())
        .eq('bucket_id', 'temp'); // Only clean temp files

      if (error) {
        errors.push(`Failed to fetch large old files: ${error.message}`);
        return { totalCleaned: 0, errors };
      }

      if (!largeFiles || largeFiles.length === 0) {
        return { totalCleaned: 0, errors: [] };
      }

      // Delete large old files
      for (const file of largeFiles) {
        try {
          await serverStorageService.deleteFile(file.bucket_id as any, file.file_path);
          totalCleaned++;
        } catch (error) {
          errors.push(`Failed to delete large file ${file.file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`Cleaned up ${totalCleaned} large old files`);

    } catch (error) {
      errors.push(`General large file cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { totalCleaned, errors };
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byBucket: Record<string, { count: number; size: number }>;
    expiredFiles: number;
    largeFiles: number;
  }> {
    try {
      if (!this.supabase) {
        this.supabase = await createClient();
      }

      // Get all file metadata
      const { data: allFiles, error } = await this.supabase
        .from('file_metadata')
        .select('bucket_id, file_size, expires_at');

      if (error) {
        throw new Error(`Failed to get file stats: ${error.message}`);
      }

      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byBucket: {} as Record<string, { count: number; size: number }>,
        expiredFiles: 0,
        largeFiles: 0
      };

      if (allFiles) {
        stats.totalFiles = allFiles.length;
        stats.totalSize = allFiles.reduce((sum: number, file: any) => sum + file.file_size, 0);

        // Group by bucket
        allFiles.forEach((file: any) => {
          const bucket = file.bucket_id;
          if (!stats.byBucket[bucket]) {
            stats.byBucket[bucket] = { count: 0, size: 0 };
          }
          stats.byBucket[bucket].count++;
          stats.byBucket[bucket].size += file.file_size;

          // Count expired files
          if (file.expires_at && new Date(file.expires_at) < new Date()) {
            stats.expiredFiles++;
          }

          // Count large files (>50MB)
          if (file.file_size > 50 * 1024 * 1024) {
            stats.largeFiles++;
          }
        });
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to calculate storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run full cleanup process
   */
  async runFullCleanup(): Promise<{
    summary: {
      expiredFiles: number;
      orphanedFiles: number;
      largeOldFiles: number;
      totalCleaned: number;
    };
    errors: string[];
  }> {
    console.log('Starting full storage cleanup...');
    
    const allErrors: string[] = [];
    
    // Clean expired files
    const expiredResult = await this.cleanupExpiredFiles();
    allErrors.push(...expiredResult.errors);
    
    // Clean orphaned files
    const orphanedResult = await this.cleanupOrphanedFiles();
    allErrors.push(...orphanedResult.errors);
    
    // Clean large old files
    const largeFilesResult = await this.cleanupLargeOldFiles();
    allErrors.push(...largeFilesResult.errors);

    const summary = {
      expiredFiles: expiredResult.totalCleaned,
      orphanedFiles: orphanedResult.totalCleaned,
      largeOldFiles: largeFilesResult.totalCleaned,
      totalCleaned: expiredResult.totalCleaned + orphanedResult.totalCleaned + largeFilesResult.totalCleaned
    };

    console.log('Storage cleanup completed:', summary);
    
    if (allErrors.length > 0) {
      console.error('Cleanup errors:', allErrors);
    }

    return { summary, errors: allErrors };
  }

  /**
   * Schedule automatic cleanup (call this in your app initialization)
   */
  scheduleCleanup(): void {
    // Run cleanup daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled storage cleanup...');
      try {
        await this.runFullCleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    });

    // Run expired files cleanup every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running scheduled expired files cleanup...');
      try {
        await this.cleanupExpiredFiles();
      } catch (error) {
        console.error('Scheduled expired files cleanup failed:', error);
      }
    });

    console.log('Storage cleanup scheduled');
  }
}

// Export singleton instance
export const storageCleanupService = new StorageCleanupService();