import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Platform } from '../../deliverables/types/deliverables_types';
import { AIImprovementService } from '../services/AIImprovementService';
import { PostMetrics } from '@/app/workflows/data_collection/functions/types';
import { featureStore } from '../functions/feedbackLoop';

// Mock the feedback loop
jest.mock('../functions/feedbackLoop', () => ({
  AIImprovementFeedbackLoop: jest.fn().mockImplementation(() => ({
    runFeedbackLoop: jest.fn().mockResolvedValue(undefined),
  })),
  featureStore: {
    contentPerformance: [],
    userInteractions: [],
    platformMetrics: [],
    competitorInsights: [],
    workflowPerformance: [],
    aiSuggestions: [],
    experimentResults: [],
  },
}));

describe('AIImprovementService', () => {
  let service: AIImprovementService;

  beforeEach(() => {
    service = new AIImprovementService();
    // Clear feature store
    featureStore.contentPerformance = [];
    featureStore.aiSuggestions = [];
  });

  describe('Content Optimization', () => {
    it('should provide content optimization suggestions', async () => {
      const request = {
        caption: 'Check out this amazing content!',
        hashtags: ['#test', '#content'],
        platform: Platform.TIKTOK,
        targetAudience: 'general',
        userId: 'test-user',
      };

      const result = await service.getContentOptimization(request);

      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('tone');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('captionVariations');
      expect(result).toHaveProperty('hashtagRecommendations');
      expect(result).toHaveProperty('aiSuggestions');

      expect(result.sentiment.sentiment).toBe('positive');
      expect(result.captionVariations).toHaveLength(5);
      expect(result.hashtagRecommendations.length).toBeGreaterThan(0);
    });

    it('should analyze sentiment correctly', async () => {
      const positiveRequest = {
        caption: 'I love this amazing content! It\'s fantastic!',
        platform: Platform.INSTAGRAM,
        userId: 'test-user',
      };

      const result = await service.getContentOptimization(positiveRequest);
      expect(result.sentiment.sentiment).toBe('positive');
      expect(result.sentiment.score).toBeGreaterThan(0);
    });

    it('should analyze tone correctly', async () => {
      const excitedRequest = {
        caption: 'OMG this is AMAZING!!! So excited!!!',
        platform: Platform.TIKTOK,
        userId: 'test-user',
      };

      const result = await service.getContentOptimization(excitedRequest);
      expect(result.tone.tone).toBe('excited');
      expect(result.tone.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Engagement Prediction', () => {
    it('should predict engagement for a post', async () => {
      const request = {
        caption: 'Great content with good engagement potential',
        hashtags: ['#viral', '#trending', '#content'],
        platform: Platform.TIKTOK,
        publishTime: new Date('2024-01-15T19:00:00Z'), // Optimal time
        contentType: 'video' as const,
      };

      const result = await service.predictPostEngagement(request);

      expect(result).toHaveProperty('predictedEngagement');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('recommendations');

      expect(result.predictedEngagement).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.factors.captionScore).toBeGreaterThan(0);
      expect(result.factors.hashtagScore).toBeGreaterThan(0);
    });

    it('should provide higher scores for optimal timing', async () => {
      const optimalTimeRequest = {
        caption: 'Test content',
        hashtags: ['#test'],
        platform: Platform.TIKTOK,
        publishTime: new Date('2024-01-15T19:00:00Z'), // 7 PM - optimal for TikTok
      };

      const poorTimeRequest = {
        caption: 'Test content',
        hashtags: ['#test'],
        platform: Platform.TIKTOK,
        publishTime: new Date('2024-01-15T03:00:00Z'), // 3 AM - poor timing
      };

      const optimalResult = await service.predictPostEngagement(optimalTimeRequest);
      const poorResult = await service.predictPostEngagement(poorTimeRequest);

      expect(optimalResult.factors.timingScore).toBeGreaterThan(poorResult.factors.timingScore);
    });
  });

  describe('A/B Testing', () => {
    it('should create A/B test experiments', async () => {
      const request = {
        name: 'Caption Length Test',
        description: 'Testing short vs long captions',
        platform: Platform.INSTAGRAM,
        baseContent: {
          caption: 'Original caption for testing',
          hashtags: ['#test', '#experiment'],
        },
        variationType: 'length' as const,
        targetMetric: 'engagementRate' as const,
        duration: 7,
        userId: 'test-user',
      };

      const result = await service.createABTest(request);

      expect(result).toHaveProperty('experiment');
      expect(result).toHaveProperty('variants');
      expect(result).toHaveProperty('assignmentInstructions');

      expect(result.experiment.name).toBe(request.name);
      expect(result.experiment.platform).toBe(request.platform);
      expect(result.variants.length).toBeGreaterThan(1);
      expect(result.assignmentInstructions).toContain('A/B Test');
    });

    it('should generate appropriate variants for different variation types', async () => {
      const captionRequest = {
        name: 'Caption Test',
        description: 'Testing caption variations',
        platform: Platform.TIKTOK,
        baseContent: {
          caption: 'Base caption',
          hashtags: ['#test'],
        },
        variationType: 'caption' as const,
        targetMetric: 'likes' as const,
        duration: 5,
        userId: 'test-user',
      };

      const result = await service.createABTest(captionRequest);
      expect(result.variants.length).toBe(2); // Original and optimized
      expect(result.variants.some(v => v.name.includes('Original'))).toBe(true);
      expect(result.variants.some(v => v.name.includes('Optimized'))).toBe(true);
    });
  });

  describe('Performance Insights', () => {
    beforeEach(() => {
      // Add sample data to feature store
      featureStore.contentPerformance = [
        {
          postId: 'post1',
          platform: Platform.TIKTOK,
          contentType: 'video',
          engagementRate: 15.5,
          likeRatio: 0.08,
          commentRatio: 0.02,
          shareRatio: 0.01,
          hashtags: ['#viral', '#trending'],
          caption: 'Amazing content here!',
          publishTime: new Date(),
          audienceReach: 10000,
          impressions: 12000,
          sentiment: 'positive',
          viralityScore: 0.8,
          qualityScore: 0.9,
        },
        {
          postId: 'post2',
          platform: Platform.INSTAGRAM,
          contentType: 'image',
          engagementRate: 8.2,
          likeRatio: 0.05,
          commentRatio: 0.01,
          shareRatio: 0.005,
          hashtags: ['#photo', '#instagood'],
          caption: 'Beautiful photo',
          publishTime: new Date(),
          audienceReach: 5000,
          impressions: 6000,
          sentiment: 'positive',
          viralityScore: 0.4,
          qualityScore: 0.7,
        },
      ];

      featureStore.aiSuggestions = [
        {
          id: 'suggestion1',
          type: 'content',
          suggestion: 'Add more engaging questions to your captions',
          confidence: 0.85,
          expectedImprovement: 12,
          userId: 'test-user',
          platform: Platform.TIKTOK,
        },
      ];
    });

    it('should provide comprehensive performance insights', async () => {
      const result = await service.getPerformanceInsights('test-user');

      expect(result).toHaveProperty('overallPerformance');
      expect(result).toHaveProperty('contentInsights');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('experimentOpportunities');

      expect(result.overallPerformance.averageEngagement).toBeGreaterThan(0);
      expect(result.overallPerformance.topPerformingPlatform).toBeDefined();
      expect(result.contentInsights.topPerformingWords).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.experimentOpportunities.length).toBeGreaterThan(0);
    });

    it('should identify top performing platform correctly', async () => {
      const result = await service.getPerformanceInsights('test-user');
      
      // TikTok should be top performing based on sample data (15.5% vs 8.2%)
      expect(result.overallPerformance.topPerformingPlatform).toBe(Platform.TIKTOK);
    });
  });

  describe('Post Performance Recording', () => {
    it('should record post performance correctly', async () => {
      const postMetrics: PostMetrics = {
        id: 'test-post-123',
        platform: Platform.TIKTOK,
        views: 10000,
        likes: 800,
        comments: 50,
        shares: 25,
        engagementRate: 8.75,
        timestamp: new Date(),
        url: 'https://tiktok.com/test-post-123',
        caption: 'Test post for recording',
        hashtags: ['#test', '#recording'],
      };

      await service.recordPostPerformance(postMetrics);

      // Check if the post was added to feature store
      const recordedPost = featureStore.contentPerformance.find(p => p.postId === 'test-post-123');
      expect(recordedPost).toBeDefined();
      expect(recordedPost?.platform).toBe(Platform.TIKTOK);
      expect(recordedPost?.engagementRate).toBe(8.75);
    });
  });

  describe('Workflow Improvements', () => {
    it('should provide workflow improvement suggestions', async () => {
      const result = await service.getWorkflowImprovements();

      expect(result).toHaveProperty('dataCollection');
      expect(result).toHaveProperty('videoOptimization');
      expect(result).toHaveProperty('autoposting');
      expect(result).toHaveProperty('competitorTactics');
      expect(result).toHaveProperty('contentTemplateGenerator');

      expect(result.dataCollection.length).toBeGreaterThan(0);
      expect(result.videoOptimization.length).toBeGreaterThan(0);
      expect(result.autoposting.length).toBeGreaterThan(0);
      expect(result.competitorTactics.length).toBeGreaterThan(0);
      expect(result.contentTemplateGenerator.length).toBeGreaterThan(0);

      // Check that suggestions are meaningful
      expect(result.dataCollection.some(s => s.includes('data collection'))).toBe(true);
      expect(result.videoOptimization.some(s => s.includes('video'))).toBe(true);
    });
  });

  describe('Feedback System', () => {
    beforeEach(() => {
      featureStore.aiSuggestions = [
        {
          id: 'feedback-test-1',
          type: 'content',
          suggestion: 'Test suggestion for feedback',
          confidence: 0.7,
          expectedImprovement: 10,
          userId: 'test-user',
          platform: Platform.TIKTOK,
        },
      ];
    });

    it('should handle positive feedback correctly', async () => {
      await service.provideFeedback('feedback-test-1', 'positive');

      const suggestion = featureStore.aiSuggestions.find(s => s.id === 'feedback-test-1');
      expect(suggestion?.feedback).toBe('positive');
      expect(suggestion?.confidence).toBeGreaterThan(0.7); // Should increase
    });

    it('should handle negative feedback correctly', async () => {
      await service.provideFeedback('feedback-test-1', 'negative');

      const suggestion = featureStore.aiSuggestions.find(s => s.id === 'feedback-test-1');
      expect(suggestion?.feedback).toBe('negative');
      expect(suggestion?.confidence).toBeLessThan(0.7); // Should decrease
    });

    it('should handle neutral feedback correctly', async () => {
      const originalConfidence = 0.7;
      await service.provideFeedback('feedback-test-1', 'neutral');

      const suggestion = featureStore.aiSuggestions.find(s => s.id === 'feedback-test-1');
      expect(suggestion?.feedback).toBe('neutral');
      expect(suggestion?.confidence).toBe(originalConfidence); // Should remain same
    });
  });

  describe('Error Handling', () => {
    it('should handle missing experiment gracefully', async () => {
      const result = await service.analyzeABTest('non-existent-experiment');

      expect(result.analysis).toBeNull();
      expect(result.insights).toContain('Experiment not found');
      expect(result.nextSteps).toContain('Verify experiment ID');
    });

    it('should handle empty content gracefully', async () => {
      const request = {
        caption: '',
        platform: Platform.TIKTOK,
        userId: 'test-user',
      };

      const result = await service.getContentOptimization(request);
      
      expect(result.sentiment).toBeDefined();
      expect(result.tone).toBeDefined();
      expect(result.optimization).toBeDefined();
    });
  });

  describe('Integration Points', () => {
    it('should initialize service correctly', async () => {
      const newService = new AIImprovementService();
      await newService.initialize();
      
      // Service should be marked as initialized
      expect(newService['initialized']).toBe(true);
    });

    it('should auto-initialize when calling methods', async () => {
      const newService = new AIImprovementService();
      
      // Should auto-initialize when calling a method
      const result = await newService.getWorkflowImprovements();
      expect(result).toBeDefined();
      expect(newService['initialized']).toBe(true);
    });
  });
});

describe('A/B Testing Functions', () => {
  it('should create experiments with proper validation', () => {
    const { createExperiment } = require('../functions/abTesting');
    
    const experimentData = {
      name: 'Test Experiment',
      description: 'Testing caption variations',
      platform: Platform.TIKTOK,
      status: 'draft' as const,
      variants: [
        {
          id: 'variant1',
          name: 'Original',
          description: 'Original caption',
          config: { caption: 'Original' },
          weight: 50,
        },
        {
          id: 'variant2',
          name: 'Optimized',
          description: 'Optimized caption',
          config: { caption: 'Optimized' },
          weight: 50,
        },
      ],
      startDate: new Date(),
      targetMetric: 'engagementRate' as const,
      minimumSampleSize: 100,
      confidenceLevel: 0.95,
      createdBy: 'test-user',
    };

    const experiment = createExperiment(experimentData);
    
    expect(experiment.id).toBeDefined();
    expect(experiment.name).toBe('Test Experiment');
    expect(experiment.variants.length).toBe(2);
    expect(experiment.createdAt).toBeInstanceOf(Date);
  });
});

describe('NLP Functions', () => {
  it('should analyze sentiment with emotion detection', () => {
    const { analyzeSentiment } = require('../functions/nlp');
    
    const result = analyzeSentiment('I love this amazing content! It makes me so happy and excited!');
    
    expect(result.sentiment).toBe('positive');
    expect(result.score).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.emotions.joy).toBeGreaterThan(0);
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it('should generate caption variations', () => {
    const { generateCaptionVariations } = require('../functions/nlp');
    
    const variations = generateCaptionVariations(
      'Check out this amazing content!',
      Platform.TIKTOK,
      'general'
    );
    
    expect(variations.length).toBe(5);
    expect(variations.every(v => v.variation && v.type && v.expectedPerformance)).toBe(true);
    expect(variations.some(v => v.type === 'shortened')).toBe(true);
    expect(variations.some(v => v.type === 'expanded')).toBe(true);
  });
}); 