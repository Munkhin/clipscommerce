'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { PlusCircle, Edit3, PlayCircle, Trash2, GripVertical, AlertTriangle, Zap, Upload, Sparkles, TrendingUp } from 'lucide-react';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/providers/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Progress } from '@/components/ui/progress';
import { CircularScore } from '@/components/ui/circular-score';

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
  status: string;
  columnId: string;
  result?: any;
  error?: string;
  loading?: boolean;
  uploadProgress?: number;
}

interface Column {
  id: string;
  title: string;
  icon: any;
  color: string;
}

const initialColumns: Column[] = [
  { id: 'todo', title: 'To Do / Uploaded', icon: Upload, color: 'from-slate-500 to-slate-600' },
  { id: 'processing', title: 'AI Processing', icon: Sparkles, color: 'from-violet-500 to-purple-600' },
  { id: 'review', title: 'Review & Edit', icon: Edit3, color: 'from-blue-500 to-cyan-600' },
  { id: 'ready', title: 'Ready to Post', icon: TrendingUp, color: 'from-emerald-500 to-green-600' },
];

// TODO: Replace with actual fetching of user's videos from a database/API.
// This initial state should be empty or load from a user-specific source.
const initialVideos: Video[] = [
  // { id: 'vid1', title: 'Amazing Product Demo.mp4', status: 'To Do', columnId: 'todo' },
  // { id: 'vid2', title: 'How To Use Our New Feature.mov', status: 'To Do', columnId: 'todo' },
  // { id: 'vid3', title: 'Client Testimonial Short.mp4', status: 'Processing', columnId: 'processing', loading: true },
  // { id: 'vid4', title: 'Weekly Update - Ep 5.avi', status: 'Review', columnId: 'review' },
  // { id: 'vid5', title: 'Grand Launch Announcement.mp4', status: 'Ready', columnId: 'ready' },
];

interface SortableVideoCardProps {
  video: Video;
}

