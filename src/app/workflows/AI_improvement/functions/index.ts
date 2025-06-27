// Re-export all functions from individual files
export * from './feedbackLoop';
export * from './updateModel';
export { predictEngagement, evaluateModel } from './updateModel';
export { ingestSampleBatchData } from './feedbackLoop';
export * from './nlp';
export * from './vision';

// Explicitly re-export from abTesting to resolve naming conflicts
export type {
  Experiment,
  ExperimentVariant,
  ExperimentResult,
  ExperimentAnalysis
} from './abTesting';

export {
  createExperiment,
  updateExperiment,
  getExperiment,
  listExperiments,
  assignVariant,
  recordExperimentData,
  analyzeExperiment,
  generateContentVariations
} from './abTesting';

// Re-export the renamed type from feedbackLoop
export type { FeedbackExperimentResult } from './feedbackLoop';
