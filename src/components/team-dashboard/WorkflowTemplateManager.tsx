'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, GripVertical, FileJson, Copy } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  config: string; // JSON string of the workflow configuration
}

const initialTemplates: WorkflowTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard Accelerate Workflow',
    description: 'Optimizes content for engagement across all platforms.',
    config: JSON.stringify({ type: 'accelerate', steps: ['analyze', 'optimize', 'publish'] }, null, 2),
  },
  {
    id: 'template-2',
    name: 'Blitz Scheduling Campaign',
    description: 'Schedules a series of posts at optimal times over a week.',
    config: JSON.stringify({ type: 'blitz', schedule: 'weekly', platforms: ['instagram', 'tiktok'] }, null, 2),
  },
  {
    id: 'template-3',
    name: 'Monthly Performance Cycle',
    description: 'Generates a comprehensive performance report and content ideas.',
    config: JSON.stringify({ type: 'cycle', frequency: 'monthly', reporting: true, ideation: true }, null, 2),
  },
];

interface SortableTemplateCardProps {
  template: WorkflowTemplate;
  onEdit: (template: WorkflowTemplate) => void;
  onDelete: (id: string) => void;
}

function SortableTemplateCard({ template, onEdit, onDelete }: SortableTemplateCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <Card ref={setNodeRef} style={style} className="bg-muted/50 border-border hover:shadow-lg transition-shadow duration-200 touch-manipulation">
      <CardHeader className="p-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-foreground truncate flex-grow" title={template.name}>
          {template.name}
        </CardTitle>
        <button {...attributes} {...listeners} className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{template.description}</p>
        <div className="flex items-center text-xs text-info gap-1 mb-2">
            <FileJson className="h-3 w-3" />
            <span>Config available</span>
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t border-border/50 flex justify-end space-x-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => onEdit(template)}>
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive" onClick={() => onDelete(template.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function WorkflowTemplateManager() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(initialTemplates);
  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditingTemplate, setCurrentEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateConfig, setNewTemplateConfig] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddTemplate = () => {
    setCurrentEditingTemplate(null);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateConfig('{\n  "type": "new_workflow",\n  "steps": []\n}');
    setIsEditDialogOpen(true);
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const configContent = e.target?.result as string;
            JSON.parse(configContent); // Validate JSON
            const newTemplate: WorkflowTemplate = {
              id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name.replace(/\.json$/, ''),
              description: `Imported from ${file.name}`,
              config: configContent,
            };
            setTemplates(prev => [...prev, newTemplate]);
          } catch (err) {
            console.error('Failed to parse JSON from file:', err);
            alert('Invalid JSON file. Please upload a valid workflow configuration.');
          }
        };
        reader.readAsText(file);
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditTemplate = (template: WorkflowTemplate) => {
    setCurrentEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateDescription(template.description);
    setNewTemplateConfig(template.config);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateConfig.trim()) {
      alert('Template name and configuration cannot be empty.');
      return;
    }
    try {
        JSON.parse(newTemplateConfig); // Final validation
    } catch (err) {
        alert('Invalid JSON configuration.');
        return;
    }

    if (currentEditingTemplate) {
      setTemplates(prev => prev.map(t =>
        t.id === currentEditingTemplate.id
          ? { ...t, name: newTemplateName, description: newTemplateDescription, config: newTemplateConfig }
          : t
      ));
    } else {
      const newTemplate: WorkflowTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newTemplateName,
        description: newTemplateDescription,
        config: newTemplateConfig,
      };
      setTemplates(prev => [...prev, newTemplate]);
    }
    setIsEditDialogOpen(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveTemplate(templates.find(t => t.id === active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTemplate(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTemplates((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id);
        const newIndex = prev.findIndex((t) => t.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleCopyConfig = (config: string) => {
    navigator.clipboard.writeText(config);
    alert('Workflow configuration copied to clipboard!');
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Workflow Templates</h2>
          <Button onClick={handleAddTemplate}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Template
          </Button>
        </div>

        {/* Drag and Drop Area for Importing Templates */}
        <div className="w-full flex justify-center">
          <div 
            className="bg-muted/50 border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center w-full max-w-2xl shadow-sm cursor-pointer hover:border-primary transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-primary'); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-primary'); }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-primary');
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    handleFileSelected({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
                }
            }}
          >
            <FileJson className="h-10 w-10 text-primary mb-2" />
            <span className="text-lg font-semibold">Drag & Drop Workflow JSON Here</span>
            <span className="text-muted-foreground text-sm mt-1">or click to browse files (.json)</span>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SortableContext items={templates.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {templates.map((template) => (
              <SortableTemplateCard key={template.id} template={template} onEdit={handleEditTemplate} onDelete={handleDeleteTemplate} />
            ))}
          </SortableContext>
        </div>

        {templates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <FileJson className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No Workflow Templates Found</h3>
                  <p className="text-muted-foreground">Create a new template or drag & drop to import one.</p>
                </div>
                <Button onClick={handleAddTemplate}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <DragOverlay>
          {activeTemplate ? <SortableTemplateCard template={activeTemplate} onEdit={() => {}} onDelete={() => {}} /> : null}
        </DragOverlay>

        {/* Edit/Create Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{currentEditingTemplate ? 'Edit Workflow Template' : 'Create New Workflow Template'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="templateName" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="templateName"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="templateDescription" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="templateDescription"
                            value={newTemplateDescription}
                            onChange={(e) => setNewTemplateDescription(e.target.value)}
                            className="col-span-3"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="templateConfig" className="text-right pt-2">
                            Configuration (JSON)
                        </Label>
                        <div className="relative col-span-3">
                            <Textarea
                                id="templateConfig"
                                value={newTemplateConfig}
                                onChange={(e) => setNewTemplateConfig(e.target.value)}
                                className="min-h-[200px] font-mono text-xs"
                                rows={10}
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 opacity-50 hover:opacity-100"
                                onClick={() => handleCopyConfig(newTemplateConfig)}
                                title="Copy configuration"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTemplate}>Save Template</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
} 