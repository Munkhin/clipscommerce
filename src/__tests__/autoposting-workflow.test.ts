import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the required modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({
        data: { id: 'test-post-id', status: 'scheduled' },
        error: null
      })),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn(() => Promise.resolve({
        data: [],
        error: null
      }))
    })),
    rpc: jest.fn(() => Promise.resolve({
      data: [],
      error: null
    }))
  }))
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

describe('Autoposting Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Post Scheduling', () => {
    test('should validate required fields for post scheduling', async () => {
      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          content: 'Test content',
          media_urls: ['https://example.com/video.mp4'],
          post_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      // Should succeed with valid data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should reject post with past timestamp', async () => {
      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          content: 'Test content',
          media_urls: ['https://example.com/video.mp4'],
          post_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('future');
    });

    test('should validate media URLs', async () => {
      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          content: 'Test content',
          media_urls: ['invalid-url'],
          post_time: new Date(Date.now() + 3600000).toISOString(),
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('media URLs');
    });
  });

  describe('Retry Logic', () => {
    test('should calculate exponential backoff correctly', async () => {
      const { RetryService } = await import('@/app/workflows/autoposting/RetryService');
      const { MonitoringService } = await import('@/app/workflows/autoposting/Monitoring');
      
      const monitoring = new MonitoringService();
      const retryService = new RetryService(monitoring);
      
      // Test exponential backoff calculation
      const delay1 = retryService.calculateRetryDelay(0, 'tiktok');
      const delay2 = retryService.calculateRetryDelay(1, 'tiktok');
      const delay3 = retryService.calculateRetryDelay(2, 'tiktok');
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      
      // Should not exceed max delay
      const maxDelay = retryService.calculateRetryDelay(10, 'tiktok');
      expect(maxDelay).toBeLessThanOrEqual(1800000); // 30 minutes for TikTok
    });

    test('should handle platform-specific retry configurations', async () => {
      const { RetryService } = await import('@/app/workflows/autoposting/RetryService');
      const { MonitoringService } = await import('@/app/workflows/autoposting/Monitoring');
      
      const monitoring = new MonitoringService();
      const retryService = new RetryService(monitoring);
      
      // TikTok should have different config than Instagram
      const tiktokDelay = retryService.calculateRetryDelay(1, 'tiktok');
      const instagramDelay = retryService.calculateRetryDelay(1, 'instagram');
      
      // TikTok has longer base delay (60s vs 30s)
      expect(tiktokDelay).toBeGreaterThan(instagramDelay);
    });
  });

  describe('Platform Poster Integration', () => {
    test('should validate content for TikTok platform', async () => {
      const { TikTokPoster } = await import('@/app/workflows/autoposting/PlatformPoster');
      
      const poster = new TikTokPoster();
      
      // Valid content
      const validContent = {
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test caption',
        hashtags: ['test', 'video'],
        duration: 30
      };
      
      const validResult = await poster.validateContent(validContent);
      expect(validResult.isValid).toBe(true);
      
      // Invalid content - no video URL
      const invalidContent = {
        caption: 'Test caption'
      };
      
      const invalidResult = await poster.validateContent(invalidContent);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('TikTok content must include a mediaUrl or videoUrl field');
    });

    test('should validate content for Instagram platform', async () => {
      const { InstagramPoster } = await import('@/app/workflows/autoposting/PlatformPoster');
      
      const poster = new InstagramPoster();
      
      // Valid content
      const validContent = {
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        hashtags: ['test', 'image']
      };
      
      const validResult = await poster.validateContent(validContent);
      expect(validResult.isValid).toBe(true);
      
      // Invalid content - too many hashtags
      const invalidContent = {
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        hashtags: Array(35).fill('tag') // 35 hashtags > 30 limit
      };
      
      const invalidResult = await poster.validateContent(invalidContent);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Instagram allows maximum 30 hashtags per post');
    });

    test('should validate content for YouTube platform', async () => {
      const { YouTubePoster } = await import('@/app/workflows/autoposting/PlatformPoster');
      
      const poster = new YouTubePoster();
      
      // Valid content
      const validContent = {
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Video',
        description: 'Test description',
        tags: ['test', 'video']
      };
      
      const validResult = await poster.validateContent(validContent);
      expect(validResult.isValid).toBe(true);
      
      // Invalid content - no title
      const invalidContent = {
        videoUrl: 'https://example.com/video.mp4',
        description: 'Test description'
      };
      
      const invalidResult = await poster.validateContent(invalidContent);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('YouTube videos must have a title');
    });
  });

  describe('Queue Management', () => {
    test('should fetch queue statistics', async () => {
      const { GET } = await import('@/app/api/autoposting/queue/route');
      
      const request = new Request('http://localhost/api/autoposting/queue');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('ready_for_processing');
      expect(data).toHaveProperty('ready_for_retry');
    });

    test('should process queue items', async () => {
      const { POST } = await import('@/app/api/autoposting/queue/route');
      
      const request = new Request('http://localhost/api/autoposting/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process'
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Dead Letter Queue Management', () => {
    test('should fetch DLQ items', async () => {
      const { GET } = await import('@/app/api/autoposting/dead-letter-queue/route');
      
      const request = new Request('http://localhost/api/autoposting/dead-letter-queue');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('statistics');
    });

    test('should resolve DLQ items', async () => {
      const { POST } = await import('@/app/api/autoposting/dead-letter-queue/route');
      
      const request = new Request('http://localhost/api/autoposting/dead-letter-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: 'test-dlq-item-id',
          action: 'resolve',
          resolution_notes: 'Test resolution'
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Retry API Endpoints', () => {
    test('should schedule manual retry', async () => {
      const { POST } = await import('@/app/api/autoposting/retry/route');
      
      const request = new Request('http://localhost/api/autoposting/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: 'test-post-id',
          error_type: 'manual_retry',
          strategy: 'exponential_backoff'
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should fetch retry statistics', async () => {
      const { GET } = await import('@/app/api/autoposting/retry/route');
      
      const request = new Request('http://localhost/api/autoposting/retry?days=7');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('retry_stats');
      expect(data).toHaveProperty('database_stats');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock a database error
      const mockError = new Error('Database connection failed');
      jest.mocked(require('@/lib/supabase/server').createClient).mockImplementationOnce(() => {
        throw mockError;
      });

      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          content: 'Test content',
          media_urls: ['https://example.com/video.mp4'],
          post_time: new Date(Date.now() + 3600000).toISOString(),
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });

    test('should handle invalid JSON in request body', async () => {
      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject unauthenticated requests', async () => {
      // Mock unauthenticated user
      jest.mocked(require('@/lib/supabase/server').createClient).mockImplementationOnce(() => ({
        auth: {
          getUser: jest.fn(() => Promise.resolve({
            data: { user: null },
            error: new Error('Unauthorized')
          }))
        }
      }));

      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          content: 'Test content',
          media_urls: ['https://example.com/video.mp4'],
          post_time: new Date(Date.now() + 3600000).toISOString(),
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Data Validation', () => {
    test('should validate Zod schemas correctly', async () => {
      const { POST } = await import('@/app/api/autoposting/schedule/route');
      
      // Missing required fields
      const request = new Request('http://localhost/api/autoposting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'invalid-platform', // Invalid enum value
          content: '', // Empty content
          media_urls: [], // Empty array
          post_time: 'invalid-date', // Invalid date format
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
      expect(data.details).toBeDefined();
    });
  });
});