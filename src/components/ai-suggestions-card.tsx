// src/components/ai-suggestions-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Suggestion {
  id: string;
  platform: string;
  suggestion_type: string;
  suggestion: string;
  confidence: number;
}

interface AiSuggestionsCardProps {
  suggestions: Suggestion[];
  loading: boolean;
}

export function AiSuggestionsCard({ suggestions, loading }: AiSuggestionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Suggestions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading suggestions...</p>
        ) : suggestions.length > 0 ? (
          <ul className="space-y-4">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="p-4 border rounded-lg">
                <p><strong>Platform:</strong> {suggestion.platform}</p>
                <p><strong>Type:</strong> {suggestion.suggestion_type}</p>
                <p><strong>Suggestion:</strong> {suggestion.suggestion}</p>
                <p><strong>Confidence:</strong> {suggestion.confidence}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No suggestions available at this time.</p>
        )}
      </CardContent>
    </Card>
  );
}
