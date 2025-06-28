export interface ClientReport {
  id: string;
  clientId: string;
  clientName: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalViews: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topPerformingVideo: string;
    growthRate: number;
    platformBreakdown: {
      platform: string;
      views: number;
      engagement: number;
    }[];
  };
  insights: string[];
  recommendations: string[];
  status: 'generating' | 'ready' | 'sent' | 'failed';
  tone: 'professional' | 'casual' | 'enthusiastic' | 'analytical';
  customizations: {
    includeComparisons: boolean;
    includeRecommendations: boolean;
    includeProjections: boolean;
    brandColors: string[];
  };
  generatedAt: Date;
  sentAt?: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'analytical';
  variables: string[];
  clientTypes: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'weekly' | 'monthly' | 'milestone' | 'performance_threshold';
  conditions: {
    metric: string;
    operator: string;
    value: number;
  }[];
  actions: {
    generateReport: boolean;
    sendEmail: boolean;
    notifyTeam: boolean;
    scheduleFollowup: boolean;
  };
  clientFilter: string[];
  isActive: boolean;
}