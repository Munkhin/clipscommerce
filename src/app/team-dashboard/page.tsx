'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  BarChart3, 
  Zap, 
  TrendingUp, 
  Activity, 
  ArrowRight,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Lock,
  Play,
  Pause,
  RefreshCw,
  Upload,
  Download,
  Mail,
  Calendar,
  Settings,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  DollarSign,
  Sparkles,
  Rocket,
  Globe,
  Filter,
  Search,
  Plus,
  Layers,
  Cpu,
  Database,
  Network,
  Workflow,
  Bot,
  Gauge,
  LineChart,
  PieChart,
  BarChart,
  Briefcase,
  Star,
  Award,
  Flame,
  Zap as Lightning,
  FileVideo,
  MousePointer2,
  Maximize2,
  Minimize2,
  ChevronRight,
  MoreHorizontal,
  Bell,
  UserCheck,
  TrendingDown,
  ShoppingBag,
  Video,
  Building,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import { ChartWrapper } from '@/components/ui/chart-wrapper';
import { LineChartComponent, BarChartComponent } from '@/components/dashboard/charts';
import GlassCard from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
// Note: These components need to be implemented
// import { ClientOverviewGrid } from '@/components/ui/client-overview-grid';
// import { WorkflowStatusOverview } from '@/components/ui/workflow-status-overview';
// import { TeamActivityStream } from '@/components/ui/team-activity-stream';

