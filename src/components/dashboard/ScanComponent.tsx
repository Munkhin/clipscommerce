'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ScanResult = {
  id: string;
  niche: string;
  competitors: string;
  hooks: string[];
  templates: string[];
  keywords: string[];
  created_at: string;
};

export default function ScanComponent() {
  const { user } = useAuth();
  const [niche, setNiche] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanCompleted, setScanCompleted] = useState(false);

  const handleScan = async () => {
    if (!niche.trim()) {
      setError('Please enter a niche to scan');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setScanCompleted(false);

    try {
      // Start scan via API
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          niche,
          competitors,
          platforms: ['tiktok'],
          lookbackDays: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start scan');
      }
      const scanId = data.scanId;
      // Poll for scan result
      let attempts = 0;
      let result = null;
      while (attempts < 20) { // up to ~1 min
        await new Promise(resolve => setTimeout(resolve, 3000));
        const res2 = await fetch(`/api/scan?scanId=${scanId}`);
        const data2 = await res2.json();
        if (res2.ok && data2.success && data2.data && data2.data.status === 'completed') {
          result = data2.data;
          break;
        }
        if (res2.ok && data2.data && data2.data.status === 'failed') {
          throw new Error(data2.data.error || 'Scan failed');
        }
        attempts++;
      }
      if (!result) {
        throw new Error('Scan timed out');
      }
      // Adapt result to ScanResult type for display
      setScanResult({
        id: result.id,
        niche,
        competitors,
        hooks: result.metrics?.topPerformingPosts?.map((p: any) => p.hook) || [],
        templates: ['Problem → Solution → Result', 'Myth → Reality → Action', 'Before → After → Bridge'], // Placeholder, adapt as needed
        keywords: [niche + ' tips', niche + ' strategy', niche + ' guide'], // Placeholder, adapt as needed
        created_at: new Date().toISOString(),
      });
      setScanCompleted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during the scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setScanCompleted(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text">Scan</h1>
        <p className="text-muted-foreground mt-1">Analyze trends and opportunities in your niche</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Field Research</CardTitle>
          <CardDescription>
            Analyze your niche and competitors to discover high-performing content strategies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!scanCompleted ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="niche" className="text-sm font-medium">
                  Niche or Topic
                </label>
                <Input
                  id="niche"
                  placeholder="e.g., fitness, marketing, personal finance"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  disabled={isScanning}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="competitors" className="text-sm font-medium">
                  Competitors (Optional)
                </label>
                <Textarea
                  id="competitors"
                  placeholder="List competitor accounts or websites (one per line)"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  disabled={isScanning}
                  rows={3}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Scan Completed</AlertTitle>
                <AlertDescription>
                  We&apos;ve analyzed your niche and identified key opportunities.
                </AlertDescription>
              </Alert>
              
              {scanResult && (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">High-Performing Hooks</h3>
                      <p className="text-sm text-gray-500 mb-2">Use these hooks to capture attention</p>
                      <ul className="space-y-2">
                        {scanResult.hooks.map((hook, index) => (
                          <li key={index} className="bg-gray-50 p-3 rounded-md text-sm">{hook}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Content Templates</h3>
                      <p className="text-sm text-gray-500 mb-2">Proven structures for your content</p>
                      <ul className="space-y-2">
                        {scanResult.templates.map((template, index) => (
                          <li key={index} className="bg-gray-50 p-3 rounded-md text-sm">{template}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Recommended Keywords</h3>
                      <p className="text-sm text-gray-500 mb-2">Include these in your content</p>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.keywords.map((keyword, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {!scanCompleted ? (
            <Button onClick={handleScan} disabled={isScanning} className="w-full">
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                'Start Scan'
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                New Scan
              </Button>
              <Button>
                Save Results
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
