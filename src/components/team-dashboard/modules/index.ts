// Team Dashboard Core Modules
// These modules provide enterprise-scale automation capabilities for the team dashboard

export { ContentAutomationModule } from './ContentAutomationModule';
export { BulkVideoProcessor } from './BulkVideoProcessor';
export { AutoPostingScheduler } from './AutoPostingScheduler';
export { FeedbackModule } from './FeedbackModule';
export { ContentIdeationModule } from './ContentIdeationModule';

// Module types for type safety - export only the types that actually exist
export type {
  BrandVoice,
  AutomationJob,
  VideoFile
} from './ContentAutomationModule';

export type {
  BulkVideoFile,
  ProcessingQueue,
  ProcessingStats
} from './BulkVideoProcessor';

export type {
  PostingSchedule,
  ClientPreferences,
  PlatformAnalytics
} from './AutoPostingScheduler';

export type {
  ClientReport,
  EmailTemplate,
  AutomationRule
} from './feedback/types';

export type {
  ContentIdea,
  TrendAnalysis,
  CompetitorInsight,
  ContentCalendar
} from './ContentIdeationModule'; 