function SortableVideoCard({ video }: SortableVideoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`enhanced-card p-4 cursor-pointer touch-manipulation animate-slideUp ${
        isDragging ? 'scale-105 rotate-2 shadow-2xl' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white truncate flex-grow text-sm" title={video.title}>
          {video.title}
        </h4>
        <button 
          {...attributes} 
          {...listeners} 
          className="p-1 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors hover-glow"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      
      <div className="relative w-full h-28 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mb-3 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <PlayCircle className="w-12 h-12 text-white/70 z-10 group-hover:scale-110 transition-transform" />
        {video.loading && (
          <div className="absolute inset-0 bg-violet-500/20 animate-pulse flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Status:</span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            video.loading ? 'bg-violet-500/20 text-violet-400' :
            video.status === 'Ready' ? 'bg-emerald-500/20 text-emerald-400' :
            video.status === 'Processing' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {video.status}{video.loading && ' (processing...)'}
          </span>
        </div>
        
        {video.uploadProgress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Upload Progress</span>
              <span className="text-violet-400">{video.uploadProgress}%</span>
            </div>
            <Progress value={video.uploadProgress} className="h-1" />
          </div>
        )}
        
        {video.error && (
          <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
            Error: {video.error}
          </div>
        )}
        
        {video.result && (
          <div className="mt-3 text-xs space-y-2">
            <div className="flex items-center gap-3">
              <CircularScore value={Math.round((video.result.sentiment?.score || 0) * 100)} size={40} />
              <div className="space-y-1 flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sentiment:</span>
                  <span className="text-emerald-400">{video.result.sentiment?.sentiment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tone:</span>
                  <span className="text-blue-400">{video.result.tone?.tone}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-700/50">
        <Button variant="ghost" size="sm" className="hover-lift text-gray-400 hover:text-white">
          <Edit3 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="hover-lift text-gray-400 hover:text-red-400">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function AccelerateComponent() {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [columns] = useState<Column[]>(initialColumns);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddVideos = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newVideos: Video[] = Array.from(files).map((file, index) => ({
        id: `new-vid-${Date.now()}-${index}`,
        title: file.name,
        status: 'Processing',
        columnId: 'processing',
        thumbnailUrl: '',
        loading: true,
        uploadProgress: 0,
      }));
      
      setVideos(prevVideos => [...newVideos, ...prevVideos]);
      
      // Simulate upload progress
      newVideos.forEach((video, idx) => {
        let progress = 0;
        const uploadInterval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(uploadInterval);
            // Start processing after upload
            setTimeout(() => {
              processVideo(video.id, files[idx]);
            }, 500);
          }
          setVideos(prev => prev.map(v =>
            v.id === video.id ? { ...v, uploadProgress: Math.round(progress) } : v
          ));
        }, 200);
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processVideo = async (videoId: string, file: File) => {
    try {
      const caption = file.name.replace(/\.[^/.]+$/, '');
      const res = await fetch('/api/ai/optimize/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      const data = await res.json();
      
      setVideos(prev => prev.map(v =>
        v.id === videoId
          ? {
              ...v,
              status: 'Ready',
              columnId: 'ready',
              result: data,
              loading: false,
              uploadProgress: undefined,
              error: data.error ? data.error : undefined,
            }
          : v
      ));
    } catch (err: any) {
      setVideos(prev => prev.map(v =>
        v.id === videoId
          ? {
              ...v,
              status: 'Error',
              columnId: 'todo',
              loading: false,
              uploadProgress: undefined,
              error: err.message || 'Failed to optimize',
            }
          : v
      ));
    }
  };

  const getVideosByColumn = (columnId: string) => videos.filter(v => v.columnId === columnId);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveVideo(videos.find(v => v.id === active.id) || null);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over && columns.some(c => c.id === over.id)) {
      setDragOverColumn(over.id);
    } else {
      setDragOverColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveVideo(null);
    setDragOverColumn(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeVideo = videos.find(v => v.id === active.id);
      
      const overIsColumn = columns.some(c => c.id === over.id);
      const overIsVideo = videos.some(v => v.id === over.id);

      if (activeVideo) {
        let newColumnId = activeVideo.columnId;
        let newVideos = [...videos];

        if (overIsColumn) {
          newColumnId = over.id as string;
        } else if (overIsVideo) {
          const overVideo = videos.find(v => v.id === over.id);
          if (overVideo) {
            newColumnId = overVideo.columnId;
          }
        }
        
        if (newColumnId !== activeVideo.columnId || overIsVideo) {
          const oldColumnId = activeVideo.columnId;
          const targetColumnId = newColumnId;

          newVideos = newVideos.map(v => 
            v.id === active.id ? { ...v, columnId: targetColumnId } : v
          );

          if (overIsVideo && targetColumnId === oldColumnId) {
            const oldIndex = videos.findIndex(v => v.id === active.id && v.columnId === oldColumnId);
            const newIndex = videos.findIndex(v => v.id === over.id && v.columnId === oldColumnId);
            const columnVideos = videos.filter(v => v.columnId === oldColumnId);
            const reorderedColumnVideos = arrayMove(columnVideos, 
              columnVideos.findIndex(v => v.id === active.id), 
              columnVideos.findIndex(v => v.id === over.id)
            );
            
            let updatedVideos: Video[] = [];
            columns.forEach(col => {
              if (col.id === oldColumnId) {
                updatedVideos.push(...reorderedColumnVideos);
              } else {
                updatedVideos.push(...videos.filter(v => v.columnId === col.id));
              }
            });
            newVideos = updatedVideos;
          }
          setVideos(newVideos);
        }
      }
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0a0b0f 0%, #111318 50%, #1a1d25 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Enhanced Header */}
        <div className="text-center space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text">
              Accelerate
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Transform your raw content into viral-ready videos with AI-powered optimization
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleAddVideos}
              className="btn-primary flex items-center gap-3 text-lg px-8 py-4"
            >
              <PlusCircle className="h-6 w-6" />
              Upload Videos
            </button>
            <div className="text-sm text-gray-500">
              Supports MP4, MOV, AVI • Max 100MB per file
            </div>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        {/* Enhanced Drop Zone */}
        <div className="flex justify-center animate-slideUp">
          <div className="w-full max-w-4xl">
            <GlassCard 
              className="p-12 text-center cursor-pointer group border-2 border-dashed border-violet-500/30 hover:border-violet-500/60"
              onClick={handleAddVideos}
            >
              <div className="space-y-6">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="h-12 w-12 text-violet-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Drop videos here</h3>
                  <p className="text-gray-400">Or click to browse your files</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
        
        {/* Enhanced Progress Section */}
        <div className="flex justify-center animate-slideUp">
          <div className="w-full max-w-4xl">
            <GlassCard className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                  <Zap className="h-6 w-6 text-violet-400" />
                  AI Processing Pipeline
                </h2>
                <p className="text-gray-400 mt-2">Real-time optimization progress</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">Audio Enhancement</span>
                    <span className="text-sm text-violet-400">65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                  <p className="text-xs text-gray-500">Noise reduction, clarity boost</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">Content Analysis</span>
                    <span className="text-sm text-blue-400">80%</span>
                  </div>
                  <Progress value={80} className="h-2" />
                  <p className="text-xs text-gray-500">Sentiment, tone, engagement prediction</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">Hashtag Generation</span>
                    <span className="text-sm text-emerald-400">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                  <p className="text-xs text-gray-500">Trending tags, optimal reach</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Enhanced Video Workflow */}
        <div className="space-y-6 animate-slideUp">
          <h2 className="text-3xl font-bold text-center text-white">Video Workflow</h2>
          
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {columns.map((column) => {
                const IconComponent = column.icon;
                const videoCount = getVideosByColumn(column.id).length;
                const isDropTarget = dragOverColumn === column.id;
                
                return (
                  <GlassCard 
                    key={column.id} 
                    className={`transition-all duration-300 ${isDropTarget ? 'ring-2 ring-violet-500 bg-violet-500/10' : ''}`}
                  >
                    <div className="p-6 border-b border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${column.color}`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{column.title}</h3>
                            <p className="text-xs text-gray-400">{videoCount} videos</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                          {videoCount}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4 min-h-[400px]">
                      <SortableContext items={getVideosByColumn(column.id).map(v => v.id)} strategy={verticalListSortingStrategy}>
                        {getVideosByColumn(column.id).map((video) => (
                          <SortableVideoCard key={video.id} video={video} />
                        ))}
                      </SortableContext>
                      
                      {getVideosByColumn(column.id).length === 0 && (
                        <div className="text-center text-gray-500 py-16">
                          <div className="space-y-3">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                              <IconComponent className="h-8 w-8 text-gray-600" />
                            </div>
                            <p className="text-sm">No videos in this stage</p>
                            {isDropTarget && (
                              <p className="text-violet-400 text-xs animate-pulse">Drop video here</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            <DragOverlay>
              {activeVideo ? (
                <div className="enhanced-card p-4 rotate-3 scale-105 shadow-2xl opacity-90">
                  <h4 className="font-semibold text-white text-sm">{activeVideo.title}</h4>
                  <div className="w-full h-20 bg-gray-800 rounded mt-2" />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
