import { AutopostingService } from '../autoposting';

describe('AutopostingService', () => {
  let service: AutopostingService;

  beforeEach(() => {
    service = new AutopostingService();
  });

  describe('social media integration', () => {
    it('should post to TikTok successfully', async () => {
      const request = {
        platform: 'tiktok' as const,
        content: { videoUrl: 'test.mp4', caption: 'Test post' },
        userId: 'user123',
      };

      const mockResponse = {
        success: true,
        postId: 'tiktok_123',
        platform: 'tiktok',
        status: 'published',
      };

      jest.spyOn(service, 'publishPost').mockResolvedValue(mockResponse);
      const result = await service.publishPost(request);

      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
      expect(result.platform).toBe('tiktok');
    });

    it('should handle Instagram posts', async () => {
      const request = {
        platform: 'instagram' as const,
        content: { imageUrl: 'test.jpg', caption: 'Instagram test' },
        userId: 'user456',
      };

      const mockResponse = {
        success: true,
        postId: 'instagram_456',
        platform: 'instagram',
        status: 'published',
      };

      jest.spyOn(service, 'publishPost').mockResolvedValue(mockResponse);
      const result = await service.publishPost(request);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('instagram');
    });

    it('should successfully post to YouTube', async () => {
      const postRequest = {
        platform: 'youtube' as const,
        content: {
          videoUrl: 'https://example.com/youtube-video.mp4',
          title: 'Amazing Tutorial - How to Code',
          description: 'Learn coding with this comprehensive tutorial...',
          tags: ['coding', 'tutorial', 'programming'],
          thumbnail: 'https://example.com/thumbnail.jpg',
          category: 'Education',
          privacy: 'public',
        },
        userId: 'user789',
        scheduledTime: new Date(Date.now() + 7200000), // 2 hours from now
      };

      const mockResponse = {
        success: true,
        postId: 'youtube_video_789',
        platform: 'youtube',
        scheduledFor: postRequest.scheduledTime,
        status: 'scheduled',
        videoProcessing: {
          status: 'processing',
          estimatedTime: '5-10 minutes',
        },
      };

      jest.spyOn(service, 'schedulePost').mockResolvedValue(mockResponse);

      const result = await service.schedulePost(postRequest);

      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
      expect(result.platform).toBe('youtube');
      expect(result.videoProcessing).toBeDefined();
    });

    it('should handle cross-platform posting', async () => {
      const crossPlatformRequest = {
        platforms: ['tiktok', 'instagram', 'youtube'],
        content: {
          videoUrl: 'https://example.com/cross-platform-video.mp4',
          caption: 'Cross-platform content #viral',
          platformSpecific: {
            tiktok: { hashtags: ['#fyp', '#viral'] },
            instagram: { location: 'New York' },
            youtube: { category: 'Entertainment' },
          },
        },
        userId: 'user_cross',
        scheduledTime: new Date(Date.now() + 3600000),
      };

      const mockCrossResponse = {
        success: true,
        results: [
          { platform: 'tiktok', postId: 'tiktok_cross_1', status: 'scheduled' },
          { platform: 'instagram', postId: 'instagram_cross_1', status: 'scheduled' },
          { platform: 'youtube', postId: 'youtube_cross_1', status: 'scheduled' },
        ],
        scheduledFor: crossPlatformRequest.scheduledTime,
      };

      jest.spyOn(service, 'scheduleCrossPlatformPost').mockResolvedValue(mockCrossResponse);

      const result = await service.scheduleCrossPlatformPost(crossPlatformRequest);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results?.every(r => r.status === 'scheduled')).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should handle rate limits gracefully', async () => {
      const rateLimitCheck = {
        allowed: false,
        retryAfter: 3600,
        remainingQuota: 0,
      };

      jest.spyOn(service, 'checkRateLimit').mockResolvedValue(rateLimitCheck);
      const result = await service.checkRateLimit('tiktok', 'user123');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should queue posts when rate limited', async () => {
      const queueResponse = {
        success: true,
        queued: true,
        queuePosition: 5,
        estimatedPostTime: new Date(Date.now() + 3600000),
      };

      jest.spyOn(service, 'queuePost').mockResolvedValue(queueResponse);
      const result = await service.queuePost({
        platform: 'tiktok' as const,
        content: { videoUrl: 'test.mp4', caption: 'Queued post' },
        userId: 'user123',
      });

      expect(result.queued).toBe(true);
      expect(result.queuePosition).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      jest.spyOn(service, 'publishPost').mockRejectedValue(authError);

      await expect(service.publishPost({
        platform: 'instagram' as const,
        content: { imageUrl: 'test.jpg', caption: 'Auth test' },
        userId: 'user123',
      })).rejects.toThrow('Authentication failed');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      jest.spyOn(service, 'publishPost').mockRejectedValue(networkError);

      await expect(service.publishPost({
        platform: 'youtube' as const,
        content: { videoUrl: 'test.mp4', title: 'Network test' },
        userId: 'user123',
      })).rejects.toThrow('Network connection failed');
    });

    it('should handle content policy violations', async () => {
      const policyViolationRequest = {
        platform: 'tiktok' as const,
        content: {
          videoUrl: 'https://example.com/policy-violation.mp4',
          caption: 'Content that violates platform policies',
        },
        userId: 'user_policy',
      };

      const mockPolicyResponse = {
        success: false,
        error: 'Content policy violation',
        violationType: 'inappropriate_content',
        suggestions: [
          'Review community guidelines',
          'Modify content to comply with policies',
          'Appeal the decision if you believe it\'s incorrect',
        ],
      };

      jest.spyOn(service, 'publishPost').mockResolvedValue(mockPolicyResponse);

      const result = await service.publishPost(policyViolationRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('policy violation');
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should handle file upload failures', async () => {
      const uploadFailRequest = {
        platform: 'instagram' as const,
        content: {
          imageUrl: 'https://example.com/corrupted-image.jpg',
          caption: 'Upload failure test',
        },
        userId: 'user_upload_fail',
      };

      const mockUploadFailResponse = {
        success: false,
        error: 'File upload failed',
        suggestions: [
          'Check file integrity',
          'Convert to supported format',
          'Reduce file size if too large',
        ],
      };

      jest.spyOn(service, 'publishPost').mockResolvedValue(mockUploadFailResponse);

      const result = await service.publishPost(uploadFailRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File upload failed');
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should handle generic API errors', async () => {
      const genericErrorRequest = {
        platform: 'youtube' as const,
        content: { videoUrl: 'https://example.com/generic-error.mp4', title: 'Generic error test' },
        userId: 'user_generic_error',
      };

      const mockGenericErrorResponse = {
        success: false,
        error: 'Internal API error',
        suggestions: [
          'Try again later',
          'Contact support if the issue persists',
        ],
      };

      jest.spyOn(service, 'publishPost').mockResolvedValue(mockGenericErrorResponse);

      const result = await service.publishPost(genericErrorRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal API error');
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should handle platform-specific errors', async () => {
      const platformErrors = [
        {
          platform: 'tiktok' as const,
          error: 'Video duration exceeds platform limit',
          errorCode: 'DURATION_LIMIT_EXCEEDED',
        },
        {
          platform: 'instagram' as const,
          error: 'Hashtag limit exceeded',
          errorCode: 'HASHTAG_LIMIT_EXCEEDED',
        },
        {
          platform: 'youtube' as const,
          error: 'Video processing failed',
          errorCode: 'VIDEO_PROCESSING_FAILED',
        },
      ];

      for (const errorCase of platformErrors) {
        const errorRequest = {
          platform: errorCase.platform,
          content: {
            videoUrl: 'https://example.com/error-test.mp4',
            caption: 'Platform error test',
          },
          userId: 'user_platform_error',
        };

        const mockErrorResponse = {
          success: false,
          error: errorCase.error,
          errorCode: errorCase.errorCode,
          platform: errorCase.platform,
        };

        jest.spyOn(service, 'publishPost').mockResolvedValue(mockErrorResponse);

        const result = await service.publishPost(errorRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorCase.error);
        expect(result.errorCode).toBe(errorCase.errorCode);
      }
    });
  });
});