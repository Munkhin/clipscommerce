'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  Trash2, 
  Eye,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface DLQStats {
  total: number;
  unresolved: number;
  resolved: number;
  by_platform: Record<string, number>;
  by_failure_reason: Record<string, number>;
}

interface DLQItem {
  id: string;
  original_schedule_id: string;
  platform: string;
  content: string;
  media_urls: string[];
  original_post_time: string;
  failure_reason: string;
  last_error: string;
  retry_count: number;
  moved_to_dlq_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  metadata: any;
}

export function DeadLetterQueueManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dlqItems, setDlqItems] = useState<DLQItem[]>([]);
  const [stats, setStats] = useState<DLQStats>({
    total: 0,
    unresolved: 0,
    resolved: 0,
    by_platform: {},
    by_failure_reason: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<DLQItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchDLQData();
  }, [platformFilter, resolvedFilter]);

  const fetchDLQData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      params.append('resolved', resolvedFilter.toString());
      params.append('limit', '50');

      const response = await fetch(`/api/autoposting/dead-letter-queue?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setDlqItems(data.items || []);
        setStats(data.statistics || { 
          total: 0, 
          unresolved: 0, 
          resolved: 0, 
          by_platform: {}, 
          by_failure_reason: {} 
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch dead letter queue data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching DLQ data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch dead letter queue data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDLQAction = async (
    action: 'resolve' | 'retry' | 'delete', 
    itemIds: string[], 
    notes?: string
  ) => {
    try {
      const endpoint = itemIds.length === 1 
        ? '/api/autoposting/dead-letter-queue'
        : '/api/autoposting/dead-letter-queue';
      
      const method = 'POST';
      const body = itemIds.length === 1 
        ? {
            item_id: itemIds[0],
            action,
            resolution_notes: notes || ''
          }
        : {
            item_ids: itemIds,
            action,
            resolution_notes: notes || ''
          };

      const response = await fetch(endpoint, {
        method: itemIds.length === 1 ? method : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: data.message || `${action} completed successfully`,
        });
        await fetchDLQData();
        setSelectedItems([]);
        setIsDialogOpen(false);
        setSelectedItem(null);
        setResolutionNotes('');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${action} items`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing DLQ items:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} items`,
        variant: 'destructive',
      });
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
    if (selectedItems.length === dlqItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(dlqItems.map(item => item.id));
    }
  };

  const openItemDialog = (item: DLQItem) => {
    setSelectedItem(item);
    setResolutionNotes('');
    setIsDialogOpen(true);
  };

  const formatFailureReason = (reason: string) => {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* DLQ Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
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
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unresolved</p>
                <p className="text-2xl font-bold">{stats.unresolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolution Rate</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 
                    ? Math.round((stats.resolved / stats.total) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DLQ Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dead Letter Queue Management</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDLQData}
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
              <label className="text-sm font-medium">Status Filter</label>
              <Select 
                value={resolvedFilter ? 'resolved' : 'unresolved'} 
                onValueChange={(value) => setResolvedFilter(value === 'resolved')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Bulk Actions</label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDLQAction('retry', selectedItems, 'Bulk retry from DLQ')}
                  disabled={isLoading || selectedItems.length === 0 || resolvedFilter}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Selected ({selectedItems.length})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDLQAction('resolve', selectedItems, 'Bulk resolution')}
                  disabled={isLoading || selectedItems.length === 0 || resolvedFilter}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve Selected ({selectedItems.length})
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDLQAction('delete', selectedItems, 'Bulk deletion')}
                  disabled={isLoading || selectedItems.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedItems.length})
                </Button>
              </div>
            </div>
          </div>

          {/* DLQ Items List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={selectedItems.length === dlqItems.length && dlqItems.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                Select All ({dlqItems.length} items)
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : dlqItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {resolvedFilter ? 'No resolved items found' : 'No unresolved items in dead letter queue'}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dlqItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                        className="rounded border-gray-300"
                        disabled={resolvedFilter}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <Badge variant="destructive">
                          {formatFailureReason(item.failure_reason)}
                        </Badge>
                        <span className="text-sm font-medium">{item.platform}</span>
                        {item.resolved_at && (
                          <Badge variant="secondary">Resolved</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openItemDialog(item)}
                          title="View details"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {!item.resolved_at && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDLQAction('retry', [item.id], 'Manual retry from DLQ')}
                              title="Retry post"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDLQAction('resolve', [item.id], 'Manual resolution')}
                              title="Mark as resolved"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Original Post Time: {new Date(item.original_post_time).toLocaleString()}</p>
                      <p>Moved to DLQ: {new Date(item.moved_to_dlq_at).toLocaleString()}</p>
                      <p className="text-red-600">Last Error: {item.last_error}</p>
                      <p>Retry Count: {item.retry_count}</p>
                      {item.resolved_at && (
                        <>
                          <p className="text-green-600">Resolved: {new Date(item.resolved_at).toLocaleString()}</p>
                          {item.resolution_notes && (
                            <p className="text-green-600">Notes: {item.resolution_notes}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Item Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dead Letter Queue Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Platform</h4>
                  <p className="text-sm text-gray-600">{selectedItem.platform}</p>
                </div>
                <div>
                  <h4 className="font-medium">Failure Reason</h4>
                  <p className="text-sm text-gray-600">{formatFailureReason(selectedItem.failure_reason)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium">Content</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedItem.content}</p>
              </div>

              {selectedItem.media_urls && selectedItem.media_urls.length > 0 && (
                <div>
                  <h4 className="font-medium">Media URLs</h4>
                  <div className="space-y-1">
                    {selectedItem.media_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline block"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium">Error Details</h4>
                <p className="text-sm text-red-600">{selectedItem.last_error}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Original Post Time</h4>
                  <p className="text-sm text-gray-600">{new Date(selectedItem.original_post_time).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium">Retry Count</h4>
                  <p className="text-sm text-gray-600">{selectedItem.retry_count}</p>
                </div>
              </div>

              {!selectedItem.resolved_at && (
                <div>
                  <h4 className="font-medium">Resolution Notes</h4>
                  <Textarea
                    placeholder="Enter resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="mt-2"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleDLQAction('retry', [selectedItem.id], resolutionNotes || 'Retried from dialog')}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Post
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDLQAction('resolve', [selectedItem.id], resolutionNotes || 'Resolved from dialog')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Resolved
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDLQAction('delete', [selectedItem.id], resolutionNotes || 'Deleted from dialog')}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              {selectedItem.resolved_at && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800">Resolution Information</h4>
                  <p className="text-sm text-green-700">Resolved: {new Date(selectedItem.resolved_at).toLocaleString()}</p>
                  {selectedItem.resolution_notes && (
                    <p className="text-sm text-green-700 mt-2">Notes: {selectedItem.resolution_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}