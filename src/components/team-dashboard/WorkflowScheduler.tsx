'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Play, 
  Pause, 
  SkipForward, 
  Edit3, 
  Trash2, 
  Plus,
  Zap,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle2,
  Users,
  Settings,
  Copy,
  MoreHorizontal,
  Video,
  Brain,
  Mail,
  Lightbulb,
  BarChart3,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledWorkflow {
  id: string;
  name: string;
  workflowType: 'accelerate' | 'blitz' | 'cycle' | 'custom' | 'bulk_video_processing' | 'auto_posting' | 'feedback_automation' | 'content_ideation' | 'brand_voice_setup';
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    time: string;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    date?: Date;
  };
  targets: {
    type: 'all' | 'filtered' | 'selected';
    filters?: Record<string, any>;
    clientIds?: string[];
  };
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runHistory: {
    date: Date;
    status: 'success' | 'failed' | 'partial';
    clientsProcessed: number;
    errors?: string[];
    itemsProcessed?: number;
    estimatedDuration?: number;
  }[];
  createdAt: Date;
  automationSettings?: {
    batchSize?: number;
    concurrentJobs?: number;
    retryAttempts?: number;
    brandVoiceProfile?: string;
    platforms?: string[];
    emailTemplate?: string;
  };
}

export function WorkflowScheduler() {
  const [activeTab, setActiveTab] = useState('scheduled');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ScheduledWorkflow | null>(null);

  // Mock scheduled workflows with new automation types
  const [scheduledWorkflows, setScheduledWorkflows] = useState<ScheduledWorkflow[]>([
    {
      id: 'wf-1',
      name: 'Daily Content Optimization',
      workflowType: 'accelerate',
      schedule: {
        type: 'daily',
        time: '09:00'
      },
      targets: {
        type: 'filtered',
        filters: { status: ['active'], engagement: [0, 5] }
      },
      isActive: true,
      lastRun: new Date('2025-01-20T09:00:00'),
      nextRun: new Date('2025-01-21T09:00:00'),
      runHistory: [
        {
          date: new Date('2025-01-20T09:00:00'),
          status: 'success',
          clientsProcessed: 245
        },
        {
          date: new Date('2025-01-19T09:00:00'),
          status: 'success',
          clientsProcessed: 238
        }
      ],
      createdAt: new Date('2025-01-01')
    },
    {
      id: 'wf-2',
      name: 'Weekly Performance Reports',
      workflowType: 'cycle',
      schedule: {
        type: 'weekly',
        time: '08:00',
        daysOfWeek: [1] // Monday
      },
      targets: {
        type: 'all'
      },
      isActive: true,
      lastRun: new Date('2025-01-20T08:00:00'),
      nextRun: new Date('2025-01-27T08:00:00'),
      runHistory: [
        {
          date: new Date('2025-01-20T08:00:00'),
          status: 'success',
          clientsProcessed: 1234
        }
      ],
      createdAt: new Date('2025-01-05')
    },
    {
      id: 'wf-3',
      name: 'High Priority Client Blitz',
      workflowType: 'blitz',
      schedule: {
        type: 'weekly',
        time: '10:30',
        daysOfWeek: [2, 4] // Tuesday, Thursday
      },
      targets: {
        type: 'filtered',
        filters: { tags: ['High Priority', 'VIP Client'] }
      },
      isActive: false,
      lastRun: new Date('2025-01-16T10:30:00'),
      nextRun: new Date('2025-01-21T10:30:00'),
      runHistory: [
        {
          date: new Date('2025-01-16T10:30:00'),
          status: 'partial',
          clientsProcessed: 45,
          errors: ['API rate limit exceeded for 3 clients']
        }
      ],
      createdAt: new Date('2025-01-10')
    },
    {
      id: 'wf-4',
      name: 'Bulk Video Processing - Enterprise',
      workflowType: 'bulk_video_processing',
      schedule: {
        type: 'weekly',
        time: '02:00',
        daysOfWeek: [0] // Sunday
      },
      targets: {
        type: 'filtered',
        filters: { status: ['active'], clientCount: [100, 1000] }
      },
      isActive: true,
      lastRun: new Date('2025-01-19T02:00:00'),
      nextRun: new Date('2025-01-26T02:00:00'),
      runHistory: [
        {
          date: new Date('2025-01-19T02:00:00'),
          status: 'success',
          clientsProcessed: 567,
          itemsProcessed: 15420,
          estimatedDuration: 180
        }
      ],
      createdAt: new Date('2025-01-12'),
      automationSettings: {
        batchSize: 50,
        concurrentJobs: 8,
        retryAttempts: 3,
        brandVoiceProfile: 'auto-detect'
      }
    },
    {
      id: 'wf-5',
      name: 'Auto Posting Scheduler',
      workflowType: 'auto_posting',
      schedule: {
        type: 'daily',
        time: '06:00'
      },
      targets: {
        type: 'all'
      },
      isActive: true,
      lastRun: new Date('2025-01-20T06:00:00'),
      nextRun: new Date('2025-01-21T06:00:00'),
      runHistory: [
        {
          date: new Date('2025-01-20T06:00:00'),
          status: 'success',
          clientsProcessed: 892,
          itemsProcessed: 3456
        }
      ],
      createdAt: new Date('2025-01-08'),
      automationSettings: {
        platforms: ['TikTok', 'Instagram', 'YouTube', 'LinkedIn'],
        concurrentJobs: 12
      }
    },
    {
      id: 'wf-6',
      name: 'Feedback Report Generation',
      workflowType: 'feedback_automation',
      schedule: {
        type: 'weekly',
        time: '09:00',
        daysOfWeek: [5] // Friday
      },
      targets: {
        type: 'all'
      },
      isActive: true,
      lastRun: new Date('2025-01-17T09:00:00'),
      nextRun: new Date('2025-01-24T09:00:00'),
      runHistory: [
        {
          date: new Date('2025-01-17T09:00:00'),
          status: 'success',
          clientsProcessed: 1234,
          itemsProcessed: 1234
        }
      ],
      createdAt: new Date('2025-01-03'),
      automationSettings: {
        emailTemplate: 'professional',
        retryAttempts: 2
      }
    },
    {
      id: 'wf-7',
      name: 'Content Ideation Engine',
      workflowType: 'content_ideation',
      schedule: {
        type: 'weekly',
        time: '07:00',
        daysOfWeek: [1] // Monday
      },
      targets: {
        type: 'filtered',
        filters: { status: ['active'] }
      },
      isActive: true,
      lastRun: new Date('2025-01-20T07:00:00'),
      nextRun: new Date('2025-01-27T07:00:00'),
      runHistory: [
        {
          date: new Date('2025-01-20T07:00:00'),
          status: 'success',
          clientsProcessed: 756,
          itemsProcessed: 2268
        }
      ],
      createdAt: new Date('2025-01-06'),
      automationSettings: {
        batchSize: 25,
        concurrentJobs: 6
      }
    }
  ]);

  // New workflow form state
  const [newWorkflow, setNewWorkflow] = useState<Partial<ScheduledWorkflow>>({
    name: '',
    workflowType: 'accelerate',
    schedule: {
      type: 'daily',
      time: '09:00'
    },
    targets: {
      type: 'all'
    },
    isActive: true,
    automationSettings: {}
  });

  const workflowTypeIcons = {
    accelerate: Zap,
    blitz: Target,
    cycle: RefreshCw,
    custom: Settings,
    bulk_video_processing: Video,
    auto_posting: CalendarIcon,
    feedback_automation: Mail,
    content_ideation: Lightbulb,
    brand_voice_setup: Brain
  };

  const workflowTypeColors = {
    accelerate: 'text-mint bg-mint/10 border-mint/20',
    blitz: 'text-lavender bg-lavender/10 border-lavender/20',
    cycle: 'text-coral bg-coral/10 border-coral/20',
    custom: 'text-info bg-info/10 border-info/20',
    bulk_video_processing: 'text-mint bg-mint/10 border-mint/20',
    auto_posting: 'text-lavender bg-lavender/10 border-lavender/20',
    feedback_automation: 'text-coral bg-coral/10 border-coral/20',
    content_ideation: 'text-info bg-info/10 border-info/20',
    brand_voice_setup: 'text-warning bg-warning/10 border-warning/20'
  };

  const workflowTypeDescriptions = {
    accelerate: 'Content optimization pipeline',
    blitz: 'Automated posting scheduler',
    cycle: 'Performance analytics & improvements',
    custom: 'Custom workflow configuration',
    bulk_video_processing: 'Process thousands of videos with AI',
    auto_posting: 'Optimal timing for social media posts',
    feedback_automation: 'Generate and send feedback reports',
    content_ideation: 'AI-powered content idea generation',
    brand_voice_setup: 'Configure brand voice profiles'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-mint bg-mint/10 border-mint/20';
      case 'failed': return 'text-coral bg-coral/10 border-coral/20';
      case 'partial': return 'text-warning bg-warning/10 border-warning/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getScheduleDescription = (schedule: ScheduledWorkflow['schedule']) => {
    const time = schedule.time;
    
    switch (schedule.type) {
      case 'once':
        return `Once on ${schedule.date ? format(schedule.date, 'MMM dd, yyyy') : 'TBD'} at ${time}`;
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const days = schedule.daysOfWeek?.map(day => 
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
        ).join(', ');
        return `Weekly on ${days || 'TBD'} at ${time}`;
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth || 'TBD'} at ${time}`;
      default:
        return 'Not configured';
    }
  };

  const getTargetDescription = (targets: ScheduledWorkflow['targets']) => {
    switch (targets.type) {
      case 'all':
        return 'All clients';
      case 'selected':
        return `${targets.clientIds?.length || 0} selected clients`;
      case 'filtered':
        const filterCount = Object.keys(targets.filters || {}).length;
        return `Filtered clients (${filterCount} filter${filterCount !== 1 ? 's' : ''})`;
      default:
        return 'No targets';
    }
  };

  const getWorkflowScale = (workflow: ScheduledWorkflow) => {
    const isEnterpriseWorkflow = [
      'bulk_video_processing',
      'auto_posting', 
      'feedback_automation',
      'content_ideation',
      'brand_voice_setup'
    ].includes(workflow.workflowType);
    
    if (isEnterpriseWorkflow) {
      const lastRun = workflow.runHistory[0];
      if (lastRun?.clientsProcessed >= 1000) return '1000x Scale';
      if (lastRun?.clientsProcessed >= 100) return 'Enterprise';
    }
    
    return 'Standard';
  };

  const toggleWorkflowStatus = (id: string) => {
    setScheduledWorkflows(prev => 
      prev.map(wf => 
        wf.id === id ? { ...wf, isActive: !wf.isActive } : wf
      )
    );
  };

  const duplicateWorkflow = (workflow: ScheduledWorkflow) => {
    const newWorkflow: ScheduledWorkflow = {
      ...workflow,
      id: `wf-${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      isActive: false,
      lastRun: undefined,
      nextRun: undefined,
      runHistory: [],
      createdAt: new Date()
    };
    setScheduledWorkflows(prev => [...prev, newWorkflow]);
  };

  const deleteWorkflow = (id: string) => {
    setScheduledWorkflows(prev => prev.filter(wf => wf.id !== id));
  };

  const runWorkflowNow = (id: string) => {
    // In a real app, this would trigger the workflow execution
    console.log(`Running workflow ${id} now`);
  };

  const createWorkflow = () => {
    if (!newWorkflow.name) return;
    
    const workflow: ScheduledWorkflow = {
      id: `wf-${Date.now()}`,
      name: newWorkflow.name,
      workflowType: newWorkflow.workflowType || 'accelerate',
      schedule: newWorkflow.schedule || { type: 'daily', time: '09:00' },
      targets: newWorkflow.targets || { type: 'all' },
      isActive: newWorkflow.isActive || true,
      runHistory: [],
      createdAt: new Date(),
      automationSettings: newWorkflow.automationSettings || {}
    };
    
    setScheduledWorkflows(prev => [...prev, workflow]);
    setNewWorkflow({
      name: '',
      workflowType: 'accelerate',
      schedule: { type: 'daily', time: '09:00' },
      targets: { type: 'all' },
      isActive: true,
      automationSettings: {}
    });
    setShowCreateForm(false);
  };

  const isEnterpriseWorkflow = (type: string) => {
    return [
      'bulk_video_processing',
      'auto_posting', 
      'feedback_automation',
      'content_ideation',
      'brand_voice_setup'
    ].includes(type);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-creative">Workflow Scheduler</h2>
          <p className="text-muted-foreground">
            Automate workflows and schedule enterprise-scale operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Play className="h-3 w-3" />
            {scheduledWorkflows.filter(wf => wf.isActive).length} Active
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {scheduledWorkflows.filter(wf => isEnterpriseWorkflow(wf.workflowType)).length} Enterprise
          </Badge>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled Workflows</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid gap-4">
            {scheduledWorkflows.map((workflow) => {
              const IconComponent = workflowTypeIcons[workflow.workflowType];
              const scale = getWorkflowScale(workflow);
              
              return (
                <Card key={workflow.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${workflowTypeColors[workflow.workflowType]}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{workflow.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {workflowTypeDescriptions[workflow.workflowType]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {workflow.workflowType.replace('_', ' ')}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={scale === '1000x Scale' ? 'bg-primary/10 text-primary border-primary' : ''}
                            >
                              {scale}
                            </Badge>
                            {isEnterpriseWorkflow(workflow.workflowType) && (
                              <Badge variant="outline" className="bg-mint/10 text-mint border-mint">
                                Enterprise
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Schedule:</span>
                            <div className="font-medium">{getScheduleDescription(workflow.schedule)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Targets:</span>
                            <div className="font-medium">{getTargetDescription(workflow.targets)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Run:</span>
                            <div className="font-medium">
                              {workflow.lastRun ? format(workflow.lastRun, 'MMM dd, HH:mm') : 'Never'}
                            </div>
                          </div>
                        </div>

                        {workflow.runHistory.length > 0 && (
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(workflow.runHistory[0].status)}>
                                {workflow.runHistory[0].status}
                              </Badge>
                              <span className="text-muted-foreground">
                                {workflow.runHistory[0].clientsProcessed} clients processed
                              </span>
                              {workflow.runHistory[0].itemsProcessed && (
                                <span className="text-muted-foreground">
                                  • {workflow.runHistory[0].itemsProcessed.toLocaleString()} items
                                </span>
                              )}
                              {workflow.runHistory[0].estimatedDuration && (
                                <span className="text-muted-foreground">
                                  • {workflow.runHistory[0].estimatedDuration}min
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {workflow.automationSettings && Object.keys(workflow.automationSettings).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {workflow.automationSettings.batchSize && (
                              <Badge variant="outline" className="text-xs">
                                Batch: {workflow.automationSettings.batchSize}
                              </Badge>
                            )}
                            {workflow.automationSettings.concurrentJobs && (
                              <Badge variant="outline" className="text-xs">
                                Concurrent: {workflow.automationSettings.concurrentJobs}
                              </Badge>
                            )}
                            {workflow.automationSettings.platforms && (
                              <Badge variant="outline" className="text-xs">
                                {workflow.automationSettings.platforms.length} platforms
                              </Badge>
                            )}
                            {workflow.automationSettings.brandVoiceProfile && (
                              <Badge variant="outline" className="text-xs">
                                Voice: {workflow.automationSettings.brandVoiceProfile}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={workflow.isActive}
                          onCheckedChange={() => toggleWorkflowStatus(workflow.id)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runWorkflowNow(workflow.id)}
                          disabled={!workflow.isActive}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run Now
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="end">
                            <div className="space-y-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSelectedWorkflow(workflow)}
                              >
                                <Edit3 className="h-3 w-3 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => duplicateWorkflow(workflow)}
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                Duplicate
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-coral hover:text-coral"
                                onClick={() => deleteWorkflow(workflow.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Workflow Run History</CardTitle>
              <CardDescription>Recent workflow executions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledWorkflows
                  .flatMap(wf => 
                    wf.runHistory.map(run => ({ ...run, workflowName: wf.name, workflowType: wf.workflowType }))
                  )
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .slice(0, 10)
                  .map((run, index) => {
                    const IconComponent = workflowTypeIcons[run.workflowType];
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{run.workflowName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(run.date, 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right text-sm">
                            <div>{run.clientsProcessed} clients</div>
                            {run.itemsProcessed && (
                              <div className="text-muted-foreground">
                                {run.itemsProcessed.toLocaleString()} items
                              </div>
                            )}
                          </div>
                          <Badge className={getStatusColor(run.status)}>
                            {run.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(workflowTypeDescriptions).map(([type, description]) => {
              const IconComponent = workflowTypeIcons[type as keyof typeof workflowTypeIcons];
              const isEnterprise = isEnterpriseWorkflow(type);
              
              return (
                <Card key={type} className="border-border cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${workflowTypeColors[type as keyof typeof workflowTypeColors]}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium capitalize">
                          {type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {isEnterprise && (
                            <Badge variant="outline" className="text-xs bg-mint/10 text-mint border-mint">
                              Enterprise
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Template
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Form */}
      {showCreateForm && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Create New Workflow</CardTitle>
            <CardDescription>Set up automated workflows for your team operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={newWorkflow.name || ''}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="Enter workflow name"
                />
              </div>
              <div>
                <Label htmlFor="workflow-type">Workflow Type</Label>
                <Select
                  value={newWorkflow.workflowType}
                  onValueChange={(value: any) => setNewWorkflow({ ...newWorkflow, workflowType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accelerate">Accelerate - Content Optimization</SelectItem>
                    <SelectItem value="blitz">Blitz - Automated Posting</SelectItem>
                    <SelectItem value="cycle">Cycle - Performance Analytics</SelectItem>
                    <SelectItem value="bulk_video_processing">Bulk Video Processing (Enterprise)</SelectItem>
                    <SelectItem value="auto_posting">Auto Posting Scheduler (Enterprise)</SelectItem>
                    <SelectItem value="feedback_automation">Feedback Automation (Enterprise)</SelectItem>
                    <SelectItem value="content_ideation">Content Ideation (Enterprise)</SelectItem>
                    <SelectItem value="brand_voice_setup">Brand Voice Setup (Enterprise)</SelectItem>
                    <SelectItem value="custom">Custom Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEnterpriseWorkflow(newWorkflow.workflowType || '') && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">Enterprise Workflow</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This workflow is designed for 1000x scale operations and includes advanced automation features.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="schedule-type">Schedule Type</Label>
                <Select
                  value={newWorkflow.schedule?.type}
                  onValueChange={(value: any) => 
                    setNewWorkflow({ 
                      ...newWorkflow, 
                      schedule: { ...newWorkflow.schedule!, type: value } 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={newWorkflow.schedule?.time || '09:00'}
                  onChange={(e) => 
                    setNewWorkflow({ 
                      ...newWorkflow, 
                      schedule: { ...newWorkflow.schedule!, time: e.target.value } 
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="target-type">Target Clients</Label>
                <Select
                  value={newWorkflow.targets?.type}
                  onValueChange={(value: any) => 
                    setNewWorkflow({ 
                      ...newWorkflow, 
                      targets: { ...newWorkflow.targets!, type: value } 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="filtered">Filtered Clients</SelectItem>
                    <SelectItem value="selected">Selected Clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newWorkflow.isActive}
                  onCheckedChange={(checked) => setNewWorkflow({ ...newWorkflow, isActive: checked })}
                />
                <Label>Start workflow immediately</Label>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={createWorkflow} disabled={!newWorkflow.name}>
                  Create Workflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 