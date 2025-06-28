// src/components/ab-experiments-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Experiment {
  id: string;
  name: string;
  platform: string;
  status: string;
}

interface AbExperimentsCardProps {
  experiments: Experiment[];
  loading: boolean;
}

export function AbExperimentsCard({ experiments, loading }: AbExperimentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Experiments</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading experiments...</p>
        ) : experiments.length > 0 ? (
          <ul className="space-y-4">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="p-4 border rounded-lg">
                <p><strong>Name:</strong> {experiment.name}</p>
                <p><strong>Platform:</strong> {experiment.platform}</p>
                <p><strong>Status:</strong> {experiment.status}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No experiments are currently running.</p>
        )}
      </CardContent>
    </Card>
  );
}
