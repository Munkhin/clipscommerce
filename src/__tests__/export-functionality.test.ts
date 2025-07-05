import { convertToCSV, convertToHTML, formatAnalyticsForExport, generateExportFilename } from '@/lib/utils/export';
import { AnalyticsReport } from '@/types/analytics';
import { Platform } from '@/types/platform';

describe('Export Functionality', () => {
  const mockAnalyticsReport: AnalyticsReport = {
    summary: {
      totalPosts: 10,
      totalEngagement: 1500,
      avgEngagementRate: 5.2,
      followersGrowth: 12.5,
      bestPerformingPlatform: 'tiktok' as Platform,
      bestPerformingContentType: 'video',
      bestPerformingTime: '2:00 PM',
    },
    platformComparison: [
      {
        platform: 'tiktok' as Platform,
        metrics: {
          likes: 500,
          comments: 100,
          shares: 50,
          saves: 25,
          reach: 2000,
          impressions: 3000,
          engagementRate: 5.5,
        },
        postCount: 5,
        avgEngagementRate: 5.5,
        bestPerformingTime: '2:00 PM',
        bestPerformingContentType: 'video',
      },
    ],
    contentPerformance: [
      {
        id: 'post1',
        content: 'Test post content',
        platform: 'tiktok' as Platform,
        publishedAt: new Date('2023-01-01'),
        metrics: {
          likes: 100,
          comments: 20,
          shares: 10,
          saves: 5,
          reach: 500,
          impressions: 750,
          engagementRate: 4.5,
        },
        contentType: 'video',
        tags: ['test', 'content'],
        mediaType: 'video' as const,
        hasLink: false,
        hasHashtags: true,
        hasMentions: false,
        wordCount: 50,
        characterCount: 200,
      },
    ],
    audience: {
      ageRange: {
        '13-17': 5,
        '18-24': 25,
        '25-34': 45,
        '35-44': 15,
        '45-54': 7,
        '55-64': 2,
        '65+': 1,
      },
      gender: {
        male: 45,
        female: 52,
        other: 2,
        unknown: 1,
      },
      topLocations: [
        { location: 'United States', percentage: 40 },
        { location: 'United Kingdom', percentage: 15 },
      ],
      languages: [
        { language: 'English', percentage: 85 },
        { language: 'Spanish', percentage: 15 },
      ],
    },
    trends: {
      trendingHashtags: [
        { tag: 'test', postCount: 10, growth: 25 },
      ],
      trendingTopics: [
        { topic: 'Test Topic', postCount: 15, growth: 30 },
      ],
    },
    timeSeries: [
      {
        date: new Date('2023-01-01'),
        metrics: {
          likes: 50,
          comments: 10,
          shares: 5,
          saves: 2,
          reach: 200,
          impressions: 300,
          engagementRate: 3.5,
        },
      },
      {
        date: new Date('2023-01-02'),
        metrics: {
          likes: 75,
          comments: 15,
          shares: 8,
          saves: 4,
          reach: 300,
          impressions: 450,
          engagementRate: 4.2,
        },
      },
    ],
  };

  test('formatAnalyticsForExport should format data correctly', () => {
    const result = formatAnalyticsForExport(mockAnalyticsReport);
    
    expect(result.summary).toEqual(mockAnalyticsReport.summary);
    expect(result.platformComparison).toEqual(mockAnalyticsReport.platformComparison);
    expect(result.contentPerformance).toEqual(mockAnalyticsReport.contentPerformance);
    expect(result.timeSeries).toEqual(mockAnalyticsReport.timeSeries);
  });

  test('convertToCSV should generate valid CSV data', () => {
    const exportData = formatAnalyticsForExport(mockAnalyticsReport);
    const csvData = convertToCSV(exportData);
    
    expect(csvData).toContain('SUMMARY');
    expect(csvData).toContain('PLATFORM COMPARISON');
    expect(csvData).toContain('CONTENT PERFORMANCE');
    expect(csvData).toContain('TIME SERIES DATA');
    expect(csvData).toContain('Total Posts,10');
    expect(csvData).toContain('tiktok,5,5.50%');
  });

  test('convertToHTML should generate valid HTML', () => {
    const exportData = formatAnalyticsForExport(mockAnalyticsReport);
    const htmlData = convertToHTML(exportData);
    
    expect(htmlData).toContain('<!DOCTYPE html>');
    expect(htmlData).toContain('<title>Analytics Report</title>');
    expect(htmlData).toContain('Summary');
    expect(htmlData).toContain('Platform Comparison');
    expect(htmlData).toContain('Top Performing Content');
    expect(htmlData).toContain('10'); // Total posts
  });

  test('generateExportFilename should create correct filenames', () => {
    const csvFilename = generateExportFilename('csv', 'tiktok');
    const pdfFilename = generateExportFilename('pdf', 'instagram');
    
    expect(csvFilename).toMatch(/analytics-report-tiktok-\d{4}-\d{2}-\d{2}\.csv/);
    expect(pdfFilename).toMatch(/analytics-report-instagram-\d{4}-\d{2}-\d{2}\.pdf/);
  });
});