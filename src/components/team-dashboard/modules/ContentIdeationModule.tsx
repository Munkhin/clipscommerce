import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Lightbulb, 
  TrendingUp, 
  Calendar, 
  Target, 
  Zap,
  Mail,
  FileText,
  BarChart3,
  Clock,
  Users,
  Star,
  Send,
  Eye,
  Download,
  Filter,
  Settings,
  Brain,
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  category: 'trending' | 'evergreen' | 'seasonal' | 'viral' | 'educational';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedViews: number;
  trendScore: number;
  keywords: string[];
  platforms: string[];
  createdAt: Date;
  status: 'generated' | 'approved' | 'in-production' | 'published';
  clientId?: string;
  clientName?: string;
}

interface IdeationReport {
  id: string;
  clientId: string;
  clientName: string;
  reportType: 'weekly' | 'monthly' | 'trending' | 'custom';
  generatedAt: Date;
  status: 'generating' | 'ready' | 'sent' | 'viewed';
  ideasCount: number;
  topCategories: string[];
  avgTrendScore: number;
  emailSent: boolean;
  viewedAt?: Date;
}

interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  trendScore: number;
  searchVolume: number;
  difficulty: number;
  relatedKeywords: string[];
  platforms: string[];
  peakTime: string;
}

const ContentIdeationModule: React.FC = () => {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [reports, setReports] = useState<IdeationReport[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [emailQueue, setEmailQueue] = useState<number>(0);
  const [autoGeneration, setAutoGeneration] = useState(false);

  // Initialize with sample data
  useEffect(() => {
    const sampleIdeas: ContentIdea[] = [
      {
        id: '1',
        title: 'AI-Powered Video Editing Workflow',
        description: 'Step-by-step guide to streamline video editing using AI tools',
        category: 'trending',
        difficulty: 'medium',
        estimatedViews: 45000,
        trendScore: 8.7,
        keywords: ['AI editing', 'workflow', 'automation', 'video production'],
        platforms: ['YouTube', 'TikTok', 'Instagram'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'approved',
        clientId: 'client-1',
        clientName: 'TechCorp Solutions'
      },
      {
        id: '2',
        title: '10 Viral Video Hooks That Convert',
        description: 'Proven opening techniques that grab attention in the first 3 seconds',
        category: 'viral',
        difficulty: 'easy',
        estimatedViews: 120000,
        trendScore: 9.2,
        keywords: ['viral hooks', 'engagement', 'conversion', 'attention'],
        platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'in-production',
        clientId: 'client-2',
        clientName: 'Creative Studios'
      },
      {
        id: '3',
        title: 'Behind the Scenes: Brand Story Creation',
        description: 'Documentary-style content showing the creative process',
        category: 'evergreen',
        difficulty: 'hard',
        estimatedViews: 25000,
        trendScore: 7.5,
        keywords: ['behind scenes', 'brand story', 'creative process', 'documentary'],
        platforms: ['YouTube', 'LinkedIn'],
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        status: 'generated'
      }
    ];

    const sampleReports: IdeationReport[] = [
      {
        id: '1',
        clientId: 'client-1',
        clientName: 'TechCorp Solutions',
        reportType: 'weekly',
        generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'sent',
        ideasCount: 15,
        topCategories: ['trending', 'educational', 'viral'],
        avgTrendScore: 8.3,
        emailSent: true,
        viewedAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: '2',
        clientId: 'client-2',
        clientName: 'Creative Studios',
        reportType: 'trending',
        generatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'ready',
        ideasCount: 8,
        topCategories: ['viral', 'trending'],
        avgTrendScore: 9.1,
        emailSent: false
      }
    ];

    const sampleTrending: TrendingTopic[] = [
      {
        id: '1',
        topic: 'AI Video Generation',
        category: 'Technology',
        trendScore: 9.5,
        searchVolume: 150000,
        difficulty: 7,
        relatedKeywords: ['AI video', 'automated editing', 'machine learning'],
        platforms: ['YouTube', 'TikTok', 'LinkedIn'],
        peakTime: '2-4 PM EST'
      },
      {
        id: '2',
        topic: 'Sustainable Content Creation',
        category: 'Lifestyle',
        trendScore: 8.2,
        searchVolume: 85000,
        difficulty: 5,
        relatedKeywords: ['eco-friendly', 'sustainable', 'green content'],
        platforms: ['Instagram', 'YouTube', 'Pinterest'],
        peakTime: '6-8 PM EST'
      }
    ];

    setIdeas(sampleIdeas);
    setReports(sampleReports);
    setTrendingTopics(sampleTrending);
  }, []);

  const generateBulkIdeas = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate bulk idea generation
    const totalIdeas = 100;
    for (let i = 0; i < totalIdeas; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setGenerationProgress((i + 1) / totalIdeas * 100);
    }

    setIsGenerating(false);
    // Add generated ideas to the list
    const newIdeas = Array.from({ length: 20 }, (_, i) => ({
      id: `generated-${Date.now()}-${i}`,
      title: `Generated Idea ${i + 1}`,
      description: 'AI-generated content idea based on trending topics',
      category: ['trending', 'viral', 'educational', 'evergreen'][Math.floor(Math.random() * 4)] as any,
      difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as any,
      estimatedViews: Math.floor(Math.random() * 100000) + 10000,
      trendScore: Math.random() * 3 + 7,
      keywords: ['trending', 'viral', 'content'],
      platforms: ['YouTube', 'TikTok', 'Instagram'],
      createdAt: new Date(),
      status: 'generated' as any
    }));
    
    setIdeas(prev => [...newIdeas, ...prev]);
  };

  const generateReports = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const totalReports = 50;
    for (let i = 0; i < totalReports; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setGenerationProgress((i + 1) / totalReports * 100);
    }

    setIsGenerating(false);
    setEmailQueue(totalReports);
  };

  const sendBulkEmails = async () => {
    const totalEmails = emailQueue;
    for (let i = 0; i < totalEmails; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setEmailQueue(totalEmails - i - 1);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trending': return 'bg-red-500';
      case 'viral': return 'bg-purple-500';
      case 'evergreen': return 'bg-green-500';
      case 'seasonal': return 'bg-orange-500';
      case 'educational': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'bg-yellow-500';
      case 'ready': return 'bg-blue-500';
      case 'sent': return 'bg-green-500';
      case 'viewed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const categoryMatch = selectedCategory === 'all' || idea.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || idea.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Ideation</h2>
          <p className="text-muted-foreground">
            AI-powered content idea generation and automated reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {ideas.length} Ideas
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {reports.length} Reports
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {emailQueue} Queued
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="ideas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ideas">Content Ideas</TabsTrigger>
          <TabsTrigger value="trending">Trending Topics</TabsTrigger>
          <TabsTrigger value="reports">Ideation Reports</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="viral">Viral</SelectItem>
                  <SelectItem value="evergreen">Evergreen</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={generateBulkIdeas}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Ideas'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {isGenerating && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating content ideas...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filteredIdeas.map((idea) => (
              <Card key={idea.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{idea.title}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`${getCategoryColor(idea.category)} text-white`}
                        >
                          {idea.category}
                        </Badge>
                        <Badge variant="outline" className={getDifficultyColor(idea.difficulty)}>
                          {idea.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{idea.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{idea.estimatedViews.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{idea.trendScore.toFixed(1)}/10</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{idea.createdAt.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {idea.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Platforms:</span>
                        {idea.platforms.map((platform, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(idea.status)} text-white`}
                      >
                        {idea.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Trending Topics</h3>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Trends
            </Button>
          </div>

          <div className="grid gap-4">
            {trendingTopics.map((topic) => (
              <Card key={topic.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{topic.topic}</h3>
                        <Badge variant="outline">{topic.category}</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{topic.trendScore.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Search Volume:</span>
                          <div className="font-medium">{topic.searchVolume.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Difficulty:</span>
                          <div className="font-medium">{topic.difficulty}/10</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peak Time:</span>
                          <div className="font-medium">{topic.peakTime}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-muted-foreground">Related Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {topic.relatedKeywords.map((keyword, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Best Platforms:</span>
                          <div className="flex gap-1 mt-1">
                            {topic.platforms.map((platform, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Generate Ideas
                      </Button>
                      <Button size="sm">
                        <Target className="h-4 w-4 mr-2" />
                        Track
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ideation Reports</h3>
            <div className="flex items-center gap-2">
              <Button 
                onClick={generateReports}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Reports'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {isGenerating && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating ideation reports...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{report.clientName}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(report.status)} text-white`}
                        >
                          {report.status}
                        </Badge>
                        <Badge variant="outline">{report.reportType}</Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Ideas Generated:</span>
                          <div className="font-medium">{report.ideasCount}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Trend Score:</span>
                          <div className="font-medium">{report.avgTrendScore.toFixed(1)}/10</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Generated:</span>
                          <div className="font-medium">{report.generatedAt.toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Top Categories:</span>
                        <div className="flex gap-1 mt-1">
                          {report.topCategories.map((category, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {report.emailSent && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-green-500" />
                            <span>Email sent</span>
                          </div>
                        )}
                        {report.viewedAt && (
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <span>Viewed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {!report.emailSent && (
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Auto Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable Auto Generation</div>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate ideas based on trending topics
                    </p>
                  </div>
                  <Button 
                    variant={autoGeneration ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoGeneration(!autoGeneration)}
                  >
                    {autoGeneration ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generation Frequency</label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ideas per batch</label>
                  <Input type="number" defaultValue="20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{emailQueue}</div>
                  <p className="text-sm text-muted-foreground">Reports pending</p>
                </div>
                <Button 
                  onClick={sendBulkEmails}
                  disabled={emailQueue === 0}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send All Reports
                </Button>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Schedule</label>
                  <Select defaultValue="weekly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-sm text-muted-foreground">Ideas Generated</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">8.4</div>
                  <p className="text-sm text-muted-foreground">Avg Trend Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-sm text-muted-foreground">Reports Sent</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">92%</div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentIdeationModule; 