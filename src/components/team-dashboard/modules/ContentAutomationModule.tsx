import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  Play,
  Pause,
  Settings,
  Upload,
  FileVideo,
  Tag,
  MessageSquare,
  Zap,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { LoadingSpinner, CardSkeleton } from '@/components/ui/loading-states';
import { FirstTimeEmpty, NoDataEmpty } from '@/components/ui/empty-states';
import { ApiError, UploadError } from '@/components/ui/error-states';

// Types
export interface BrandVoice {
  id: string;
  name: string;
  tone: 'professional' | 'casual' | 'friendly' | 'energetic' | 'authoritative';
  description: string;
  keywords: string[];
}

export interface VideoFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  platforms: string[];
}

export interface AutomationJob {
  id: string;
  name: string;
  videoCount: number;
  progress: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  estimatedCompletion: string;
  settings: {
    generateDescriptions: boolean;
    generateHashtags: boolean;
    optimizeForPlatform: boolean;
    brandVoice: string;
  };
}

// Mock data
const mockBrandVoices: BrandVoice[] = [
  {
    id: '1',
    name: 'Professional Tech',
    tone: 'professional',
    description: 'Clear, informative, and trustworthy tone for technology content',
    keywords: ['innovative', 'efficient', 'reliable', 'cutting-edge']
  },
  {
    id: '2',
    name: 'Casual Lifestyle',
    tone: 'casual',
    description: 'Relaxed and approachable for lifestyle and entertainment content',
    keywords: ['fun', 'easy', 'amazing', 'love', 'perfect']
  },
  {
    id: '3',
    name: 'Energetic Fitness',
    tone: 'energetic',
    description: 'High-energy and motivational for fitness and wellness content',
    keywords: ['powerful', 'strong', 'transform', 'achieve', 'crush']
  }
];

const mockActiveJobs: AutomationJob[] = [
  {
    id: '1',
    name: 'TikTok Batch #1',
    videoCount: 25,
    progress: 68,
    status: 'running',
    estimatedCompletion: '2 hours',
    settings: {
      generateDescriptions: true,
      generateHashtags: true,
      optimizeForPlatform: true,
      brandVoice: 'casual'
    }
  },
  {
    id: '2',
    name: 'Instagram Reels Batch',
    videoCount: 15,
    progress: 100,
    status: 'completed',
    estimatedCompletion: 'Completed',
    settings: {
      generateDescriptions: true,
      generateHashtags: true,
      optimizeForPlatform: true,
      brandVoice: 'professional'
    }
  },
  {
    id: '3',
    name: 'YouTube Shorts Batch',
    videoCount: 10,
    progress: 0,
    status: 'paused',
    estimatedCompletion: 'Paused',
    settings: {
      generateDescriptions: true,
      generateHashtags: false,
      optimizeForPlatform: true,
      brandVoice: 'energetic'
    }
  }
];

