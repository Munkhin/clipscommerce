import { AnalyticsReport, ContentPerformance, PlatformComparison } from '@/types/analytics';
import { Platform } from '@/types/platform';
import * as XLSX from 'xlsx';

export interface ExportData {
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
  timeSeries: Array<{
    date: Date;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  }>;
}

/**
 * Converts analytics data to CSV format
 */
export function convertToCSV(data: ExportData): string {
  const rows: string[] = [];
  
  // Add summary section
  rows.push('SUMMARY');
  rows.push('Metric,Value');
  rows.push(`Total Posts,${data.summary.totalPosts}`);
  rows.push(`Total Engagement,${data.summary.totalEngagement}`);
  rows.push(`Average Engagement Rate,${data.summary.avgEngagementRate.toFixed(2)}%`);
  rows.push(`Followers Growth,${data.summary.followersGrowth.toFixed(1)}%`);
  rows.push(`Best Performing Platform,${data.summary.bestPerformingPlatform}`);
  rows.push(`Best Performing Content Type,${data.summary.bestPerformingContentType}`);
  rows.push(`Best Performing Time,${data.summary.bestPerformingTime}`);
  rows.push('');
  
  // Add platform comparison section
  rows.push('PLATFORM COMPARISON');
  rows.push('Platform,Post Count,Avg Engagement Rate,Likes,Comments,Shares,Saves,Reach,Impressions');
  data.platformComparison.forEach(platform => {
    rows.push([
      platform.platform,
      platform.postCount,
      platform.avgEngagementRate.toFixed(2) + '%',
      platform.metrics.likes,
      platform.metrics.comments,
      platform.metrics.shares,
      platform.metrics.saves,
      platform.metrics.reach,
      platform.metrics.impressions
    ].join(','));
  });
  rows.push('');
  
  // Add content performance section
  rows.push('CONTENT PERFORMANCE');
  rows.push('Content,Platform,Published At,Likes,Comments,Shares,Saves,Reach,Impressions,Engagement Rate');
  data.contentPerformance.slice(0, 20).forEach(content => { // Limit to top 20 for CSV
    rows.push([
      `"${content.content.replace(/"/g, '""').substring(0, 50)}..."`,
      content.platform,
      content.publishedAt.toLocaleDateString(),
      content.metrics.likes,
      content.metrics.comments,
      content.metrics.shares,
      content.metrics.saves,
      content.metrics.reach,
      content.metrics.impressions,
      content.metrics.engagementRate.toFixed(2) + '%'
    ].join(','));
  });
  rows.push('');
  
  // Add time series section
  rows.push('TIME SERIES DATA');
  rows.push('Date,Likes,Comments,Shares,Saves,Reach,Impressions,Engagement Rate');
  data.timeSeries.forEach(item => {
    rows.push([
      item.date.toLocaleDateString(),
      item.likes,
      item.comments,
      item.shares,
      item.saves,
      item.reach,
      item.impressions,
      item.engagementRate.toFixed(2) + '%'
    ].join(','));
  });
  
  return rows.join('\n');
}

/**
 * Converts analytics data to HTML format for PDF generation
 */
