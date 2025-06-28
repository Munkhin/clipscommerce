'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { 
  Mail, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Send, 
  Settings,
  Zap,
  Brain,
  Target
} from 'lucide-react';

import { ReportFilters } from './ReportFilters';
import { ReportList } from './ReportList';
import { useFeedbackData } from './useFeedbackData';
import type { ClientReport } from './types';

export function FeedbackModuleRefactored() {
  const {
    reports,
    setReports,
    emailTemplates,
    automationRules,
    isLoading
  } = useFeedbackData();

  // Filter states
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bulkEmailMode, setBulkEmailMode] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);

  // Filtered reports based on current filters
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (selectedClient !== 'all' && report.clientId !== selectedClient) return false;
      if (selectedReportType !== 'all' && report.reportType !== selectedReportType) return false;
      if (filterStatus !== 'all' && report.status !== filterStatus) return false;
      return true;
    });
  }, [reports, selectedClient, selectedReportType, filterStatus]);

  // Analytics summary
  const analytics = useMemo(() => {
    const totalReports = filteredReports.length;
    const sentReports = filteredReports.filter(r => r.status === 'sent').length;
    const pendingReports = filteredReports.filter(r => r.status === 'ready').length;
    const avgEngagement = filteredReports.reduce((acc, r) => acc + r.metrics.avgEngagementRate, 0) / totalReports || 0;

    return {
      totalReports,
      sentReports,
      pendingReports,
      avgEngagement: avgEngagement.toFixed(1)
    };
  }, [filteredReports]);

  // Event handlers
  const handleViewReport = useCallback((reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      toast({
        title: "Report Opened",
        description: `Viewing report for ${report.clientName}`,
      });
    }
  }, [reports]);

  const handleSendReport = useCallback((reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: 'sent' as const, sentAt: new Date() }
          : r
      ));
      toast({
        title: "Report Sent",
        description: `Report sent to ${report.clientName}`,
      });
    }
  }, [reports, setReports]);

  const handleDownloadReport = useCallback((reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      toast({
        title: "Download Started",
        description: `Downloading report for ${report.clientName}`,
      });
    }
  }, [reports]);

  const handleBulkSend = useCallback(() => {
    if (selectedReports.length === 0) {
      toast({
        title: "No Reports Selected",
        description: "Please select reports to send",
        variant: "destructive"
      });
      return;
    }

    setReports(prev => prev.map(r => 
      selectedReports.includes(r.id) && r.status === 'ready'
        ? { ...r, status: 'sent' as const, sentAt: new Date() }
        : r
    ));

    toast({
      title: "Bulk Email Sent",
      description: `Sent ${selectedReports.length} reports`,
    });

    setSelectedReports([]);
  }, [selectedReports, setReports]);

  const handleGenerateNewReports = useCallback(async () => {
    setIsGeneratingReports(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Reports Generated",
        description: "New reports have been generated successfully",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate new reports",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReports(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Client Feedback & Reports</h2>
          <p className="text-muted-foreground">
            Automated client reporting and feedback management system
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateNewReports}
            disabled={isGeneratingReports}
          >
            <Brain className="h-4 w-4 mr-2" />
            {isGeneratingReports ? 'Generating...' : 'Generate Reports'}
          </Button>
          {bulkEmailMode && selectedReports.length > 0 && (
            <Button onClick={handleBulkSend} variant="default">
              <Send className="h-4 w-4 mr-2" />
              Send Selected ({selectedReports.length})
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Reports</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sentReports}</div>
            <p className="text-xs text-muted-foreground">
              {((analytics.sentReports / analytics.totalReports) * 100).toFixed(1)}% delivery rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              Ready to send
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgEngagement}%</div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Zap className="h-4 w-4 mr-2" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <ReportFilters
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            selectedReportType={selectedReportType}
            setSelectedReportType={setSelectedReportType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            bulkEmailMode={bulkEmailMode}
            setBulkEmailMode={setBulkEmailMode}
          />
          
          <ReportList
            reports={filteredReports}
            onViewReport={handleViewReport}
            onSendReport={handleSendReport}
            onDownloadReport={handleDownloadReport}
            bulkEmailMode={bulkEmailMode}
            selectedReports={selectedReports}
            setSelectedReports={setSelectedReports}
          />
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage email templates for client reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Email templates management will be implemented here.
                Total templates: {emailTemplates.length}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                Configure automated report generation and sending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automation rules management will be implemented here.
                Active rules: {automationRules.filter(r => r.isActive).length}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Module Settings</CardTitle>
              <CardDescription>
                Configure feedback module preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Settings panel will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}