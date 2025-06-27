'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  FileImage, 
  FileVideo, 
  FileText, 
  File as FileIcon,
  Search,
  Filter,
  Download,
  Trash2,
  MoreVertical,
  Eye,
  RefreshCw,
  HardDrive,
  AlertCircle,
  Calendar,
  FileSize
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BucketName, FileMetadata } from '@/lib/storage/supabase-storage';
import { cn } from '@/lib/utils';

interface FileManagerProps {
  className?: string;
  bucket?: BucketName;
  allowDelete?: boolean;
  allowDownload?: boolean;
  onFileSelect?: (file: FileMetadata) => void;
}

export function FileManager({
  className,
  bucket,
  allowDelete = true,
  allowDownload = true,
  onFileSelect
}: FileManagerProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<BucketName | 'all'>(bucket || 'all');
  const [stats, setStats] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileMetadata | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadFiles();
    loadStats();
  }, [selectedBucket]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('file_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedBucket !== 'all') {
        query = query.eq('bucket_id', selectedBucket);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setFiles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/storage?action=stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    try {
      const response = await fetch(`/api/storage/${file.bucket_id}/${file.file_path}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setFiles(files.filter(f => f.id !== file.id));
      setDeleteConfirm(null);
      await loadStats(); // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const response = await fetch(`/api/storage/${file.bucket_id}/${file.file_path}?download=true`);
      const result = await response.json();
      
      if (result.success) {
        window.open(result.url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleCleanup = async () => {
    try {
      const response = await fetch('/api/storage?action=cleanup');
      const result = await response.json();
      
      if (result.success) {
        await loadFiles();
        await loadStats();
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed');
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text/')) return FileText;
    return FileIcon;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const buckets: Array<{ value: BucketName | 'all'; label: string }> = [
    { value: 'all', label: 'All Files' },
    { value: 'avatars', label: 'Avatars' },
    { value: 'videos', label: 'Videos' },
    { value: 'thumbnails', label: 'Thumbnails' },
    { value: 'documents', label: 'Documents' },
    { value: 'temp', label: 'Temporary' }
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <HardDrive className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                  <p className="text-2xl font-bold">{stats.totalFiles}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileSize className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {files.filter(f => new Date(f.created_at).getMonth() === new Date().getMonth()).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              File Manager
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanup}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Cleanup
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFiles}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={selectedBucket} onValueChange={(value) => setSelectedBucket(value as any)}>
              <TabsList>
                {buckets.map(bucket => (
                  <TabsTrigger key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Files Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.mime_type);
                
                return (
                  <Card key={file.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onFileSelect && (
                              <DropdownMenuItem onClick={() => onFileSelect(file)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Select
                              </DropdownMenuItem>
                            )}
                            {allowDownload && (
                              <DropdownMenuItem onClick={() => handleDownload(file)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                            )}
                            {allowDelete && (
                              <DropdownMenuItem 
                                onClick={() => setDeleteConfirm(file)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm truncate" title={file.original_name}>
                          {file.original_name}
                        </h4>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {file.bucket_id}
                          </Badge>
                          {file.optimized && (
                            <Badge variant="outline" className="text-xs">
                              Optimized
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{formatBytes(file.file_size)}</div>
                          <div>{formatDate(file.created_at)}</div>
                          {file.expires_at && (
                            <div className="text-amber-600">
                              Expires: {formatDate(file.expires_at)}
                            </div>
                          )}
                        </div>
                        
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {file.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{file.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.original_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}