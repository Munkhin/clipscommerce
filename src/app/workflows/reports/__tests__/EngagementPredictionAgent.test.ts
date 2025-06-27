import { EngagementPredictionAgent } from '../services/EngagementPredictionAgent';
import { PredictionRequest } from '../types/EngagementTypes';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null,
          })),
          data: [],
          error: null,
        })),
      })),
    })),
  })),
} as any;

describe('EngagementPredictionAgent', () => {
  let agent: EngagementPredictionAgent;

  beforeEach(() => {
    agent = new EngagementPredictionAgent(mockSupabase);
  });

  describe('Initialization', () => {
    test('should initialize successfully with mock data', async () => {
      const evaluation = await agent.initialize();
      
      expect(evaluation).toBeDefined();
      expect(evaluation.engagementModel).toBeDefined();
      expect(evaluation.viralModel).toBeDefined();
      expect(agent.isReady()).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const evaluation = await agent.initialize();
      
      expect(evaluation).toBeDefined();
      expect(agent.isReady()).toBe(true); // Should still work with mock data
    });
  });

  describe('Engagement Prediction', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should predict engagement for TikTok content', async () => {
      const request: PredictionRequest = {
        userId: 'test-user-1',
        platform: 'tiktok',
        contentMetadata: {
          caption: 'Amazing dance video! #viral #fyp #trending',
          hashtags: ['#viral', '#fyp', '#trending'],
          duration: 30,
          contentType: 'video',
          scheduledPublishTime: new Date(),
        },
      };

      const prediction = await agent.predictEngagement(request);

      expect(prediction).toBeDefined();
      expect(prediction.predictedMetrics.views).toBeGreaterThan(0);
      expect(prediction.predictedMetrics.engagementRate).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedMetrics.engagementRate).toBeLessThanOrEqual(1);
      expect(prediction.viralProbability.score).toBeGreaterThanOrEqual(0);
      expect(prediction.viralProbability.score).toBeLessThanOrEqual(1);
      expect(prediction.recommendations).toBeDefined();
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });

    test('should predict engagement for Instagram content', async () => {
      const request: PredictionRequest = {
        userId: 'test-user-2',
        platform: 'instagram',
        contentMetadata: {
          caption: 'Beautiful sunset photo 🌅 #photography #nature',
          hashtags: ['#photography', '#nature', '#sunset'],
          contentType: 'image',
        },
      };

      const prediction = await agent.predictEngagement(request);

      expect(prediction).toBeDefined();
      expect(prediction.predictedMetrics).toBeDefined();
      expect(prediction.viralProbability).toBeDefined();
      expect(prediction.recommendations.length).toBeGreaterThan(0);
    });

    test('should predict engagement for YouTube content', async () => {
      const request: PredictionRequest = {
        userId: 'test-user-3',
        platform: 'youtube',
        contentMetadata: {
          caption: 'How to code in TypeScript - Complete Tutorial',
          hashtags: ['#typescript', '#programming', '#tutorial'],
          duration: 600,
          contentType: 'video',
        },
      };

      const prediction = await agent.predictEngagement(request);

      expect(prediction).toBeDefined();
      expect(prediction.predictedMetrics.views).toBeGreaterThan(0);
      expect(prediction.viralProbability.isLikelyViral).toBeDefined();
    });

    test('should throw error when not initialized', async () => {
      const uninitializedAgent = new EngagementPredictionAgent(mockSupabase);
      
      const request: PredictionRequest = {
        userId: 'test-user',
        platform: 'tiktok',
        contentMetadata: {
          caption: 'Test content',
          hashtags: ['#test'],
          contentType: 'video',
        },
      };

      await expect(uninitializedAgent.predictEngagement(request)).rejects.toThrow(
        'Agent must be initialized before making predictions'
      );
    });
  });

  describe('Batch Predictions', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should handle batch predictions', async () => {
      const requests: PredictionRequest[] = [
        {
          userId: 'user1',
          platform: 'tiktok',
          contentMetadata: {
            caption: 'Dance video 1',
            hashtags: ['#dance'],
            contentType: 'video',
          },
        },
        {
          userId: 'user2',
          platform: 'instagram',
          contentMetadata: {
            caption: 'Photo post',
            hashtags: ['#photo'],
            contentType: 'image',
          },
        },
      ];

      const predictions = await agent.batchPredict(requests);

      expect(predictions).toHaveLength(2);
      expect(predictions[0]).toBeDefined();
      expect(predictions[1]).toBeDefined();
    });
  });

  describe('Optimization Strategies', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should generate optimization strategies', async () => {
      const request: PredictionRequest = {
        userId: 'test-user',
        platform: 'tiktok',
        contentMetadata: {
          caption: 'Short caption',
          hashtags: ['#test'],
          contentType: 'video',
          duration: 15,
          scheduledPublishTime: new Date(2024, 0, 1, 10, 0), // 10 AM
        },
      };

      const strategies = await agent.getOptimizationStrategies(request);

      expect(strategies).toBeDefined();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);

      // Check strategy structure
      const strategy = strategies[0];
      expect(strategy.type).toBeDefined();
      expect(strategy.title).toBeDefined();
      expect(strategy.description).toBeDefined();
      expect(strategy.expectedImpact).toBeDefined();
      expect(strategy.actionable).toBeDefined();
      expect(strategy.priority).toBeDefined();
    });
  });

  describe('Model Performance', () => {
    test('should return null performance when not initialized', async () => {
      const performance = await agent.getModelPerformance();
      expect(performance).toBeNull();
    });

    test('should return performance metrics when initialized', async () => {
      await agent.initialize();
      const performance = await agent.getModelPerformance();

      expect(performance).toBeDefined();
      expect(performance!.engagementModel).toBeDefined();
      expect(performance!.viralModel).toBeDefined();
      expect(performance!.featureImportance).toBeDefined();
      expect(performance!.evaluationDate).toBeDefined();
    });
  });

  describe('Performance Updates', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should update with actual performance data', async () => {
      const request: PredictionRequest = {
        userId: 'test-user',
        platform: 'tiktok',
        contentMetadata: {
          caption: 'Test content',
          hashtags: ['#viral', '#test'],
          contentType: 'video',
        },
      };

      const actualMetrics = {
        views: 5000,
        likes: 250,
        shares: 50,
        comments: 25,
        engagementRate: 0.065,
      };

      // Should not throw error
      await expect(agent.updateWithActualPerformance(request, actualMetrics)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should handle empty hashtags', async () => {
      const request: PredictionRequest = {
        userId: 'test-user',
        platform: 'tiktok',
        contentMetadata: {
          caption: 'Content without hashtags',
          hashtags: [],
          contentType: 'video',
        },
      };

      const prediction = await agent.predictEngagement(request);
      expect(prediction).toBeDefined();
    });

    test('should handle missing caption', async () => {
      const request: PredictionRequest = {
        userId: 'test-user',
        platform: 'instagram',
        contentMetadata: {
          hashtags: ['#test'],
          contentType: 'image',
        },
      };

      const prediction = await agent.predictEngagement(request);
      expect(prediction).toBeDefined();
    });

    test('should handle very long captions', async () => {
      const longCaption = 'A'.repeat(1000);
      const request: PredictionRequest = {
        userId: 'test-user',
        platform: 'youtube',
        contentMetadata: {
          caption: longCaption,
          hashtags: ['#test'],
          contentType: 'video',
        },
      };

      const prediction = await agent.predictEngagement(request);
      expect(prediction).toBeDefined();
    });
  });
}); 