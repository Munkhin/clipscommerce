interface PostOutcome {
  postId: string;
  platform: string;
  contentType: 'video' | 'image' | 'story' | 'reel';
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    clicks?: number;
  };
  reach: {
    impressions: number;
    uniqueViews: number;
    organicReach: number;
    paidReach?: number;
  };
  performance: {
    engagementRate: number;
    clickThroughRate?: number;
    conversionRate?: number;
    costPerEngagement?: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    locations: Record<string, number>;
  };
  timing: {
    scheduledTime: Date;
    publishedTime: Date;
    peakEngagementTime?: Date;
  };
  roi?: number;
  timestamp: Date;
  metadata: {
    hashtags?: string[];
    caption?: string;
    duration?: number;
    fileSize?: number;
  };
}

interface AnalyticsFilter {
  platform?: string[];
  contentType?: string[];
  dateRange?: { start: Date; end: Date };
  minEngagement?: number;
  hashtags?: string[];
}

interface DetailedReport {
  summary: {
    totalPosts: number;
    totalEngagement: number;
    totalReach: number;
    avgEngagementRate: number;
    totalROI: number;
    period: { start: Date; end: Date };
  };
  platformBreakdown: Record<string, {
    posts: number;
    engagement: number;
    reach: number;
    engagementRate: number;
    bestPerformingPost?: PostOutcome;
  }>;
  contentTypeAnalysis: Record<string, {
    posts: number;
    avgEngagement: number;
    avgReach: number;
    performance: number;
  }>;
  timeAnalysis: {
    bestPostingTimes: Array<{ hour: number; day: number; avgEngagement: number }>;
    worstPostingTimes: Array<{ hour: number; day: number; avgEngagement: number }>;
    peakEngagementPeriods: Array<{ start: Date; end: Date; engagementMultiplier: number }>;
  };
  hashtagAnalysis: {
    topPerformingHashtags: Array<{ hashtag: string; avgEngagement: number; posts: number }>;
    trendingHashtags: Array<{ hashtag: string; growthRate: number }>;
    hashtagRecommendations: string[];
  };
  audienceInsights: {
    demographics: {
      ageDistribution: Record<string, number>;
      genderDistribution: Record<string, number>;
      topLocations: Array<{ location: string; percentage: number }>;
    };
    behaviorPatterns: {
      mostActiveHours: number[];
      preferredContentTypes: string[];
      engagementPreferences: string[];
    };
  };
  trends: Array<{
    metric: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    significance: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  benchmarks: Array<{
    metric: string;
    ourValue: number;
    industryAverage: number;
    topPerformer: number;
    position: 'above' | 'at' | 'below';
  }>;
  predictions: {
    nextWeekEngagement: number;
    growthProjection: number;
    recommendedPostingFrequency: number;
  };
  actionableInsights: {
    criticalIssues: string[];
    opportunities: string[];
    recommendations: string[];
  };
}

export class AutoPostAnalytics {
  private outcomes: PostOutcome[] = [];

  recordOutcome(outcome: PostOutcome) {
    this.outcomes.push(outcome);
  }

  generateReport(periodDays = 7) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const filtered = this.outcomes.filter(o => o.timestamp >= since);
    const totalEngagement = filtered.reduce((a, b) => a + (b.engagement?.likes || 0) + (b.engagement?.comments || 0) + (b.engagement?.shares || 0), 0);
    const totalReach = filtered.reduce((a, b) => a + (b.reach?.impressions || 0), 0);
    const avgROI = filtered.length ? filtered.reduce((a, b) => a + (b.roi || 0), 0) / filtered.length : 0;
    return {
      totalPosts: filtered.length,
      totalEngagement,
      totalReach,
      avgROI,
    };
  }

  getAllOutcomes() {
    return this.outcomes;
  }
} 