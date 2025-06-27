import { featureStore } from './feedbackLoop';

// Placeholder for a simple regression model
let modelParams = { weight: 1, bias: 0 };

export function updateModel(): void {
  // Simulate training: fit a linear model engagementRate = weight * likeRatio + bias
  const data = featureStore.contentPerformance;
  if (!data.length) return;
  // Simple least squares for one feature (likeRatio)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const d of data) {
    sumX += d.likeRatio;
    sumY += d.engagementRate;
    sumXY += d.likeRatio * d.engagementRate;
    sumXX += d.likeRatio * d.likeRatio;
  }
  const n = data.length;
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return;
  modelParams.weight = (n * sumXY - sumX * sumY) / denominator;
  modelParams.bias = (sumY - modelParams.weight * sumX) / n;
}

export function predictEngagement(likeRatio: number): number {
  // Simple linear prediction
  return modelParams.weight * likeRatio + modelParams.bias;
}

export function evaluateModel(): number {
  const data = featureStore.contentPerformance;
  if (!data.length) return 0;
  let mse = 0;
  for (const d of data) {
    const pred = predictEngagement(d.likeRatio);
    mse += Math.pow(pred - d.engagementRate, 2);
  }
  return mse / data.length;
}
