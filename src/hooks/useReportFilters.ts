import { useState, useMemo } from 'react';
import type { ClientReport } from '@/components/team-dashboard/modules/feedback/types';

interface UseReportFiltersProps {
  reports: ClientReport[];
}

export function useReportFilters({ reports }: UseReportFiltersProps) {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (selectedClient !== 'all' && report.clientId !== selectedClient) return false;
      if (selectedReportType !== 'all' && report.reportType !== selectedReportType) return false;
      if (filterStatus !== 'all' && report.status !== filterStatus) return false;
      return true;
    });
  }, [reports, selectedClient, selectedReportType, filterStatus]);

  const resetFilters = () => {
    setSelectedClient('all');
    setSelectedReportType('all');
    setFilterStatus('all');
  };

  return {
    filters: {
      selectedClient,
      selectedReportType,
      filterStatus
    },
    setters: {
      setSelectedClient,
      setSelectedReportType,
      setFilterStatus
    },
    filteredReports,
    resetFilters
  };
}