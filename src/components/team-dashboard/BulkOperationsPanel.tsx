'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, CheckCircle } from 'lucide-react';

export interface BulkOperation {
  id: string;
  name: string;
  type: 'update' | 'delete' | 'export' | 'process';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  itemCount?: number;
}

export interface BulkOperationsPanelProps {
  operations?: BulkOperation[];
  onOperationStart?: (operationId: string) => void;
  onOperationStop?: (operationId: string) => void;
  onOperationDelete?: (operationId: string) => void;
  className?: string;
}

const defaultOperations: BulkOperation[] = [
  {
    id: '1',
    name: 'Update Client Status',
    type: 'update',
    status: 'pending',
    progress: 0,
    itemCount: 150
  },
  {
    id: '2',
    name: 'Export Analytics Data',
    type: 'export',
    status: 'running',
    progress: 65,
    itemCount: 500
  },
  {
    id: '3',
    name: 'Process Content Queue',
    type: 'process',
    status: 'completed',
    progress: 100,
    itemCount: 75
  }
];

export function BulkOperationsPanel({ 
  operations = defaultOperations,
  onOperationStart,
  onOperationStop,
  onOperationDelete,
  className 
}: BulkOperationsPanelProps) {
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  const handleSelectOperation = (operationId: string, checked: boolean) => {
    if (checked) {
      setSelectedOperations([...selectedOperations, operationId]);
    } else {
      setSelectedOperations(selectedOperations.filter(id => id !== operationId));
    }
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedOperations.length === 0) return;
    
    selectedOperations.forEach(operationId => {
      switch (bulkAction) {
        case 'start':
          onOperationStart?.(operationId);
          break;
        case 'stop':
          onOperationStop?.(operationId);
          break;
        case 'delete':
          onOperationDelete?.(operationId);
          break;
      }
    });
    
    setSelectedOperations([]);
    setBulkAction('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <Square className="h-4 w-4 text-red-500" />;
      default: return <Pause className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
        <CardDescription>
          Manage and monitor bulk operations across your content and clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bulk Actions */}
        <div className="flex gap-2 items-center p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Bulk Actions:</span>
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Start</SelectItem>
              <SelectItem value="stop">Stop</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={handleBulkAction}
            disabled={!bulkAction || selectedOperations.length === 0}
          >
            Apply ({selectedOperations.length})
          </Button>
        </div>

        {/* Operations List */}
        <div className="space-y-3">
          {operations.map((operation) => (
            <div key={operation.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedOperations.includes(operation.id)}
                    onCheckedChange={(checked) => 
                      handleSelectOperation(operation.id, checked as boolean)
                    }
                  />
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(operation.status)}
                    <div>
                      <h4 className="font-medium">{operation.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {operation.itemCount} items • {operation.type}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(operation.status)}`}>
                    {operation.status}
                  </span>
                </div>
              </div>
              
              {operation.progress !== undefined && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{operation.progress}%</span>
                  </div>
                  <Progress value={operation.progress} className="h-2" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {operations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No bulk operations found. Operations will appear here when created.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BulkOperationsPanel;