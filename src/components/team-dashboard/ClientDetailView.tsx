'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  User, Mail, Phone, Building, Calendar, 
  TrendingUp, DollarSign, Clock, Target,
  FileText, MessageSquare, Settings
} from 'lucide-react';

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  lastActivity: string;
  metrics?: {
    totalRevenue: number;
    activeProjects: number;
    completionRate: number;
    satisfaction: number;
  };
  recentActivity?: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export interface ClientDetailViewProps {
  client?: ClientData;
  onClientUpdate?: (client: ClientData) => void;
  onClientDelete?: (clientId: string) => void;
  className?: string;
}

const defaultClient: ClientData = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@example.com',
  phone: '+1 (555) 123-4567',
  company: 'TechCorp Inc.',
  status: 'active',
  joinDate: '2024-01-15',
  lastActivity: '2024-01-20',
  metrics: {
    totalRevenue: 45000,
    activeProjects: 3,
    completionRate: 94,
    satisfaction: 4.8
  },
  recentActivity: [
    {
      id: '1',
      type: 'project',
      description: 'Started new campaign project',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'payment',
      description: 'Payment received: $5,000',
      timestamp: '1 day ago'
    },
    {
      id: '3',
      type: 'meeting',
      description: 'Quarterly review meeting completed',
      timestamp: '3 days ago'
    }
  ]
};

export function ClientDetailView({ 
  client = defaultClient,
  onClientUpdate,
  onClientDelete,
  className 
}: ClientDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project': return <Target className="h-4 w-4" />;
      case 'payment': return <DollarSign className="h-4 w-4" />;
      case 'meeting': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={client.avatar} alt={client.name} />
              <AvatarFallback className="text-lg">
                {client.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{client.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building className="h-4 w-4" />
                {client.company}
              </CardDescription>
              <Badge className={`mt-2 ${getStatusColor(client.status)}`}>
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onClientDelete?.(client.id)}>
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined: {new Date(client.joinDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last active: {new Date(client.lastActivity).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Key Metrics */}
              {client.metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">${client.metrics.totalRevenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Total Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{client.metrics.activeProjects}</div>
                        <div className="text-sm text-muted-foreground">Active Projects</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate</span>
                        <span>{client.metrics.completionRate}%</span>
                      </div>
                      <Progress value={client.metrics.completionRate} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Satisfaction</span>
                        <span>{client.metrics.satisfaction}/5.0</span>
                      </div>
                      <Progress value={(client.metrics.satisfaction / 5) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="projects" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Projects</CardTitle>
                <CardDescription>Current projects for this client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Projects view will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest interactions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {client.recentActivity && client.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {client.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="mt-1">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>Payment history and billing details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Billing information will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ClientDetailView;