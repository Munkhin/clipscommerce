import { HfInference } from '@huggingface/inference';

/**
 * Input for insights generation, including metrics and time series.
 */
export interface InsightInput {
  metrics: Record<string, any>;
  timeSeries: Array<{ date: string; [key: string]: any }>;
  platform: string;
  businessGoals?: string[];
}

/**
 * Generates actionable insights from metrics and time series data.
 */
export async function generateInsights(
  input: InsightInput
): Promise<{
  keyFindings: string[];
  opportunities: string[];
  recommendations: string[];
  predictedTrends: Array<{
    metric: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    explanation: string;
  }>;
}> {
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

  const prompt = `
    Given the following data for ${input.platform}:
    - Summary Metrics: ${JSON.stringify(input.metrics)}
    - Time Series Data: ${JSON.stringify(input.timeSeries)}

    Generate key findings, opportunities, and recommendations for a social media manager.
  `;

  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2',
    inputs: prompt,
    parameters: {
      max_new_tokens: 250,
    }
  });

  const generatedText = response.generated_text;

  // This is a simple parsing of the generated text. A more robust solution would be to use a structured output model.
  const keyFindings = generatedText.match(/Key Findings:(.*?)Opportunities:/s)?.[1].trim().split('\n- ').filter(Boolean) || [];
  const opportunities = generatedText.match(/Opportunities:(.*?)Recommendations:/s)?.[1].trim().split('\n- ').filter(Boolean) || [];
  const recommendations = generatedText.match(/Recommendations:(.*?)$/s)?.[1].trim().split('\n- ').filter(Boolean) || [];

  return {
    keyFindings,
    opportunities,
    recommendations,
    predictedTrends: [], // Placeholder for now
  };
} 