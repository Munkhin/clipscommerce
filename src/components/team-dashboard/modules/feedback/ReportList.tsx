'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  Send, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { ClientReport } from './types';

interface ReportListProps {
  reports: ClientReport[];
  onViewReport: (reportId: string) => void;
  onSendReport: (reportId: string) => void;
  onDownloadReport: (reportId: string) => void;
  bulkEmailMode: boolean;
  selectedReports: string[];
  setSelectedReports: (reports: string[]) => void;
}

export function ReportList({
  reports,
  onViewReport,
  onSendReport,
  onDownloadReport,
  bulkEmailMode,
  selectedReports,
  setSelectedReports
}: ReportListProps) {
  const getStatusIcon = (status: ClientReport['status']) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ClientReport['status']) => {
    const statusConfig = {
      generating: { variant: 'secondary' as const, text: 'Generating' },
      ready: { variant: 'default' as const, text: 'Ready' },
      sent: { variant: 'outline' as const, text: 'Sent' },
      failed: { variant: 'destructive' as const, text: 'Failed' }
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  const toggleReportSelection = (reportId: string) => {
    if (selectedReports.includes(reportId)) {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    } else {
      setSelectedReports([...selectedReports, reportId]);
    }
  };

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="relative overflow-hidden">
          {bulkEmailMode && (
            <div className="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                checked={selectedReports.includes(report.id)}
                onChange={() => toggleReportSelection(report.id)}
              />
            </div>
          )}
          
          <CardHeader className={bulkEmailMode ? 'pl-12' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {report.clientName}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)}
                  </Badge>
                  {getStatusBadge(report.status)}
                  <span className="text-sm text-gray-500">
                    {formatDate(report.period.start)} - {formatDate(report.period.end)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(report.status)}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewReport(report.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {report.status === 'ready' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSendReport(report.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownloadReport(report.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-500">Total Views</div>
                  <div className="font-semibold">{formatNumber(report.metrics.totalViews)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm text-gray-500">Engagement</div>
                  <div className="font-semibold">{formatNumber(report.metrics.totalEngagement)}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Engagement Rate</div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{report.metrics.avgEngagementRate.toFixed(1)}%</div>
                  <Progress value={report.metrics.avgEngagementRate} className="flex-1 h-2" />
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Growth Rate</div>
                <div className={`font-semibold ${report.metrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {report.metrics.growthRate >= 0 ? '+' : ''}{report.metrics.growthRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {report.status === 'generating' && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Generating report...</span>
                  <span>75%</span>
                </div>
                <Progress value={75} className="mt-2" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}