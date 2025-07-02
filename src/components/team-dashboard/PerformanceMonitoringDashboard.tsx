'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Users, Clock } from 'lucide-react';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceMonitoringDashboardProps {
  metrics?: PerformanceMetric[];
  className?: string;
}

const defaultMetrics: PerformanceMetric[] = [
  { id: '1', name: 'Content Processed', value: 847, target: 1000, unit: 'posts', trend: 'up' },
  { id: '2', name: 'Engagement Rate', value: 3.2, target: 4.0, unit: '%', trend: 'up' },
  { id: '3', name: 'Active Users', value: 156, target: 200, unit: 'users', trend: 'stable' },
  { id: '4', name: 'Response Time', value: 1.2, target: 1.0, unit: 'sec', trend: 'down' }
];

export function PerformanceMonitoringDashboard({ 
  metrics = defaultMetrics, 
  className 
}: PerformanceMonitoringDashboardProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <Activity className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Monitoring</CardTitle>
        <CardDescription>
          Real-time performance metrics and system health
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const progress = (metric.value / metric.target) * 100;
            return (
              <Card key={metric.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">{metric.name}</div>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {metric.value}{metric.unit}
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Target: {metric.target}{metric.unit}</span>
                      <span className={getTrendColor(metric.trend)}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                API Status: Healthy
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Database: Connected
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Queue: Processing
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PerformanceMonitoringDashboard;