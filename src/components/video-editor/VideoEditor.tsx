'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { 
  Play, 
  Pause, 
  RotateCw,
  Crop,
  Scissors,
  Filter,
  Volume2,
  Zap,
  Download,
  Upload,
  Undo,
  Redo,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  Settings
} from 'lucide-react';

import { VideoEditOperation } from '@/app/api/videos/edit/route';
import { UserVideo } from '@/services/userVideoService';

interface VideoEditorProps {
  video: UserVideo;
  onSave?: (editedVideo: UserVideo, editId?: string) => void;
  onCancel?: () => void;
}

interface EditorState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  playbackSpeed: number;
  selectedTool: string;
  operations: VideoEditOperation[];
  previewUrl?: string;
  isProcessing: boolean;
  hasUnsavedChanges: boolean;
}

export function VideoEditor({ video, onSave, onCancel }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [state, setState] = useState<EditorState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 100,
    playbackSpeed: 1,
    selectedTool: 'trim',
    operations: [],
    isProcessing: false,
    hasUnsavedChanges: false
  });

  const [trimState, setTrimState] = useState({
    startTime: 0,
    endTime: 0,
    isSelecting: false
  });

  const [cropState, setCropState] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isSelecting: false
  });

  const [filterState, setFilterState] = useState({
    type: 'none' as 'none' | 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation',
    intensity: 50
  });

  // Initialize video when component mounts
  useEffect(() => {
    if (videoRef.current && video.videoUrl) {
      videoRef.current.src = video.videoUrl;
      videoRef.current.load();
    }
  }, [video.videoUrl]);

  // Video event handlers
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setState(prev => ({
        ...prev,
        duration: videoRef.current!.duration
      }));
      setTrimState(prev => ({
        ...prev,
        endTime: videoRef.current!.duration
      }));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setState(prev => ({
        ...prev,
        currentTime: videoRef.current!.currentTime
      }));
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setState(prev => ({
        ...prev,
        isPlaying: !prev.isPlaying
      }));
    }
  }, [state.isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setState(prev => ({
        ...prev,
        currentTime: time
      }));
    }
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      setState(prev => ({
        ...prev,
        volume
      }));
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setState(prev => ({
        ...prev,
        playbackSpeed: speed
      }));
    }
  }, []);

  // Tool handlers
  const handleTrimSet = useCallback(() => {
    const operation: VideoEditOperation = {
      type: 'trim',
      parameters: {
        startTime: trimState.startTime,
        endTime: trimState.endTime
      }
    };
    
    setState(prev => ({
      ...prev,
      operations: [...prev.operations, operation],
      hasUnsavedChanges: true
    }));

    toast({
      title: "Trim added",
      description: `Video will be trimmed from ${trimState.startTime.toFixed(1)}s to ${trimState.endTime.toFixed(1)}s`
    });
  }, [trimState]);

  const handleCropSet = useCallback(() => {
    if (cropState.width > 0 && cropState.height > 0) {
      const operation: VideoEditOperation = {
        type: 'crop',
        parameters: {
          x: cropState.x,
          y: cropState.y,
          width: cropState.width,
          height: cropState.height
        }
      };
      
      setState(prev => ({
        ...prev,
        operations: [...prev.operations, operation],
        hasUnsavedChanges: true
      }));

      toast({
        title: "Crop added",
        description: `Video will be cropped to ${cropState.width}x${cropState.height}`
      });
    }
  }, [cropState]);

  const handleRotate = useCallback((degrees: number) => {
    const operation: VideoEditOperation = {
      type: 'rotate',
      parameters: { degrees }
    };
    
    setState(prev => ({
      ...prev,
      operations: [...prev.operations, operation],
      hasUnsavedChanges: true
    }));

    toast({
      title: "Rotation added",
      description: `Video will be rotated by ${degrees} degrees`
    });
  }, []);

  const handleFilterApply = useCallback(() => {
    if (filterState.type !== 'none') {
      const operation: VideoEditOperation = {
        type: 'filter',
        parameters: {
          filterType: filterState.type,
          intensity: filterState.intensity
        }
      };
      
      setState(prev => ({
        ...prev,
        operations: [...prev.operations, operation],
        hasUnsavedChanges: true
      }));

      toast({
        title: "Filter added",
        description: `${filterState.type} filter applied with ${filterState.intensity}% intensity`
      });
    }
  }, [filterState]);

  const handleSpeedChange2 = useCallback((speedMultiplier: number) => {
    const operation: VideoEditOperation = {
      type: 'speed',
      parameters: { speedMultiplier }
    };
    
    setState(prev => ({
      ...prev,
      operations: [...prev.operations, operation],
      hasUnsavedChanges: true
    }));

    toast({
      title: "Speed change added",
      description: `Video speed will be changed by ${speedMultiplier}x`
    });
  }, []);

  const handleVolumeAdjust = useCallback((volumeLevel: number) => {
    const operation: VideoEditOperation = {
      type: 'volume',
      parameters: { volumeLevel }
    };
    
    setState(prev => ({
      ...prev,
      operations: [...prev.operations, operation],
      hasUnsavedChanges: true
    }));

    toast({
      title: "Volume adjustment added",
      description: `Video volume will be set to ${volumeLevel}%`
    });
  }, []);

  const handleClearOperations = useCallback(() => {
    setState(prev => ({
      ...prev,
      operations: [],
      hasUnsavedChanges: false
    }));
    
    toast({
      title: "Operations cleared",
      description: "All pending operations have been removed"
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (state.operations.length === 0) {
      toast({
        title: "No changes to save",
        description: "Add some operations before saving"
      });
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const response = await fetch('/api/videos/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: video.id,
          operations: state.operations
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save video edits');
      }

      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          isProcessing: false
        }));
        
        toast({
          title: "Video processing started",
          description: `Your video is being processed. Estimated time: ${result.estimatedTime}`
        });

        if (onSave) {
          onSave({
            ...video,
            status: 'processing',
            processingStage: 'optimization'
          }, result.editId);
        }
      } else {
        throw new Error(result.error || 'Failed to process video');
      }
    } catch (error) {
      console.error('Error saving video edits:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error saving video",
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  }, [state.operations, video, onSave]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Video Editor</h2>
          <p className="text-muted-foreground">{video.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {state.hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={state.isProcessing || state.operations.length === 0}
          >
            {state.isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes ({state.operations.length})
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Video Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-auto rounded-lg bg-black"
                  onLoadedData={handleVideoLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  controls={false}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ display: state.selectedTool === 'crop' ? 'block' : 'none' }}
                />
              </div>

              {/* Video Controls */}
              <div className="mt-4 space-y-4">
                {/* Playback Controls */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlayPause}
                  >
                    {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </span>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <Slider
                    value={[state.currentTime]}
                    max={state.duration}
                    step={0.1}
                    onValueChange={([value]) => handleSeek(value)}
                    className="w-full"
                  />
                  
                  {/* Trim markers */}
                  {state.selectedTool === 'trim' && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>Start: {formatTime(trimState.startTime)}</span>
                      <span>End: {formatTime(trimState.endTime)}</span>
                    </div>
                  )}
                </div>

                {/* Volume and Speed Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    <Slider
                      value={[state.volume]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => handleVolumeChange(value)}
                      className="w-20"
                    />
                    <span className="text-sm">{state.volume}%</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <Select value={state.playbackSpeed.toString()} onValueChange={(value) => handleSpeedChange(parseFloat(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editing Tools */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Editing Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={state.selectedTool} onValueChange={(value) => setState(prev => ({ ...prev, selectedTool: value }))}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="trim">
                    <Scissors className="w-4 h-4 mr-1" />
                    Trim
                  </TabsTrigger>
                  <TabsTrigger value="crop">
                    <Crop className="w-4 h-4 mr-1" />
                    Crop
                  </TabsTrigger>
                  <TabsTrigger value="effects">
                    <Filter className="w-4 h-4 mr-1" />
                    Effects
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="trim" className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Use the timeline above to select the portion you want to keep. The trim will remove everything outside the selected range.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Start Time (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={trimState.startTime.toFixed(1)}
                          onChange={(e) => setTrimState(prev => ({ ...prev, startTime: Math.max(0, Math.min(parseFloat(e.target.value) || 0, state.duration)) }))}
                          step="0.1"
                          min="0"
                          max={state.duration}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTrimState(prev => ({ ...prev, startTime: state.currentTime }))}
                        >
                          Use Current
                        </Button>
                      </div>
                      <Slider
                        value={[trimState.startTime]}
                        max={state.duration}
                        step={0.1}
                        onValueChange={([value]) => setTrimState(prev => ({ ...prev, startTime: Math.min(value, prev.endTime - 0.1) }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Time (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={trimState.endTime.toFixed(1)}
                          onChange={(e) => setTrimState(prev => ({ ...prev, endTime: Math.max(trimState.startTime + 0.1, Math.min(parseFloat(e.target.value) || 0, state.duration)) }))}
                          step="0.1"
                          min={trimState.startTime + 0.1}
                          max={state.duration}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTrimState(prev => ({ ...prev, endTime: Math.max(state.currentTime, prev.startTime + 0.1) }))}
                        >
                          Use Current
                        </Button>
                      </div>
                      <Slider
                        value={[trimState.endTime]}
                        max={state.duration}
                        step={0.1}
                        onValueChange={([value]) => setTrimState(prev => ({ ...prev, endTime: Math.max(value, prev.startTime + 0.1) }))}
                        className="w-full"
                      />
                    </div>

                    <div className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">{(trimState.endTime - trimState.startTime).toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Start:</span>
                        <span className="font-medium">{formatTime(trimState.startTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>End:</span>
                        <span className="font-medium">{formatTime(trimState.endTime)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTrimState({
                            startTime: 0,
                            endTime: state.duration,
                            isSelecting: false
                          });
                        }}
                        className="flex-1"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={handleTrimSet}
                        className="flex-1"
                        disabled={trimState.endTime <= trimState.startTime}
                      >
                        Add Trim
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="crop" className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Define the crop area by setting position (X, Y) and dimensions (Width, Height). Use preset aspect ratios for common social media formats.
                      </p>
                    </div>

                    {/* Preset Aspect Ratios */}
                    <div className="space-y-2">
                      <Label>Aspect Ratio Presets</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const width = 360;
                            const height = 640; // 9:16 for TikTok/Instagram Stories
                            setCropState(prev => ({ ...prev, width, height, x: 0, y: 0 }));
                          }}
                        >
                          9:16 (Stories)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const width = 480;
                            const height = 480; // 1:1 for Instagram Post
                            setCropState(prev => ({ ...prev, width, height, x: 0, y: 0 }));
                          }}
                        >
                          1:1 (Square)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const width = 640;
                            const height = 360; // 16:9 for YouTube/Landscape
                            setCropState(prev => ({ ...prev, width, height, x: 0, y: 0 }));
                          }}
                        >
                          16:9 (Landscape)
                        </Button>
                      </div>
                    </div>

                    {/* Position Controls */}
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">X (Left)</Label>
                          <Input
                            type="number"
                            value={cropState.x}
                            onChange={(e) => setCropState(prev => ({ ...prev, x: Math.max(0, parseInt(e.target.value) || 0) }))}
                            min="0"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (Top)</Label>
                          <Input
                            type="number"
                            value={cropState.y}
                            onChange={(e) => setCropState(prev => ({ ...prev, y: Math.max(0, parseInt(e.target.value) || 0) }))}
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dimensions Controls */}
                    <div className="space-y-2">
                      <Label>Dimensions</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={cropState.width}
                            onChange={(e) => setCropState(prev => ({ ...prev, width: Math.max(1, parseInt(e.target.value) || 1) }))}
                            min="1"
                            placeholder="Width"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            value={cropState.height}
                            onChange={(e) => setCropState(prev => ({ ...prev, height: Math.max(1, parseInt(e.target.value) || 1) }))}
                            min="1"
                            placeholder="Height"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview Info */}
                    {cropState.width > 0 && cropState.height > 0 && (
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex justify-between">
                          <span>Crop Area:</span>
                          <span className="font-medium">{cropState.width} × {cropState.height}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Aspect Ratio:</span>
                          <span className="font-medium">{(cropState.width / cropState.height).toFixed(2)}:1</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Position:</span>
                          <span className="font-medium">({cropState.x}, {cropState.y})</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropState({
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0,
                            isSelecting: false
                          });
                        }}
                        className="flex-1"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={handleCropSet}
                        className="flex-1"
                        disabled={cropState.width <= 0 || cropState.height <= 0}
                      >
                        Add Crop
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="effects" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate(90)}
                      >
                        <RotateCw className="w-4 h-4 mr-1" />
                        Rotate 90°
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate(-90)}
                      >
                        <RotateCw className="w-4 h-4 mr-1 transform scale-x-[-1]" />
                        Rotate -90°
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Filter</Label>
                      <Select value={filterState.type} onValueChange={(value: any) => setFilterState(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="blur">Blur</SelectItem>
                          <SelectItem value="sharpen">Sharpen</SelectItem>
                          <SelectItem value="brightness">Brightness</SelectItem>
                          <SelectItem value="contrast">Contrast</SelectItem>
                          <SelectItem value="saturation">Saturation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {filterState.type !== 'none' && (
                      <div className="space-y-2">
                        <Label>Intensity: {filterState.intensity}%</Label>
                        <Slider
                          value={[filterState.intensity]}
                          max={100}
                          step={1}
                          onValueChange={([value]) => setFilterState(prev => ({ ...prev, intensity: value }))}
                        />
                      </div>
                    )}
                    
                    <Button onClick={handleFilterApply} className="w-full">
                      Apply Filter
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Operations List */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Operations</CardTitle>
              <CardDescription>
                {state.operations.length} operation(s) queued
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {state.operations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No operations added yet
                  </p>
                ) : (
                  state.operations.map((op, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {op.type === 'trim' && <Scissors className="w-4 h-4" />}
                        {op.type === 'crop' && <Crop className="w-4 h-4" />}
                        {op.type === 'rotate' && <RotateCw className="w-4 h-4" />}
                        {op.type === 'filter' && <Filter className="w-4 h-4" />}
                        {op.type === 'speed' && <Zap className="w-4 h-4" />}
                        {op.type === 'volume' && <Volume2 className="w-4 h-4" />}
                        <span className="text-sm capitalize">{op.type}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              
              {state.operations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOperations}
                  className="w-full mt-2"
                >
                  Clear All
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}