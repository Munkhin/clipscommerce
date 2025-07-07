
import { UserVideoService } from '@/services/userVideoService';
import { createMockFile, MOCK_USER_ID, MOCK_VIDEO_ID } from '@/tests/utils/test-helpers';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client and its storage/from/upload methods
const mockSupabaseClient = {
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
  from: jest.fn(() => ({
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
      })),
    })),
    eq: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
      delete: jest.fn(),
    })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
  })),
} as unknown as SupabaseClient;

// Mock global fetch for video processing initiation
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, estimatedTime: '5 minutes' }),
  })
) as jest.Mock;

describe('UserVideoService - Video Upload Fix', () => {
  let service: UserVideoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserVideoService(mockSupabaseClient);
  });

  it('should store the public Supabase Storage URL in video_url after successful upload', async () => {
    const mockFile = createMockFile('test-video.mp4', 'video/mp4', 1024000);
    const publicUrl = 'https://your-supabase-bucket.supabase.co/storage/v1/object/public/videos/test-user-id/test-video.mp4';

    // Mock successful storage upload
    mockSupabaseClient.storage.from().upload.mockResolvedValue({
      data: { path: `${MOCK_USER_ID}/${mockFile.name}` },
      error: null,
    });

    // Mock getPublicUrl to return the expected public URL
    mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
      data: { publicUrl: publicUrl },
    });

    // Mock successful database insert
    mockSupabaseClient.from().insert.mockResolvedValue({
      data: [{ id: MOCK_VIDEO_ID, video_url: publicUrl, status: 'uploaded' }],
      error: null,
    });

    const thumbnailUrl = 'https://your-supabase-bucket.supabase.co/storage/v1/object/public/thumbnails/test-user-id/test-video.mp4-thumb.jpg';

    const result = await service.uploadVideo(MOCK_USER_ID, {
      file: mockFile,
      title: 'Test Video',
      thumbnailUrl: thumbnailUrl,
    });

    expect(result.success).toBe(true);
    expect(result.videoId).toBe(MOCK_VIDEO_ID);

    // Verify storage upload was called with correct path
    expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('videos');
    expect(mockSupabaseClient.storage.from().upload).toHaveBeenCalledWith(
      `${MOCK_USER_ID}/${mockFile.name}`,
      mockFile,
      {
        cacheControl: '3600',
        upsert: false,
      }
    );

    // Verify getPublicUrl was called with correct path
    expect(mockSupabaseClient.storage.from().getPublicUrl).toHaveBeenCalledWith(
      `${MOCK_USER_ID}/${mockFile.name}`
    );

    // Verify database insert was called with the public URL
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_videos');
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: MOCK_USER_ID,
        filename: mockFile.name,
        title: 'Test Video',
        file_size: mockFile.size,
        mime_type: mockFile.type,
        video_url: publicUrl, // This is the crucial assertion
        status: 'uploaded',
      })
    );

    // Verify video processing was initiated
    expect(global.fetch).toHaveBeenCalledWith('/api/videos/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId: MOCK_VIDEO_ID }),
    });
  });

  it('should handle storage upload failure gracefully', async () => {
    const mockFile = createMockFile('fail-video.mp4', 'video/mp4', 1000);
    const uploadError = new Error('Storage upload failed');

    mockSupabaseClient.storage.from().upload.mockResolvedValue({
      data: null,
      error: uploadError,
    });

    const result = await service.uploadVideo(MOCK_USER_ID, { file: mockFile });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to upload video file');
    expect(mockSupabaseClient.from().insert).not.toHaveBeenCalled(); // No DB insert on upload failure
    expect(global.fetch).not.toHaveBeenCalled(); // No processing initiated
  });

  it('should handle database insert failure gracefully and clean up storage', async () => {
    const mockFile = createMockFile('db-fail-video.mp4', 'video/mp4', 1000);
    const publicUrl = 'https://your-supabase-bucket.supabase.co/storage/v1/object/public/videos/test-user-id/db-fail-video.mp4';
    const dbError = new Error('Database insert failed');

    mockSupabaseClient.storage.from().upload.mockResolvedValue({
      data: { path: `${MOCK_USER_ID}/${mockFile.name}` },
      error: null,
    });
    mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
      data: { publicUrl: publicUrl },
    });
    mockSupabaseClient.from().insert.mockResolvedValue({
      data: null,
      error: dbError,
    });
    const mockRemove = mockSupabaseClient.storage.from().remove;

    const result = await service.uploadVideo(MOCK_USER_ID, { file: mockFile });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to save video record');
    expect(mockRemove).toHaveBeenCalledWith([`${MOCK_USER_ID}/${mockFile.name}`]); // Should cleanup uploaded file
    expect(global.fetch).not.toHaveBeenCalled(); // No processing initiated
  });
});
