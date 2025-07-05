'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface QueueStats {
  total: number;
  by_status: Record<string, number>;
  by_platform: Record<string, number>;
  by_priority: Record<string, number>;
}

interface QueueItem {
  id: string;
  platform: string;
  content: string;
  post_time: string;
  status: string;
  priority: string;
  retry_count: number;
  created_at: string;
}

export function QueueManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    by_status: {},
    by_platform: {},
    by_priority: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [readyForProcessing, setReadyForProcessing] = useState(0);
  const [readyForRetry, setReadyForRetry] = useState(0);

  useEffect(() => {
    fetchQueueData();
  }, [statusFilter, platformFilter]);

  const fetchQueueData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      params.append('include_metadata', 'true');

      const response = await fetch(`/api/autoposting/queue?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.queue_items || []);
        setStats(data.statistics || { total: 0, by_status: {}, by_platform: {}, by_priority: {} });
        setReadyForProcessing(data.ready_for_processing || 0);
        setReadyForRetry(data.ready_for_retry || 0);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch queue data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch queue data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueueAction = async (action: 'process' | 'pause' | 'resume' | 'clear', scheduleIds?: string[]) => {
    try {
      const response = await fetch('/api/autoposting/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          schedule_ids: scheduleIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: data.message,
        });
        await fetchQueueData();
        setSelectedItems([]);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${action} queue items`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing queue:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} queue items`,
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'posted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'retrying':
        return <RefreshCw className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'retrying':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleItemSelection = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === queueItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(queueItems.map(item => item.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ready to Process</p>
                <p className="text-2xl font-bold">{readyForProcessing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ready to Retry</p>
                <p className="text-2xl font-bold">{readyForRetry}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 
                    ? Math.round(((stats.by_status?.posted || 0) / stats.total) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Queue Management</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchQueueData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <div className="col-span-2">
              <label className="text-sm font-medium">Bulk Actions</label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleQueueAction('process')}
                  disabled={isLoading || readyForProcessing === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Process Ready ({readyForProcessing})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQueueAction('pause', selectedItems)}
                  disabled={isLoading || selectedItems.length === 0}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Selected ({selectedItems.length})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQueueAction('resume', selectedItems)}
                  disabled={isLoading || selectedItems.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume Selected ({selectedItems.length})
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleQueueAction('clear', selectedItems)}
                  disabled={isLoading || selectedItems.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Selected ({selectedItems.length})
                </Button>
              </div>
            </div>
          </div>

          {/* Queue Items List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={selectedItems.length === queueItems.length && queueItems.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                Select All ({queueItems.length} items)
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : queueItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No queue items found
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queueItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {getStatusIcon(item.status)}
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <span className="text-sm font-medium">{item.platform}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.retry_count > 0 && `Retries: ${item.retry_count}`}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                    </div>
                    
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                      <span>Scheduled: {new Date(item.post_time).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}