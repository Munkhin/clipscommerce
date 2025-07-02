import { createClient } from '@/lib/supabase/server';
import { serverStorageService } from './supabase-storage';
import * as cron from 'node-cron';
import { createStorageError, extractErrorMessage, logError, isError } from '@/lib/errors/errorHandling';

interface FileMetadata {
  id: string;
  bucket_id: string;
  file_path: string;
  file_size: number;
  expires_at?: string;
  created_at: string;
}

export class StorageCleanupService {
  private async getSupabase() {
    return await createClient();
  }

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
        this.supabase = await createClient(cookies());
      }
      // Get all expired files
      const supabase = await this.getSupabase();
      const { data: expiredFiles, error } = await supabase
        .from('file_metadata')
        .select('*')
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        const storageError = createStorageError(error, 'cleanup', undefined, undefined, { operation: 'fetch_expired' });
        logError(storageError);
        errors.push(`Failed to fetch expired files: ${storageError.message}`);
        return { totalCleaned: 0, errors };
      }

      if (!expiredFiles || expiredFiles.length === 0) {
        return { totalCleaned: 0, errors: [] };
      }

      // Group files by bucket for efficient deletion
      const filesByBucket = expiredFiles.reduce((acc: Record<string, FileMetadata[]>, file: FileMetadata) => {
        if (!acc[file.bucket_id]) {
          acc[file.bucket_id] = [];
        }
        acc[file.bucket_id].push(file);
        return acc;
      }, {} as Record<string, FileMetadata[]>);

      // Delete files from each bucket
      for (const [bucketId, files] of Object.entries(filesByBucket)) {
        try {
          // Delete from storage
          const filePaths = files.map((f: FileMetadata) => f.file_path);
          const { error: storageError } = await supabase.storage
            .from(bucketId)
            .remove(filePaths);

          if (storageError) {
            const cleanupError = createStorageError(storageError, 'cleanup', bucketId, filePaths.join(', '));
            logError(cleanupError);
            errors.push(`Failed to delete files from bucket ${bucketId}: ${cleanupError.message}`);
            continue;
          }

          // Delete metadata
          const fileIds = files.map((f: FileMetadata) => f.id);
          const { error: metadataError } = await supabase
            .from('file_metadata')
            .delete()
            .in('id', fileIds);

          if (metadataError) {
            const cleanupError = createStorageError(metadataError, 'cleanup', bucketId, undefined, { operation: 'delete_metadata' });
            logError(cleanupError);
            errors.push(`Failed to delete metadata for bucket ${bucketId}: ${cleanupError.message}`);
            continue;
          }

          totalCleaned += files.length;
          console.log(`Cleaned up ${files.length} expired files from bucket ${bucketId}`);
        } catch (error) {
          const storageError = createStorageError(error, 'cleanup', bucketId);
          logError(storageError);
          errors.push(`Error processing bucket ${bucketId}: ${storageError.message}`);
        }
      }

    } catch (error) {
      const storageError = createStorageError(error, 'cleanup');
      logError(storageError);
      errors.push(`General cleanup error: ${storageError.message}`);
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

    const supabase = await this.getSupabase();

    for (const bucketId of buckets) {
      try {
        // Get all files in bucket
        const supabase = await this.getSupabase();
        const { data: storageFiles, error: storageError } = await supabase.storage
          .from(bucketId)
          .list('', { limit: 1000 });

        if (storageError) {
          const cleanupError = createStorageError(storageError, 'list', bucketId);
          logError(cleanupError);
          errors.push(`Failed to list files in bucket ${bucketId}: ${cleanupError.message}`);
          continue;
        }

        if (!storageFiles || storageFiles.length === 0) {
          continue;
        }

        // Get all file metadata for this bucket
        const { data: metadataFiles, error: metadataError } = await supabase
          .from('file_metadata')
          .select('file_path')
          .eq('bucket_id', bucketId);

        if (metadataError) {
          const cleanupError = createStorageError(metadataError, 'list', bucketId, undefined, { operation: 'fetch_metadata' });
          logError(cleanupError);
          errors.push(`Failed to get metadata for bucket ${bucketId}: ${cleanupError.message}`);
          continue;
        }

        const metadataPaths = new Set(metadataFiles?.map((f: {file_path: string}) => f.file_path) || []);
        
        // Find orphaned files (in storage but not in metadata)
        const orphanedFiles = storageFiles?.filter((file: {name: string}) => {
          const filePath = file.name;
          return !metadataPaths.has(filePath) && !file.name.endsWith('/'); // Exclude folders
        }) || [];

        if (orphanedFiles.length > 0) {
          const orphanedPaths = orphanedFiles.map((f: {name: string}) => f.name);
          
          // Delete orphaned files
          const { error: deleteError } = await supabase.storage
            .from(bucketId)
            .remove(orphanedPaths);

          if (deleteError) {
            const cleanupError = createStorageError(deleteError, 'delete', bucketId, orphanedPaths.join(', '));
            logError(cleanupError);
            errors.push(`Failed to delete orphaned files from bucket ${bucketId}: ${cleanupError.message}`);
          } else {
            totalCleaned += orphanedFiles.length;
            console.log(`Cleaned up ${orphanedFiles.length} orphaned files from bucket ${bucketId}`);
          }
        }

      } catch (error) {
        const storageError = createStorageError(error, 'cleanup', bucketId, undefined, { operation: 'orphaned_files' });
        logError(storageError);
        errors.push(`Error processing orphaned files in bucket ${bucketId}: ${storageError.message}`);
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
        this.supabase = await createClient(cookies());
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dayThreshold);

      // Get large old files
      const supabase = await this.getSupabase();
      const { data: largeFiles, error } = await supabase
        .from('file_metadata')
        .select('*')
        .gt('file_size', sizeThreshold)
        .lt('created_at', cutoffDate.toISOString())
        .eq('bucket_id', 'temp'); // Only clean temp files

      if (error) {
        const storageError = createStorageError(error, 'cleanup', 'temp', undefined, { operation: 'fetch_large_files' });
        logError(storageError);
        errors.push(`Failed to fetch large old files: ${storageError.message}`);
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
          const storageError = createStorageError(error, 'delete', file.bucket_id, file.file_path);
          logError(storageError);
          errors.push(`Failed to delete large file ${file.file_path}: ${storageError.message}`);
        }
      }

      console.log(`Cleaned up ${totalCleaned} large old files`);

    } catch (error) {
      const storageError = createStorageError(error, 'cleanup', undefined, undefined, { operation: 'large_files' });
      logError(storageError);
      errors.push(`General large file cleanup error: ${storageError.message}`);
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
        this.supabase = await createClient(cookies());
      }

      // Get all file metadata
      const supabase = await this.getSupabase();
      const { data: allFiles, error } = await supabase
        .from('file_metadata')
        .select('bucket_id, file_size, expires_at');

      if (error) {
        const storageError = createStorageError(error, 'stats');
        logError(storageError);
        throw storageError;
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
        stats.totalSize = allFiles.reduce((sum: number, file: FileMetadata) => sum + file.file_size, 0);

        // Group by bucket
        allFiles.forEach((file: FileMetadata) => {
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
      const storageError = createStorageError(error, 'stats');
      logError(storageError);
      throw storageError;
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
        const storageError = createStorageError(error, 'cleanup', undefined, undefined, { scheduled: true });
        logError(storageError);
        console.error('Scheduled cleanup failed:', storageError.message);
      }
    });

    // Run expired files cleanup every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running scheduled expired files cleanup...');
      try {
        await this.cleanupExpiredFiles();
      } catch (error) {
        const storageError = createStorageError(error, 'cleanup', undefined, undefined, { scheduled: true, operation: 'expired_files' });
        logError(storageError);
        console.error('Scheduled expired files cleanup failed:', storageError.message);
      }
    });

    console.log('Storage cleanup scheduled');
  }
}

// Export singleton instance
export const storageCleanupService = new StorageCleanupService();