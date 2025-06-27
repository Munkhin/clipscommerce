'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Zap,
  Video,
  Brain,
  Mail,
  Lightbulb,
  Calendar,
  Target,
  RefreshCw,
  Activity,
  TrendingUp,
  Clock,
  Layers,
  Bot,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';

// Import all the enhanced components
import { AdvancedClientFilters } from './AdvancedClientFilters';
import { BulkOperationsPanel } from './BulkOperationsPanel';
import { ClientDetailView } from './ClientDetailView';
import { PerformanceMonitoringDashboard } from './PerformanceMonitoringDashboard';
import { WorkflowScheduler } from './WorkflowScheduler';
import { TeamAnalyticsOverview } from './TeamAnalyticsOverview';
import { RoleManagementPanel } from './RoleManagementPanel';

// Import automation modules
import { ContentAutomationModule } from './modules/ContentAutomationModule';
import { BulkVideoProcessor } from './modules/BulkVideoProcessor';
import { AutoPostingScheduler } from './modules/AutoPostingScheduler';
import { FeedbackModule } from './modules/FeedbackModule';
import { ContentIdeationModule } from './modules/ContentIdeationModule';

// Import infrastructure components
import { ScaleManager } from './infrastructure/ScaleManager';
import { BackgroundProcessor } from './infrastructure/BackgroundProcessor';
import { DataFlowManager } from './infrastructure/DataFlowManager';
import { PerformanceOptimizer } from './infrastructure/PerformanceOptimizer';

interface TeamDashboardProps {
  initialView?: 'overview' | 'automation' | 'analytics' | 'operations' | 'workflows' | 'settings';
}

export function TeamDashboard({ initialView = 'overview' }: TeamDashboardProps) {
  const { clients, totalClientCount, isLoading } = useTeamMode();
  const [activeView, setActiveView] = useState(initialView);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);

  // Mock dashboard stats
  const dashboardStats = {
    activeWorkflows: 47,
    processingJobs: 156,
    automationCoverage: 89,
    aiRecommendations: 12,
    systemHealth: 98.7,
    lastUpdate: new Date()
  };

  const automationModules = [
    {
      id: 'content-automation',
      name: 'Content Automation',
      description: 'Bulk video processing with AI-generated content',
      icon: Video,
      status: 'active',
      clients: 847,
      lastRun: '2 hours ago',
      component: ContentAutomationModule
    },
    {
      id: 'auto-posting',
      name: 'Auto Posting Scheduler',
      description: 'Optimal timing for social media posts',
      icon: Calendar,
      status: 'active',
      clients: 1234,
      lastRun: '30 minutes ago',
      component: AutoPostingScheduler
    },
    {
      id: 'feedback-automation',
      name: 'Feedback Automation',
      description: 'AI-generated feedback reports with tone adaptation',
      icon: Mail,
      status: 'active',
      clients: 892,
      lastRun: '1 hour ago',
      component: FeedbackModule
    },
    {
      id: 'content-ideation',
      name: 'Content Ideation',
      description: 'AI-powered content idea generation',
      icon: Lightbulb,
      status: 'active',
      clients: 756,
      lastRun: '3 hours ago',
      component: ContentIdeationModule
    },
    {
      id: 'bulk-processing',
      name: 'Bulk Video Processor',
      description: 'Queue management for thousands of videos',
      icon: Layers,
      status: 'processing',
      clients: 567,
      lastRun: 'Running now',
      component: BulkVideoProcessor
    }
  ];

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowClientDetail(true);
  };

  const handleBackToOverview = () => {
    setShowClientDetail(false);
    setSelectedClientId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading Team Dashboard...</p>
        </div>
      </div>
    );
  }

  if (showClientDetail && selectedClientId) {
    return (
      <ClientDetailView 
        clientId={selectedClientId} 
        onBack={handleBackToOverview}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Skip links for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-1/2 focus:-translate-x-1/2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:p-3 focus:rounded-b-md">Skip to main content</a>
      <a href="#main-navigation" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-1/2 focus:-translate-x-1/2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:p-3 focus:rounded-b-md mt-12">Skip to navigation</a>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-creative">Team Dashboard</h1>
          <p className="text-muted-foreground">
            Enterprise-scale automation and analytics for {totalClientCount.toLocaleString()} clients
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            System Health: {dashboardStats.systemHealth}%
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {dashboardStats.aiRecommendations} AI Insights
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {dashboardStats.activeWorkflows} Active Workflows
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-mint/20 text-mint border-mint">Active</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold">{totalClientCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Enterprise scale</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-info/20 text-info border-info">Running</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
              <p className="text-2xl font-bold">{dashboardStats.activeWorkflows}</p>
              <p className="text-xs text-muted-foreground">Automated processes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-lavender/20 text-lavender border-lavender">Processing</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Queue Jobs</p>
              <p className="text-2xl font-bold">{dashboardStats.processingJobs}</p>
              <p className="text-xs text-muted-foreground">In progress</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-primary/20 text-primary border-primary">AI Powered</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Automation Coverage</p>
              <p className="text-2xl font-bold">{dashboardStats.automationCoverage}%</p>
              <p className="text-xs text-muted-foreground">Client coverage</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-warning/20 text-warning border-warning">Insights</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">AI Recommendations</p>
              <p className="text-2xl font-bold">{dashboardStats.aiRecommendations}</p>
              <p className="text-xs text-muted-foreground">Actionable insights</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full" id="main-content">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-6 gap-2 md:gap-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Automation Modules Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Automation Modules</h3>
              <Button 
                variant="outline" 
                onClick={() => setActiveView('automation')}
              >
                View All Modules
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationModules.slice(0, 3).map((module) => {
                const IconComponent = module.icon;
                
                return (
                  <Card key={module.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">{module.name}</h4>
                        </div>
                        <Badge className={
                          module.status === 'active' ? 'bg-mint/20 text-mint border-mint' :
                          module.status === 'processing' ? 'bg-info/20 text-info border-info' :
                          'bg-muted/20 text-muted-foreground border-muted'
                        }>
                          {module.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {module.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {module.clients.toLocaleString()} clients
                        </span>
                        <span className="text-muted-foreground">
                          {module.lastRun}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Quick Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-mint" />
                  Performance Overview
                </CardTitle>
                <CardDescription>Key metrics across all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Engagement</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">8.7%</span>
                      <Badge className="bg-mint/20 text-mint border-mint text-xs">
                        +12.3%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">$2.3M</span>
                      <Badge className="bg-mint/20 text-mint border-mint text-xs">
                        +15.2%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Automation Efficiency</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">94.2%</span>
                      <Badge className="bg-mint/20 text-mint border-mint text-xs">
                        +3.1%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-info" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-mint" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bulk video processing completed</p>
                      <p className="text-xs text-muted-foreground">847 clients processed • 2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-info" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Auto-posting scheduler updated</p>
                      <p className="text-xs text-muted-foreground">1,234 posts scheduled • 30 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-warning" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New AI recommendations available</p>
                      <p className="text-xs text-muted-foreground">12 actionable insights • 1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {automationModules.map((module) => {
              const ModuleComponent = module.component;
              
              return (
                <Card key={module.id} className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <module.icon className="h-5 w-5" />
                      {module.name}
                    </CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModuleComponent />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PerformanceMonitoringDashboard />
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <AdvancedClientFilters onClientSelect={handleClientSelect} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <BulkOperationsPanel />
              <ScaleManager />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <WorkflowScheduler />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RoleManagementPanel />
            <div className="space-y-6">
              <DataFlowManager />
              <PerformanceOptimizer />
              <BackgroundProcessor />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 