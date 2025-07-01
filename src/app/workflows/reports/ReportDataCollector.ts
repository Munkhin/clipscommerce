import { BasePlatformClient } from '../data_collection/lib/platforms/base-platform';

/**
 * Input for report data aggregation, including social and e-commerce metrics.
 */
export interface ReportDataInput {
  client: BasePlatformClient;
  platform: 'tiktok' | 'instagram' | 'youtube';
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: Array<'engagement' | 'reach' | 'impressions' | 'conversions' | 'roi' | 'followerGrowth'>;
  compareWithPreviousPeriod?: boolean;
  eCommerce?: {
    orderCount?: boolean;
    salesAmount?: boolean;
    conversionRate?: boolean;
    roi?: boolean;
  };
}

/**
 * Aggregates report data from social and e-commerce sources.
 */
export async function collectReportData(
  input: ReportDataInput
): Promise<{
  summary: Record<string, any>;
  timeSeries: Array<{ date: string; [key: string]: any }>;
  comparisons?: {
    previousPeriod: Record<string, any>;
    percentageChanges: Record<string, number>;
  };
  eCommerceMetrics?: Record<string, number>;
}> {
  const { client, dateRange } = input;
  const posts = await client.fetchPosts('recent');

  const timeSeries = posts.map((post: any) => ({
    date: new Date(post.create_time * 1000).toISOString().split('T')[0],
    engagement: post.like_count + post.comment_count + post.share_count,
    views: post.view_count,
  }));

  return {
    summary: {
      total_posts: posts.length,
      total_engagement: timeSeries.reduce((acc: number, cur: { engagement: number }) => acc + cur.engagement, 0),
      total_views: timeSeries.reduce((acc: number, cur: { views: number }) => acc + cur.views, 0),
    },
    timeSeries,
    comparisons: undefined,
    eCommerceMetrics: {},
  };
} 