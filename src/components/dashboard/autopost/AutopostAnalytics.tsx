'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface RetryStats {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  successRate: number;
  averageRetryCount: number;
  platformStats: Record<string, {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  }>;
}

interface DatabaseStats {
  retry_history_count: number;
  pending_retries: number;
  dead_letter_queue_size: number;
}

interface PendingRetry {
  id: string;
  platform: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  last_error: string;
}

interface DLQItem {
  id: string;
  platform: string;
  failure_reason: string;
  moved_to_dlq_at: string;
}

export function AutopostAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [retryStats, setRetryStats] = useState<RetryStats>({
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    successRate: 0,
    averageRetryCount: 0,
    platformStats: {}
  });
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats>({
    retry_history_count: 0,
    pending_retries: 0,
    dead_letter_queue_size: 0
  });
  const [pendingRetries, setPendingRetries] = useState<PendingRetry[]>([]);
  const [dlqItems, setDlqItems] = useState<DLQItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<number>(7);
  const [includeHistory, setIncludeHistory] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [platformFilter, daysFilter, includeHistory]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      params.append('days', daysFilter.toString());
      params.append('include_history', includeHistory.toString());

      const response = await fetch(`/api/autoposting/retry?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setRetryStats(data.retry_stats || {
          totalRetries: 0,
          successfulRetries: 0,
          failedRetries: 0,
          successRate: 0,
          averageRetryCount: 0,
          platformStats: {}
        });
        setDatabaseStats(data.database_stats || {
          retry_history_count: 0,
          pending_retries: 0,
          dead_letter_queue_size: 0
        });
        setPendingRetries(data.pending_retries || []);
        setDlqItems(data.dead_letter_queue || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch analytics data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateIcon = (rate: number) => {
    if (rate >= 0.8) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (rate >= 0.6) return <Activity className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Autoposting Analytics</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalyticsData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Platform Filter</label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Time Period</label>
              <Select value={daysFilter.toString()} onValueChange={(value) => setDaysFilter(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeHistory}
                    onChange={(e) => setIncludeHistory(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Include detailed history
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Retries</p>
                <p className="text-2xl font-bold">{retryStats.totalRetries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Successful Retries</p>
                <p className="text-2xl font-bold">{retryStats.successfulRetries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex items-center">
                {getSuccessRateIcon(retryStats.successRate)}
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className={`text-2xl font-bold ${getSuccessRateColor(retryStats.successRate)}`}>
                    {formatPercentage(retryStats.successRate)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Retry Count</p>
                <p className="text-2xl font-bold">{retryStats.averageRetryCount.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(retryStats.platformStats).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No platform data available for the selected period
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(retryStats.platformStats).map(([platform, stats]) => (
                <Card key={platform}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{platform}</h4>
                      <div className="flex items-center">
                        {getSuccessRateIcon(stats.successRate)}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Retries:</span>
                        <span className="font-medium">{stats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Successful:</span>
                        <span className="font-medium text-green-600">{stats.successful}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span className="font-medium text-red-600">{stats.failed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate:</span>
                        <span className={`font-medium ${getSuccessRateColor(stats.successRate)}`}>
                          {formatPercentage(stats.successRate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Pending Retries ({databaseStats.pending_retries})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRetries.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No pending retries
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingRetries.slice(0, 10).map((retry) => (
                  <div key={retry.id} className="border rounded p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{retry.platform}</span>
                      <span className="text-sm text-gray-500">
                        {retry.retry_count}/{retry.max_retries}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Next retry: {new Date(retry.next_retry_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-red-600">
                      {retry.last_error.substring(0, 100)}...
                    </div>
                  </div>
                ))}
                {pendingRetries.length > 10 && (
                  <div className="text-center text-sm text-gray-500">
                    ...and {pendingRetries.length - 10} more
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Dead Letter Queue ({databaseStats.dead_letter_queue_size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dlqItems.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No items in dead letter queue
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dlqItems.slice(0, 10).map((item) => (
                  <div key={item.id} className="border rounded p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.platform}</span>
                      <span className="text-xs text-red-600">
                        {item.failure_reason.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Added: {new Date(item.moved_to_dlq_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                {dlqItems.length > 10 && (
                  <div className="text-center text-sm text-gray-500">
                    ...and {dlqItems.length - 10} more
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 border rounded">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                databaseStats.pending_retries < 10 ? 'bg-green-500' : 
                databaseStats.pending_retries < 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="text-sm font-medium">Retry Queue</p>
                <p className="text-xs text-gray-500">
                  {databaseStats.pending_retries < 10 ? 'Healthy' : 
                   databaseStats.pending_retries < 50 ? 'Moderate Load' : 'High Load'}
                </p>
              </div>
            </div>

            <div className="flex items-center p-4 border rounded">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                databaseStats.dead_letter_queue_size === 0 ? 'bg-green-500' : 
                databaseStats.dead_letter_queue_size < 20 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="text-sm font-medium">Dead Letter Queue</p>
                <p className="text-xs text-gray-500">
                  {databaseStats.dead_letter_queue_size === 0 ? 'Clear' : 
                   databaseStats.dead_letter_queue_size < 20 ? 'Some Issues' : 'Needs Attention'}
                </p>
              </div>
            </div>

            <div className="flex items-center p-4 border rounded">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                retryStats.successRate >= 0.8 ? 'bg-green-500' : 
                retryStats.successRate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-xs text-gray-500">
                  {retryStats.successRate >= 0.8 ? 'Excellent' : 
                   retryStats.successRate >= 0.6 ? 'Good' : 'Needs Improvement'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}