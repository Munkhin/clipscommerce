'use client';

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
  MessageSquare, 
  Mail, 
  TrendingUp, 
  Clock, 
  Users, 
  Star,
  Send,
  Eye,
  BarChart3,
  Filter,
  Download,
  Settings,
  Zap,
  Target,
  Brain
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';

interface FeedbackReport {
  id: string;
  clientId: string;
  clientName: string;
  videoTitle: string;
  videoTone: 'professional' | 'casual' | 'energetic' | 'educational' | 'promotional';
  generatedAt: Date;
  status: 'generating' | 'ready' | 'sent' | 'viewed';
  feedbackScore: number;
  keyInsights: string[];
  recommendations: string[];
  emailSent: boolean;
  viewedAt?: Date;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  tone: string;
  content: string;
  variables: string[];
}

export function FeedbackModule() {
  const { clients, selectedClients } = useTeamMode();
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [filterTone, setFilterTone] = useState<string>('all');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [emailQueue, setEmailQueue] = useState<number>(0);

  // Initialize with sample data
  useEffect(() => {
    const sampleReports: FeedbackReport[] = [
      {
        id: '1',
        clientId: 'client-1',
        clientName: 'TechCorp Solutions',
        videoTitle: 'Product Demo - Q4 Launch',
        videoTone: 'professional',
        generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'sent',
        feedbackScore: 8.7,
        keyInsights: [
          'Strong opening hook captures attention',
          'Technical explanations are clear and concise',
          'Call-to-action could be more prominent'
        ],
        recommendations: [
          'Consider adding customer testimonials',
          'Enhance visual transitions between sections',
          'Include pricing information earlier'
        ],
        emailSent: true,
        viewedAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: '2',
        clientId: 'client-2',
        clientName: 'Creative Studios',
        videoTitle: 'Brand Story Animation',
        videoTone: 'energetic',
        generatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'ready',
        feedbackScore: 9.2,
        keyInsights: [
          'Excellent use of color and motion',
          'Brand personality shines through',
          'Music perfectly complements visuals'
        ],
        recommendations: [
          'Consider shorter duration for social media',
          'Add subtitles for accessibility',
          'Create vertical version for mobile'
        ],
        emailSent: false
      }
    ];

    const sampleTemplates: EmailTemplate[] = [
      {
        id: '1',
        name: 'Professional Feedback',
        subject: 'Video Performance Analysis - {{videoTitle}}',
        tone: 'professional',
        content: 'Dear {{clientName}},\n\nWe have completed the analysis of your video "{{videoTitle}}". Based on our comprehensive review, your video scored {{feedbackScore}}/10.\n\nKey strengths identified:\n{{keyInsights}}\n\nRecommendations for optimization:\n{{recommendations}}\n\nBest regards,\nYour Video Team',
        variables: ['clientName', 'videoTitle', 'feedbackScore', 'keyInsights', 'recommendations']
      },
      {
        id: '2',
        name: 'Casual Feedback',
        subject: 'Great work on {{videoTitle}}! 🎬',
        tone: 'casual',
        content: 'Hey {{clientName}}! 👋\n\nJust finished reviewing "{{videoTitle}}" and wow - you scored {{feedbackScore}}/10! 🌟\n\nWhat we loved:\n{{keyInsights}}\n\nSome ideas to make it even better:\n{{recommendations}}\n\nKeep up the amazing work!\nCheers! 🎉',
        variables: ['clientName', 'videoTitle', 'feedbackScore', 'keyInsights', 'recommendations']
      }
    ];

    setReports(sampleReports);
    setEmailTemplates(sampleTemplates);
  }, []);

  const generateBulkReports = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate bulk report generation
    const totalClients = 50;
    for (let i = 0; i < totalClients; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setGenerationProgress((i + 1) / totalClients * 100);
    }

    setIsGenerating(false);
    setEmailQueue(totalClients);
  };

  const sendBulkEmails = async () => {
    const totalEmails = emailQueue;
    for (let i = 0; i < totalEmails; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setEmailQueue(totalEmails - i - 1);
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

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'professional': return <Target className="h-4 w-4" />;
      case 'casual': return <MessageSquare className="h-4 w-4" />;
      case 'energetic': return <Zap className="h-4 w-4" />;
      case 'educational': return <Brain className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredReports = reports.filter(report => 
    filterTone === 'all' || report.videoTone === filterTone
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Automation</h2>
          <p className="text-muted-foreground">
            Automated feedback generation and email delivery for thousands of clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {reports.length} Reports
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {emailQueue} Queued
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Feedback Reports</TabsTrigger>
          <TabsTrigger value="automation">Email Automation</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={filterTone} onValueChange={setFilterTone}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tones</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={generateBulkReports}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Bulk Reports'}
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
                    <span className="text-sm font-medium">Generating feedback reports...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filteredReports.map((report) => (
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
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getToneIcon(report.videoTone)}
                          {report.videoTone}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.videoTitle}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{report.feedbackScore}/10</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{report.generatedAt.toLocaleTimeString()}</span>
                        </div>
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
                  
                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                      <ul className="text-sm space-y-1">
                        {report.keyInsights.map((insight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                      <ul className="text-sm space-y-1">
                        {report.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
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
                  <Mail className="h-5 w-5" />
                  Email Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{emailQueue}</div>
                  <p className="text-sm text-muted-foreground">Emails pending</p>
                </div>
                <Button 
                  onClick={sendBulkEmails}
                  disabled={emailQueue === 0}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send All Emails
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Automation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-send delay</label>
                  <Select defaultValue="1hour">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="24hour">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch size</label>
                  <Input type="number" defaultValue="50" />
                </div>
                <Button variant="outline" className="w-full">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Templates</h3>
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          <div className="grid gap-4">
            {emailTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="outline">{template.tone}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input value={template.subject} readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content Preview</label>
                    <Textarea 
                      value={template.content.substring(0, 200) + '...'} 
                      readOnly 
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Variables: {template.variables.join(', ')}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Test</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">1,247</div>
                  <p className="text-sm text-muted-foreground">Reports Generated</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">98.5%</div>
                  <p className="text-sm text-muted-foreground">Email Delivery Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">76%</div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">8.3</div>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mr-2" />
                Analytics chart would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 