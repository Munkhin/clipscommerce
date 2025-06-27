'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Settings, 
  Trash2, 
  Download, 
  Upload,
  CheckSquare,
  Square,
  Zap,
  Calendar,
  RefreshCw,
  Users,
  X,
  AlertTriangle,
  Video,
  Brain,
  Mail,
  Lightbulb,
  BarChart3,
  Clock,
  Target,
  Layers
} from 'lucide-react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface BulkOperationsPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function BulkOperationsPanel({ isVisible, onClose }: BulkOperationsPanelProps) {
  const { selectedClients, clients, clearSelection } = useTeamMode();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationCategory, setOperationCategory] = useState<'standard' | 'automation' | 'analytics'>('automation');
  
  if (!isVisible || selectedClients.length === 0) {
    return null;
  }

  const selectedClientsData = clients.filter(client => selectedClients.includes(client.id));

  const bulkOperations = {
    automation: [
      {
        id: 'bulk_video_processing',
        name: 'Bulk Video Processing',
        description: `Process thousands of videos with brand voice for ${selectedClients.length} clients`,
        icon: Video,
        color: 'text-mint',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.5)} hours`,
        scale: 'Enterprise'
      },
      {
        id: 'auto_posting_schedule',
        name: 'Auto Posting Scheduler',
        description: 'Generate optimal posting schedules across all platforms',
        icon: Calendar,
        color: 'text-lavender',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.1)} hours`,
        scale: 'Enterprise'
      },
      {
        id: 'feedback_automation',
        name: 'Automated Feedback Reports',
        description: 'Generate and send personalized feedback reports to all clients',
        icon: Mail,
        color: 'text-coral',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.2)} hours`,
        scale: 'Enterprise'
      },
      {
        id: 'content_ideation',
        name: 'Content Ideation Engine',
        description: 'Generate content ideas and send ideation reports',
        icon: Lightbulb,
        color: 'text-info',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.15)} hours`,
        scale: 'Enterprise'
      },
      {
        id: 'brand_voice_setup',
        name: 'Brand Voice Configuration',
        description: 'Set up brand voice profiles for all selected clients',
        icon: Brain,
        color: 'text-warning',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.05)} hours`,
        scale: 'Enterprise'
      }
    ],
    standard: [
      {
        id: 'accelerate',
        name: 'Run Accelerate Workflow',
        description: 'Optimize content for all selected clients',
        icon: Zap,
        color: 'text-mint',
        estimatedTime: '30 min',
        scale: 'Standard'
      },
      {
        id: 'blitz',
        name: 'Schedule Bulk Posts',
        description: 'Create posting schedule for selected clients',
        icon: Calendar,
        color: 'text-lavender',
        estimatedTime: '15 min',
        scale: 'Standard'
      },
      {
        id: 'cycle',
        name: 'Generate Analytics Reports',
        description: 'Create performance reports for selected clients',
        icon: RefreshCw,
        color: 'text-coral',
        estimatedTime: '20 min',
        scale: 'Standard'
      }
    ],
    analytics: [
      {
        id: 'performance_analysis',
        name: 'Deep Performance Analysis',
        description: 'Comprehensive performance analysis across all metrics',
        icon: BarChart3,
        color: 'text-mint',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.1)} hours`,
        scale: 'Analytics'
      },
      {
        id: 'trend_analysis',
        name: 'Trend Analysis & Predictions',
        description: 'Analyze trends and generate predictive insights',
        icon: Target,
        color: 'text-lavender',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.2)} hours`,
        scale: 'Analytics'
      },
      {
        id: 'competitive_analysis',
        name: 'Competitive Analysis',
        description: 'Compare performance against industry benchmarks',
        icon: Layers,
        color: 'text-coral',
        estimatedTime: `${Math.ceil(selectedClients.length * 0.3)} hours`,
        scale: 'Analytics'
      }
    ]
  };

  const handleBulkOperation = async (operationId: string) => {
    if (!operationId) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Simulate processing with different speeds based on operation type
    const operation = Object.values(bulkOperations).flat().find(op => op.id === operationId);
    const isEnterpriseOperation = operation?.scale === 'Enterprise';
    const totalSteps = isEnterpriseOperation ? selectedClients.length * 10 : selectedClients.length;
    const stepDelay = isEnterpriseOperation ? 100 : 200;
    
    for (let i = 0; i < totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDelay));
      setProcessingProgress(((i + 1) / totalSteps) * 100);
    }
    
    setIsProcessing(false);
    setProcessingProgress(0);
    setSelectedOperation('');
    
    // In a real app, this would trigger the actual bulk operation
    console.log(`Bulk operation ${operationId} completed for ${selectedClients.length} clients`);
  };

  const getClientStatusCounts = () => {
    const counts = {
      active: 0,
      paused: 0,
      needs_attention: 0
    };
    
    selectedClientsData.forEach(client => {
      counts[client.status]++;
    });
    
    return counts;
  };

  const statusCounts = getClientStatusCounts();
  const currentOperations = bulkOperations[operationCategory];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            {/* Status breakdown */}
            <div className="flex items-center space-x-2 text-sm">
              {statusCounts.active > 0 && (
                <Badge className="bg-mint/20 text-mint border-mint">
                  {statusCounts.active} active
                </Badge>
              )}
              {statusCounts.paused > 0 && (
                <Badge className="bg-lavender/20 text-lavender border-lavender">
                  {statusCounts.paused} paused
                </Badge>
              )}
              {statusCounts.needs_attention > 0 && (
                <Badge className="bg-coral/20 text-coral border-coral">
                  {statusCounts.needs_attention} need attention
                </Badge>
              )}
            </div>

            {/* Scale indicator */}
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
              {selectedClients.length >= 100 ? '1000x Scale' : selectedClients.length >= 10 ? 'Enterprise' : 'Standard'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={operationCategory} onValueChange={(value: any) => setOperationCategory(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automation">Automation</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={isProcessing}
            >
              Clear Selection
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isProcessing && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Processing bulk operation...</span>
              <span className="text-sm text-muted-foreground">{Math.round(processingProgress)}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Processing {selectedClients.length} clients with enterprise-scale automation</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {currentOperations.map((operation) => {
            const IconComponent = operation.icon;
            const isSelected = selectedOperation === operation.id;
            
            return (
              <Card 
                key={operation.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isProcessing) {
                    if (isSelected) {
                      handleBulkOperation(operation.id);
                    } else {
                      setSelectedOperation(operation.id);
                    }
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <IconComponent className={`h-4 w-4 ${operation.color}`} />
                    <span className="font-medium text-sm">{operation.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {operation.scale}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{operation.description}</p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>~{operation.estimatedTime}</span>
                  </div>
                  
                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-border">
                      <Button 
                        size="sm" 
                        className="w-full h-8"
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Execute'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedOperation && !isProcessing && (
          <div className="mt-4 p-3 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-info mt-0.5" />
              <div>
                <p className="text-sm font-medium text-info">
                  Ready to execute {operationCategory} operation
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This action will affect {selectedClients.length} selected client{selectedClients.length !== 1 ? 's' : ''}. 
                  {selectedClients.length >= 100 && ' This is a 1000x scale operation that will process thousands of items.'}
                  {' '}Click the operation card again to proceed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Client Preview */}
        {selectedClientsData.length > 0 && selectedClientsData.length <= 5 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Selected clients:</p>
            <div className="flex flex-wrap gap-2">
              {selectedClientsData.map(client => (
                <Badge key={client.id} variant="outline" className="text-xs">
                  {client.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Scale Information */}
        {selectedClients.length >= 100 && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">1000x Scale Operations Available</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              With {selectedClients.length} clients selected, you can now use enterprise-scale automation 
              modules for bulk video processing, automated reporting, and content generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 