'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload } from 'lucide-react';

export interface ClientImportWizardProps {
  onImportComplete?: (clients: any[]) => void;
  className?: string;
}

export function ClientImportWizard({ onImportComplete, className }: ClientImportWizardProps) {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(25);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setProgress(50);
    // Simulate import process
    setTimeout(() => {
      setProgress(100);
      onImportComplete?.([]); // Empty array for now
    }, 2000);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Import Clients</CardTitle>
        <CardDescription>
          Upload a CSV file to import client data into the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select CSV File</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
          />
        </div>
        
        {progress > 0 && (
          <div className="space-y-2">
            <Label>Import Progress</Label>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={handleImport} 
            disabled={!file || progress === 100}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Clients
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClientImportWizard;