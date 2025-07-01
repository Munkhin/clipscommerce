import 'openai/shims/node';
import { UserVideoService } from '@/services/userVideoService';
import {
  createMockSupabaseClient,
  createMockFile,
  mockFetch,
  cleanupMocks,
  mockVideoData,
  MOCK_USER_ID,
  MOCK_VIDEO_ID,
} from '../utils/test-helpers';
import { createClient } from '@/../supabase';

// Mock Supabase client
jest.mock('@/../supabase');

describe('UserVideoService', () => {
  let service: UserVideoService;
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    service = new UserVideoService();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('getUserVideos', () => {
    const mockDatabaseResponse = [
      {
        ...mockVideoData,
        status: 'processing',
        processing_stage: 'audio_analysis',
        video_processing_results: [{
          sentiment_analysis: { score: 0.8, label: 'positive' },
          tone_analysis: { tone: 'enthusiastic', confidence: 0.9 },
          hashtag_recommendations: ['#tech', '#tutorial'],
          optimization_suggestions: ['Add more hashtags', 'Improve thumbnail'],
          virality_score: 0.75,
          engagement_prediction: 0.82
        }]
      }
    ];

    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: mockDatabaseResponse,
              error: null
            }))
          }))
        }))
      });
    });

    it('should fetch user videos successfully', async () => {
      const result = await service.getUserVideos(MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data?.length).toBe(1);
    });

    it('should map database response to UserVideo format correctly', async () => {
      const result = await service.getUserVideos(MOCK_USER_ID);

      expect(result.success).toBe(true);
      const video = result.data?.[0];

      expect(video).toHaveProperty('id', mockVideoData.id);
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('status');
      expect(video).toHaveProperty('columnId');
      expect(video).toHaveProperty('videoUrl');
      expect(video).toHaveProperty('fileSize');
      expect(video).toHaveProperty('duration');
      expect(video).toHaveProperty('uploadedAt');
      expect(video).toHaveProperty('result');
      expect(video).toHaveProperty('loading');
      expect(video).toHaveProperty('processingStage');
    });

    it('should map processing results correctly', async () => {
      const result = await service.getUserVideos(MOCK_USER_ID);
      const video = result.data?.[0];

      expect(video?.result).toBeDefined();
      expect(video?.result?.sentiment).toEqual({
        score: 0.8,
        sentiment: 'positive'
      });
      expect(video?.result?.tone).toEqual({
        tone: 'enthusiastic',
        confidence: 0.9
      });
      expect(video?.result?.hashtags).toEqual(['#tech', '#tutorial']);
      expect(video?.result?.optimizations).toEqual(['Add more hashtags', 'Improve thumbnail']);
      expect(video?.result?.viralityScore).toBe(0.75);
      expect(video?.result?.engagementPrediction).toBe(0.82);
    });

    it('should map video status to column ID correctly', async () => {
      const statusMappings = [
        { status: 'uploaded', expectedColumn: 'todo' },
        { status: 'processing', expectedColumn: 'processing' },
        { status: 'optimized', expectedColumn: 'review' },
        { status: 'ready', expectedColumn: 'ready' },
        { status: 'error', expectedColumn: 'todo' }
      ];

      for (const mapping of statusMappings) {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [{ ...mockVideoData, status: mapping.status }],
                error: null
              }))
            }))
          }))
        });

        const result = await service.getUserVideos(MOCK_USER_ID);
        expect(result.data?.[0].columnId).toBe(mapping.expectedColumn);
      }
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      });

      const result = await service.getUserVideos(MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch videos from database');
    });

    it('should handle empty video list', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      });

      const result = await service.getUserVideos(MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should set loading flag correctly for processing videos', async () => {
      const processingVideo = { ...mockVideoData, status: 'processing' };
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [processingVideo],
              error: null
            }))
          }))
        }))
      });

      const result = await service.getUserVideos(MOCK_USER_ID);
      
      expect(result.data?.[0].loading).toBe(true);
    });

    it('should use filename as title when title is missing', async () => {
      const videoWithoutTitle = { ...mockVideoData, title: null, filename: 'test-video.mp4' };
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [videoWithoutTitle],
              error: null
            }))
          }))
        }))
      });

      const result = await service.getUserVideos(MOCK_USER_ID);
      
      expect(result.data?.[0].title).toBe('test-video.mp4');
    });
  });

  describe('uploadVideo', () => {
    const mockFile = createMockFile('test-video.mp4', 'video/mp4', 1024000);
    
    beforeEach(() => {
      // Mock successful storage upload
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn(() => Promise.resolve({
          data: { path: 'user123/123456.mp4' },
          error: null
        })),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/video.mp4' }
        }))
      });

      // Mock successful database insert
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: MOCK_VIDEO_ID, ...mockVideoData },
              error: null
            }))
          }))
        }))
      });

      // Mock fetch for processing API
      mockFetch({ success: true });
    });

    it('should upload video successfully', async () => {
      const result = await service.uploadVideo(MOCK_USER_ID, {
        file: mockFile,
        title: 'Test Video',
        description: 'Test description'
      });

      expect(result.success).toBe(true);
      expect(result.videoId).toBe(MOCK_VIDEO_ID);
    });

    it('should validate file type', async () => {
      const invalidFile = createMockFile('test.txt', 'text/plain');

      const result = await service.uploadVideo(MOCK_USER_ID, {
        file: invalidFile
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file type. Please upload MP4, MOV, or AVI files.');
    });

    it('should validate file size', async () => {
      const largeFile = createMockFile('large-video.mp4', 'video/mp4', 200 * 1024 * 1024); // 200MB

      const result = await service.uploadVideo(MOCK_USER_ID, {
        file: largeFile
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('File size exceeds 100MB limit.');
    });

    it('should accept valid video file types', async () => {
      const validTypes = [
        { name: 'video.mp4', type: 'video/mp4' },
        { name: 'video.mov', type: 'video/mov' },
        { name: 'video.quicktime', type: 'video/quicktime' },
        { name: 'video.avi', type: 'video/avi' }
      ];

      for (const fileType of validTypes) {
        const validFile = createMockFile(fileType.name, fileType.type);
        
        const result = await service.uploadVideo(MOCK_USER_ID, {
          file: validFile
        });

        expect(result.success).toBe(true);
      }
    });

    it('should handle storage upload errors', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn(() => Promise.resolve({
          data: null,
          error: new Error('Storage error')
        }))
      });

      const result = await service.uploadVideo(MOCK_USER_ID, {
        file: mockFile
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload video file');
    });

    it('should handle database insert errors and cleanup storage', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      });

      // Mock storage remove for cleanup
      const mockRemove = jest.fn(() => Promise.resolve({ error: null }));
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn(() => Promise.resolve({
          data: { path: 'user123/123456.mp4' },
          error: null
        })),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/video.mp4' }
        })),
        remove: mockRemove
      });

      const result = await service.uploadVideo(MOCK_USER_ID, {
        file: mockFile
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save video record');
      expect(mockRemove).toHaveBeenCalled(); // Should cleanup uploaded file
    });

    it('should generate unique filename with timestamp', async () => {
      const beforeTime = Date.now();
      
      await service.uploadVideo(MOCK_USER_ID, { file: mockFile });

      const uploadCall = mockSupabaseClient.storage.from().upload;
      const filename = uploadCall.mock.calls[0][0];
      
      expect(filename).toMatch(new RegExp(`^${MOCK_USER_ID}/\\d+\\.mp4$`));
      
      // Extract timestamp from filename
      const timestamp = parseInt(filename.split('/')[1].split('.')[0]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should use file name as title when title not provided', async () => {
      await service.uploadVideo(MOCK_USER_ID, { file: mockFile });

      const insertCall = mockSupabaseClient.from().insert;
      const insertData = insertCall.mock.calls[0][0];
      
      expect(insertData.title).toBe('test-video.mp4');
    });

    it('should include description in database record', async () => {
      const description = 'Test video description';
      
      await service.uploadVideo(MOCK_USER_ID, {
        file: mockFile,
        description
      });

      const insertCall = mockSupabaseClient.from().insert;
      const insertData = insertCall.mock.calls[0][0];
      
      expect(insertData.description).toBe(description);
    });

    it('should start video processing after upload', async () => {
      await service.uploadVideo(MOCK_USER_ID, { file: mockFile });

      expect(global.fetch).toHaveBeenCalledWith('/api/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: MOCK_VIDEO_ID })
      });
    });
  });

  describe('updateVideoStatus', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      });
    });

    it('should update video status successfully', async () => {
      await service.updateVideoStatus(MOCK_VIDEO_ID, 'processing');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_videos');
      
      const updateCall = mockSupabaseClient.from().update;
      expect(updateCall).toHaveBeenCalledWith({
        status: 'processing',
        updated_at: expect.any(String)
      });
    });

    it('should set processed_at when status is optimized', async () => {
      await service.updateVideoStatus(MOCK_VIDEO_ID, 'optimized');

      const updateCall = mockSupabaseClient.from().update;
      expect(updateCall).toHaveBeenCalledWith({
        status: 'optimized',
        updated_at: expect.any(String),
        processed_at: expect.any(String)
      });
    });

    it('should include error message when provided', async () => {
      const errorMessage = 'Processing failed';
      
      await service.updateVideoStatus(MOCK_VIDEO_ID, 'error', errorMessage);

      const updateCall = mockSupabaseClient.from().update;
      expect(updateCall).toHaveBeenCalledWith({
        status: 'error',
        updated_at: expect.any(String),
        error_message: errorMessage
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            error: new Error('Update failed') 
          }))
        }))
      });

      // Should not throw error
      await expect(
        service.updateVideoStatus(MOCK_VIDEO_ID, 'processing')
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteVideo', () => {
    beforeEach(() => {
      // Mock video lookup
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: {
                  video_url: 'https://example.com/storage/user123/video.mp4',
                  user_id: MOCK_USER_ID
                },
                error: null
              }))
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      });

      // Mock storage removal
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: jest.fn(() => Promise.resolve({ error: null }))
      });
    });

    it('should delete video successfully', async () => {
      const result = await service.deleteVideo(MOCK_VIDEO_ID, MOCK_USER_ID);

      expect(result.success).toBe(true);
    });

    it('should remove video file from storage', async () => {
      await service.deleteVideo(MOCK_VIDEO_ID, MOCK_USER_ID);

      const removeCall = mockSupabaseClient.storage.from().remove;
      expect(removeCall).toHaveBeenCalledWith([`${MOCK_USER_ID}/video.mp4`]);
    });

    it('should delete processing results', async () => {
      await service.deleteVideo(MOCK_VIDEO_ID, MOCK_USER_ID);

      // Should call delete on video_processing_results table
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('video_processing_results');
    });

    it('should delete video record from database', async () => {
      await service.deleteVideo(MOCK_VIDEO_ID, MOCK_USER_ID);

      // Should call delete on user_videos table
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_videos');
      
      const deleteCall = mockSupabaseClient.from().delete;
      expect(deleteCall).toHaveBeenCalled();
    });

    it('should return error when video not found', async () => {
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

      const result = await service.deleteVideo('nonexistent', MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Video not found');
    });

    it('should continue with database deletion even if storage deletion fails', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: jest.fn(() => Promise.resolve({ 
          error: new Error('Storage error') 
        }))
      });

      const result = await service.deleteVideo(MOCK_VIDEO_ID, MOCK_USER_ID);

      expect(result.success).toBe(true); // Should still succeed
    });

    it('should handle database deletion errors', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_videos') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({
                    data: {
                      video_url: 'https://example.com/storage/user123/video.mp4',
                      user_id: MOCK_USER_ID
                    },
                    error: null
                  }))
                }))
              }))
            })),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ 
                  error: new Error('Delete failed') 
                }))
              }))
            }))
          };
        }
        return {
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        };
      });

      const result = await service.deleteVideo(MOCK_VIDEO_ID, MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete video record');
    });
  });

  describe('retryVideoProcessing', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      });

      mockFetch({ success: true });
    });

    it('should retry processing successfully', async () => {
      const result = await service.retryVideoProcessing(MOCK_VIDEO_ID);

      expect(result.success).toBe(true);
    });

    it('should reset video status to processing', async () => {
      await service.retryVideoProcessing(MOCK_VIDEO_ID);

      const updateCall = mockSupabaseClient.from().update;
      expect(updateCall).toHaveBeenCalledWith({
        status: 'processing',
        updated_at: expect.any(String)
      });
    });

    it('should start processing again', async () => {
      await service.retryVideoProcessing(MOCK_VIDEO_ID);

      expect(global.fetch).toHaveBeenCalledWith('/api/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: MOCK_VIDEO_ID })
      });
    });

    it('should handle errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            error: new Error('Update failed') 
          }))
        }))
      });

      const result = await service.retryVideoProcessing(MOCK_VIDEO_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('subscribeToVideoUpdates', () => {
    let mockChannel: { on: jest.Mock; subscribe: jest.Mock };

    beforeEach(() => {
      mockChannel = {
        on: jest.fn(() => mockChannel),
        subscribe: jest.fn()
      };

      mockSupabaseClient.channel.mockReturnValue(mockChannel);
      mockSupabaseClient.removeChannel = jest.fn();
    });

    it('should set up subscription for video updates', () => {
      const callback = jest.fn();
      
      service.subscribeToVideoUpdates(MOCK_USER_ID, callback);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('video-updates');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_videos',
          filter: `user_id=eq.${MOCK_USER_ID}`
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = service.subscribeToVideoUpdates(MOCK_USER_ID, callback);

      expect(typeof cleanup).toBe('function');
      
      cleanup();
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should call callback with mapped video data on updates', () => {
      const callback = jest.fn();
      let updateHandler: any;

      mockChannel.on.mockImplementation((_event: string, _config: any, handler: any) => {
        updateHandler = handler;
        return mockChannel;
      });

      service.subscribeToVideoUpdates(MOCK_USER_ID, callback);

      // Simulate a database update
      const mockPayload = {
        new: {
          ...mockVideoData,
          status: 'optimized'
        }
      };

      updateHandler(mockPayload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockVideoData.id,
          status: 'optimized'
        })
      );
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle concurrent upload requests', async () => {
      const file1 = createMockFile('video1.mp4', 'video/mp4');
      const file2 = createMockFile('video2.mp4', 'video/mp4');
      const file3 = createMockFile('video3.mp4', 'video/mp4');

      // Mock successful responses for all uploads
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn(() => Promise.resolve({
          data: { path: 'user123/video.mp4' },
          error: null
        })),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/video.mp4' }
        }))
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: MOCK_VIDEO_ID },
              error: null
            }))
          }))
        }))
      });

      mockFetch({ success: true });

      const uploadPromises = [
        service.uploadVideo(MOCK_USER_ID, { file: file1 }),
        service.uploadVideo(MOCK_USER_ID, { file: file2 }),
        service.uploadVideo(MOCK_USER_ID, { file: file3 })
      ];

      const results = await Promise.all(uploadPromises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle very large video metadata', async () => {
      const largeVideoData = {
        ...mockVideoData,
        description: 'A'.repeat(10000), // Very long description
        title: 'B'.repeat(1000) // Very long title
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [largeVideoData],
              error: null
            }))
          }))
        }))
      });

      const result = await service.getUserVideos(MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.[0].title).toBe(largeVideoData.title);
    });

    it('should handle processing of many videos efficiently', async () => {
      const manyVideos = Array.from({ length: 100 }, (_, i) => ({
        ...mockVideoData,
        id: `video_${i}`,
        title: `Video ${i}`
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: manyVideos,
              error: null
            }))
          }))
        }))
      });

      const startTime = Date.now();
      const result = await service.getUserVideos(MOCK_USER_ID);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle videos with missing processing results gracefully', async () => {
      const videoWithoutResults = {
        ...mockVideoData,
        video_processing_results: []
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [videoWithoutResults],
              error: null
            }))
          }))
        }))
      });

      const result = await service.getUserVideos(MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.[0].result).toBeUndefined();
    });
  });
});