'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Play, 
  Pause, 
  Settings, 
  FileVideo, 
  Zap, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Download,
  Send,
  Users,
  Loader2,
  X,
  Plus,
  Calendar,
  Hash,
  MessageSquare,
  Sparkles,
  Target,
  Filter
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';

interface VideoFile {
  id: string;
  name: string;
  size: number;
  duration?: number;
  thumbnail?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  generatedContent?: {
    description: string;
    hashtags: string[];
    title: string;
    platforms: string[];
  };
  brandVoice?: string;
  clientId?: string;
  error?: string;
}

interface BrandVoiceProfile {
  id: string;
  name: string;
  tone: string;
  style: string;
  keywords: string[];
  restrictions: string[];
  examples: string[];
  clientIds: string[];
}

interface ProcessingBatch {
  id: string;
  name: string;
  videos: VideoFile[];
  brandVoiceId: string;
  status: 'preparing' | 'processing' | 'completed' | 'paused';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

export function ContentAutomationModule() {
  const { clients, selectedClients } = useTeamMode();
  const [activeTab, setActiveTab] = useState('upload');
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [brandVoices, setBrandVoices] = useState<BrandVoiceProfile[]>([
    {
      id: 'default',
      name: 'Default Brand Voice',
      tone: 'Professional and engaging',
      style: 'Clear, concise, action-oriented',
      keywords: ['innovative', 'quality', 'results'],
      restrictions: ['avoid jargon', 'keep under 150 characters'],
      examples: ['Transform your business with our innovative solutions'],
      clientIds: []
    }
  ]);
  const [currentBatch, setCurrentBatch] = useState<ProcessingBatch | null>(null);
  const [selectedBrandVoice, setSelectedBrandVoice] = useState('default');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBrandVoiceEditor, setShowBrandVoiceEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock processing simulation
  const startProcessing = async () => {
    if (videos.length === 0) return;

    const batch: ProcessingBatch = {
      id: `batch_${Date.now()}`,
      name: `Batch ${new Date().toLocaleString()}`,
      videos: videos.map(v => ({ ...v, status: 'pending' })),
      brandVoiceId: selectedBrandVoice,
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
      estimatedTimeRemaining: videos.length * 2 // 2 seconds per video simulation
    };

    setCurrentBatch(batch);
    setIsProcessing(true);
    setActiveTab('processing');

    // Simulate processing each video
    for (let i = 0; i < videos.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per video
      
      const updatedVideos = [...batch.videos];
      updatedVideos[i] = {
        ...updatedVideos[i],
        status: 'completed',
        generatedContent: {
          description: `Engaging content for ${updatedVideos[i].name} - professionally crafted to drive results and engagement across all platforms.`,
          hashtags: ['#content', '#marketing', '#engagement', '#professional', '#results'],
          title: `${updatedVideos[i].name.replace(/\.[^/.]+$/, '')} - Professional Content`,
          platforms: ['instagram', 'tiktok', 'twitter', 'linkedin']
        }
      };

      const updatedBatch = {
        ...batch,
        videos: updatedVideos,
        progress: ((i + 1) / videos.length) * 100,
        estimatedTimeRemaining: (videos.length - i - 1) * 2
      };

      setCurrentBatch(updatedBatch);
      setVideos(updatedVideos);
    }

    setCurrentBatch(prev => prev ? { ...prev, status: 'completed', completedAt: new Date() } : null);
    setIsProcessing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newVideos: VideoFile[] = files.map(file => ({
      id: `video_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      status: 'pending',
      brandVoice: selectedBrandVoice
    }));

    setVideos(prev => [...prev, ...newVideos]);
  };

  const removeVideo = (videoId: string) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-info animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-mint" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-coral" />;
    }
  };

  const getStatusColor = (status: VideoFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning border-warning';
      case 'processing': return 'bg-info/20 text-info border-info';
      case 'completed': return 'bg-mint/20 text-mint border-mint';
      case 'error': return 'bg-coral/20 text-coral border-coral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-creative">Content Automation</h2>
          <p className="text-muted-foreground">
            Process thousands of videos with automated content generation
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="flex items-center space-x-1">
            <FileVideo className="h-3 w-3" />
            <span>{videos.length} videos</span>
          </Badge>
          
          {selectedClients.length > 0 && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{selectedClients.length} clients selected</span>
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </TabsTrigger>
          <TabsTrigger value="brand-voice" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Brand Voice</span>
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Processing</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Bulk Video Upload</span>
              </CardTitle>
              <CardDescription>
                Upload thousands of videos for automated content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Upload Video Files</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop videos here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              {/* Video List */}
              {videos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Uploaded Videos ({videos.length})</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVideos([])}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {videos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(video.status)}
                          <div>
                            <p className="font-medium">{video.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(video.size)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(video.status)}>
                            {video.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideo(video.id)}
                            disabled={isProcessing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  <Label>Brand Voice:</Label>
                  <Select value={selectedBrandVoice} onValueChange={setSelectedBrandVoice}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {brandVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={startProcessing}
                  disabled={videos.length === 0 || isProcessing}
                  className="bg-mint text-background hover:bg-mint/90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Processing ({videos.length} videos)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand-voice" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Brand Voice Management</span>
              </CardTitle>
              <CardDescription>
                Configure brand voice profiles for automated content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {brandVoices.map((voice) => (
                <div key={voice.id} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{voice.name}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {voice.clientIds.length || 'All'} clients
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">TONE</Label>
                      <p>{voice.tone}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">STYLE</Label>
                      <p>{voice.style}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">KEYWORDS</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {voice.keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">RESTRICTIONS</Label>
                      <ul className="text-xs text-muted-foreground mt-1">
                        {voice.restrictions.map((restriction, index) => (
                          <li key={index}>• {restriction}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Brand Voice
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          {currentBatch ? (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Processing Batch</span>
                </CardTitle>
                <CardDescription>
                  {currentBatch.name} - {currentBatch.videos.length} videos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Overview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(currentBatch.progress)}%
                    </span>
                  </div>
                  <Progress value={currentBatch.progress} className="h-2" />
                  
                  {currentBatch.estimatedTimeRemaining && currentBatch.estimatedTimeRemaining > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Estimated time remaining: {Math.ceil(currentBatch.estimatedTimeRemaining / 60)} minutes
                    </p>
                  )}
                </div>

                {/* Processing Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-mint">
                      {currentBatch.videos.filter(v => v.status === 'completed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-info">
                      {currentBatch.videos.filter(v => v.status === 'processing').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {currentBatch.videos.filter(v => v.status === 'pending').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    disabled={currentBatch.status === 'completed'}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('results')}
                    disabled={currentBatch.status !== 'completed'}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No processing batch active</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload videos and start processing to see progress here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Generated Content</span>
              </CardTitle>
              <CardDescription>
                Review and edit automatically generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videos.filter(v => v.status === 'completed').length > 0 ? (
                <div className="space-y-4">
                  {videos.filter(v => v.status === 'completed').map((video) => (
                    <div key={video.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{video.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Send className="h-3 w-3 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                      
                      {video.generatedContent && (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">TITLE</Label>
                            <p className="text-sm">{video.generatedContent.title}</p>
                          </div>
                          
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">DESCRIPTION</Label>
                            <p className="text-sm">{video.generatedContent.description}</p>
                          </div>
                          
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">HASHTAGS</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {video.generatedContent.hashtags.map((hashtag) => (
                                <Badge key={hashtag} variant="secondary" className="text-xs">
                                  <Hash className="h-2 w-2 mr-1" />
                                  {hashtag.replace('#', '')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">PLATFORMS</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {video.generatedContent.platforms.map((platform) => (
                                <Badge key={platform} variant="outline" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {videos.filter(v => v.status === 'completed').length} videos processed
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export All
                      </Button>
                      <Button>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule All
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed content yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Process videos to see generated content here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}