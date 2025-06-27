// Mock OpenAI to prevent browser environment errors
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-api-key';

import { ContentAutomationWorkflow } from '../contentAutomationWorkflow';
import { optimizeVideo } from '../videoOptimization';
import { autopost } from '../autoposting';
import { ContentOptimizationRequest } from '../../app/workflows/video_optimization/enhanced_content_optimization_types';
import { AutoPostRequest } from '../autoposting';

// Mock dependencies
jest.mock('../videoOptimization');
jest.mock('../autoposting');

const mockOptimizeVideo = optimizeVideo as jest.MockedFunction<typeof optimizeVideo>;
const mockAutopost = autopost as jest.MockedFunction<typeof autopost>;

describe('ContentAutomationWorkflow', () => {
  let workflow: ContentAutomationWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    workflow = new ContentAutomationWorkflow();

    // Default successful mocks
    mockOptimizeVideo.mockImplementation(async (req: ContentOptimizationRequest) => {
      return { 
        success: true, 
        data: { optimizedVideoContent: { optimizedCaption: 'optimized', trendingHashtags: [{ tag: '#mocktag' }] } as any }, 
        metadata: { generatedAt: new Date(), source: 'test' }
      };
    });
    mockAutopost.mockImplementation(async (req: AutoPostRequest) => {
      return { id: 'mock-autopost-id', success: true };
    });
  });

  describe('executeBulk', () => {
    it('should process a single request successfully', async () => {
      const requests = [
        {
          userId: 'test-user-1',
          videoUrl: 'https://example.com/video1.mp4',
          platform: 'tiktok' as const,
          timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
          caption: 'original caption',
          hashtags: ['#original'],
        },
      ];

      const results = await workflow.executeBulk(requests);

      expect(results.length).toBe(1);
      expect(results[0].requestId).toBeDefined();
      expect(results[0].optimization.success).toBe(true);
      expect(results[0].autopostId).toBe('mock-autopost-id');
      expect(mockOptimizeVideo).toHaveBeenCalledTimes(1);
      expect(mockAutopost).toHaveBeenCalledTimes(1);
      expect(mockAutopost).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            caption: 'optimized',
            hashtags: [{ tag: '#mocktag' }],
          }),
        }),
      );
      expect(results[0].status).toBe('success');
      expect(results[0].error).toBeUndefined();
    });

    it('should process multiple requests concurrently', async () => {
      const requests = Array.from({ length: 5 }).map((_, i) => ({
        userId: `user-${i}`,
        videoUrl: `https://example.com/video${i}.mp4`,
        platform: 'youtube' as const,
        timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
      }));

      const results = await workflow.executeBulk(requests);

      expect(results.length).toBe(5);
      expect(mockOptimizeVideo).toHaveBeenCalledTimes(5);
      expect(mockAutopost).toHaveBeenCalledTimes(5);
      results.forEach(result => {
        expect(result.status).toBe('success');
        expect(result.error).toBeUndefined();
      });
    });

    it('should handle optimization failures', async () => {
      const requests = [
        {
          userId: 'fail-user',
          videoUrl: 'https://example.com/fail-video.mp4',
          platform: 'tiktok' as const,
          timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
        },
      ];

      mockOptimizeVideo.mockResolvedValueOnce({
        success: false,
        error: { message: 'Optimization service down', code: 'SERVICE_ERROR' },
        metadata: { generatedAt: new Date(), source: 'test' },
      });

      const results = await workflow.executeBulk(requests);

      expect(results.length).toBe(1);
      expect(results[0].optimization.success).toBe(false);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBeDefined();
      expect(results[0].error!.message).toContain('Optimization service down');
      expect(mockAutopost).not.toHaveBeenCalled(); // Autopost should not be called if optimization fails
    });

    it('should handle autoposting failures', async () => {
      const requests = [
        {
          userId: 'fail-autopost-user',
          videoUrl: 'https://example.com/video.mp4',
          platform: 'instagram' as const,
          timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
        },
      ];

      mockAutopost.mockResolvedValueOnce({ id: 'error-id', success: false, error: { message: 'Platform API error', code: 'PLATFORM_ERROR' } });

      const results = await workflow.executeBulk(requests);

      expect(results.length).toBe(1);
      expect(results[0].optimization.success).toBe(true);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBeDefined();
      expect(results[0].error!.message).toContain('Platform API error');
      expect(mockOptimizeVideo).toHaveBeenCalledTimes(1);
    });
  });

  describe('advanced scheduling options', () => {
    it('should pass scheduleTime to autopost', async () => {
      const scheduleTime = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
      const requests = [
        {
          userId: 'scheduled-user',
          videoUrl: 'https://example.com/scheduled-video.mp4',
          platform: 'youtube' as const,
          timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
          scheduleTime: scheduleTime,
        },
      ];

      await workflow.executeBulk(requests);

      expect(mockAutopost).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleTime: scheduleTime,
        }),
      );
    });

    it('should handle timezone conversions for scheduling (conceptual)', async () => {
      const timezoneRequests = [
        {
          userId: 'timezone-user-1',
          videoUrl: 'https://example.com/timezone-video.mp4',
          platform: 'tiktok' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          scheduleTime: new Date('2024-03-15T10:00:00Z'), // UTC time
          schedulingOptions: { timezone: 'America/New_York' }, // Intention for timezone conversion
        },
        {
          userId: 'timezone-user-2',
          videoUrl: 'https://example.com/timezone-video-2.mp4',
          platform: 'instagram' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          scheduleTime: new Date('2024-03-15T18:00:00Z'), // UTC time
          schedulingOptions: { timezone: 'Europe/London' },
        },
      ];

      // For this test, we are primarily checking if the `scheduleTime` is passed correctly.
      // Actual timezone conversion logic would be within the `autopost` service.
      await workflow.executeBulk(timezoneRequests as any);
      
      expect(mockAutopost).toHaveBeenCalledWith(expect.objectContaining({ scheduleTime: timezoneRequests[0].scheduleTime }));
      expect(mockAutopost).toHaveBeenCalledWith(expect.objectContaining({ scheduleTime: timezoneRequests[1].scheduleTime }));
    });

    it('should handle recurring schedule patterns (conceptual)', async () => {
      const recurringRequests = [
        {
          userId: 'recurring-user-1',
          videoUrl: 'https://example.com/recurring-video.mp4',
          platform: 'tiktok' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          scheduleTime: new Date(Date.now() + 3600000), // 1 hour from now
          schedulingOptions: {
            recurring: true,
            interval: 'daily',
            endDate: new Date(Date.now() + 604800000), // 1 week
          },
        },
        {
          userId: 'recurring-user-2',
          videoUrl: 'https://example.com/weekly-video.mp4',
          platform: 'instagram' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          scheduleTime: new Date(Date.now() + 3600000), // 1 hour from now
          schedulingOptions: {
            recurring: true,
            interval: 'weekly',
            daysOfWeek: ['monday', 'wednesday', 'friday'],
          },
        },
      ];

      await workflow.executeBulk(recurringRequests as any);
      
      expect(mockAutopost).toHaveBeenCalledWith(expect.objectContaining({
        scheduleTime: recurringRequests[0].scheduleTime,
        // In a real scenario, autopost would interpret and handle recurring options
      }));
      expect(mockAutopost).toHaveBeenCalledWith(expect.objectContaining({
        scheduleTime: recurringRequests[1].scheduleTime,
      }));
    });
  });

  describe('comprehensive error handling', () => {
    it('should handle API rate limiting gracefully', async () => {
      const rateLimitRequests = Array.from({ length: 20 }).map((_, idx) => ({
        userId: `rate-limit-user-${idx}`,
        videoUrl: `https://example.com/rate-limit-video-${idx}.mp4`,
        platform: 'instagram' as const,
        timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
      }));

      // Mock the autopost service to simulate rate limiting
      mockAutopost.mockImplementation(async (req: AutoPostRequest) => {
        if (mockAutopost.mock.calls.length % 5 === 0) {
          // Simulate a rate limit error every 5th call
          return { id: 'error-id', success: false, error: { message: 'Rate limit exceeded', code: 'RATE_LIMITED' } };
        }
        return { id: 'post-id', success: true };
      });

      const results = await workflow.executeBulk(rateLimitRequests as any);
      expect(results.length).toBe(20);
      
      // Should handle rate limiting without throwing errors
      results.forEach(result => {
        // Expected statuses from the mocked autopost service
        expect(['success', 'failed']).toContain(result.status);
        if (result.status === 'failed') {
          expect(result.error).toBeDefined();
          expect(result.error!.code).toBe('RATE_LIMITED');
        }
      });
    });

    it('should handle service unavailability with retry logic', async () => {
      const unavailabilityRequests = [
        {
          userId: 'unavailable-user-1',
          videoUrl: 'https://example.com/unavailable-video.mp4',
          platform: 'tiktok' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          retryOptions: {
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
          },
        },
      ];

      // Mock optimizeVideo to fail for the first few calls then succeed
      let optimizeVideoCallCount = 0;
      mockOptimizeVideo.mockImplementation(async (req: ContentOptimizationRequest) => {
        optimizeVideoCallCount++;
        if (optimizeVideoCallCount <= 2) {
          return { success: false, error: { message: 'Service unavailable', code: 'UNAVAILABLE' }, metadata: { generatedAt: new Date(), source: 'test' } };
        }
        return { success: true, data: { optimizedVideoContent: { optimizedCaption: 'optimized', trendingHashtags: [] } as any }, metadata: { generatedAt: new Date(), source: 'test' } };
      });

      const results = await workflow.executeBulk(unavailabilityRequests as any);
      expect(results.length).toBe(1);
      
      // The workflow should eventually succeed due to retry logic (implicitly handled by the mock)
      expect(results[0].status).toBe('success');
      expect(results[0].error).toBeUndefined();

      // Verify retry info if applicable (the test implies retry handling, but the mock doesn't expose it directly yet)
      // if (results[0].retryInfo) {
      //   expect(results[0].retryInfo).toHaveProperty('attempts');
      //   expect(results[0].retryInfo.attempts).toBeGreaterThanOrEqual(1);
      // }
    });

    it('should handle partial failures in batch processing', async () => {
      const mixedRequests = [
        {
          userId: 'success-user-1',
          videoUrl: 'https://example.com/success-video.mp4',
          platform: 'instagram' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
        },
        {
          userId: 'failure-user-1',
          videoUrl: 'invalid-url',
          platform: 'tiktok' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
        },
        {
          userId: 'success-user-2',
          videoUrl: 'https://example.com/success-video-2.mp4',
          platform: 'youtube' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
        },
      ];

      // Mock optimizeVideo to fail for invalid-url
      mockOptimizeVideo.mockImplementation(async (req: ContentOptimizationRequest) => {
        if (req.videoUrl === 'invalid-url') {
          return { success: false, error: { message: 'Invalid video URL', code: 'INVALID_URL' }, metadata: { generatedAt: new Date(), source: 'test' } };
        }
        return { success: true, data: { optimizedVideoContent: { optimizedCaption: 'optimized', trendingHashtags: [] } as any }, metadata: { generatedAt: new Date(), source: 'test' } };
      });

      const results = await workflow.executeBulk(mixedRequests as any);
      expect(results.length).toBe(3);
      
      // Should process all requests, marking failures appropriately
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach(result => {
        // Explicitly check for success status based on mock implementation
        if (result.optimization.success) {
          successCount++;
          expect(result.status).toBe('success');
          expect(result.error).toBeUndefined();
        } else {
          failureCount++;
          expect(result.status).toBe('failed');
          expect(result.error).toBeDefined();
          expect(result.error!.code).toBe('INVALID_URL');
        }
      });
      
      expect(successCount).toBe(2);
      expect(failureCount).toBe(1);
    });

    it('should handle resource exhaustion scenarios', async () => {
      const resourceExhaustionRequests = Array.from({ length: 100 }).map((_, idx) => ({
        userId: `resource-user-${idx}`,
        videoUrl: `https://example.com/resource-video-${idx}.mp4`,
        platform: 'tiktok' as const,
        timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
      }));

      // Mock optimizeVideo to simulate resource exhaustion
      let optimizeVideoCallCount = 0;
      mockOptimizeVideo.mockImplementation(async (req: ContentOptimizationRequest) => {
        optimizeVideoCallCount++;
        if (optimizeVideoCallCount > 50) { // After 50 successful calls, simulate exhaustion
          return { success: false, error: { message: 'Resource exhausted', code: 'RESOURCE_EXHAUSTED' }, metadata: { generatedAt: new Date(), source: 'test' } };
        }
        return { success: true, data: { optimizedVideoContent: { optimizedCaption: 'optimized', trendingHashtags: [] } as any }, metadata: { generatedAt: new Date(), source: 'test' } };
      });

      const startTime = Date.now();
      const results = await workflow.executeBulk(resourceExhaustionRequests as any);
      const endTime = Date.now();

      expect(results.length).toBe(100);
      // Should handle resource constraints gracefully
      expect(endTime - startTime).toBeLessThan(120000); // 2 minutes max
      
      // Should not crash or hang
      expect(Array.isArray(results)).toBe(true);

      let successCount = 0;
      let failureCount = 0;
      results.forEach(result => {
        if (result.optimization.success) {
          successCount++;
          expect(result.status).toBe('success');
          expect(result.error).toBeUndefined();
        } else {
          failureCount++;
          expect(result.status).toBe('failed');
          expect(result.error).toBeDefined();
          expect(result.error!.code).toBe('RESOURCE_EXHAUSTED');
        }
      });
      expect(successCount).toBe(50);
      expect(failureCount).toBe(50);
    });
  });

  describe('workflow state persistence', () => {
    it('should maintain workflow state across interruptions', async () => {
      const persistenceRequests = [
        {
          userId: 'persistence-user-1',
          videoUrl: 'https://example.com/persistence-video.mp4',
          platform: 'instagram' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          workflowId: 'workflow-123',
        },
      ];

      // Mock optimizeVideo to return workflowState
      mockOptimizeVideo.mockImplementation(async (req: ContentOptimizationRequest) => {
        return { 
          success: true, 
          data: { optimizedVideoContent: { optimizedCaption: 'optimized', trendingHashtags: [] } as any },
          metadata: { generatedAt: new Date(), source: 'test' },
          workflowState: { id: req.workflowId!, status: 'in_progress', progress: 50 } // Mock workflowState
        };
      });

      const results = await workflow.executeBulk(persistenceRequests as any);
      expect(results.length).toBe(1);
      
      expect(results[0].status).toBe('success'); // Assuming final status is success if workflow completes
      expect(results[0].workflowState).toBeDefined();
      expect(results[0].workflowState!).toHaveProperty('id');
      expect(results[0].workflowState!).toHaveProperty('status');
      expect(results[0].workflowState!).toHaveProperty('progress');
    });

    it('should handle workflow resumption after failures', async () => {
      const resumptionRequests = [
        {
          userId: 'resumption-user-1',
          videoUrl: 'https://example.com/resumption-video.mp4',
          platform: 'tiktok' as const,
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
          workflowId: 'workflow-456',
          resumeFromStep: 'processing',
        },
      ];

      // Mock optimizeVideo to return resumptionInfo
      mockOptimizeVideo.mockImplementation(async (req: ContentOptimizationRequest) => {
        return { 
          success: true, 
          data: { optimizedVideoContent: { optimizedCaption: 'optimized', trendingHashtags: [] } as any },
          metadata: { generatedAt: new Date(), source: 'test' },
          resumptionInfo: { resumedFrom: req.resumeFromStep!, completedSteps: ['optimization'] } // Mock resumptionInfo
        };
      });

      const results = await workflow.executeBulk(resumptionRequests as any);
      expect(results.length).toBe(1);
      
      expect(results[0].status).toBe('success'); // Assuming final status is success if workflow completes
      expect(results[0].resumptionInfo).toBeDefined();
      expect(results[0].resumptionInfo!).toHaveProperty('resumedFrom');
      expect(results[0].resumptionInfo!).toHaveProperty('completedSteps');
    });
  });
}); 