export default function TeamDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { totalClientCount, setCurrentTab } = useTeamMode();
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [animationStage, setAnimationStage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    totalRevenue: 847250,
    revenueGrowth: 23.4,
    activeClients: 1247,
    clientGrowth: 8.7,
    teamEfficiency: 94.2,
    efficiencyChange: 12.1,
    processingRate: 2847,
    queueSize: 234
  });

  // Mock subscription tier - team plan for demo
  const subscriptionTier = 'team';
  const { hasFeatureAccess, tier } = useUsageLimits(subscriptionTier);

  // Check team dashboard access
  const hasTeamAccess = hasFeatureAccess('teamDashboard');

  const isTeam = user?.user_metadata?.subscription_tier === 'team';

  // Utility functions for consistent styling
  const getMetricColorClass = (id: string) => {
    switch (id) {
      case 'revenue': return 'bg-emerald-500/20 text-emerald-400';
      case 'clients': return 'bg-purple-500/20 text-purple-400';
      case 'efficiency': return 'bg-emerald-500/20 text-emerald-400';
      case 'processing': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getMetricProgress = (id: string) => {
    switch (id) {
      case 'revenue': return Math.min(100, realtimeMetrics.revenueGrowth * 3);
      case 'clients': return Math.min(100, realtimeMetrics.clientGrowth * 5);
      case 'efficiency': return realtimeMetrics.teamEfficiency;
      case 'processing': return Math.min(100, realtimeMetrics.processingRate / 30); // Example progress
      default: return 50;
    }
  };

  const getModuleColorClass = (id: string) => {
    switch (id) {
      case 'bulk-operations': return 'bg-emerald-500/20 text-emerald-400';
      case 'client-management-module': return 'bg-purple-500/20 text-purple-400';
      case 'analytics-reports': return 'bg-violet-500/20 text-violet-400';
      case 'workflow-automation': return 'bg-teal-500/20 text-teal-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getModuleButtonClass = (id: string) => {
    switch (id) {
      case 'bulk-operations': return 'bg-emerald-600 hover:bg-emerald-700';
      case 'client-management-module': return 'bg-purple-600 hover:bg-purple-700';
      case 'analytics-reports': return 'bg-violet-600 hover:bg-violet-700';
      case 'workflow-automation': return 'bg-teal-600 hover:bg-teal-700';
      default: return 'bg-slate-600 hover:bg-slate-700';
    }
  };

  const getActivityColorClass = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-emerald-500/20 text-emerald-400';
      case 'optimization': return 'bg-purple-500/20 text-purple-400';
      case 'alert': return 'bg-amber-500/20 text-amber-400';
      case 'client-onboard': return 'bg-blue-500/20 text-blue-400';
      case 'workflow-update': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getAlertColorClass = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-emerald-500/20 text-emerald-400';
      case 'warning': return 'bg-amber-500/20 text-amber-400';
      case 'critical': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getUsageColorClass = (id: string) => {
    switch (id) {
      case 'ai-credits': return 'bg-purple-500/20 text-purple-400';
      case 'video-processing-hours': return 'bg-blue-500/20 text-blue-400';
      case 'automation-tasks': return 'bg-teal-500/20 text-teal-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Staggered animation entrance
  useEffect(() => {
    const stages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Expanded stages for all sections
    stages.forEach((stage, index) => {
      setTimeout(() => setAnimationStage(stage), index * 150);
    });
  }, []);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeMetrics(prev => ({
        totalRevenue: prev.totalRevenue + Math.floor(Math.random() * 1000) - 500,
        revenueGrowth: Math.max(0, prev.revenueGrowth + (Math.random() - 0.5) * 0.5),
        activeClients: prev.activeClients + Math.floor(Math.random() * 10) - 5,
        clientGrowth: Math.max(0, prev.clientGrowth + (Math.random() - 0.5) * 0.3),
        teamEfficiency: Math.max(80, Math.min(100, prev.teamEfficiency + (Math.random() - 0.5) * 0.5)),
        efficiencyChange: Math.max(0, prev.efficiencyChange + (Math.random() - 0.5) * 0.3),
        processingRate: Math.max(1000, prev.processingRate + Math.floor(Math.random() * 200) - 100),
        queueSize: Math.max(0, prev.queueSize + Math.floor(Math.random() * 50) - 25)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // If no team access, show upgrade prompt
  if (!hasTeamAccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <Card className="max-w-md w-full bg-slate-900 border border-slate-700 shadow-xl relative z-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-slate-800 border border-slate-700">
                <Lock className="h-8 w-8 text-slate-300" />
              </div>
            </div>
            <CardTitle className="text-xl text-white">Team Dashboard Access Required</CardTitle>
            <CardDescription className="text-slate-400">
              The Team Dashboard is available for Team plan subscribers only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h4 className="font-semibold text-white mb-2">Current Plan: {tier?.name}</h4>
              <p className="text-sm text-slate-300 mb-3">
                Upgrade to Team plan to unlock:
              </p>
              <ul className="text-sm text-slate-200 space-y-1">
                <li className="flex items-center">
                  <Shield className="h-4 w-4 text-purple-400 mr-2" />
                  Advanced team management
                </li>
                <li className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-purple-400 mr-2" />
                  Advanced analytics & reporting
                </li>
                <li className="flex items-center">
                  <Users className="h-4 w-4 text-purple-400 mr-2" />
                  Multi-client management
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => router.push('/dashboard/subscription')}
                className="w-full bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md"
              >
                Upgrade to Team Plan
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Back to My Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isTeam) {
    return (
      <div data-testid="team-restricted-content" className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Team-only features</h2>
        <p className="text-lg text-muted-foreground">
          <span>Upgrade to Team</span> to access these features.
        </p>
      </div>
    );
  }

  const teamMetrics = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `$${(realtimeMetrics.totalRevenue / 1000).toFixed(1)}K`,
      change: `${realtimeMetrics.revenueGrowth.toFixed(1)}%`,
      icon: DollarSign,
      trend: realtimeMetrics.revenueGrowth >= 0 ? 'up' : 'down',
      chartData: [
        { name: 'Jan', value: 4000 }, { name: 'Feb', value: 3000 }, { name: 'Mar', value: 2000 },
        { name: 'Apr', value: 2780 }, { name: 'May', value: 1890 }, { name: 'Jun', value: 2390 },
        { name: 'Jul', value: 3490 }
      ]
    },
    {
      id: 'clients',
      title: 'Active Clients',
      value: realtimeMetrics.activeClients,
      change: `${realtimeMetrics.clientGrowth.toFixed(1)}%`,
      icon: Users,
      trend: realtimeMetrics.clientGrowth >= 0 ? 'up' : 'down',
      chartData: [
        { name: 'Jan', value: 200 }, { name: 'Feb', value: 220 }, { name: 'Mar', value: 180 },
        { name: 'Apr', value: 250 }, { name: 'May', value: 230 }, { name: 'Jun', value: 270 },
        { name: 'Jul', value: 290 }
      ]
    },
    {
      id: 'efficiency',
      title: 'Team Efficiency',
      value: `${realtimeMetrics.teamEfficiency.toFixed(1)}%`,
      change: `${realtimeMetrics.efficiencyChange.toFixed(1)}%`,
      icon: Gauge,
      trend: realtimeMetrics.efficiencyChange >= 0 ? 'up' : 'down',
      chartData: [
        { name: 'Jan', value: 70 }, { name: 'Feb', value: 75 }, { name: 'Mar', value: 80 },
        { name: 'Apr', value: 78 }, { name: 'May', value: 85 }, { name: 'Jun', value: 82 },
        { name: 'Jul', value: 88 }
      ]
    },
    {
      id: 'processing',
      title: 'Processing Rate',
      value: `${realtimeMetrics.processingRate} ops/sec`,
      change: `${realtimeMetrics.queueSize} in queue`,
      icon: Cpu,
      trend: 'flat', // No direct trend for processing rate change
      chartData: [
        { name: 'Jan', value: 1500 }, { name: 'Feb', value: 1700 }, { name: 'Mar', value: 1600 },
        { name: 'Apr', value: 1800 }, { name: 'May', value: 1750 }, { name: 'Jun', value: 1900 },
        { name: 'Jul', value: 2000 }
      ]
    },
  ];

  const workflowModules = [
    {
      id: 'bulk-operations',
      title: 'Bulk Operations Panel',
      description: 'Manage and automate tasks across multiple clients and campaigns simultaneously.',
      icon: Layers,
      buttonText: 'Launch Panel',
      link: '/dashboard/bulk-operations',
      features: [
        { text: 'Mass content uploads', icon: Upload },
        { text: 'Campaign scheduling', icon: Calendar },
        { text: 'Performance adjustments', icon: BarChart3 }
      ]
    },
    {
      id: 'client-management-module',
      title: 'Client Management Module',
      description: 'Centralized hub for detailed client insights, performance tracking, and communication.',
      icon: Briefcase,
      buttonText: 'View Clients',
      link: '/dashboard/client-management',
      features: [
        { text: 'Zoom-in client profiles', icon: Eye },
        { text: 'Custom reporting', icon: FileVideo },
        { text: 'Direct communication tools', icon: Mail }
      ]
    },
    {
      id: 'analytics-reports',
      title: 'Advanced Analytics & Reports',
      description: 'Deep-dive into performance data with AI-driven insights and customizable reports.',
      icon: LineChart,
      buttonText: 'Generate Reports',
      link: '/dashboard/analytics-reports',
      features: [
        { text: 'Predictive analytics', icon: TrendingUp },
        { text: 'Real-time data feeds', icon: Activity },
        { text: 'Automated report generation', icon: RefreshCw }
      ]
    },
    {
      id: 'workflow-automation',
      title: 'Workflow Automation Engine',
      description: 'Design, deploy, and monitor automated workflows for content, campaigns, and more.',
      icon: Workflow,
      buttonText: 'Manage Workflows',
      link: '/dashboard/workflow-automation',
      features: [
        { text: 'AI-powered task routing', icon: Bot },
        { text: 'Conditional logic builder', icon: Target },
        { text: 'Integrated approval flows', icon: CheckCircle2 }
      ]
    },
  ];

  const recentActivities = [
    { id: 1, type: 'sale', description: 'New Team Plan subscription from Acme Corp', time: '5 mins ago', icon: DollarSign },
    { id: 2, type: 'optimization', description: 'Video content optimized for Client A', time: '1 hour ago', icon: Sparkles },
    { id: 3, type: 'alert', description: 'High processing queue detected, initiating scale-up', time: '2 hours ago', icon: AlertTriangle },
    { id: 4, type: 'client-onboard', description: 'New client "Global Brands Inc." onboarded', time: '1 day ago', icon: UserCheck },
    { id: 5, type: 'workflow-update', description: 'Content approval workflow updated by John Doe', time: '2 days ago', icon: Workflow },
    { id: 6, type: 'sale', description: 'Enterprise Plan upgrade from Tech Solutions LLC', time: '3 days ago', icon: Rocket },
  ];

  const teamAlerts = [
    { id: 1, type: 'critical', title: 'Payment Gateway Issue', description: 'Immediate action required: Payment processing is experiencing disruptions.', icon: CreditCard },
    { id: 2, type: 'warning', title: 'Content Moderation Backlog', description: 'Growing backlog in content moderation. Consider assigning more resources.', icon: Pause },
    { id: 3, type: 'positive', title: 'New AI Model Deployed', description: 'Successfully deployed new AI model for enhanced content ideation.', icon: CheckCircle2 },
    { id: 4, type: 'warning', title: 'Server Load Imbalance', description: 'Monitoring server load imbalance, automatic rebalancing in progress.', icon: Network },
  ];

  const usageBreakdown = [
    { id: 'ai-credits', title: 'AI Credits Used', current: 7500, limit: 10000, unit: 'credits', icon: Cpu },
    { id: 'video-processing-hours', title: 'Video Processing Hours', current: 120, limit: 200, unit: 'hours', icon: FileVideo },
    { id: 'automation-tasks', title: 'Automation Tasks', current: 4500, limit: 5000, unit: 'tasks', icon: Bot },
  ];

  const teamMembers = [
    { id: 1, name: 'Alice Johnson', role: 'Team Lead', status: 'Active', avatar: '/avatars/avatar1.jpg' },
    { id: 2, name: 'Bob Williams', role: 'Content Strategist', status: 'Active', avatar: '/avatars/avatar2.jpg' },
    { id: 3, name: 'Charlie Brown', role: 'AI Engineer', status: 'Active', avatar: '/avatars/avatar3.jpg' },
    { id: 4, name: 'Diana Prince', role: 'Client Manager', status: 'On Leave', avatar: '/avatars/avatar4.jpg' },
    { id: 5, name: 'Eve Adams', role: 'Data Analyst', status: 'Active', avatar: '/avatars/avatar5.jpg' },
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const currentClientData = [
    { category: 'Client A', value: 400 },
    { category: 'Client B', value: 300 },
    { category: 'Client C', value: 200 },
    { category: 'Client D', value: 100 },
    { category: 'Other', value: 50 }
  ];

  const ClientDetailView = ({ client }: any) => (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-2">{client.name}</h3>
      <p className="text-sm text-slate-400">ID: {client.id}</p>
      <p className="text-sm text-slate-400">Total Projects: {client.totalProjects}</p>
      <p className="text-sm text-slate-400">Active Campaigns: {client.activeCampaigns}</p>
      <p className="text-sm text-slate-400">Last Activity: {client.lastActivity}</p>
      <Button size="sm" className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white">View Details</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground transition-all duration-500">
            Team Dashboard — Total Clients: {totalClientCount} clients
          </h1>
        </div>
        <p className="text-slate-400 mb-8">Comprehensive overview of your team's performance, workflows, and client activities.</p>

        {/* Search and Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search team members, clients, or modules..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex space-x-2 w-full sm:w-auto justify-end">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              <Filter className="h-4 w-4 mr-2" /> Filter
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> New Task
            </Button>
          </div>
        </div>

        {/* Main Team Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {teamMetrics.map((metric, index) => (
            <GlassCard
              key={metric.id}
              className={`bg-slate-900 border border-slate-700 shadow-lg relative overflow-hidden transition-all duration-500 transform ${animationStage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:scale-[1.02]`}
            >
              <div className="flex flex-row items-center justify-between pb-2">
                <p className="text-slate-400 text-sm">{metric.title}</p>
                <metric.icon className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-2">{metric.value}</div>
                <div className={`flex items-center text-sm ${metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                  {metric.trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
                  {metric.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                  {metric.change}
                </div>
                <Progress value={getMetricProgress(metric.id)} className="mt-3 h-2 bg-slate-800 [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg [&::-webkit-progress-value]:bg-purple-500" />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Workflow Modules */}
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
          <Workflow className="h-7 w-7 mr-3 text-teal-400" /> Workflow Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {workflowModules.map((module, index) => (
            <GlassCard
              key={module.id}
              className={`bg-slate-900 border border-slate-700 shadow-lg relative overflow-hidden transition-all duration-500 transform ${animationStage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:scale-[1.02]`}
            >
              <div className="flex flex-row items-center justify-between pb-2">
                <h3 className="text-xl font-semibold text-white">{module.title}</h3>
                <module.icon className="h-6 w-6 text-slate-500" />
              </div>
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">{module.description}</p>
                <ul className="text-sm text-slate-300 space-y-2">
                  {module.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center">
                      <feature.icon className="h-4 w-4 mr-2 text-blue-400" /> {feature.text}
                    </li>
                  ))}
                </ul>
                <AnimatedButton onClick={() => router.push(module.link)} className={`w-full ${getModuleButtonClass(module.id)} text-white font-semibold`}>
                  {module.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                </AnimatedButton>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Team Activity and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Recent Activity */}
          <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg transition-all duration-500 transform ${animationStage >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center">
                <Activity className="h-6 w-6 mr-2 text-yellow-400" /> Recent Activity
              </h3>
            </div>
            <div>
              <ul className="space-y-4">
                {recentActivities.map(activity => (
                  <li key={activity.id} className="flex items-start">
                    <div className={`p-2 rounded-full ${getActivityColorClass(activity.type)} mr-3`}>
                      <activity.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{activity.description}</p>
                      <p className="text-slate-500 text-sm">{activity.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>

          {/* Team Alerts */}
          <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg transition-all duration-500 transform ${animationStage >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center">
                <Bell className="h-6 w-6 mr-2 text-red-400" /> Team Alerts
              </h3>
            </div>
            <div>
              <ul className="space-y-4">
                {teamAlerts.map(alert => (
                  <li key={alert.id} className="flex items-start">
                    <div className={`p-2 rounded-full ${getAlertColorClass(alert.type)} mr-3`}>
                      <alert.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{alert.title}</p>
                      <p className="text-slate-500 text-sm">{alert.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </div>

        {/* Usage & Team Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Usage Breakdown */}
          <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg transition-all duration-500 transform ${animationStage >= 5 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center">
                <PieChart className="h-6 w-6 mr-2 text-blue-400" /> Usage Breakdown
              </h3>
            </div>
            <div className="space-y-4">
              {usageBreakdown.map(usage => (
                <div key={usage.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium flex items-center">
                      <usage.icon className="h-4 w-4 mr-2 text-slate-400" /> {usage.title}
                    </span>
                    <span className="text-slate-400 text-sm">{usage.current} / {usage.limit} {usage.unit}</span>
                  </div>
                  <Progress value={(usage.current / usage.limit) * 100} className="h-2 bg-slate-800 [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg [&::-webkit-progress-value]:bg-blue-500" />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Team Members */}
          <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg transition-all duration-500 transform ${animationStage >= 6 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center">
                <Users className="h-6 w-6 mr-2 text-emerald-400" /> Team Members ({teamMembers.length})
              </h3>
            </div>
            <div>
              <div className="space-y-4">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center">
                      <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-full mr-3 border border-slate-600" />
                      <div>
                        <p className="text-white font-medium">{member.name}</p>
                        <p className="text-slate-400 text-sm">{member.role}</p>
                      </div>
                    </div>
                    <Badge className={`${member.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <AnimatedButton variant="outline" className="mt-6 w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                Manage Team <ArrowRight className="ml-2 h-4 w-4" />
              </AnimatedButton>
            </div>
          </GlassCard>
        </div>

        {/* Client Distribution (Chart) */}
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
          <BarChart className="h-7 w-7 mr-3 text-violet-400" /> Client Distribution
        </h2>
        <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg mb-12 transition-all duration-500 transform ${animationStage >= 7 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="p-6">
            <ChartWrapper title="Client Revenue Distribution" description="Revenue contribution by top clients">
              <BarChartComponent
                data={currentClientData}
                categoryKey="category"
                valueKey="value"
                valueFormatter={(value: number) => `$${formatNumber(value)}`}
                className="h-[300px]"
              />
            </ChartWrapper>
          </div>
        </GlassCard>

        {/* Placeholder for Dynamic Client List - now a table */}
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
          <Building className="h-7 w-7 mr-3 text-cyan-400" /> Top Clients Overview
        </h2>
        <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg mb-12 transition-all duration-500 transform ${animationStage >= 8 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider rounded-tl-lg">Client Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Projects</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Active Campaigns</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider rounded-tr-lg">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-800">
                  {/* Sample Data, replace with actual fetched data */}
                  {[
                    { id: '1', name: 'Alpha Solutions', totalProjects: 15, activeCampaigns: 7, lastActivity: '2 days ago' },
                    { id: '2', name: 'Beta Innovations', totalProjects: 10, activeCampaigns: 5, lastActivity: '1 week ago' },
                    { id: '3', name: 'Gamma Enterprises', totalProjects: 22, activeCampaigns: 12, lastActivity: '3 hours ago' },
                    { id: '4', name: 'Delta Dynamics', totalProjects: 8, activeCampaigns: 3, lastActivity: '4 days ago' },
                  ].map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{client.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">{client.totalProjects}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">{client.activeCampaigns}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">{client.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AnimatedButton variant="outline" className="mt-6 w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                View All Clients <ArrowRight className="ml-2 h-4 w-4" />
            </AnimatedButton>
          </div>
        </GlassCard>

        {/* Call to Action for New Workflow */}
        <GlassCard className={`bg-slate-900 border border-slate-700 shadow-lg text-center p-8 transition-all duration-500 transform ${animationStage >= 9 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="space-y-4">
            <Sparkles className="h-12 w-12 text-purple-500 mx-auto" />
            <h3 className="text-3xl font-bold text-white">Ready to Boost Your Team's Productivity?</h3>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Explore our advanced workflow automation tools and seamlessly integrate AI into your team's operations.
            </p>
            <AnimatedButton onClick={() => router.push('/dashboard/workflow-automation')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105">
              Build a New Workflow <ArrowUpRight className="ml-2 h-5 w-5" />
            </AnimatedButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
} 