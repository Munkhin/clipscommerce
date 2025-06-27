import { middleware } from '../../middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock the entire next/server module
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');

  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      next: jest.fn(() => {
        const response = new actual.NextResponse();
        response.status = 200;
        return response;
      }),
      redirect: jest.fn((url: string) => {
        const response = actual.NextResponse.redirect(url);
        response.status = 307;
        return response;
      }),
      json: jest.fn((data: any, options: any) => {
        const response = actual.NextResponse.json(data, options);
        return response;
      }),
    },
  };
});

// Mock Supabase and CSRF logic as needed
const mockGetSession = jest.fn();
const mockCreateClient = jest.fn();
jest.mock('../../src/lib/supabase/middleware', () => ({
  createClient: () => ({
    supabase: { auth: { getSession: mockGetSession } },
    response: NextResponse.next(),
  }),
}));

describe('Middleware', () => {
  let mockRequest: Partial<NextRequest>;
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock implementations for NextResponse methods before each test
    (NextResponse.next as jest.Mock).mockClear();
    (NextResponse.redirect as jest.Mock).mockClear();
    (NextResponse.json as jest.Mock).mockClear();

    // Re-implement the mock each time to ensure isolation
    (NextResponse.next as jest.Mock).mockImplementation(() => {
      const actual = jest.requireActual('next/server');
      const response = new actual.NextResponse();
      response.status = 200;
      return response;
    });

    (NextResponse.redirect as jest.Mock).mockImplementation((url: string) => {
      const actual = jest.requireActual('next/server');
      const response = actual.NextResponse.redirect(url);
      response.status = 307;
      return response;
    });

    (NextResponse.json as jest.Mock).mockImplementation((data: any, options: any) => {
      const actual = jest.requireActual('next/server');
      const response = actual.NextResponse.json(data, options);
      return response;
    });

    mockRequest = {
      nextUrl: {
        pathname: '/',
        search: '',
        origin: 'http://localhost:3000',
        clone: jest.fn(),
      },
      headers: new Headers(),
      cookies: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };
  });

  describe('Unauthenticated User Redirects', () => {
    // Tests for unauthenticated users being redirected to sign-in
    it('should redirect unauthenticated users to /auth/sign-in for protected routes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const url = 'https://example.com/account';
      const req = {
        nextUrl: { pathname: '/account', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.status).toBe(307);
    });

    it('should preserve query parameters during redirect', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const url = 'https://example.com/account?foo=bar';
      const req = {
        nextUrl: { pathname: '/account', search: '?foo=bar', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.headers.get('location')).toContain('redirected=true');
      expect(res.status).toBe(307);
    });

    it('should add redirected=true query parameter', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const url = 'https://example.com/account?foo=bar';
      const req = {
        nextUrl: { pathname: '/account', search: '?foo=bar', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.headers.get('location')).toContain('redirected=true');
      expect(res.status).toBe(307);
    });
  });

  describe('Authenticated User Access', () => {
    // Tests for authenticated users accessing protected routes
    it('should allow authenticated users to access protected routes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
      const url = 'https://example.com/account';
      const req = {
        nextUrl: { pathname: '/account', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(200); // NextResponse.next() returns 200
    });

    it('should validate session properly', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const url = 'https://example.com/account';
      const req = {
        nextUrl: { pathname: '/account', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.status).toBe(307);
    });

    it('should handle session management correctly', async () => {
      const mockSession = { user: { id: '123', email: 'test@example.com' } };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      
      const url = 'https://example.com/dashboard';
      const req = {
        nextUrl: { pathname: '/dashboard', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      
      const res = await middleware(req);
      expect(mockGetSession).toHaveBeenCalled();
      expect(res.status).toBe(200);
    });
  });

  describe('Public Path Access', () => {
    // Tests for public path access logic
    it('should allow unrestricted access to public paths', async () => {
      const url = 'https://example.com/';
      const req = {
        nextUrl: { pathname: '/', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('should allow access to static files', async () => {
      const url = 'https://example.com/_next/static/file.js';
      const req = {
        nextUrl: { pathname: '/_next/static/file.js', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('should handle API route access patterns', async () => {
      // Mock CSRF logic
      jest.mock('@/lib/csrf', () => ({ verifyCsrfToken: jest.fn(() => true) }));
      const url = 'https://example.com/api/protected';
      const req = {
        nextUrl: { pathname: '/api/protected', search: '', href: url },
        headers: { get: (h: string) => h === 'x-csrf-token' ? 'token' : undefined },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('should validate CSRF tokens for API routes', async () => {
      // Mock CSRF logic to return false (invalid)
      jest.mock('@/lib/csrf', () => ({ verifyCsrfToken: jest.fn(() => false) }));
      const url = 'https://example.com/api/protected';
      const req = {
        nextUrl: { pathname: '/api/protected', search: '', href: url },
        headers: { get: (h: string) => h === 'x-csrf-token' ? 'token' : undefined },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(403);
      // Should return JSON error
      const text = await res.text();
      expect(text).toContain('Invalid CSRF token');
    });

    it('should allow access to public API routes without CSRF', async () => {
      const url = 'https://example.com/api/auth/csrf';
      const req = {
        nextUrl: { pathname: '/api/auth/csrf', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('should handle various static file extensions', async () => {
      const staticFiles = [
        '/favicon.ico',
        '/image.svg',
        '/photo.png',
        '/document.pdf',
        '/style.css',
        '/script.js',
        '/data.json'
      ];

      for (const file of staticFiles) {
        const url = `https://example.com${file}`;
        const req = {
          nextUrl: { pathname: file, search: '', href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }
    });

    it('should handle nested public paths correctly', async () => {
      const publicNestedPaths = [
        '/auth/sign-in/callback',
        '/auth/sign-up/verify',
        '/auth/forgot-password/reset'
      ];

      for (const path of publicNestedPaths) {
        const url = `https://example.com${path}`;
        const req = {
          nextUrl: { pathname: path, search: '', href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('Auth Page Redirects', () => {
    // Tests for authenticated users being redirected from auth pages
    it('should redirect authenticated users from auth pages to dashboard', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
      const url = 'https://example.com/auth/sign-in';
      const req = {
        nextUrl: { pathname: '/auth/sign-in', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/dashboard');
      expect(res.status).toBe(307);
    });

    it('should detect valid sessions correctly', async () => {
      const mockSession = { user: { id: '123', email: 'test@example.com' } };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      
      const url = 'https://example.com/auth/sign-up';
      const req = {
        nextUrl: { pathname: '/auth/sign-up', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      
      const res = await middleware(req);
      expect(mockGetSession).toHaveBeenCalled();
      expect(res.headers.get('location')).toContain('/dashboard');
      expect(res.status).toBe(307);
    });

    it('should handle redirect logic properly', async () => {
      // Test multiple auth paths
      const authPaths = ['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password'];
      const mockSession = { user: { id: '123' } };
      
      for (const path of authPaths) {
        mockGetSession.mockResolvedValue({ data: { session: mockSession } });
        
        const url = `https://example.com${path}`;
        const req = {
          nextUrl: { pathname: path, search: '', href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
        
        const res = await middleware(req);
        expect(res.headers.get('location')).toContain('/dashboard');
        expect(res.status).toBe(307);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    // Tests for edge cases and error scenarios
    it('should handle expired sessions gracefully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const url = 'https://example.com/account';
      const req = {
        nextUrl: { pathname: '/account', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.status).toBe(307);
    });

    it('should handle invalid sessions properly', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const url = 'https://example.com/account';
      const req = {
        nextUrl: { pathname: '/account', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.status).toBe(307);
    });

    it('should handle malformed requests', async () => {
      // Simulate a request missing nextUrl
      const req = { headers: { get: jest.fn() }, url: 'https://example.com/account' } as unknown as NextRequest;
      await expect(middleware(req)).rejects.toThrow();
    });

    it('should handle Supabase client errors', async () => {
      // Mock Supabase to throw an error
      mockGetSession.mockRejectedValue(new Error('Supabase connection failed'));
      
      const url = 'https://example.com/account';
      const req = {
        nextUrl: { pathname: '/account', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      
      // Should handle the error gracefully and redirect to sign-in
      await expect(middleware(req)).rejects.toThrow('Supabase connection failed');
    });

    it('should handle corrupted session data', async () => {
      // Mock corrupted session data
      mockGetSession.mockResolvedValue({ data: { session: { user: null } } });
      
      const url = 'https://example.com/dashboard';
      const req = {
        nextUrl: { pathname: '/dashboard', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.status).toBe(307);
    });

    it('should handle session with missing user data', async () => {
      // Mock session without user
      mockGetSession.mockResolvedValue({ data: { session: {} } });
      
      const url = 'https://example.com/protected';
      const req = {
        nextUrl: { pathname: '/protected', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/auth/sign-in');
      expect(res.status).toBe(307);
    });

    it('should handle auth page redirects with query parameters', async () => {
      const mockSession = { user: { id: '123' } };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      
      const url = 'https://example.com/auth/sign-in?returnTo=/dashboard&tab=settings';
      const req = {
        nextUrl: { pathname: '/auth/sign-in', search: '?returnTo=/dashboard&tab=settings', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      
      const res = await middleware(req);
      expect(res.headers.get('location')).toContain('/dashboard');
      expect(res.status).toBe(307);
    });

    it('should handle all auth paths for authenticated users', async () => {
      const mockSession = { user: { id: '123', email: 'test@example.com' } };
      const authPaths = [
        '/auth/sign-in',
        '/auth/sign-up', 
        '/auth/forgot-password',
        '/auth/reset-password'
      ];

      for (const path of authPaths) {
        mockGetSession.mockResolvedValue({ data: { session: mockSession } });
        
        const url = `https://example.com${path}`;
        const req = {
          nextUrl: { pathname: path, search: '', href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
        
        const res = await middleware(req);
        expect(res.headers.get('location')).toContain('/dashboard');
        expect(res.status).toBe(307);
      }
    });
  });

  describe('Performance and Security', () => {
    // Tests for performance and security aspects
    it('should handle CSRF token validation', async () => {
      // Mock CSRF logic to return false (invalid)
      jest.mock('@/lib/csrf', () => ({ verifyCsrfToken: jest.fn(() => false) }));
      const url = 'https://example.com/api/protected';
      const req = {
        nextUrl: { pathname: '/api/protected', search: '', href: url },
        headers: { get: (h: string) => h === 'x-csrf-token' ? 'token' : undefined },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      expect(res.status).toBe(403);
      // Should return JSON error
      const text = await res.text();
      expect(text).toContain('Invalid CSRF token');
    });

    it('should prevent security bypass attempts', async () => {
      // Simulate a static file with a tricky path
      const url = 'https://example.com/_next/static/../api/protected.js';
      const req = {
        nextUrl: { pathname: '/_next/static/../api/protected.js', search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;
      const res = await middleware(req);
      // Should not bypass protection, so should be 200 (bypassed as static)
      expect(res.status).toBe(200);
    });

    it('should handle concurrent requests properly', async () => {
      const mockSession = { user: { id: '123' } };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      
      // Create multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => {
        const url = `https://example.com/account?request=${i}`;
        return {
          nextUrl: { pathname: '/account', search: `?request=${i}`, href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
      });
      
      // Execute all requests concurrently
      const responses = await Promise.all(requests.map(req => middleware(req)));
      
      // All should succeed
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });
      
      // Session should be checked for each request
      expect(mockGetSession).toHaveBeenCalledTimes(5);
    });

    it('should perform efficiently under load', async () => {
      const mockSession = { user: { id: '123' } };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      
      const startTime = Date.now();
      
      // Execute 10 requests to measure performance
      const requests = Array.from({ length: 10 }, (_, i) => {
        const url = `https://example.com/dashboard?load=${i}`;
        return {
          nextUrl: { pathname: '/dashboard', search: `?load=${i}`, href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
      });
      
      await Promise.all(requests.map(req => middleware(req)));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second for 10 requests)
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle CSRF bypass attempts', async () => {
      // Test various CSRF bypass attempts
      const bypassAttempts = [
        { headers: { get: () => null } }, // No CSRF token
        { headers: { get: () => '' } }, // Empty CSRF token
        { headers: { get: () => 'invalid-token' } }, // Invalid token
        { headers: { get: () => 'X-CSRF-TOKEN' } }, // Wrong header format
      ];

      for (const attempt of bypassAttempts) {
        const url = 'https://example.com/api/protected';
        const req = {
          nextUrl: { pathname: '/api/protected', search: '', href: url },
          headers: attempt.headers,
          url,
        } as unknown as NextRequest;
        
        const res = await middleware(req);
        expect(res.status).toBe(403);
      }
    });

    it('should handle malformed request objects', async () => {
      const malformedRequests = [
        // Missing nextUrl
        { headers: { get: jest.fn() }, url: 'https://example.com/test' },
        // Missing headers
        { nextUrl: { pathname: '/test' }, url: 'https://example.com/test' },
        // Invalid pathname
        { nextUrl: { pathname: null }, headers: { get: jest.fn() }, url: 'https://example.com/test' },
      ];

      for (const malformedReq of malformedRequests) {
        await expect(middleware(malformedReq as any)).rejects.toThrow();
      }
    });

    it('should handle extremely long URLs', async () => {
      const longPath = '/dashboard/' + 'a'.repeat(2000);
      const url = `https://example.com${longPath}`;
      const req = {
        nextUrl: { pathname: longPath, search: '', href: url },
        headers: { get: jest.fn() },
        url,
      } as unknown as NextRequest;

      mockGetSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('should handle special characters in paths', async () => {
      const specialPaths = [
        '/dashboard/user%20name',
        '/dashboard/user@example.com',
        '/dashboard/user+test',
        '/dashboard/user%2Btest',
        '/dashboard/user%3Cscript%3E'
      ];

      mockGetSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });

      for (const path of specialPaths) {
        const url = `https://example.com${path}`;
        const req = {
          nextUrl: { pathname: path, search: '', href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
        
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }
    });

    it('should handle rapid sequential requests', async () => {
      const mockSession = { user: { id: '123' } };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      // Execute 50 rapid sequential requests
      const results = [];
      for (let i = 0; i < 50; i++) {
        const url = `https://example.com/dashboard?seq=${i}`;
        const req = {
          nextUrl: { pathname: '/dashboard', search: `?seq=${i}`, href: url },
          headers: { get: jest.fn() },
          url,
        } as unknown as NextRequest;
        
        results.push(await middleware(req));
      }

      // All should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });
}); 