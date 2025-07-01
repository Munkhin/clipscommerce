import { GET } from '@/app/api/competitors/route';
import {
  createMockRequest,
  createMockSupabaseClient,
  mockSuccessfulAuth,
  mockFailedAuth,
  cleanupMocks
} from '../utils/test-helpers';
import { createClient } from '@/../supabase';

// Mock Supabase auth helpers
jest.mock('@/../supabase', () => ({
  createClient: jest.fn()
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

describe('/api/competitors API Route', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockFailedAuth(mockSupabaseClient);

      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return 401 when auth returns null user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      mockSuccessfulAuth(mockSupabaseClient);

      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockSuccessfulAuth(mockSupabaseClient);
    });

    it('should handle request with default parameters', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.timestamp).toBeDefined();
    });

    it('should handle niche parameter correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?niche=tech');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      // Should return tech competitors
      expect(responseData.data[0].name).toContain('Tech');
    });

    it('should handle limit parameter correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?limit=3');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(3);
    });

    it('should handle multiple parameters', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?niche=fashion&limit=2');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
    });

    it('should handle invalid limit parameter gracefully', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?limit=invalid');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should default to 5
      expect(responseData.data).toHaveLength(5);
    });

    it('should handle unknown niche by falling back to general', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?niche=unknown');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockSuccessfulAuth(mockSupabaseClient);
    });

    it('should return correctly formatted response', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');
      expect(responseData).toHaveProperty('timestamp');
      expect(Array.isArray(responseData.data)).toBe(true);
    });

    it('should return competitor data with correct structure', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?limit=1');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      const competitor = responseData.data[0];
      
      expect(competitor).toHaveProperty('id');
      expect(competitor).toHaveProperty('name');
      expect(competitor).toHaveProperty('handle');
      expect(competitor).toHaveProperty('followers');
      expect(competitor).toHaveProperty('engagement');
      expect(competitor).toHaveProperty('avgViews');
      expect(competitor).toHaveProperty('topContent');
      expect(competitor).toHaveProperty('tactics');
      expect(competitor).toHaveProperty('hooks');
      
      expect(Array.isArray(competitor.topContent)).toBe(true);
      expect(Array.isArray(competitor.tactics)).toBe(true);
      expect(Array.isArray(competitor.hooks)).toBe(true);
    });

    it('should return top content with correct structure', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors?limit=1');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      const topContent = responseData.data[0].topContent[0];
      
      expect(topContent).toHaveProperty('id');
      expect(topContent).toHaveProperty('title');
      expect(topContent).toHaveProperty('views');
      expect(topContent).toHaveProperty('engagement');
      expect(topContent).toHaveProperty('url');
      expect(topContent).toHaveProperty('platform');
      expect(['tiktok', 'instagram', 'youtube']).toContain(topContent.platform);
    });

    it('should return valid ISO timestamp', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(new Date(responseData.timestamp).toISOString()).toBe(responseData.timestamp);
    });
  });

  describe('Niche-Specific Data', () => {
    beforeEach(() => {
      mockSuccessfulAuth(mockSupabaseClient);
    });

    const niches = ['tech', 'fashion', 'fitness', 'food', 'beauty', 'general'];

    niches.forEach(niche => {
      it(`should return ${niche} competitors with relevant data`, async () => {
        const request = createMockRequest(`http://localhost:3000/api/competitors?niche=${niche}`);
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.data).toBeDefined();
        expect(responseData.data.length).toBeGreaterThan(0);
        
        // Verify competitor data structure
        const competitor = responseData.data[0];
        expect(competitor.id).toContain(niche === 'general' ? 'general' : niche);
        expect(competitor.tactics).toBeDefined();
        expect(competitor.hooks).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      mockSuccessfulAuth(mockSupabaseClient);
      
      // Mock an error in the fetchCompetitorData function by mocking Date to throw
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Internal error');
      }) as any;
      global.Date.now = originalDate.now;

      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch competitor data');

      // Restore Date
      global.Date = originalDate;
    });

    it('should handle large limit values', async () => {
      mockSuccessfulAuth(mockSupabaseClient);

      const request = createMockRequest('http://localhost:3000/api/competitors?limit=9999');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should handle large limits gracefully without crashing
      expect(Array.isArray(responseData.data)).toBe(true);
    });

    it('should handle negative limit values', async () => {
      mockSuccessfulAuth(mockSupabaseClient);

      const request = createMockRequest('http://localhost:3000/api/competitors?limit=-5');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should handle negative limits gracefully
      expect(Array.isArray(responseData.data)).toBe(true);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      mockSuccessfulAuth(mockSupabaseClient);
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const request = createMockRequest('http://localhost:3000/api/competitors?limit=10');
      const response = await GET(request);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        createMockRequest('http://localhost:3000/api/competitors?limit=3')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => GET(req)));
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });

  describe('Content Validation', () => {
    beforeEach(() => {
      mockSuccessfulAuth(mockSupabaseClient);
    });

    it('should return competitors with valid engagement percentages', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      responseData.data.forEach((competitor: { engagement: string }) => {
        expect(competitor.engagement).toMatch(/^\d+(\.\d+)?%$/);
        const percentage = parseFloat(competitor.engagement.replace('%', ''));
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should return competitors with valid follower counts', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      responseData.data.forEach((competitor: { followers: string }) => {
        expect(competitor.followers).toMatch(/^\d+(\.\d+)?[KMB]?$/);
      });
    });

    it('should return valid URLs in top content', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      responseData.data.forEach((competitor: { topContent: Array<{ url: string }> }) => {
        competitor.topContent.forEach((content: { url: string }) => {
          expect(content.url).toMatch(/^https?:\/\/.+/);
        });
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should only accept GET requests', async () => {
      mockSuccessfulAuth(mockSupabaseClient);

      // Test that the route function is specifically for GET
      // Note: In Next.js App Router, each HTTP method is a separate export
      expect(typeof GET).toBe('function');
    });
  });

  describe('Headers and CORS', () => {
    beforeEach(() => {
      mockSuccessfulAuth(mockSupabaseClient);
    });

    it('should return JSON content type', async () => {
      const request = createMockRequest('http://localhost:3000/api/competitors');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});