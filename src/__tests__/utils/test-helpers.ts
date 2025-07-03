import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createClientClient } from '@/lib/supabase/client';

// Mock data constants
export const MOCK_USER_ID = 'test-user-123';
export const MOCK_VIDEO_ID = 'test-video-456';
export const MOCK_API_KEY = 'test-api-key';

// Mock user for authentication tests
export const mockUser = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z'
};

// Mock video data
export const mockVideoData = {
  id: MOCK_VIDEO_ID,
  user_id: MOCK_USER_ID,
  title: 'Test Video',
  filename: 'test-video.mp4',
  video_url: 'https://example.com/test-video.mp4',
  file_size: 1024000,
  duration: 30,
  status: 'uploaded',
  uploaded_at: '2024-01-01T00:00:00.000Z'
};

// Mock competitor data
export const mockCompetitorData = {
  id: 'competitor-1',
  name: 'Test Competitor',
  handle: '@testcompetitor',
  followers: '1M',
  engagement: '5.5%',
  avgViews: '100K',
  topContent: [{
    id: 'content-1',
    title: 'Test Content',
    views: '500K',
    engagement: '8.2%',
    url: 'https://tiktok.com/@test/video/123',
    platform: 'tiktok' as const
  }],
  tactics: ['Posts at optimal times'],
  hooks: ['This will change everything']
};

// Mock audio data
export const mockAudioData = {
  sound_id: 'audio-123',
  url: 'https://cdn.tiktok.com/audio/123.mp3',
  velocity: 85.5,
  bpm: 128,
  mood: 'energetic',
  isCopyrightSafe: true
};

// Helper to create mock NextRequest
export function createMockRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

// Helper to create mock Supabase client
export function createMockSupabaseClient() {
  const mockClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn()
          })),
          limit: jest.fn(),
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn()
              }))
            }))
          }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn()
        })),
        limit: jest.fn(),
        single: jest.fn()
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/file.mp4' }
        })),
        remove: jest.fn()
      }))
    },
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      }))
    })),
    removeChannel: jest.fn()
  };

  return mockClient;
}

// Helper to mock successful authentication
export function mockSuccessfulAuth(supabaseClient: any) {
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null
  });
}

// Helper to mock failed authentication
export function mockFailedAuth(supabaseClient: any) {
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: new Error('Authentication failed')
  });
}

// Helper to mock database operations
export function mockDatabaseSuccess(supabaseClient: any, data: any) {
  const mockQuery = {
    select: jest.fn(() => mockQuery),
    eq: jest.fn(() => mockQuery),
    order: jest.fn(() => mockQuery),
    limit: jest.fn(() => mockQuery),
    gte: jest.fn(() => mockQuery),
    lte: jest.fn(() => mockQuery),
    single: jest.fn(() => Promise.resolve({ data, error: null }))
  };

  supabaseClient.from.mockReturnValue(mockQuery);
  return mockQuery;
}

// Helper to mock database errors
export function mockDatabaseError(supabaseClient: any, error: string) {
  const mockQuery = {
    select: jest.fn(() => mockQuery),
    eq: jest.fn(() => mockQuery),
    order: jest.fn(() => mockQuery),
    limit: jest.fn(() => mockQuery),
    gte: jest.fn(() => mockQuery),
    lte: jest.fn(() => mockQuery),
    single: jest.fn(() => Promise.resolve({ data: null, error: new Error(error) }))
  };

  supabaseClient.from.mockReturnValue(mockQuery);
  return mockQuery;
}

// Helper to create mock file for upload tests
export function createMockFile(
  name: string = 'test-video.mp4',
  type: string = 'video/mp4',
  size: number = 1024000
): File {
  const mockFile = new File(['mock content'], name, { type });
  Object.defineProperty(mockFile, 'size', { value: size });
  return mockFile;
}

// Helper to wait for async operations in tests
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to assert error response format
export function assertErrorResponse(response: any, expectedStatus: number, expectedMessage?: string) {
  expect(response.status).toBe(expectedStatus);
  expect(response.json).toBeDefined();
  
  if (expectedMessage) {
    expect(response.json.error).toContain(expectedMessage);
  }
}

// Helper to assert success response format
export function assertSuccessResponse(response: any, expectedData?: any) {
  expect(response.status).toBe(200);
  expect(response.json).toBeDefined();
  expect(response.json.success).toBe(true);
  
  if (expectedData) {
    expect(response.json.data).toEqual(expect.objectContaining(expectedData));
  }
}

// Mock fetch for API integration tests
export function mockFetch(responseData: any, status: number = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData))
    })
  ) as jest.Mock;
}

// Clean up mocks after tests
export function cleanupMocks() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Clear any global fetch mocks
  if (global.fetch && (global.fetch as any).mockRestore) {
    (global.fetch as any).mockRestore();
  }
}

// Mock environment variables for tests
export function mockEnvironmentVariables(vars: Record<string, string>) {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv, ...vars };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
}