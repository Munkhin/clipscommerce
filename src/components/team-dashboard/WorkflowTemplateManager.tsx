'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: string[];
}

export interface WorkflowTemplateManagerProps {
  templates?: WorkflowTemplate[];
  onTemplateCreate?: (template: WorkflowTemplate) => void;
  onTemplateUpdate?: (template: WorkflowTemplate) => void;
  onTemplateDelete?: (templateId: string) => void;
  className?: string;
}

export function WorkflowTemplateManager({ 
  templates = [], 
  onTemplateCreate, 
  onTemplateUpdate, 
  onTemplateDelete,
  className 
}: WorkflowTemplateManagerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreateTemplate = () => {
    const newTemplate: WorkflowTemplate = {
      id: Date.now().toString(),
      name: 'New Template',
      description: 'Template description',
      category: 'general',
      steps: ['Step 1']
    };
    onTemplateCreate?.(newTemplate);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Workflow Templates</CardTitle>
        <CardDescription>
          Manage reusable workflow templates for your team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Templates ({templates.length})</h3>
          <Button onClick={handleCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
        
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {template.category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onTemplateDelete?.(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {templates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No workflow templates found. Create your first template to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowTemplateManager;