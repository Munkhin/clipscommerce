'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Database, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download,
  Eye,
  Users,
  ArrowRight,
  ArrowLeft,
  Zap,
  MapPin,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { AccessibilityHelpers } from '@/lib/accessibility/accessibilityAuditor';

interface ImportSource {
  id: string;
  name: string;
  description: string;
  icon: any;
  supportedFormats: string[];
}

interface ClientData {
  name: string;
  industry: string;
  description?: string;
  website?: string;
  location?: string;
  socialAccounts: {
    platform: string;
    username: string;
    verified: boolean;
  }[];
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  tags?: string[];
}

interface ValidationResult {
  valid: number;
  errors: number;
  warnings: number;
  issues: {
    type: 'error' | 'warning';
    message: string;
    line?: number;
  }[];
}

export function ClientImportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [parsedClients, setParsedClients] = useState<ClientData[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wizardRef = useRef<HTMLDivElement>(null);

  const importSources: ImportSource[] = [
    {
      id: 'spreadsheet',
      name: 'Spreadsheet Upload',
      description: 'Import from Excel, CSV, or Google Sheets',
      icon: FileText,
      supportedFormats: ['.xlsx', '.csv', '.xls']
    },
    {
      id: 'text',
      name: 'Text Document',
      description: 'Parse client data from text documents',
      icon: FileText,
      supportedFormats: ['.txt', '.docx', '.pdf']
    },
    {
      id: 'api',
      name: 'API Integration',
      description: 'Connect to CRM or e-commerce platforms',
      icon: Database,
      supportedFormats: ['Shopify', 'WooCommerce', 'Salesforce']
    },
    {
      id: 'manual',
      name: 'Manual Entry',
      description: 'Paste or type client information directly',
      icon: Globe,
      supportedFormats: ['Text', 'JSON', 'CSV']
    }
  ];

  const steps = [
    { id: 1, name: 'Source Selection', description: 'Choose your data source' },
    { id: 2, name: 'Data Import', description: 'Upload or enter your data' },
    { id: 3, name: 'Field Mapping', description: 'Map data to client fields' },
    { id: 4, name: 'Validation', description: 'Review and validate data' },
    { id: 5, name: 'Import', description: 'Complete the import process' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      parseImportData(content);
    };
    reader.readAsText(file);
  };

  const parseImportData = (data: string) => {
    // Simulate parsing different data formats
    const lines = data.split('\n').filter(line => line.trim());
    const clients: ClientData[] = [];

    if (selectedSource === 'manual' || selectedSource === 'text') {
      // Simple text parsing
      lines.forEach((line, index) => {
        if (line.includes('@') || line.includes('www.') || line.includes('.com')) {
          // Likely contains business info
          const words = line.split(/[\s,]+/);
                                const name = words.find(w => w.length > 3 && !w.includes('@') && !w.includes('.')) || `Client ${index + 1}`;
           const website = words.find(w => w.includes('www.') || w.includes('.com'));
           const email = words.find(w => w.includes('@'));

           clients.push({
             name: name ? name.charAt(0).toUpperCase() + name.slice(1) : `Client ${index + 1}`,
            industry: 'General',
            website,
            socialAccounts: [],
            contactInfo: email ? { email } : undefined
          });
        }
      });
    } else if (selectedSource === 'spreadsheet') {
      // CSV parsing simulation
      const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase());
      lines.slice(1).forEach(line => {
        const values = line.split(',').map(v => v.trim());
        const client: ClientData = {
          name: values[headers?.indexOf('name') || 0] || 'Unknown Client',
          industry: values[headers?.indexOf('industry') || 1] || 'General',
          website: values[headers?.indexOf('website') || 2],
          socialAccounts: []
        };
        clients.push(client);
      });
    }

    setParsedClients(clients);
    validateData(clients);
  };

  const validateData = (clients: ClientData[]) => {
    let valid = 0;
    let errors = 0;
    let warnings = 0;
    const issues: ValidationResult['issues'] = [];

    clients.forEach((client, index) => {
      if (!client.name || client.name.length < 2) {
        errors++;
        issues.push({
          type: 'error',
          message: `Client ${index + 1}: Name is required and must be at least 2 characters`,
          line: index + 1
        });
      } else {
        valid++;
      }

      if (!client.industry) {
        warnings++;
        issues.push({
          type: 'warning',
          message: `Client ${index + 1}: Industry not specified`,
          line: index + 1
        });
      }

      if (client.website && !client.website.includes('.')) {
        warnings++;
        issues.push({
          type: 'warning',
          message: `Client ${index + 1}: Website format may be invalid`,
          line: index + 1
        });
      }
    });

    setValidation({ valid, errors, warnings, issues });
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);

    // Simulate import process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProcessingProgress(i);
    }

    setImportResults({
      total: parsedClients.length,
      imported: parsedClients.length - (validation?.errors || 0),
      skipped: validation?.errors || 0,
      warnings: validation?.warnings || 0
    });

    setIsProcessing(false);
    setCurrentStep(5);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedSource('');
    setImportData('');
    setParsedClients([]);
    setValidation(null);
    setIsProcessing(false);
    setProcessingProgress(0);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      resetWizard();
    }
  }, [resetWizard]);

  useEffect(() => {
    if (wizardRef.current) {
      const cleanupFocusTrap = AccessibilityHelpers.createFocusTrap(wizardRef.current);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        cleanupFocusTrap();
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown]);

  return (
    <div
      ref={wizardRef}
      className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6 flex flex-col items-center justify-center"
    >
      <Card className="w-full max-w-4xl shadow-lg border-border">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted text-muted-foreground'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <CardContent className="space-y-6">
          {/* Step 1: Source Selection */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {importSources.map((source) => {
                const IconComponent = source.icon;
                return (
                  <Card
                    key={source.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedSource === source.id ? 'ring-2 ring-primary border-primary' : 'border-border'
                    }`}
                    onClick={() => setSelectedSource(source.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{source.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {source.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {source.supportedFormats.slice(0, 3).map((format) => (
                              <Badge key={format} variant="outline" className="text-xs">
                                {format}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 2: Data Import */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {selectedSource === 'spreadsheet' && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Upload your spreadsheet</h3>
                  <p className="text-muted-foreground mb-4">
                    Supports CSV, Excel (.xlsx), and Google Sheets exports
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                </div>
              )}

              {selectedSource === 'manual' && (
                <div className="space-y-4">
                  <Label htmlFor="manual-data">Enter client data</Label>
                  <Textarea
                    id="manual-data"
                    placeholder="Paste client information here... Each line should contain client details like:&#10;Company Name, Industry, website@example.com&#10;Another Company, Technology, contact@company.com&#10;..."
                    rows={10}
                    value={importData}
                    onChange={(e) => {
                      setImportData(e.target.value);
                      parseImportData(e.target.value);
                    }}
                  />
                </div>
              )}

              {selectedSource === 'api' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="api-platform">Platform</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shopify">Shopify</SelectItem>
                          <SelectItem value="woocommerce">WooCommerce</SelectItem>
                          <SelectItem value="salesforce">Salesforce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="Enter your API key"
                      />
                    </div>
                  </div>
                  <Button className="w-full">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect to Platform
                  </Button>
                </div>
              )}

              {parsedClients.length > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    Preview: {parsedClients.length} clients detected
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {parsedClients.slice(0, 5).map((client, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {client.name} - {client.industry}
                      </div>
                    ))}
                    {parsedClients.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ... and {parsedClients.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map your data fields to client properties
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Detected Fields</h4>
                  <div className="space-y-2">
                    {['Name', 'Industry', 'Website', 'Email', 'Location'].map((field) => (
                      <div key={field} className="p-2 bg-muted/30 rounded border">
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Client Properties</h4>
                  <div className="space-y-2">
                    {['Business Name', 'Industry Category', 'Website URL', 'Contact Email', 'Business Location'].map((prop) => (
                      <div key={prop} className="p-2 bg-primary/10 rounded border border-primary/20">
                        {prop}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Validation */}
          {currentStep === 4 && validation && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-mint/20 bg-mint/5">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-mint" />
                    <div className="text-2xl font-bold text-mint">{validation.valid}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </CardContent>
                </Card>
                
                <Card className="border-coral/20 bg-coral/5">
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-coral" />
                    <div className="text-2xl font-bold text-coral">{validation.errors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </CardContent>
                </Card>
                
                <Card className="border-warning/20 bg-warning/5">
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <div className="text-2xl font-bold text-warning">{validation.warnings}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </CardContent>
                </Card>
              </div>

              {validation.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Issues Found:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {validation.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded border text-sm ${
                          issue.type === 'error'
                            ? 'border-coral/20 bg-coral/5 text-coral'
                            : 'border-warning/20 bg-warning/5 text-warning'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <div>
                            <p>{issue.message}</p>
                            {issue.line && (
                              <p className="text-xs opacity-75">Line {issue.line}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Import Results */}
          {currentStep === 5 && importResults && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-mint" />
              <h3 className="text-xl font-semibold">Import Complete!</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto">
                <div>
                  <div className="text-2xl font-bold">{importResults.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-mint">{importResults.imported}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-coral">{importResults.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">{importResults.warnings}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={resetWizard} className="mr-2">
                  Import More Clients
                </Button>
                <Button variant="outline">
                  View Imported Clients
                </Button>
              </div>
            </div>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 mx-auto animate-spin" />
              <div>
                <p className="font-medium">Importing clients...</p>
                <p className="text-sm text-muted-foreground">Please wait while we process your data</p>
              </div>
              <div className="max-w-xs mx-auto">
                <Progress value={processingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{processingProgress}% complete</p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {currentStep < 4 && (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && !selectedSource) ||
                  (currentStep === 2 && parsedClients.length === 0) ||
                  isProcessing
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {currentStep === 4 && (
              <Button
                onClick={handleImport}
                disabled={validation?.errors !== 0 || isProcessing}
                className="bg-primary text-primary-foreground"
              >
                <Users className="h-4 w-4 mr-2" />
                Import {validation?.valid || 0} Clients
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 