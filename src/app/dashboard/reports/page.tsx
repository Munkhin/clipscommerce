'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePickerWithRange from '@/components/ui/date-picker-with-range';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/dashboard/Header';

export default function ReportsPage() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState('tiktok');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!dateRange || !user) {
      setError('Please select a date range and ensure you are logged in');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analytics/full-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          platform: platform as "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "linkedin",
          timeRange: {
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString(),
          },
          reportOptions: {
            format: 'html',
            includeCharts: true,
            includeRawData: false,
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setReport(result.report);
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate a Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Select onValueChange={setPlatform} defaultValue={platform}>
              <SelectTrigger>
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange
              onSelect={setDateRange as any}
            />
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>
      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: report.toString() }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
