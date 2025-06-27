import { ContentInsightsEngine } from './ContentInsightsEngine';
import { BaseAnalysisRequest, Platform, TimeRange, DetailedPlatformMetricsSchema } from '../types'; // Assuming Platform and TimeRange are needed for BaseAnalysisRequest
import { ZodError } from 'zod';

describe('ContentInsightsEngine', () => {
  let engine: ContentInsightsEngine;

  beforeEach(() => {
    engine = new ContentInsightsEngine();
  });

  describe('getDetailedPlatformAnalytics', () => {
    // Helper function to create date strings for tests
    const getTestDateString = (date: Date): string => date.toISOString();
    const today = new Date('2024-01-15T12:00:00.000Z'); // Fixed date for test consistency
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const mockRequest: BaseAnalysisRequest = {
      userId: 'testUser123',
      platform: 'Instagram', // Use string literal
      timeRange: { 
        start: getTestDateString(sevenDaysAgo),
        end: getTestDateString(today),
      },
      correlationId: 'test-correlation-id-123',
    };

    it('should return success:true and mock detailed platform analytics data', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();

      // Validate the structure of the returned data against the Zod schema
      try {
        DetailedPlatformMetricsSchema.parse(result.data);
      } catch (e) {
        if (e instanceof ZodError) {
          console.error('Zod validation errors:', JSON.stringify(e.issues, null, 2));
        }
        // Fail the test if parsing fails
        throw new Error(`Data validation failed for DetailedPlatformMetrics: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      expect(result.data?.audienceDemographics).toBeDefined();
      expect(result.data?.audienceDemographics?.ageGroups).toEqual({ '18-24': 0.35, '25-34': 0.40, '35-44': 0.15 });
      
      expect(result.data?.peakEngagementTimes).toBeDefined();
      expect(result.data?.peakEngagementTimes?.length).toBeGreaterThan(0);
      if (result.data?.peakEngagementTimes?.length) { // Type guard
        expect(result.data.peakEngagementTimes[0].dayOfWeek).toBe('Friday');
      }

      expect(result.data?.contentFormatPerformance).toBeDefined();
      expect(result.data?.contentFormatPerformance?.length).toBeGreaterThan(0);
       if (result.data?.contentFormatPerformance?.length) { // Type guard
        expect(result.data.contentFormatPerformance[0].formatName).toBe('Reels');
      }

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.source).toBe('ContentInsightsEngine.getDetailedPlatformAnalytics');
      expect(result.metadata?.correlationId).toBe(mockRequest.correlationId);
      expect(result.metadata?.warnings).toContain('Using placeholder data for detailed analytics');
    });

    it('should include correlationId in metadata if provided in request', async () => {
      const result = await engine.getDetailedPlatformAnalytics(mockRequest);
      expect(result.metadata?.correlationId).toBe('test-correlation-id-123');
    });

    it('should handle request without correlationId', async () => {
      const requestWithoutCorrelationId: BaseAnalysisRequest = {
        userId: 'testUser456',
        platform: 'TikTok', // Use string literal
        timeRange: { 
          start: getTestDateString(thirtyDaysAgo),
          end: getTestDateString(today),
        },
      };
      const result = await engine.getDetailedPlatformAnalytics(requestWithoutCorrelationId);
      expect(result.success).toBe(true);
      expect(result.metadata?.correlationId).toBeUndefined();
    });
  });

  // We can add tests for getTopPerformingContentInsights later if needed,
  // focusing on the new getDetailedPlatformAnalytics for now.
});
