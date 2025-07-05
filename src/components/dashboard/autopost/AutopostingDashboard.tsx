'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  BarChart3, 
  Settings, 
  AlertTriangle, 
  Activity,
  Queue,
  RefreshCw
} from 'lucide-react';

import { AutopostScheduler } from './AutopostScheduler';
import { QueueManagement } from './QueueManagement';
import { DeadLetterQueueManagement } from './DeadLetterQueueManagement';
import { AutopostAnalytics } from './AutopostAnalytics';

export function AutopostingDashboard() {
  const [activeTab, setActiveTab] = useState('scheduler');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = () => {
    setLastUpdated(new Date());
    // Trigger refresh on child components by re-mounting them
    const event = new CustomEvent('refreshAutoposting');
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Autoposting Dashboard</h1>
          <p className="text-gray-600">
            Manage your scheduled posts, monitor queue status, and analyze performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
          <Badge variant="secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">--</div>
              <div className="text-sm text-gray-500">Scheduled Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">--</div>
              <div className="text-sm text-gray-500">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">--</div>
              <div className="text-sm text-gray-500">Posted Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">--</div>
              <div className="text-sm text-gray-500">Failed/Retry</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Queue className="w-4 h-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="dlq" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Dead Letter Queue
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="space-y-4">
          <AutopostScheduler key={lastUpdated.getTime()} />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <QueueManagement key={lastUpdated.getTime()} />
        </TabsContent>

        <TabsContent value="dlq" className="space-y-4">
          <DeadLetterQueueManagement key={lastUpdated.getTime()} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AutopostAnalytics key={lastUpdated.getTime()} />
        </TabsContent>
      </Tabs>

      {/* Help and Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Quick Help
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Scheduling Posts</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Select platform and set priority for better queue management</li>
                <li>• Add hashtags separated by commas</li>
                <li>• Preview your post before scheduling</li>
                <li>• Failed posts are automatically retried with exponential backoff</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Managing Issues</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Check the Queue tab for pending and processing posts</li>
                <li>• Monitor Dead Letter Queue for posts requiring attention</li>
                <li>• Use Analytics to track success rates and identify issues</li>
                <li>• Bulk actions are available for efficient management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}