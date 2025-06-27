import { Platform } from "./platform";

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilter {
  platforms?: Platform[];
  contentTypes?: string[];
  tags?: string[];
  campaigns?: string[];
  timeRange: TimeRange;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}

export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  videoViews?: number;
  linkClicks?: number;
  viewTime?: number; // in seconds
}

export interface PerformanceMetrics extends EngagementMetrics {
  postCount: number;
  avgEngagementRate: number;
  bestPerformingPost: {
    id: string;
    content: string;
    engagementRate: number;
    platform: Platform;
    publishedAt: Date;
  };
  worstPerformingPost: {
    id: string;
    content: string;
    engagementRate: number;
    platform: Platform;
    publishedAt: Date;
  };
}

export interface AudienceDemographics {
  ageRange: {
    '13-17': number;
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55-64': number;
    '65+': number;
  };
  gender: {
    male: number;
    female: number;
    other: number;
    unknown: number;
  };
  topLocations: Array<{
    location: string;
    percentage: number;
  }>;
  languages: Array<{
    language: string;
    percentage: number;
  }>;
}

export interface PlatformComparison {
  platform: Platform;
  metrics: EngagementMetrics;
  postCount: number;
  avgEngagementRate: number;
  bestPerformingTime: string;
  bestPerformingContentType: string;
}

export interface ContentPerformance {
  id: string;
  content: string;
  platform: Platform;
  publishedAt: Date;
  metrics: EngagementMetrics;
  contentType: string;
  tags: string[];
  mediaType?: 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'text';
  mediaCount?: number;
  hasLink: boolean;
  hasHashtags: boolean;
  hasMentions: boolean;
  wordCount: number;
  characterCount: number;
}

export interface TrendAnalysis {
  trendingHashtags: Array<{
    tag: string;
    postCount: number;
    growth: number;
  }>;
  trendingTopics: Array<{
    topic: string;
    postCount: number;
    growth: number;
  }>;
  trendingAudio?: Array<{
    id: string;
    title: string;
    author: string;
    postCount: number;
    growth: number;
  }>;
}

export interface AnalyticsReport {
  summary: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    followersGrowth: number;
    bestPerformingPlatform: Platform;
    bestPerformingContentType: string;
    bestPerformingTime: string;
  };
  platformComparison: PlatformComparison[];
  contentPerformance: ContentPerformance[];
  audience: AudienceDemographics;
  trends: TrendAnalysis;
  timeSeries: Array<{
    date: Date;
    metrics: EngagementMetrics;
  }>;
}
