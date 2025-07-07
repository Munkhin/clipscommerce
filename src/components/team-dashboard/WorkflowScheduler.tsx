'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, Clock, Play, Pause, 
  RotateCcw, Trash2, Plus 
} from 'lucide-react';
import { format } from 'date-fns';

export interface ScheduledWorkflow {
  id: string;
  name: string;
  description?: string;
  schedule: {
    type: 'once' | 'recurring';
    date: Date;
    time: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
  };
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
  lastRun?: Date;
  nextRun?: Date;
  workflowId: string;
}

export interface WorkflowSchedulerProps {
  workflows?: ScheduledWorkflow[];
  onWorkflowSchedule?: (workflow: Omit<ScheduledWorkflow, 'id'>) => void;
  onWorkflowUpdate?: (workflow: ScheduledWorkflow) => void;
  onWorkflowDelete?: (workflowId: string) => void;
  onWorkflowToggle?: (workflowId: string, paused: boolean) => void;
  className?: string;
}

const defaultWorkflows: ScheduledWorkflow[] = [
  {
    id: '1',
    name: 'Daily Content Processing',
    description: 'Process and analyze daily content uploads',
    schedule: {
      type: 'recurring',
      date: new Date(),
      time: '09:00',
      frequency: 'daily'
    },
    status: 'scheduled',
    lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 60 * 60 * 1000),
    workflowId: 'content-processing-workflow'
  },
  {
    id: '2',
    name: 'Weekly Analytics Report',
    description: 'Generate comprehensive analytics report',
    schedule: {
      type: 'recurring',
      date: new Date(),
      time: '10:00',
      frequency: 'weekly',
      daysOfWeek: [1] // Monday
    },
    status: 'completed',
    lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    workflowId: 'analytics-report-workflow'
  }
];

export function WorkflowScheduler({ 
  workflows = defaultWorkflows,
  onWorkflowSchedule,
  onWorkflowUpdate,
  onWorkflowDelete,
  onWorkflowToggle,
  className 
}: WorkflowSchedulerProps) {
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    workflowId: '',
    scheduleType: 'once' as 'once' | 'recurring',
    time: '09:00',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly'
  });

  const handleScheduleWorkflow = () => {
    if (!newWorkflow.name || !newWorkflow.workflowId || !selectedDate) return;
    
    const scheduledWorkflow: Omit<ScheduledWorkflow, 'id'> = {
      name: newWorkflow.name,
      description: newWorkflow.description,
      workflowId: newWorkflow.workflowId,
      schedule: {
        type: newWorkflow.scheduleType,
        date: selectedDate,
        time: newWorkflow.time,
        frequency: newWorkflow.scheduleType === 'recurring' ? newWorkflow.frequency : undefined
      },
      status: 'scheduled'
    };
    
    onWorkflowSchedule?.(scheduledWorkflow);
    setShowNewWorkflow(false);
    setNewWorkflow({
      name: '',
      description: '',
      workflowId: '',
      scheduleType: 'once',
      time: '09:00',
      frequency: 'daily'
    });
    setSelectedDate(undefined);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4 text-green-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <RotateCcw className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workflow Scheduler</CardTitle>
            <CardDescription>
              Schedule and manage automated workflows
            </CardDescription>
          </div>
          <Button onClick={() => setShowNewWorkflow(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Workflow
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* New Workflow Form */}
        {showNewWorkflow && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Schedule New Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    placeholder="Enter workflow name"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflow-id">Workflow ID</Label>
                  <Input
                    id="workflow-id"
                    placeholder="workflow-identifier"
                    value={newWorkflow.workflowId}
                    onChange={(e) => setNewWorkflow({...newWorkflow, workflowId: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Workflow description"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Select 
                    value={newWorkflow.scheduleType} 
                    onValueChange={(value: 'once' | 'recurring') => 
                      setNewWorkflow({...newWorkflow, scheduleType: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Run Once</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newWorkflow.time}
                    onChange={(e) => setNewWorkflow({...newWorkflow, time: e.target.value})}
                  />
                </div>
              </div>
              
              {newWorkflow.scheduleType === 'recurring' && (
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select 
                    value={newWorkflow.frequency} 
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                      setNewWorkflow({...newWorkflow, frequency: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleScheduleWorkflow}>
                  Schedule Workflow
                </Button>
                <Button variant="outline" onClick={() => setShowNewWorkflow(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Scheduled Workflows List */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Scheduled Workflows ({workflows.length})</h3>
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">{getStatusIcon(workflow.status)}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{workflow.name}</h4>
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Schedule: {workflow.schedule.type === 'recurring' ? workflow.schedule.frequency : 'once'}</span>
                        <span>Time: {workflow.schedule.time}</span>
                        {workflow.nextRun && (
                          <span>Next: {format(workflow.nextRun, 'MMM dd, HH:mm')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onWorkflowToggle?.(workflow.id, workflow.status !== 'paused')}
                    >
                      {workflow.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onWorkflowDelete?.(workflow.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {workflows.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No workflows scheduled. Create your first scheduled workflow to automate your processes.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowScheduler;