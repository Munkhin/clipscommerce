// index.ts

// Main agent
export { EngagementPredictionAgent } from './services/EngagementPredictionAgent';

// Services
export { FeatureEngineeringService } from './services/FeatureEngineeringService';
export { ModelTrainingService } from './services/ModelTrainingService';
export { StrategyEngine } from './services/StrategyEngine';
export { DataIngestionService } from './services/DataIngestionService';

// Types
export * from './types/EngagementTypes';

// Example usage and initialization helper
export { initializeEngagementPredictionAgent, quickSetup, productionSetup } from './utils/initialization'; 