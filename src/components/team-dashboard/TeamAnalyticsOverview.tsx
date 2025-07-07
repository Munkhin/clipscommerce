'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, BarChart3, Clock } from 'lucide-react';

export interface TeamAnalytic {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export interface TeamAnalyticsOverviewProps {
  analytics?: TeamAnalytic[];
  className?: string;
}

const defaultAnalytics: TeamAnalytic[] = [
  {
    id: '1',
    title: 'Total Team Members',
    value: 12,
    change: '+2 this month',
    changeType: 'positive',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: '2',
    title: 'Active Projects',
    value: 8,
    change: '+1 this week',
    changeType: 'positive',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: '3',
    title: 'Avg. Performance',
    value: '94.2%',
    change: '+3.1% from last month',
    changeType: 'positive',
    icon: <BarChart3 className="h-4 w-4" />
  },
  {
    id: '4',
    title: 'Response Time',
    value: '1.2s',
    change: '-0.3s improvement',
    changeType: 'positive',
    icon: <Clock className="h-4 w-4" />
  }
];

export function TeamAnalyticsOverview({ 
  analytics = defaultAnalytics, 
  className 
}: TeamAnalyticsOverviewProps) {
  const getChangeColor = (type?: string) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeBadgeVariant = (type?: string) => {
    switch (type) {
      case 'positive': return 'secondary';
      case 'negative': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Team Analytics Overview</CardTitle>
        <CardDescription>
          Key performance indicators and team metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.map((analytic) => (
            <Card key={analytic.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <div className="text-sm font-medium">{analytic.title}</div>
                  {analytic.icon}
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{analytic.value}</div>
                  {analytic.change && (
                    <Badge 
                      variant={getChangeBadgeVariant(analytic.changeType)}
                      className={`text-xs ${getChangeColor(analytic.changeType)}`}
                    >
                      {analytic.change}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {[
              'New team member joined: Sarah Johnson',
              'Project "Q1 Campaign" completed successfully',
              'Performance benchmark achieved: 95% target',
              'System optimization reduced response time by 23%'
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>{activity}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamAnalyticsOverview;