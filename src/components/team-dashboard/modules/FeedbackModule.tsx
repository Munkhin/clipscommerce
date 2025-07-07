'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { 
  Mail, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Send, 
  Eye, 
  Settings, 
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Filter,
  Calendar,
  Zap,
  Brain,
  Target
} from 'lucide-react';

export interface ClientReport {
  id: string;
  clientId: string;
  clientName: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalViews: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topPerformingVideo: string;
    growthRate: number;
    platformBreakdown: {
      platform: string;
      views: number;
      engagement: number;
    }[];
  };
  insights: string[];
  recommendations: string[];
  status: 'generating' | 'ready' | 'sent' | 'failed';
  tone: 'professional' | 'casual' | 'enthusiastic' | 'analytical';
  customizations: {
    includeComparisons: boolean;
    includeRecommendations: boolean;
    includeProjections: boolean;
    brandColors: string[];
  };
  generatedAt: Date;
  sentAt?: Date;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'analytical';
  variables: string[];
  clientTypes: string[];
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: 'weekly' | 'monthly' | 'milestone' | 'performance_threshold';
  conditions: {
    metric: string;
    operator: string;
    value: number;
  }[];
  actions: {
    generateReport: boolean;
    sendEmail: boolean;
    notifyTeam: boolean;
    scheduleFollowup: boolean;
  };
  clientFilter: string[];
  isActive: boolean;
}

