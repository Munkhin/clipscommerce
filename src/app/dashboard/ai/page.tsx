// src/app/dashboard/ai/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ExperimentModal } from '@/components/experiment-modal';
import { AiSuggestionsCard } from '@/components/ai-suggestions-card';
import { AbExperimentsCard } from '@/components/ab-experiments-card';

interface Suggestion {
  id: string;
  platform: string;
  suggestion_type: string;
  suggestion: string;
  confidence: number;
}

interface Experiment {
  id: string;
  name: string;
  platform: string;
  status: string;
}

export default function AiDashboardPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suggestionsRes, experimentsRes] = await Promise.all([
        fetch('/api/ai/suggestions'),
        fetch('/api/ai/experiments'),
      ]);

      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data);
      }

      if (experimentsRes.ok) {
        const data = await experimentsRes.json();
        setExperiments(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Dashboard</h1>
        <ExperimentModal onSuccess={fetchData} />
      </div>

      <AiSuggestionsCard suggestions={suggestions} loading={loading} />
      <AbExperimentsCard experiments={experiments} loading={loading} />
    </div>
  );
}
