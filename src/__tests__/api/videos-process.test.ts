import { NextRequest } from 'next/server';
import { POST } from '@/app/api/videos/process/route';
import {
  createMockRequest,
  createMockSupabaseClient,
  mockSuccessfulAuth,
  mockFailedAuth,
  mockDatabaseSuccess,
  mockDatabaseError,
  cleanupMocks,
  mockVideoData,
  MOCK_USER_ID,
  MOCK_VIDEO_ID
} from '../utils/test-helpers';

// Mock Supabase auth helpers
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn()
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

describe('/api/videos/process API Route', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('POST /api/videos/process - Video Processing Initiation', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        mockFailedAuth(mockSupabaseClient);

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );
        
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Unauthorized');
      });

      it('should proceed when user is authenticated', async () => {
        mockSuccessfulAuth(mockSupabaseClient);
        
        // Mock video exists and belongs to user
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'uploaded' },
                  error: null
                }))
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );
        
        const response = await POST(request);
        expect(response.status).toBe(200);
      });
    });

    describe('Request Validation', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
      });

      it('should return 400 when request body is invalid JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/videos/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json'
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Invalid JSON in request body');
      });

      it('should return 400 when videoId is missing', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          {}
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('videoId is required');
      });

      it('should accept valid request with videoId', async () => {
        // Mock video exists and belongs to user
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'uploaded' },
                  error: null
                }))
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
      });
    });

    describe('Video Validation', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
      });

      it('should return 404 when video does not exist', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: null,
                  error: new Error('Not found')
                }))
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: 'non-existent-video' }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(404);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Video not found or access denied');
      });

      it('should return 409 when video is already processing', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'processing' },
                  error: null
                }))
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(409);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Video is already being processed');
      });

      it('should return 409 when video is already optimized without priority option', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'optimized' },
                  error: null
                }))
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(409);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Video has already been processed. Use priority option to reprocess.');
      });

      it('should allow reprocessing optimized video with priority option', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'optimized' },
                  error: null
                }))
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { 
            videoId: MOCK_VIDEO_ID,
            options: { priority: 'high' }
          }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
      });
    });

    describe('Processing Options', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
        
        // Mock successful video lookup and update
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'uploaded' },
                  error: null
                }))
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        });
      });

      it('should process video with default options', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.processingId).toBeDefined();
        expect(responseData.estimatedTime).toBeDefined();
        expect(responseData.status).toBe('queued');
      });

      it('should process video with skip options', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { 
            videoId: MOCK_VIDEO_ID,
            options: {
              skipAudioAnalysis: true,
              skipHashtagGeneration: true
            }
          }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.estimatedTime).toBeDefined();
        // Should have shorter estimated time due to skipped operations
      });

      it('should process video with priority options', async () => {
        const priorities = ['low', 'normal', 'high'];
        
        for (const priority of priorities) {
          const request = createMockRequest(
            'http://localhost:3000/api/videos/process',
            'POST',
            { 
              videoId: MOCK_VIDEO_ID,
              options: { priority }
            }
          );

          const response = await POST(request);
          const responseData = await response.json();

          expect(response.status).toBe(200);
          expect(responseData.success).toBe(true);
          expect(responseData.estimatedTime).toBeDefined();
        }
      });
    });

    describe('Response Format', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
        
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'uploaded' },
                  error: null
                }))
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        });
      });

      it('should return correctly formatted success response', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toHaveProperty('success', true);
        expect(responseData).toHaveProperty('processingId');
        expect(responseData).toHaveProperty('estimatedTime');
        expect(responseData).toHaveProperty('status', 'queued');
        expect(responseData).toHaveProperty('details');
        expect(responseData.details).toHaveProperty('stage', 'initialization');
        expect(responseData.details).toHaveProperty('progress', 0);
        expect(responseData.details).toHaveProperty('message');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
      });

      it('should handle database update errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { ...mockVideoData, status: 'uploaded' },
                  error: null
                }))
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ 
              error: new Error('Database error') 
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process',
          'POST',
          { videoId: MOCK_VIDEO_ID }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Failed to start processing');
      });
    });
  });

  describe('GET /api/videos/process - Processing Status', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        mockFailedAuth(mockSupabaseClient);

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?videoId=' + MOCK_VIDEO_ID
        );
        
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Unauthorized');
      });
    });

    describe('Request Validation', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
      });

      it('should return 400 when neither videoId nor processingId is provided', async () => {
        const request = createMockRequest('http://localhost:3000/api/videos/process');
        
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('videoId or processingId is required');
      });

      it('should accept request with videoId parameter', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [{
                  id: MOCK_VIDEO_ID,
                  status: 'processing',
                  processing_stage: 'audio_analysis',
                  video_processing_results: [{
                    processing_id: 'proc_123',
                    stage: 'audio_analysis',
                    progress: 50,
                    status: 'processing'
                  }]
                }],
                error: null
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?videoId=' + MOCK_VIDEO_ID
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
      });

      it('should accept request with processingId parameter', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                id: MOCK_VIDEO_ID,
                status: 'processing',
                processing_stage: 'audio_analysis',
                video_processing_results: [{
                  processing_id: 'proc_123',
                  stage: 'audio_analysis',
                  progress: 50,
                  status: 'processing'
                }]
              }],
              error: null
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?processingId=proc_123'
        );
        
        const response = await GET(request);
        expect(response.status).toBe(200);
      });
    });

    describe('Status Retrieval', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
      });

      it('should return processing status for existing video', async () => {
        const mockProcessingData = {
          id: MOCK_VIDEO_ID,
          status: 'processing',
          processing_stage: 'content_analysis',
          video_processing_results: [{
            processing_id: 'proc_123',
            stage: 'content_analysis',
            progress: 75,
            status: 'processing',
            updated_at: '2024-01-01T12:00:00.000Z'
          }]
        };

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [mockProcessingData],
                error: null
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?videoId=' + MOCK_VIDEO_ID
        );
        
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.videoId).toBe(MOCK_VIDEO_ID);
        expect(responseData.status).toBe('processing');
        expect(responseData.stage).toBe('content_analysis');
        expect(responseData.progress).toBe(75);
        expect(responseData.processingId).toBe('proc_123');
        expect(responseData.updatedAt).toBeDefined();
      });

      it('should return 404 when no processing records found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?videoId=nonexistent'
        );
        
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(404);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('No processing records found');
      });

      it('should handle videos with error status', async () => {
        const mockErrorData = {
          id: MOCK_VIDEO_ID,
          status: 'error',
          error_message: 'Processing failed',
          video_processing_results: [{
            processing_id: 'proc_error_123',
            stage: 'audio_analysis',
            progress: 25,
            status: 'failed',
            error_message: 'Audio analysis failed'
          }]
        };

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [mockErrorData],
                error: null
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?videoId=' + MOCK_VIDEO_ID
        );
        
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.status).toBe('error');
        expect(responseData.error).toBe('Processing failed');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockSuccessfulAuth(mockSupabaseClient);
      });

      it('should handle database query errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: null,
                error: new Error('Database error')
              }))
            }))
          }))
        });

        const request = createMockRequest(
          'http://localhost:3000/api/videos/process?videoId=' + MOCK_VIDEO_ID
        );
        
        const response = await GET(request);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Failed to fetch processing status');
      });
    });
  });
});