export function convertToHTML(data: ExportData, options: { includeCharts?: boolean } = {}): string {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analytics Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #8B5CF6; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #8B5CF6; }
        .metric-label { font-size: 14px; color: #666; }
        .date-generated { text-align: right; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Analytics Report</h1>
      <p class="date-generated">Generated on: ${new Date().toLocaleDateString()}</p>
      
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="metric-card">
          <div class="metric-value">${data.summary.totalPosts}</div>
          <div class="metric-label">Total Posts</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.summary.totalEngagement.toLocaleString()}</div>
          <div class="metric-label">Total Engagement</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.summary.avgEngagementRate.toFixed(2)}%</div>
          <div class="metric-label">Average Engagement Rate</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.summary.followersGrowth.toFixed(1)}%</div>
          <div class="metric-label">Followers Growth</div>
        </div>
      </div>
      
      <h2>Platform Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            <th>Posts</th>
            <th>Avg Engagement Rate</th>
            <th>Likes</th>
            <th>Comments</th>
            <th>Shares</th>
            <th>Reach</th>
          </tr>
        </thead>
        <tbody>
          ${data.platformComparison.map(platform => `
            <tr>
              <td>${platform.platform}</td>
              <td>${platform.postCount}</td>
              <td>${platform.avgEngagementRate.toFixed(2)}%</td>
              <td>${platform.metrics.likes.toLocaleString()}</td>
              <td>${platform.metrics.comments.toLocaleString()}</td>
              <td>${platform.metrics.shares.toLocaleString()}</td>
              <td>${platform.metrics.reach.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h2>Top Performing Content</h2>
      <table>
        <thead>
          <tr>
            <th>Content</th>
            <th>Platform</th>
            <th>Published</th>
            <th>Engagement Rate</th>
            <th>Likes</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
          ${data.contentPerformance.slice(0, 10).map(content => `
            <tr>
              <td>${content.content.substring(0, 50)}...</td>
              <td>${content.platform}</td>
              <td>${content.publishedAt.toLocaleDateString()}</td>
              <td>${content.metrics.engagementRate.toFixed(2)}%</td>
              <td>${content.metrics.likes.toLocaleString()}</td>
              <td>${content.metrics.comments.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h2>Engagement Over Time</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Likes</th>
            <th>Comments</th>
            <th>Shares</th>
            <th>Engagement Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.timeSeries.map(item => `
            <tr>
              <td>${item.date.toLocaleDateString()}</td>
              <td>${item.likes.toLocaleString()}</td>
              <td>${item.comments.toLocaleString()}</td>
              <td>${item.shares.toLocaleString()}</td>
              <td>${item.engagementRate.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Converts analytics data to XLSX format
 */
export async function convertToXLSX(data: ExportData): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Posts', data.summary.totalPosts],
    ['Total Engagement', data.summary.totalEngagement],
    ['Average Engagement Rate', `${data.summary.avgEngagementRate.toFixed(2)}%`],
    ['Followers Growth', `${data.summary.followersGrowth.toFixed(1)}%`],
    ['Best Performing Platform', data.summary.bestPerformingPlatform],
    ['Best Performing Content Type', data.summary.bestPerformingContentType],
    ['Best Performing Time', data.summary.bestPerformingTime]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Platform comparison sheet
  const platformData = [
    ['Platform', 'Posts', 'Avg Engagement Rate', 'Likes', 'Comments', 'Shares', 'Saves', 'Reach', 'Impressions'],
    ...data.platformComparison.map(platform => [
      platform.platform,
      platform.postCount,
      `${platform.avgEngagementRate.toFixed(2)}%`,
      platform.metrics.likes,
      platform.metrics.comments,
      platform.metrics.shares,
      platform.metrics.saves,
      platform.metrics.reach,
      platform.metrics.impressions
    ])
  ];
  
  const platformSheet = XLSX.utils.aoa_to_sheet(platformData);
  XLSX.utils.book_append_sheet(workbook, platformSheet, 'Platform Comparison');
  
  // Content performance sheet
  const contentData = [
    ['Content', 'Platform', 'Published', 'Likes', 'Comments', 'Shares', 'Saves', 'Reach', 'Impressions', 'Engagement Rate'],
    ...data.contentPerformance.slice(0, 100).map(content => [
      content.content.substring(0, 50) + '...',
      content.platform,
      content.publishedAt.toLocaleDateString(),
      content.metrics.likes,
      content.metrics.comments,
      content.metrics.shares,
      content.metrics.saves,
      content.metrics.reach,
      content.metrics.impressions,
      `${content.metrics.engagementRate.toFixed(2)}%`
    ])
  ];
  
  const contentSheet = XLSX.utils.aoa_to_sheet(contentData);
  XLSX.utils.book_append_sheet(workbook, contentSheet, 'Content Performance');
  
  // Time series sheet
  const timeSeriesData = [
    ['Date', 'Likes', 'Comments', 'Shares', 'Saves', 'Reach', 'Impressions', 'Engagement Rate'],
    ...data.timeSeries.map(item => [
      item.date.toLocaleDateString(),
      item.likes,
      item.comments,
      item.shares,
      item.saves,
      item.reach,
      item.impressions,
      `${item.engagementRate.toFixed(2)}%`
    ])
  ];
  
  const timeSeriesSheet = XLSX.utils.aoa_to_sheet(timeSeriesData);
  XLSX.utils.book_append_sheet(workbook, timeSeriesSheet, 'Time Series');
  
  // Convert to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Generates filename for export based on current date and format
 */
export function generateExportFilename(format: 'csv' | 'pdf' | 'json' | 'xlsx', platform?: string): string {
  const date = new Date().toISOString().split('T')[0];
  const platformSuffix = platform ? `-${platform}` : '';
  return `analytics-report${platformSuffix}-${date}.${format}`;
}

/**
 * Formats analytics report data for export
 */
export function formatAnalyticsForExport(report: AnalyticsReport, options: { includeRawData?: boolean; includeCharts?: boolean } = {}): ExportData {
  let contentPerformance = report.contentPerformance;
  
  // Limit data if not including raw data
  if (!options.includeRawData) {
    contentPerformance = contentPerformance.slice(0, 50);
  }
  
  return {
    summary: report.summary,
    platformComparison: report.platformComparison,
    contentPerformance,
    timeSeries: report.timeSeries
  };
}