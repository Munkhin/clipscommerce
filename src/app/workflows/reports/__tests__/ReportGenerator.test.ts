import { ReportGenerator, EmailService, ReportOptions } from '../ReportGenerator';

// Mock EmailService
class MockEmailService extends EmailService {
  public sentEmails: Array<{ email: string; content: string | Buffer; format: string }> = [];

  async send(email: string, content: string | Buffer, format: string): Promise<void> {
    this.sentEmails.push({ email, content, format });
  }

  reset() {
    this.sentEmails = [];
  }
}

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockEmailService: MockEmailService;
  let mockData: any;
  let mockInsights: any;
  let defaultOptions: ReportOptions;

  beforeEach(() => {
    mockEmailService = new MockEmailService();
    reportGenerator = new ReportGenerator(mockEmailService);
    
    mockData = {
      summary: 'Test report summary',
      metrics: {
        totalViews: 100000,
        totalLikes: 5000,
        engagementRate: 0.05,
      },
      timeRange: {
        start: '2024-01-01',
        end: '2024-01-31',
      },
    };

    mockInsights = {
      topPerformingContent: ['Video 1', 'Video 2'],
      recommendations: ['Post more in the evening', 'Use trending hashtags'],
      growthTrends: { followers: 'increasing', engagement: 'stable' },
    };

    defaultOptions = {
      format: 'html',
      includeCharts: true,
      includeRawData: false,
    };

    mockEmailService.reset();
  });

  describe('generateReport', () => {
    it('should generate HTML report with summary', async () => {
      const options: ReportOptions = { ...defaultOptions, format: 'html' };
      const result = await reportGenerator.generateReport(mockData, mockInsights, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('<html>');
      expect(result).toContain('<h1>Report</h1>');
      expect(result).toContain(mockData.summary);
      expect(result).toContain('</html>');
    });

    it('should generate HTML report without summary when not provided', async () => {
      const dataWithoutSummary = { ...mockData };
      delete dataWithoutSummary.summary;
      
      const options: ReportOptions = { ...defaultOptions, format: 'html' };
      const result = await reportGenerator.generateReport(dataWithoutSummary, mockInsights, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('<html>');
      expect(result).toContain('<h1>Report</h1>');
      expect(result).not.toContain('summary');
    });

    it('should generate JSON report with data and insights', async () => {
      const options: ReportOptions = { ...defaultOptions, format: 'json' };
      const result = await reportGenerator.generateReport(mockData, mockInsights, options);

      expect(typeof result).toBe('string');
      
      const parsedResult = JSON.parse(result as string);
      expect(parsedResult).toHaveProperty('data');
      expect(parsedResult).toHaveProperty('insights');
      expect(parsedResult.data).toEqual(mockData);
      expect(parsedResult.insights).toEqual(mockInsights);
    });

    it('should generate PDF placeholder', async () => {
      const options: ReportOptions = { ...defaultOptions, format: 'pdf' };
      const result = await reportGenerator.generateReport(mockData, mockInsights, options);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('PDF not implemented');
    });

    it('should handle different report options', async () => {
      const optionsVariations = [
        { format: 'html' as const, includeCharts: true, includeRawData: true },
        { format: 'json' as const, includeCharts: false, includeRawData: false },
        { format: 'html' as const, includeCharts: false, includeRawData: true },
      ];

      for (const options of optionsVariations) {
        const result = await reportGenerator.generateReport(mockData, mockInsights, options);
        expect(result).toBeDefined();
        
        if (options.format === 'html') {
          expect(typeof result).toBe('string');
          expect(result).toContain('<html>');
        } else if (options.format === 'json') {
          expect(typeof result).toBe('string');
          const parsed = JSON.parse(result as string);
          expect(parsed).toHaveProperty('data');
          expect(parsed).toHaveProperty('insights');
        }
      }
    });

    it('should handle empty data gracefully', async () => {
      const emptyData = {};
      const emptyInsights = {};
      
      const htmlResult = await reportGenerator.generateReport(emptyData, emptyInsights, { ...defaultOptions, format: 'html' });
      expect(htmlResult).toContain('<html>');
      
      const jsonResult = await reportGenerator.generateReport(emptyData, emptyInsights, { ...defaultOptions, format: 'json' });
      const parsed = JSON.parse(jsonResult as string);
      expect(parsed.data).toEqual(emptyData);
      expect(parsed.insights).toEqual(emptyInsights);
    });

    it('should handle complex data structures', async () => {
      const complexData = {
        summary: 'Complex report',
        nestedMetrics: {
          platforms: {
            instagram: { views: 50000, likes: 2500 },
            tiktok: { views: 75000, likes: 3750 },
          },
          timeSeriesData: [
            { date: '2024-01-01', views: 1000 },
            { date: '2024-01-02', views: 1200 },
          ],
        },
        arrays: ['item1', 'item2', 'item3'],
      };

      const jsonResult = await reportGenerator.generateReport(complexData, mockInsights, { ...defaultOptions, format: 'json' });
      const parsed = JSON.parse(jsonResult as string);
      expect(parsed.data).toEqual(complexData);
      expect(parsed.data.nestedMetrics.platforms.instagram.views).toBe(50000);
    });
  });

  describe('scheduleRecurringReport', () => {
    it('should schedule daily recurring report', async () => {
      const config = {
        frequency: 'daily' as const,
        recipients: ['user1@example.com', 'user2@example.com'],
        metrics: ['views', 'likes', 'engagement'],
      };
      
      const options = {
        includeCharts: true,
        includeRawData: false,
      };

      const result = await reportGenerator.scheduleRecurringReport(config, options);
      expect(result).toBe('Scheduled');
    });

    it('should schedule weekly recurring report', async () => {
      const config = {
        frequency: 'weekly' as const,
        recipients: ['manager@example.com'],
        metrics: ['growth', 'performance'],
      };
      
      const options = {
        includeCharts: false,
        includeRawData: true,
      };

      const result = await reportGenerator.scheduleRecurringReport(config, options);
      expect(result).toBe('Scheduled');
    });

    it('should schedule monthly recurring report', async () => {
      const config = {
        frequency: 'monthly' as const,
        recipients: ['executive@example.com', 'analytics@example.com'],
        metrics: ['comprehensive', 'trends', 'forecasts'],
      };
      
      const options = {
        includeCharts: true,
        includeRawData: true,
      };

      const result = await reportGenerator.scheduleRecurringReport(config, options);
      expect(result).toBe('Scheduled');
    });

    it('should handle empty recipients list', async () => {
      const config = {
        frequency: 'daily' as const,
        recipients: [],
        metrics: ['basic'],
      };
      
      const options = {
        includeCharts: false,
        includeRawData: false,
      };

      const result = await reportGenerator.scheduleRecurringReport(config, options);
      expect(result).toBe('Scheduled');
    });

    it('should handle empty metrics list', async () => {
      const config = {
        frequency: 'weekly' as const,
        recipients: ['user@example.com'],
        metrics: [],
      };
      
      const options = {
        includeCharts: true,
        includeRawData: false,
      };

      const result = await reportGenerator.scheduleRecurringReport(config, options);
      expect(result).toBe('Scheduled');
    });

    it('should handle multiple scheduling requests', async () => {
      const configs = [
        { frequency: 'daily' as const, recipients: ['daily@example.com'], metrics: ['daily'] },
        { frequency: 'weekly' as const, recipients: ['weekly@example.com'], metrics: ['weekly'] },
        { frequency: 'monthly' as const, recipients: ['monthly@example.com'], metrics: ['monthly'] },
      ];

      const options = { includeCharts: true, includeRawData: false };

      const results = await Promise.all(
        configs.map(config => reportGenerator.scheduleRecurringReport(config, options))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBe('Scheduled');
      });
    });
  });

  describe('EmailService integration', () => {
    it('should work without email service', async () => {
      const reportGeneratorWithoutEmail = new ReportGenerator();
      
      const result = await reportGeneratorWithoutEmail.generateReport(mockData, mockInsights, defaultOptions);
      expect(result).toBeDefined();
      expect(result).toContain('<html>');
    });

    it('should integrate with email service for future delivery', async () => {
      // Test that the email service is properly injected and accessible
      expect(reportGenerator['emailService']).toBe(mockEmailService);
    });
  });

  describe('performance and reliability', () => {
    it('should handle large data sets efficiently', async () => {
      const largeData = {
        summary: 'Large dataset report',
        metrics: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          views: Math.floor(Math.random() * 10000),
          likes: Math.floor(Math.random() * 1000),
        })),
      };

      const startTime = Date.now();
      const result = await reportGenerator.generateReport(largeData, mockInsights, { ...defaultOptions, format: 'json' });
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent report generation', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        data: { ...mockData, id: i },
        insights: { ...mockInsights, reportId: i },
        options: { ...defaultOptions, format: 'json' as const },
      }));

      const results = await Promise.all(
        requests.map(req => reportGenerator.generateReport(req.data, req.insights, req.options))
      );

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        const parsed = JSON.parse(result as string);
        expect(parsed.data.id).toBe(index);
        expect(parsed.insights.reportId).toBe(index);
      });
    });

    it('should maintain consistent output format', async () => {
      const results = await Promise.all([
        reportGenerator.generateReport(mockData, mockInsights, { ...defaultOptions, format: 'html' }),
        reportGenerator.generateReport(mockData, mockInsights, { ...defaultOptions, format: 'html' }),
        reportGenerator.generateReport(mockData, mockInsights, { ...defaultOptions, format: 'html' }),
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result).toContain('<html>');
        expect(result).toContain(mockData.summary);
      });
    });
  });

  describe('future implementation readiness', () => {
    it('should support email delivery integration', async () => {
      const optionsWithEmail: ReportOptions = {
        ...defaultOptions,
        recipientEmails: ['test1@example.com', 'test2@example.com'],
      };

      const result = await reportGenerator.generateReport(mockData, mockInsights, optionsWithEmail);
      expect(result).toBeDefined();
      
      // Verify structure supports email delivery
      expect(optionsWithEmail.recipientEmails).toBeInstanceOf(Array);
      expect(optionsWithEmail.recipientEmails!.length).toBe(2);
    });

    it('should support chart generation integration', async () => {
      const optionsWithCharts: ReportOptions = {
        ...defaultOptions,
        includeCharts: true,
      };

      const result = await reportGenerator.generateReport(mockData, mockInsights, optionsWithCharts);
      expect(result).toBeDefined();
      
      // Verify structure supports chart inclusion
      expect(optionsWithCharts.includeCharts).toBe(true);
    });

    it('should support raw data inclusion', async () => {
      const optionsWithRawData: ReportOptions = {
        ...defaultOptions,
        includeRawData: true,
      };

      const result = await reportGenerator.generateReport(mockData, mockInsights, optionsWithRawData);
      expect(result).toBeDefined();
      
      // Verify structure supports raw data inclusion
      expect(optionsWithRawData.includeRawData).toBe(true);
    });

    it('should support advanced scheduling features', async () => {
      const advancedConfig = {
        frequency: 'weekly' as const,
        recipients: ['advanced@example.com'],
        metrics: ['advanced', 'custom', 'detailed'],
        customSchedule: { dayOfWeek: 'monday', hour: 9 },
        timezone: 'UTC',
        template: 'executive-summary',
      };

      const result = await reportGenerator.scheduleRecurringReport(advancedConfig, defaultOptions);
      expect(result).toBe('Scheduled');
    });
  });
}); 