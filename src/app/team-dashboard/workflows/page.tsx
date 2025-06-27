'use client';

import React, { useState, useEffect } from 'react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { TeamSidebar } from '@/components/team-dashboard/TeamSidebar';
import { TeamHeader } from '@/components/team-dashboard/TeamHeader';
import { WorkflowTemplateManager } from '@/components/team-dashboard/WorkflowTemplateManager';
import { WorkflowScheduler } from '@/components/team-dashboard/WorkflowScheduler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Users,
  Zap,
  Settings,
  Copy,
  Edit,
  Trash2,
  BarChart3,
  PlusCircle,
  FolderKanban
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

// Mock workflow data
interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  progress: number;
  clientsAffected: number;
  createdAt: Date;
  lastRun: Date;
  nextRun?: Date;
  template: string;
  type: 'content' | 'engagement' | 'analytics' | 'outreach';
  priority: 'high' | 'medium' | 'low';
  estimatedCompletion?: Date;
}

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Daily Content Posting',
    description: 'Automated content posting across all platforms',
    status: 'active',
    progress: 75,
    clientsAffected: 156,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 6),
    template: 'Content Automation',
    type: 'content',
    priority: 'high',
    estimatedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 4)
  },
  {
    id: '2',
    name: 'Engagement Analytics Report',
    description: 'Weekly engagement metrics compilation',
    status: 'completed',
    progress: 100,
    clientsAffected: 1258,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 12),
    template: 'Analytics Report',
    type: 'analytics',
    priority: 'medium'
  },
  {
    id: '3',
    name: 'Influencer Outreach Campaign',
    description: 'Automated outreach to potential brand partners',
    status: 'paused',
    progress: 45,
    clientsAffected: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24),
    template: 'Outreach Campaign',
    type: 'outreach',
    priority: 'low'
  },
  {
    id: '4',
    name: 'Comment Response Automation',
    description: 'AI-powered comment responses and engagement',
    status: 'failed',
    progress: 25,
    clientsAffected: 234,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 8),
    template: 'Engagement Automation',
    type: 'engagement',
    priority: 'high'
  }
];

export default function TeamWorkflowsPage() {
  const { user } = useAuth();
  const { setCurrentTab, totalClientCount } = useTeamMode();
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddWorkflowModalOpen, setIsAddWorkflowModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTab('operations');
  }, [setCurrentTab]);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    const matchesType = typeFilter === 'all' || workflow.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4 text-mint" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-mint/10 text-mint border-mint/20';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'content': return <Edit className="h-4 w-4" />;
      case 'engagement': return <Users className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'outreach': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `in ${diffHours}h`;
    return `in ${diffDays}d`;
  };

  const handleWorkflowAction = (workflowId: string, action: 'play' | 'pause' | 'stop' | 'restart') => {
    setWorkflows(prev => prev.map(workflow => {
      if (workflow.id === workflowId) {
        switch (action) {
          case 'play':
            return { ...workflow, status: 'active' as const };
          case 'pause':
            return { ...workflow, status: 'paused' as const };
          case 'stop':
            return { ...workflow, status: 'completed' as const, progress: 100 };
          case 'restart':
            return { ...workflow, status: 'active' as const, progress: 0 };
          default:
            return workflow;
        }
      }
      return workflow;
    }));
  };

  const activeWorkflows = workflows.filter(w => w.status === 'active').length;
  const completedWorkflows = workflows.filter(w => w.status === 'completed').length;
  const failedWorkflows = workflows.filter(w => w.status === 'failed').length;
  const totalClientsInWorkflows = workflows.reduce((sum, w) => sum + w.clientsAffected, 0);

  return (
    <div className="flex h-screen bg-background">
      <TeamSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeamHeader />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fadeIn">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text">Team Workflows</h1>
                <p className="text-xl text-gray-400 mt-2">Automate your agency operations with intelligent workflows</p>
              </div>
              <Button
                onClick={() => setIsAddWorkflowModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Create New Workflow
              </Button>
            </div>

            {error && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                  {error}
                </div>
              </div>
            )}

            {/* Filter and Sort */}
            <GlassCard className="animate-slideUp p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search workflows..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="content">Content</option>
                    <option value="engagement">Engagement</option>
                    <option value="analytics">Analytics</option>
                    <option value="outreach">Outreach</option>
                  </select>
                </div>
              </div>
            </GlassCard>

            {/* Workflows Grid/List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows.length > 0 ? (filteredWorkflows.map((workflow) => (
                <GlassCard key={workflow.id} className="hover-lift animate-slideUp flex flex-col">
                  <div className="p-6 border-b border-gray-700/50 flex-grow-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(workflow.type)}
                            <h3 className="font-semibold text-lg">{workflow.name}</h3>
                          </div>
                          
                          <Badge className={getStatusColor(workflow.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(workflow.status)}
                              <span className="capitalize">{workflow.status}</span>
                            </div>
                          </Badge>
                          
                          <Badge className={getPriorityColor(workflow.priority)}>
                            {workflow.priority} priority
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-4">{workflow.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Progress</div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Progress value={workflow.progress} className="flex-1" />
                              <span className="text-sm font-medium">{workflow.progress}%</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Clients Affected</div>
                            <div className="text-lg font-semibold">{workflow.clientsAffected.toLocaleString()}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Template</div>
                            <div className="text-sm font-medium">{workflow.template}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Last run: {formatTimeAgo(workflow.lastRun)}</span>
                          </div>
                          
                          {workflow.nextRun && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Next run: {formatTimeUntil(workflow.nextRun)}</span>
                            </div>
                          )}
                          
                          {workflow.estimatedCompletion && (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4" />
                              <span>ETA: {formatTimeUntil(workflow.estimatedCompletion)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {workflow.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowAction(workflow.id, 'pause')}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {workflow.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowAction(workflow.id, 'play')}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {workflow.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowAction(workflow.id, 'restart')}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Restart
                          </Button>
                        )}
                        
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))) : (
                <GlassCard className="col-span-full text-center py-12 text-gray-500 animate-fadeIn">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <FolderKanban className="h-12 w-12 text-gray-600" />
                    <p className="text-lg">No workflows found matching your criteria.</p>
                    <Button onClick={() => setIsAddWorkflowModalOpen(true)} className="btn-primary">
                      Create Your First Workflow
                    </Button>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Workflow Components */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WorkflowTemplateManager />
              <WorkflowScheduler />
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Workflow Modal */}
      {isAddWorkflowModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Workflow</h2>
            {/* Add workflow form content here */}
          </GlassCard>
        </div>
      )}
    </div>
  );
} 