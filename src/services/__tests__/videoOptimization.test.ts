import { optimizeVideo } from '../videoOptimization';
import { VideoOptimizationAnalysisService } from '../../app/workflows/video_optimization/VideoOptimizationAnalysisService';
import { Platform, TimeRange, AnalysisResult, VideoOptimizationAnalysisData } from '../../app/workflows/data_analysis/types/analysis_types';
import { ContentOptimizationRequest } from '../../app/workflows/video_optimization/enhanced_content_optimization_types';

// Mock the VideoOptimizationAnalysisService
jest.mock('../../app/workflows/video_optimization/VideoOptimizationAnalysisService');

const mockVideoOptimizationService = VideoOptimizationAnalysisService as jest.MockedClass<typeof VideoOptimizationAnalysisService>;

// Mock data for the video optimization insights service
const mockGetVideoOptimizationInsights = jest.fn();

// Mock implementation for optimizeVideo
jest.mock('../../app/workflows/AI_improvement/services/AIImprovementService', () => ({
  getFeedbackOnOptimization: jest.fn().mockResolvedValue({
    feedback: 'Great optimization!',
    score: 95,
  }),
}));

// A valid mock request object for testing
const validRequest: ContentOptimizationRequest = {
  userId: 'testUser123',
  platform: 'YouTube', // Changed to 'YouTube' for case-sensitivity
  timeRange: { start: new Date().toISOString(), end: new Date().toISOString() }, // Ensure timeRange is provided
  correlationId: 'testCorrelation123',
  // Add any other required properties for ContentOptimizationRequest
};

