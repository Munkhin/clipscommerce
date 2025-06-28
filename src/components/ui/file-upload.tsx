import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  X, 
  FileImage, 
  FileVideo, 
  FileText, 
  File as FileIcon,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { UseFileUploadReturn } from '@/hooks/useFileUpload';

interface FileUploadProps {
  uploadHook: UseFileUploadReturn;
  className?: string;
  dropzoneText?: string;
  buttonText?: string;
  showProgress?: boolean;
  showPreview?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

export function FileUpload({
  uploadHook,
  className,
  dropzoneText = "Drag and drop files here, or click to select",
  buttonText = "Select Files",
  showProgress = true,
  showPreview = true,
  variant = 'default'
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploading,
    progress,
    errors,
    warnings,
    dragProps,
    inputProps,
    clearErrors,
    getFilePreview
  } = uploadHook;

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text/')) return FileText;
    return FileIcon;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      case 'uploading': return Loader2;
      default: return FileIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'uploading': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          ref={fileInputRef}
          {...inputProps}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {buttonText}
        </Button>
        {uploading && progress.length > 0 && (
          <div className="flex-1 max-w-xs">
            <Progress value={progress[0]?.percentage || 0} className="h-2" />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          {...dragProps}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer",
            "hover:border-primary/50 hover:bg-muted/50 transition-colors",
            uploading && "pointer-events-none opacity-50"
          )}
          onClick={handleButtonClick}
        >
          <input
            ref={fileInputRef}
            {...inputProps}
            className="hidden"
          />
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{dropzoneText}</p>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {showProgress && progress.length > 0 && (
          <div className="space-y-2">
            {progress.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{item.file.name}</span>
                <Progress value={item.percentage} className="w-20 h-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <div
        {...dragProps}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
          "hover:border-primary/50 hover:bg-muted/50 transition-colors",
          uploading && "pointer-events-none opacity-50"
        )}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          {...inputProps}
          className="hidden"
        />
        
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Upload Files</h3>
        <p className="text-muted-foreground mb-4">{dropzoneText}</p>
        
        <Button variant="outline" disabled={uploading}>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {buttonText}
        </Button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={clearErrors}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {showProgress && progress.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Upload Progress</h4>
            <div className="space-y-3">
              {progress.map((item, index) => {
                const FileIcon = getFileIcon(item.file.type);
                const StatusIcon = getStatusIcon(item.status);
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(item.file.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'error' ? 'destructive' :
                          'secondary'
                        }>
                          <StatusIcon className={cn(
                            "h-3 w-3 mr-1",
                            getStatusColor(item.status),
                            item.status === 'uploading' && "animate-spin"
                          )} />
                          {item.status}
                        </Badge>
                        {item.status === 'error' && item.error && (
                          <span className="text-xs text-red-500">{item.error}</span>
                        )}
                      </div>
                    </div>
                    
                    {item.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={item.percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatBytes(item.loaded)} / {formatBytes(item.total)}</span>
                          <span>{Math.round(item.percentage)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {showPreview && progress.length > 0 && (
        <FilePreview progress={progress} getFilePreview={getFilePreview} />
      )}
    </div>
  );
}

interface FilePreviewProps {
  progress: any[];
  getFilePreview: (file: File) => Promise<string>;
}

function FilePreview({ progress, getFilePreview }: FilePreviewProps) {
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    progress.forEach(async (item) => {
      if (item.status === 'completed' && 
          (item.file.type.startsWith('image/') || item.file.type.startsWith('video/')) &&
          !previews[item.file.name]) {
        
        try {
          const previewUrl = await getFilePreview(item.file);
          setPreviews(prev => ({
            ...prev,
            [item.file.name]: previewUrl
          }));
        } catch (error) {
          console.error('Failed to generate preview:', error);
        }
      }
    });
  }, [progress, getFilePreview, previews]);

  const completedFiles = progress.filter(item => 
    item.status === 'completed' && 
    (item.file.type.startsWith('image/') || item.file.type.startsWith('video/'))
  );

  if (completedFiles.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="font-medium mb-3">Preview</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {completedFiles.map((item, index) => {
            const previewUrl = previews[item.file.name];
            
            return (
              <div key={index} className="aspect-square border rounded-lg overflow-hidden bg-muted">
                {previewUrl ? (
                  item.file.type.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
