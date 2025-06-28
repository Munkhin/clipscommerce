import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import type { ClientReport } from '@/components/team-dashboard/modules/feedback/types';

interface UseReportActionsProps {
  reports: ClientReport[];
  setReports: React.Dispatch<React.SetStateAction<ClientReport[]>>;
}

export function useReportActions({ reports, setReports }: UseReportActionsProps) {
  const handleViewReport = useCallback((reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      toast({
        title: "Report Opened",
        description: `Viewing report for ${report.clientName}`,
      });
      // In a real app, this would navigate to the report view
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
      // In a real app, this would trigger file download
    }
  }, [reports]);

  const handleBulkSend = useCallback((selectedReports: string[]) => {
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
  }, [setReports]);

  const handleGenerateNewReports = useCallback(async () => {
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Reports Generated",
        description: "New reports have been generated successfully",
      });
      
      // In a real app, this would call an API to generate reports
      return true;
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate new reports",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  return {
    handleViewReport,
    handleSendReport,
    handleDownloadReport,
    handleBulkSend,
    handleGenerateNewReports
  };
}