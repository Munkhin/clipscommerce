import { useState, useCallback, useRef } from 'react';
import { BucketName, storageService } from '@/lib/storage/supabase-storage';
import { FileUploadConfig, FileUploadUtils, UploadProgress, fileUploadUtils } from '@/lib/storage/file-upload-utils';

export interface UseFileUploadOptions {
  bucket: BucketName;
  config?: FileUploadConfig;
  onSuccess?: (results: Array<{ url: string; path: string; file: File }>) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: UploadProgress[]) => void;
}

export interface UseFileUploadReturn {
  // State
  uploading: boolean;
  progress: UploadProgress[];
  errors: string[];
  warnings: string[];
  
  // Methods
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  validateFiles: (files: FileList | File[]) => boolean;
  clearErrors: () => void;
  
  // Drag and drop
  dragProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  
  // File input
  inputProps: {
    type: 'file';
    multiple: boolean;
    accept: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  
  // Utils
  getFilePreview: (file: File) => Promise<string>;
  compressImage: (file: File, options?: any) => Promise<File>;
  generateVideoThumbnail: (file: File) => Promise<Blob>;
}

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const { bucket, config, onSuccess, onError, onProgress } = options;
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const uploadUtilsRef = useRef(fileUploadUtils);

  const validateFiles = useCallback((files: FileList | File[]): boolean => {
    const validation = uploadUtilsRef.current.validateFiles(files, bucket, config);
    
    setErrors(validation.errors);
    setWarnings(validation.warnings);
    
    if (!validation.valid && onError) {
      onError(validation.errors.join('; '));
    }
    
    return validation.valid;
  }, [bucket, config, onError]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!validateFiles(files)) {
      return;
    }

    setUploading(true);
    setErrors([]);
    setProgress([]);

    try {
      const results = await uploadUtilsRef.current.uploadWithProgress(
        files,
        bucket,
        config,
        (progressUpdate) => {
          setProgress([...progressUpdate]);
          onProgress?.(progressUpdate);
        }
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        const errorMessages = failed.map(f => `${f.file.name}: ${f.error}`);
        setErrors(errorMessages);
        onError?.(errorMessages.join('; '));
      }

      if (successful.length > 0) {
        const successResults = successful.map(r => ({
          url: r.url!,
          path: r.path!,
          file: r.file
        }));
        onSuccess?.(successResults);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrors([errorMessage]);
      onError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [bucket, config, validateFiles, onSuccess, onError, onProgress]);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setWarnings([]);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, [uploadFiles]);

  // File input handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
    // Clear input to allow selecting the same file again
    e.target.value = '';
  }, [uploadFiles]);

  // Generate file input props
  const inputProps = {
    type: 'file' as const,
    multiple: (config?.maxFiles || 1) > 1,
    accept: config?.allowedTypes?.join(',') || '',
    onChange: handleInputChange
  };

  const dragProps = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  };

  return {
    uploading,
    progress,
    errors,
    warnings,
    uploadFiles,
    validateFiles,
    clearErrors,
    dragProps,
    inputProps,
    getFilePreview: uploadUtilsRef.current.getFilePreview.bind(uploadUtilsRef.current),
    compressImage: uploadUtilsRef.current.compressImage.bind(uploadUtilsRef.current),
    generateVideoThumbnail: uploadUtilsRef.current.generateVideoThumbnail.bind(uploadUtilsRef.current)
  };
}

// Hook for avatar uploads specifically
export function useAvatarUpload(options?: {
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}) {
  return useFileUpload({
    bucket: 'avatars',
    config: {
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      autoOptimize: true,
      validateDimensions: true
    },
    onSuccess: (results) => options?.onSuccess?.(results[0]?.url),
    onError: options?.onError
  });
}

// Hook for video uploads
export function useVideoUpload(options?: {
  onSuccess?: (results: Array<{ url: string; thumbnailUrl?: string }>) => void;
  onError?: (error: string) => void;
  generateThumbnails?: boolean;
}) {
  const thumbnailUpload = useFileUpload({
    bucket: 'thumbnails',
    config: { autoOptimize: true }
  });

  const videoUpload = useFileUpload({
    bucket: 'videos',
    config: {
      maxFiles: 5,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      generateThumbnails: options?.generateThumbnails
    },
    onSuccess: async (results) => {
      if (options?.generateThumbnails) {
        // Generate thumbnails for uploaded videos
        const resultsWithThumbnails = await Promise.all(
          results.map(async (result) => {
            try {
              const thumbnailBlob = await videoUpload.generateVideoThumbnail(result.file);
              const thumbnailFile = new File([thumbnailBlob], `${result.file.name}-thumb.jpg`, {
                type: 'image/jpeg'
              });
              
              // Upload thumbnail
              await thumbnailUpload.uploadFiles([thumbnailFile]);
              
              return {
                url: result.url,
                thumbnailUrl: thumbnailUpload.progress[0]?.file ? 
                  await storageService.getPublicUrl('thumbnails', thumbnailUpload.progress[0].file.name) : 
                  undefined
              };
            } catch {
              return { url: result.url };
            }
          })
        );
        
        options?.onSuccess?.(resultsWithThumbnails);
      } else {
        options?.onSuccess?.(results.map(r => ({ url: r.url })));
      }
    },
    onError: options?.onError
  });

  return {
    ...videoUpload,
    thumbnailUpload
  };
}