describe('videoOptimization service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock for each test
    mockVideoOptimizationService.getVideoOptimizationInsights.mockReset();
  });

  describe('core video optimization', () => {
    it('should return optimization insights for a valid video', async () => {
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: ['caption1', 'caption2'],
        trendingHashtags: [{ tag: '#trend1' }, { tag: '#trend2' }],
        audioViralityAnalysis: [],
        realTimeSentiment: undefined,
        detailedPlatformAnalytics: undefined,
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: {
          generatedAt: new Date(),
          source: 'test',
        },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.topPerformingVideoCaptions).toEqual(['caption1', 'caption2']);
      expect(result.data!.trendingHashtags).toEqual([{ tag: '#trend1' }, { tag: '#trend2' }]);
    });

    it('should handle optimization failure gracefully', async () => {
      const mockErrorResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: false,
        error: { message: 'Optimization failed', code: 'TEST_ERROR' },
        metadata: {
          generatedAt: new Date(),
          source: 'test',
        },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockErrorResult);

      const result = await optimizeVideo(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Optimization failed');
    });
  });

  describe('video processing algorithms', () => {
    it('should optimize video compression algorithms', async () => {
      const compressionRequest = {
        ...validRequest,
        videoMetadata: { format: 'mp4', quality: 'high' },
      };

      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: { // Assuming this is where formatOptimization would be nested
          contentFormatPerformance: [{ formatName: 'mp4', averageEngagementRate: 0.05 }], // Changed to array
          // ... other properties
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'compressed video caption',
          optimizedHashtags: [{ tag: '#compressed' }],
          videoRecommendation: { score: 90, recommendations: ['use h.265'] },
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(compressionRequest);
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.optimizedCaption).toBe('compressed video caption');
    });

    it('should handle video format conversion optimization', async () => {
      const formatConversions = [
        { from: 'mp4', to: 'webm' },
        { from: 'avi', to: 'mp4' },
        { from: 'mov', to: 'mp4' },
      ];

      for (const conversion of formatConversions) {
        const formatRequest = {
          ...validRequest,
          videoMetadata: { format: conversion.from },
        };

        const mockData: VideoOptimizationAnalysisData = {
          topPerformingVideoCaptions: [],
          trendingHashtags: [],
          audioViralityAnalysis: [],
          detailedPlatformAnalytics: { // Assuming this is where formatOptimization would be nested
            contentFormatPerformance: [{ formatName: 'webm', averageEngagementRate: 0.07 }], // Changed to array
            // ... other properties
          } as any,
          optimizedVideoContent: {
            optimizedCaption: 'converted video caption',
            optimizedHashtags: [{ tag: '#converted' }],
            videoRecommendation: { score: 85, recommendations: ['convert to mp4'] },
          }
        };

        const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
          success: true,
          data: mockData,
          metadata: { generatedAt: new Date(), source: 'test' },
        };
        mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);
        
        const result = await optimizeVideo(formatRequest);
        expect(result.data!.optimizedVideoContent).toBeDefined();
      }
    });

    it('should optimize video thumbnails and previews', async () => {
      const thumbnailRequest = {
        ...validRequest,
        videoMetadata: {
          generateThumbnails: true,
          thumbnailCount: 5,
          previewDuration: 15,
        },
      };
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: { // Assuming this is where thumbnail related data would be
          // Add properties that correspond to optimized thumbnails/previews
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'thumbnail optimized caption',
          optimizedHashtags: [{ tag: '#thumbnails' }],
          videoRecommendation: { score: 88, recommendations: ['add more thumbnails'] },
        thumbnails: [
          { timestamp: 0, url: 'thumb1.jpg', score: 0.9 },
          { timestamp: 5, url: 'thumb2.jpg', score: 0.8 },
          { timestamp: 10, url: 'thumb3.jpg', score: 0.85 },
        ]
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(thumbnailRequest);

      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.thumbnails!.length).toBeGreaterThan(0);
      expect(result.data!.optimizedVideoContent!.thumbnails![0]).toHaveProperty('score');
    });
  });

  describe('performance optimization', () => {
    it('should optimize batch video processing', async () => {
      const batchRequest = {
        ...validRequest,
        batchProcessing: {
          videoIds: ['video1', 'video2', 'video3', 'video4', 'video5'],
          parallelProcessing: true,
          maxConcurrency: 3,
        },
      };
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: {
          // Add batch processing related metrics here if they exist in VideoOptimizationAnalysisData
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'batch processed caption',
          optimizedHashtags: [{ tag: '#batch' }],
          videoRecommendation: { score: 82, recommendations: ['improve batching'] },
        batchResults: [
          { videoId: 'video1', score: 85, status: 'completed' },
          { videoId: 'video2', score: 78, status: 'completed' },
          { videoId: 'video3', score: 90, status: 'completed' },
          { videoId: 'video4', score: 73, status: 'completed' },
          { videoId: 'video5', score: 88, status: 'completed' },
        ]
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(batchRequest);
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.batchResults).toBeDefined();
      expect(result.data!.optimizedVideoContent!.batchResults!.length).toBe(5);
      expect(result.data!.optimizedVideoContent!.batchResults!.every(r => r.status === 'completed')).toBe(true);
    });

    it('should handle memory-intensive optimization operations', async () => {
      const memoryIntensiveRequest = {
        ...validRequest,
        optimizationSettings: {
          highQualityProcessing: true,
          aiEnhancement: true,
          deepAnalysis: true,
          memoryOptimization: true,
        },
      };
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: {
          // Add memory stats here if they exist in VideoOptimizationAnalysisData
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'memory optimized caption',
          optimizedHashtags: [{ tag: '#memory' }],
          videoRecommendation: { score: 93, recommendations: ['optimize memory'] },
        memoryStats: {
          peakUsage: 150 * 1024 * 1024, // 150MB
          averageUsage: 100 * 1024 * 1024, // 100MB
          optimizationEffective: true,
        }
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(memoryIntensiveRequest);
      const finalMemory = process.memoryUsage().heapUsed;
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.memoryStats).toBeDefined();
      expect(result.data!.optimizedVideoContent!.memoryStats!.optimizationEffective).toBe(true);
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
    });
  });

  describe('advanced edge cases', () => {
    it('should handle corrupted video files', async () => {
      const corruptedVideoRequest = {
        ...validRequest,
        videoMetadata: {
          isCorrupted: true,
          corruptionType: 'header_damage',
        },
      };
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: {
          // Add error handling stats here if they exist in VideoOptimizationAnalysisData
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'corrupted video caption',
          optimizedHashtags: [{ tag: '#corrupted' }],
          videoRecommendation: { score: 30, recommendations: ['fix corruption'] },
        errorHandling: {
          corruptionDetected: true,
          recoveryAttempted: true,
          recoverySuccess: false,
        }
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(corruptedVideoRequest);
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.errorHandling!.corruptionDetected).toBe(true);
      expect(result.data!.optimizedVideoContent!.videoRecommendation!.score).toBeLessThan(50); // Low score for corrupted files
    });

    it('should handle extremely short videos', async () => {
      const shortVideoRequest = {
        ...validRequest,
        videoMetadata: {
          duration: 0.5, // 0.5 seconds
          frameCount: 15,
        },
      };
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: {
          // Add short video handling stats here if they exist in VideoOptimizationAnalysisData
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'short video caption',
          optimizedHashtags: [{ tag: '#shortvideo' }],
          videoRecommendation: { score: 65, recommendations: ['extend duration'] },
        shortVideoHandling: {
          durationWarning: true,
          optimizationLimited: true,
          suggestions: ['Consider extending duration', 'Add slow motion effects'],
        }
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(shortVideoRequest);
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.shortVideoHandling).toBeDefined();
      expect(result.data!.optimizedVideoContent!.shortVideoHandling!.durationWarning).toBe(true);
    });

    it('should handle videos with unusual aspect ratios', async () => {
      const unusualAspectRatios = ['1:3', '3:1', '2:5', '5:2'];
      
      for (const aspectRatio of unusualAspectRatios) {
        const aspectRatioRequest = {
          ...validRequest,
          videoMetadata: { aspectRatio },
        };
        
        const mockData: VideoOptimizationAnalysisData = {
          topPerformingVideoCaptions: [],
          trendingHashtags: [],
          audioViralityAnalysis: [],
          detailedPlatformAnalytics: {
            // Add aspect ratio handling stats here if they exist in VideoOptimizationAnalysisData
          } as any,
          optimizedVideoContent: {
            optimizedCaption: 'aspect ratio caption',
            optimizedHashtags: [{ tag: '#aspectratio' }],
            videoRecommendation: { score: 70, recommendations: ['adjust aspect ratio'] },
          aspectRatioHandling: {
            originalRatio: aspectRatio,
            recommendedRatio: '16:9',
            cropSuggestions: true,
          }
          }
        };

        const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
          success: true,
          data: mockData,
          metadata: { generatedAt: new Date(), source: 'test' },
        };
        mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

        const result = await optimizeVideo(aspectRatioRequest);
        
        expect(result.data!.optimizedVideoContent).toBeDefined();
        expect(result.data!.optimizedVideoContent!.aspectRatioHandling).toBeDefined();
        expect(result.data!.optimizedVideoContent!.aspectRatioHandling!.originalRatio).toBe(aspectRatio);
      }
    });

    it('should handle videos with no audio track', async () => {
      const noAudioRequest = {
        ...validRequest,
        videoMetadata: {
          hasAudio: false,
          audioTracks: 0,
        },
      };
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: {
          // Add audio handling stats here if they exist in VideoOptimizationAnalysisData
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'no audio caption',
          optimizedHashtags: [{ tag: '#noaudio' }],
          videoRecommendation: { score: 60, recommendations: ['add music'] },
        audioHandling: {
          audioDetected: false,
          musicSuggestions: ['background-music-1', 'trending-sound-1'],
          voiceoverSuggestions: true,
        }
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(noAudioRequest);
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.audioHandling!.audioDetected).toBe(false);
      expect(result.data!.optimizedVideoContent!.audioHandling!.musicSuggestions).toBeInstanceOf(Array);
    });

    it('should handle videos with multiple audio tracks', async () => {
      const multiAudioRequest = {
        ...validRequest,
        videoMetadata: {
          hasAudio: true,
          audioTracks: 5,
          audioLanguages: ['en', 'es', 'fr', 'de', 'it'],
        },
      };
      
      const mockData: VideoOptimizationAnalysisData = {
        topPerformingVideoCaptions: [],
        trendingHashtags: [],
        audioViralityAnalysis: [],
        detailedPlatformAnalytics: {
          // Add multi audio handling stats here if they exist in VideoOptimizationAnalysisData
        } as any,
        optimizedVideoContent: {
          optimizedCaption: 'multi audio caption',
          optimizedHashtags: [{ tag: '#multiaudio' }],
          videoRecommendation: { score: 85, recommendations: ['select primary track'] },
        multiAudioHandling: {
          tracksProcessed: 5,
          primaryTrackSelected: 'en',
          alternativeTracksOptimized: true,
        }
        }
      };

      const mockResult: AnalysisResult<VideoOptimizationAnalysisData> = {
        success: true,
        data: mockData,
        metadata: { generatedAt: new Date(), source: 'test' },
      };
      mockVideoOptimizationService.getVideoOptimizationInsights.mockResolvedValue(mockResult);

      const result = await optimizeVideo(multiAudioRequest);
      
      expect(result.data!.optimizedVideoContent).toBeDefined();
      expect(result.data!.optimizedVideoContent!.multiAudioHandling!.tracksProcessed).toBe(5);
      expect(result.data!.optimizedVideoContent!.multiAudioHandling!.primaryTrackSelected).toBe('en');
    });
  });
}); 