export const ContentAutomationModule: React.FC = () => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok']);
  const [selectedBrandVoice, setSelectedBrandVoice] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<VideoFile[]>([]);
  const [automationSettings, setAutomationSettings] = useState({
    generateDescriptions: true,
    generateHashtags: true,
    optimizeForPlatform: true,
    autoPost: false
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Simulate initial loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
      // Check if user has used this feature before
      const hasUsedAutomation = localStorage.getItem('hasUsedContentAutomation');
      if (!hasUsedAutomation) {
        setIsFirstTime(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: VideoFile[] = files.map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      name: file.name,
      size: file.size,
      duration: 30, // Mock duration
      status: 'pending',
      platforms: selectedPlatforms
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Files uploaded",
      description: `${files.length} video(s) ready for automation`,
    });
  }, [selectedPlatforms]);

  const handleStartAutomation = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload videos before starting automation",
        variant: "destructive"
      });
      return;
    }

    // Mark as used
    localStorage.setItem('hasUsedContentAutomation', 'true');
    setIsFirstTime(false);

    toast({
      title: "Starting automation",
      description: `Processing ${uploadedFiles.length} videos with your settings`,
    });
  };

  const handleGetStarted = () => {
    setIsFirstTime(false);
    localStorage.setItem('hasUsedContentAutomation', 'true');
  };

  const handleJobAction = (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
    toast({
      title: `Job ${action}d`,
      description: `Automation job has been ${action}d`,
    });
  };

  // Show loading state
  if (isInitialLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Content Automation
              </CardTitle>
              <CardDescription>
                Bulk video processing with brand voice specification and AI-powered optimization
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              AI-Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CardSkeleton count={3} showAvatar={false} />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Content Automation
              </CardTitle>
              <CardDescription>
                Bulk video processing with brand voice specification and AI-powered optimization
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              AI-Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ApiError
            title="Failed to Load Content Automation"
            description={errorMessage || "Unable to load the content automation module. Please try again."}
            onRetry={() => {
              setHasError(false);
              setIsInitialLoading(true);
              setTimeout(() => setIsInitialLoading(false), 1000);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // Show first-time empty state
  if (isFirstTime) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Content Automation
              </CardTitle>
              <CardDescription>
                Bulk video processing with brand voice specification and AI-powered optimization
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              AI-Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <FirstTimeEmpty
            title="Welcome to Content Automation!"
            description="Streamline your video processing with AI-powered bulk optimization across multiple platforms."
            onGetStarted={handleGetStarted}
            steps={[
              {
                icon: <Upload className="h-5 w-5 text-primary" />,
                title: "Upload Videos",
                description: "Bulk upload your video content"
              },
              {
                icon: <Settings className="h-5 w-5 text-primary" />,
                title: "Configure Settings",
                description: "Set your brand voice and automation preferences"
              },
              {
                icon: <Zap className="h-5 w-5 text-primary" />,
                title: "Automate Processing",
                description: "Let AI handle descriptions, hashtags, and optimization"
              }
            ]}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Content Automation
            </CardTitle>
            <CardDescription>
              Bulk video processing with brand voice specification and AI-powered optimization
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            AI-Powered
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-700">1,247</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Processing</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">35</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Queued</span>
            </div>
            <div className="text-2xl font-bold text-yellow-700">128</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-700">3</div>
          </div>
        </div>

        <Tabs defaultValue="bulk" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bulk">Bulk Automation</TabsTrigger>
            <TabsTrigger value="brand-voice">Brand Voice</TabsTrigger>
            <TabsTrigger value="active-jobs">Active Jobs</TabsTrigger>
          </TabsList>

          {/* Bulk Automation Tab */}
          <TabsContent value="bulk" className="space-y-6">
            {/* Platform Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Select Platforms</h3>
              <div className="flex gap-2">
                {['tiktok', 'instagram', 'youtube', 'twitter'].map((platform) => (
                  <Button
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                    onClick={() => handlePlatformToggle(platform)}
                    className="capitalize"
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Upload Videos</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Drop videos here or click to upload
                      </span>
                      <Input
                        id="video-upload"
                        name="video-upload"
                        type="file"
                        multiple
                        accept="video/*"
                        className="hidden"
                        aria-label="Select Videos"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                  {uploadedFiles.slice(0, 3).map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileVideo className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                    </div>
                  ))}
                  {uploadedFiles.length > 3 && (
                    <p className="text-sm text-gray-500">+{uploadedFiles.length - 3} more files</p>
                  )}
                </div>
              )}
            </div>

            {/* Automation Settings */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Automation Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Generate Descriptions</p>
                    <p className="text-sm text-gray-500">AI-powered video descriptions</p>
                  </div>
                  <Switch
                    checked={automationSettings.generateDescriptions}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({...prev, generateDescriptions: checked}))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Generate Hashtags</p>
                    <p className="text-sm text-gray-500">Trending hashtag suggestions</p>
                  </div>
                  <Switch
                    checked={automationSettings.generateHashtags}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({...prev, generateHashtags: checked}))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Platform Optimization</p>
                    <p className="text-sm text-gray-500">Optimize for each platform</p>
                  </div>
                  <Switch
                    checked={automationSettings.optimizeForPlatform}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({...prev, optimizeForPlatform: checked}))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-Post</p>
                    <p className="text-sm text-gray-500">Automatically post when ready</p>
                  </div>
                  <Switch
                    checked={automationSettings.autoPost}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({...prev, autoPost: checked}))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Brand Voice Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Brand Voice</h3>
              <Select value={selectedBrandVoice} onValueChange={setSelectedBrandVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand voice" />
                </SelectTrigger>
                <SelectContent>
                  {mockBrandVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {voice.tone}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Automation */}
            <Button 
              onClick={handleStartAutomation}
              disabled={uploadedFiles.length === 0}
              size="lg"
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Automation ({uploadedFiles.length} videos)
            </Button>
          </TabsContent>

          {/* Brand Voice Tab */}
          <TabsContent value="brand-voice" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Brand Voice Library</h3>
              {mockBrandVoices.map((voice) => (
                <Card key={voice.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{voice.name}</h4>
                        <Badge variant="secondary">{voice.tone}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{voice.description}</p>
                      <div className="flex gap-1">
                        {voice.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Active Jobs Tab */}
          <TabsContent value="active-jobs" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Automation Jobs</h3>
              {mockActiveJobs.length === 0 ? (
                <NoDataEmpty
                  title="No active automation jobs"
                  description="Your automation jobs will appear here once you start processing videos."
                  type="reports"
                  onRefresh={() => window.location.reload()}
                />
              ) : (
                mockActiveJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{job.name}</h4>
                        <p className="text-sm text-gray-600">
                          {job.videoCount} videos • Est. completion: {job.estimatedCompletion}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            job.status === 'running' ? 'default' :
                            job.status === 'completed' ? 'secondary' :
                            job.status === 'paused' ? 'outline' : 'destructive'
                          }
                        >
                          {job.status}
                        </Badge>
                        {job.status === 'running' && (
                          <Button size="sm" variant="ghost" onClick={() => handleJobAction(job.id, 'pause')}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'paused' && (
                          <Button size="sm" variant="ghost" onClick={() => handleJobAction(job.id, 'resume')}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {job.status !== 'completed' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}
                    
                    <div className="flex gap-2 text-xs">
                      {job.settings.generateDescriptions && (
                        <Badge variant="outline">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Descriptions
                        </Badge>
                      )}
                      {job.settings.generateHashtags && (
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          Hashtags
                        </Badge>
                      )}
                      {job.settings.optimizeForPlatform && (
                        <Badge variant="outline">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Optimized
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
