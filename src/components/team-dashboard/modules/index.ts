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
  VideoFile
} from './ContentAutomationModule';

// Additional types with fallbacks
export interface ProcessingQueue {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videos: VideoFile[];
  createdAt: Date;
}

export interface ProcessingStats {
  totalProcessed: number;
  successRate: number;
  averageTime: number;
  errors: number;
}

export interface PostingSchedule {
  id: string;
  platform: string;
  scheduledTime: Date;
  status: 'scheduled' | 'posted' | 'failed';
}

export interface ClientPreferences {
  id: string;
  brandVoice: string;
  platforms: string[];
  autoPost: boolean;
  notifications: boolean;
}

export interface PlatformAnalytics {
  platform: string;
  engagement: number;
  reach: number;
  clicks: number;
  conversions: number;
}

export interface ClientReport {
  id: string;
  clientId: string;
  period: string;
  analytics: PlatformAnalytics[];
  generatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export interface AutomationCondition {
  type: string;
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface AutomationAction {
  type: string;
  parameters: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
}

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  platform: string;
  tags: string[];
  trending: boolean;
}

export interface TrendAnalysis {
  id: string;
  keyword: string;
  volume: number;
  growth: number;
  platforms: string[];
}

export interface CompetitorInsight {
  id: string;
  competitor: string;
  performance: PlatformAnalytics[];
  strategy: string;
}

export interface ContentCalendar {
  id: string;
  date: Date;
  content: ContentIdea[];
  scheduled: PostingSchedule[];
} 