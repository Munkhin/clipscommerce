'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Filter, Calendar } from 'lucide-react';

interface ReportFiltersProps {
  selectedClient: string;
  setSelectedClient: (value: string) => void;
  selectedReportType: string;
  setSelectedReportType: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  bulkEmailMode: boolean;
  setBulkEmailMode: (value: boolean) => void;
}

export function ReportFilters({
  selectedClient,
  setSelectedClient,
  selectedReportType,
  setSelectedReportType,
  filterStatus,
  setFilterStatus,
  bulkEmailMode,
  setBulkEmailMode
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters:</span>
      </div>
      
      <Select value={selectedClient} onValueChange={setSelectedClient}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          <SelectItem value="client-1">TechCorp Inc.</SelectItem>
          <SelectItem value="client-2">Lifestyle Brand Co.</SelectItem>
          <SelectItem value="client-3">Fitness Pro</SelectItem>
          <SelectItem value="client-4">Travel Adventures</SelectItem>
          <SelectItem value="client-5">Food & Wine Co.</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedReportType} onValueChange={setSelectedReportType}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Report type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="quarterly">Quarterly</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="generating">Generating</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="sent">Sent</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center space-x-2">
        <Switch
          id="bulk-mode"
          checked={bulkEmailMode}
          onCheckedChange={setBulkEmailMode}
        />
        <Label htmlFor="bulk-mode" className="text-sm">
          Bulk Email Mode
        </Label>
      </div>

      <Button variant="outline" size="sm">
        <Calendar className="h-4 w-4 mr-2" />
        Date Range
      </Button>
    </div>
  );
}