export function FeedbackModule() {
  const [reports, setReports] = useState<ClientReport[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bulkEmailMode, setBulkEmailMode] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);

  // Initialize sample data
  useEffect(() => {
    const sampleReports: ClientReport[] = Array.from({ length: 25 }, (_, i) => {
      const clientNames = ['TechCorp Inc.', 'Lifestyle Brand Co.', 'Fitness Pro', 'Travel Adventures', 'Food & Wine Co.'];
      const clientName = clientNames[i % clientNames.length];
      const reportTypes = ['weekly', 'monthly', 'quarterly'] as const;
      const reportType = reportTypes[i % reportTypes.length];
      const tones = ['professional', 'casual', 'enthusiastic', 'analytical'] as const;
      const tone = tones[i % tones.length];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i * 7 + 30));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      return {
        id: `report-${i + 1}`,
        clientId: `client-${(i % 5) + 1}`,
        clientName,
        reportType,
        period: { start: startDate, end: endDate },
        metrics: {
          totalViews: Math.floor(Math.random() * 1000000) + 10000,
          totalEngagement: Math.floor(Math.random() * 50000) + 1000,
          avgEngagementRate: Math.random() * 10 + 2,
          topPerformingVideo: `Video ${Math.floor(Math.random() * 100) + 1}`,
          growthRate: (Math.random() - 0.5) * 50,
          platformBreakdown: [
            { platform: 'TikTok', views: Math.floor(Math.random() * 500000), engagement: Math.floor(Math.random() * 25000) },
            { platform: 'Instagram', views: Math.floor(Math.random() * 300000), engagement: Math.floor(Math.random() * 15000) },
            { platform: 'YouTube', views: Math.floor(Math.random() * 200000), engagement: Math.floor(Math.random() * 10000) }
          ]
        },
        insights: [
          'Peak engagement occurs between 6-8 PM on weekdays',
          'Short-form content outperforms long-form by 35%',
          'User-generated content shows 40% higher engagement'
        ],
        recommendations: [
          'Increase posting frequency during peak hours',
          'Focus on short-form content strategy',
          'Implement user-generated content campaigns'
        ],
        status: ['generating', 'ready', 'sent', 'failed'][Math.floor(Math.random() * 4)] as any,
        tone,
        customizations: {
          includeComparisons: true,
          includeRecommendations: true,
          includeProjections: Math.random() > 0.5,
          brandColors: ['#3B82F6', '#10B981']
        },
        generatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        sentAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : undefined
      };
    });

    const sampleTemplates: EmailTemplate[] = [
      {
        id: 'template-1',
        name: 'Weekly Performance Summary',
        subject: '📊 Weekly Performance Report - {CLIENT_NAME}',
        content: `Hi {CLIENT_NAME},

Hope you're having a great week! Here's your weekly performance summary:

🚀 **This Week's Highlights:**
- Total Views: {TOTAL_VIEWS:,}
- Engagement Rate: {ENGAGEMENT_RATE}%
- Top Performing Video: {TOP_VIDEO}

📈 **Key Insights:**
{INSIGHTS}

💡 **Our Recommendations:**
{RECOMMENDATIONS}

Let's schedule a call this week to discuss these results and plan for next week!

Best regards,
Your Content Team`,
        tone: 'professional',
        variables: ['CLIENT_NAME', 'TOTAL_VIEWS', 'ENGAGEMENT_RATE', 'TOP_VIDEO', 'INSIGHTS', 'RECOMMENDATIONS'],
        clientTypes: ['all']
      },
      {
        id: 'template-2',
        name: 'Casual Monthly Update',
        subject: '🎉 Amazing results this month, {CLIENT_NAME}!',
        content: `Hey {CLIENT_NAME}! 👋

Just had to share these incredible numbers with you:

🔥 Your content is absolutely crushing it:
- {TOTAL_VIEWS:,} views this month (that's insane!)
- {ENGAGEMENT_RATE}% engagement rate
- Your audience LOVED "{TOP_VIDEO}"

The data shows some super interesting patterns:
{INSIGHTS}

Ready to make next month even better? Here's what we're thinking:
{RECOMMENDATIONS}

Can't wait to see what we accomplish together! 🚀

Cheers,
The Team`,
        tone: 'enthusiastic',
        variables: ['CLIENT_NAME', 'TOTAL_VIEWS', 'ENGAGEMENT_RATE', 'TOP_VIDEO', 'INSIGHTS', 'RECOMMENDATIONS'],
        clientTypes: ['lifestyle', 'entertainment']
      }
    ];

    const sampleRules: AutomationRule[] = [
      {
        id: 'rule-1',
        name: 'Weekly Report Generation',
        trigger: 'weekly',
        conditions: [],
        actions: {
          generateReport: true,
          sendEmail: true,
          notifyTeam: false,
          scheduleFollowup: false
        },
        clientFilter: [],
        isActive: true
      },
      {
        id: 'rule-2',
        name: 'High Performance Alert',
        trigger: 'performance_threshold',
        conditions: [
          { metric: 'engagement_rate', operator: '>', value: 8.0 },
          { metric: 'views', operator: '>', value: 100000 }
        ],
        actions: {
          generateReport: true,
          sendEmail: true,
          notifyTeam: true,
          scheduleFollowup: true
        },
        clientFilter: [],
        isActive: true
      }
    ];

    setReports(sampleReports);
    setEmailTemplates(sampleTemplates);
    setAutomationRules(sampleRules);
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const clientMatch = selectedClient === 'all' || report.clientId === selectedClient;
      const typeMatch = selectedReportType === 'all' || report.reportType === selectedReportType;
      const statusMatch = filterStatus === 'all' || report.status === filterStatus;
      return clientMatch && typeMatch && statusMatch;
    });
  }, [reports, selectedClient, selectedReportType, filterStatus]);

  const generateBulkReports = useCallback(async (clientIds: string[], reportType: string) => {
    setIsGeneratingReports(true);
    
    try {
      toast({
        title: "Generating reports",
        description: `Creating ${clientIds.length} ${reportType} reports with AI-powered insights`,
      });

      // Simulate AI report generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newReports: ClientReport[] = clientIds.map((clientId, index) => {
        const clientNames = ['TechCorp Inc.', 'Lifestyle Brand Co.', 'Fitness Pro'];
        const clientName = clientNames[index % clientNames.length];
        
        return {
          id: `report-${Date.now()}-${index}`,
          clientId,
          clientName,
          reportType: reportType as any,
          period: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          metrics: {
            totalViews: Math.floor(Math.random() * 1000000) + 50000,
            totalEngagement: Math.floor(Math.random() * 50000) + 2000,
            avgEngagementRate: Math.random() * 8 + 3,
            topPerformingVideo: `AI-Generated Video ${index + 1}`,
            growthRate: Math.random() * 30 + 5,
            platformBreakdown: [
              { platform: 'TikTok', views: Math.floor(Math.random() * 500000), engagement: Math.floor(Math.random() * 25000) },
              { platform: 'Instagram', views: Math.floor(Math.random() * 300000), engagement: Math.floor(Math.random() * 15000) }
            ]
          },
          insights: [
            'AI-detected optimal posting times: 7-9 PM weekdays',
            'Trending hashtags increased reach by 45%',
            'Video completion rate improved 25% this period'
          ],
          recommendations: [
            'Leverage trending audio for 20% engagement boost',
            'Implement carousel posts for Instagram',
            'Create video series for audience retention'
          ],
          status: 'ready',
          tone: 'professional',
          customizations: {
            includeComparisons: true,
            includeRecommendations: true,
            includeProjections: true,
            brandColors: ['#3B82F6', '#10B981']
          },
          generatedAt: new Date(),
        };
      });

      setReports(prev => [...prev, ...newReports]);
      
      toast({
        title: "Reports generated successfully",
        description: `${newReports.length} reports are ready for review and sending`,
      });
    } catch (error) {
      toast({
        title: "Error generating reports",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReports(false);
    }
  }, []);

  const sendBulkEmails = useCallback(async (reportIds: string[], templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;

    toast({
      title: "Sending bulk emails",
      description: `Sending ${reportIds.length} personalized reports using ${template.name}`,
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 2000));

    setReports(prev => prev.map(report => 
      reportIds.includes(report.id) 
        ? { ...report, status: 'sent' as const, sentAt: new Date() }
        : report
    ));

    toast({
      title: "Emails sent successfully",
      description: `${reportIds.length} reports delivered to clients`,
    });
  }, [emailTemplates]);

  const downloadReport = useCallback((reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    toast({
      title: "Report downloaded",
      description: `${report.reportType} report for ${report.clientName} downloaded`,
    });
  }, [reports]);

  const getStatusIcon = (status: ClientReport['status']) => {
    switch (status) {
      case 'generating': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'sent': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'sent': return 'bg-blue-600';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional': return 'text-blue-600 bg-blue-50';
      case 'casual': return 'text-green-600 bg-green-50';
      case 'enthusiastic': return 'text-orange-600 bg-orange-50';
      case 'analytical': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Feedback & Reports</h2>
          <p className="text-muted-foreground">
            Automated client reporting with intelligent tone adaptation and bulk email delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Brain className="w-4 h-4 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {filteredReports.length} Reports
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {reports.filter(r => r.status === 'ready').length}
            </div>
            <p className="text-sm text-muted-foreground">Ready to Send</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'sent').length}
            </div>
            <p className="text-sm text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {reports.filter(r => r.status === 'generating').length}
            </div>
            <p className="text-sm text-muted-foreground">Generating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {emailTemplates.length}
            </div>
            <p className="text-sm text-muted-foreground">Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-600">
              {automationRules.filter(r => r.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Active Rules</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reports">Client Reports</TabsTrigger>
          <TabsTrigger value="bulk-email">Bulk Email</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Client Reports
              </CardTitle>
              <CardDescription>
                AI-generated performance reports with adaptive tone and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Label>Client:</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="client-1">TechCorp Inc.</SelectItem>
                      <SelectItem value="client-2">Lifestyle Brand Co.</SelectItem>
                      <SelectItem value="client-3">Fitness Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Type:</Label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="generating">Generating</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => generateBulkReports(['client-1', 'client-2', 'client-3'], 'weekly')}
                  disabled={isGeneratingReports}
                >
                  {isGeneratingReports ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Generate Reports
                </Button>
              </div>

              {/* Reports List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(report.status)}
                          <div>
                            <h4 className="font-semibold">{report.clientName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {report.reportType} report • {report.period.start.toLocaleDateString()} - {report.period.end.toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getToneColor(report.tone)}>
                            {report.tone}
                          </Badge>
                          <Badge variant="outline">
                            {report.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Views:</span> {report.metrics.totalViews.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Engagement:</span> {report.metrics.avgEngagementRate.toFixed(1)}%
                          </div>
                          <div>
                            <span className="font-medium">Growth:</span> 
                            <span className={report.metrics.growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                              {report.metrics.growthRate > 0 ? '+' : ''}{report.metrics.growthRate.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Generated:</span> {report.generatedAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {report.status === 'ready' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => downloadReport(report.id)}>
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" onClick={() => sendBulkEmails([report.id], 'template-1')}>
                              <Send className="w-3 h-3 mr-1" />
                              Send
                            </Button>
                          </>
                        )}
                        {report.status === 'sent' && report.sentAt && (
                          <div className="text-xs text-muted-foreground">
                            Sent {report.sentAt.toLocaleDateString()}
                          </div>
                        )}
                        <Button size="sm" variant="ghost">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Bulk Email Delivery
              </CardTitle>
              <CardDescription>
                Send personalized reports to thousands of clients simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bulk Email Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable batch processing for large client lists
                    </p>
                  </div>
                  <Switch
                    checked={bulkEmailMode}
                    onCheckedChange={setBulkEmailMode}
                  />
                </div>

                {bulkEmailMode && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold">Bulk Email Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email Template</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} ({template.tone})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Send Schedule</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Send immediately" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Send Immediately</SelectItem>
                            <SelectItem value="scheduled">Schedule for Later</SelectItem>
                            <SelectItem value="batch">Batch Send (1000/hour)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        const readyReports = reports.filter(r => r.status === 'ready').map(r => r.id);
                        sendBulkEmails(readyReports.slice(0, 10), 'template-1');
                      }}>
                        <Send className="w-4 h-4 mr-2" />
                        Send to Ready Reports
                      </Button>
                      <Button variant="outline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Delivery
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ready Reports for Bulk Sending */}
              <div>
                <h4 className="font-semibold mb-3">Reports Ready for Sending</h4>
                <div className="space-y-2">
                  {reports
                    .filter(r => r.status === 'ready')
                    .slice(0, 5)
                    .map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(report.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReports(prev => [...prev, report.id]);
                              } else {
                                setSelectedReports(prev => prev.filter(id => id !== report.id));
                              }
                            }}
                          />
                          <div>
                            <span className="font-medium">{report.clientName}</span>
                            <p className="text-sm text-muted-foreground">
                              {report.reportType} report • {report.metrics.totalViews.toLocaleString()} views
                            </p>
                          </div>
                        </div>
                        <Badge className={getToneColor(report.tone)}>
                          {report.tone}
                        </Badge>
                      </div>
                    ))}
                </div>
                
                {selectedReports.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {selectedReports.length} reports selected for bulk sending
                      </span>
                      <Button onClick={() => sendBulkEmails(selectedReports, 'template-1')}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Selected
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Manage email templates with tone-adaptive messaging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailTemplates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getToneColor(template.tone)}>
                            {template.tone}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Settings className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm bg-gray-50 p-3 rounded">
                        {template.content.slice(0, 200)}...
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {`{${variable}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Configure automated report generation and delivery rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.trigger.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.isActive ? 'default' : 'outline'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) => {
                              setAutomationRules(prev => prev.map(r => 
                                r.id === rule.id ? { ...r, isActive: checked } : r
                              ));
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Actions:</p>
                          <ul className="text-muted-foreground">
                            {rule.actions.generateReport && <li>• Generate Report</li>}
                            {rule.actions.sendEmail && <li>• Send Email</li>}
                            {rule.actions.notifyTeam && <li>• Notify Team</li>}
                            {rule.actions.scheduleFollowup && <li>• Schedule Follow-up</li>}
                          </ul>
                        </div>
                        <div>
                          {rule.conditions.length > 0 && (
                            <>
                              <p className="font-medium">Conditions:</p>
                              <ul className="text-muted-foreground">
                                {rule.conditions.map((condition, i) => (
                                  <li key={i}>
                                    • {condition.metric} {condition.operator} {condition.value}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
