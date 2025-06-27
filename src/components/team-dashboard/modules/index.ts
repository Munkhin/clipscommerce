// Team Dashboard Core Modules
// These modules provide enterprise-scale automation capabilities for the team dashboard

export { ContentAutomationModule } from './ContentAutomationModule';
export { BulkVideoProcessor } from './BulkVideoProcessor';
export { AutoPostingScheduler } from './AutoPostingScheduler';
export { FeedbackModule } from './FeedbackModule';
export { ContentIdeationModule } from './ContentIdeationModule';

// Module types for type safety
export type {
  BrandVoice,
  AutomationJob,
  VideoFile,
  ProcessingQueue,
  ProcessingStats,
  PostingSchedule,
  ClientPreferences,
  PlatformAnalytics,
  ClientReport,
  EmailTemplate,
  AutomationRule,
  ContentIdea,
  TrendAnalysis,
  CompetitorInsight,
  ContentCalendar
} from './ContentAutomationModule'; 