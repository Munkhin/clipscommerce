/**
 * Simple tests for AI & ML Content Optimization Features
 * 
 * Tests the production-ready implementations without external dependencies
 */

import { ContentOptimizationEngine, ContentOptimizationInput } from '@/app/workflows/data_analysis/engines/ContentOptimizationEngine';
import { ContentOptimizationAgent, ProductionContextualBandit, BanditContext } from '@/app/workflows/AI_improvement/services/agents/ContentOptimizationAgent';

// Mock external APIs to avoid network calls
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Optimized caption with great engagement!' } }],
          usage: { total_tokens: 100 }
        })
      }
    }
  }))
}));

// Mock fetch for Vision API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    responses: [{
      faceAnnotations: [{ boundingPoly: { vertices: [] } }],
      textAnnotations: [{ 
        description: 'Sample Text',
        boundingPoly: { vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }] }
      }],
      imagePropertiesAnnotation: {
        dominantColors: {
          colors: [
            { color: { red: 255, green: 255, blue: 255 }, score: 0.5 },
            { color: { red: 0, green: 0, blue: 0 }, score: 0.3 }
          ]
        }
      }
    }]
  })
});

describe('AI & ML Content Optimization Features - Core Functionality', () => {
  let engine: ContentOptimizationEngine;
  let agent: ContentOptimizationAgent;
  let bandit: ProductionContextualBandit;

  beforeEach(() => {
    engine = new ContentOptimizationEngine(
      undefined,
      'test-vision-key',
      'test-openai-key'
    );
    agent = new ContentOptimizationAgent();
    bandit = new ProductionContextualBandit();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('ContentOptimizationEngine - Core Features', () => {
    it('should optimize content with basic functionality', async () => {
      const input: ContentOptimizationInput = {
        text: 'Check out this amazing product!',
        platform: 'TikTok',
        topic: 'technology'
      };

      const result = await engine.optimizeContent(input);

      expect(result).toHaveProperty('optimizedCaption');
      expect(result).toHaveProperty('suggestedHashtags');
      expect(result).toHaveProperty('contentScore');
      expect(result.contentScore).toBeGreaterThan(0);
      expect(result.contentScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.suggestedHashtags)).toBe(true);
    });

    it('should handle thumbnail analysis with vision API', async () => {
      const imageUrl = 'https://example.com/test-image.jpg';
      
      const result = await engine.analyzeThumbnail(imageUrl);

      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('improvementSuggestions');
      expect(result).toHaveProperty('visualElements');
      expect(result).toHaveProperty('overallScore');
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.visualElements.hasText).toBe(true);
      expect(result.visualElements.faceDetected).toBe(true);
    });

    it('should provide fallback when APIs are not configured', async () => {
      const fallbackEngine = new ContentOptimizationEngine();
      
      const input: ContentOptimizationInput = {
        text: 'Test content',
        platform: 'Instagram'
      };

      const result = await fallbackEngine.optimizeContent(input);

      expect(result.optimizedCaption).toContain('Test content');
      expect(result.suggestedHashtags).toContain('#instagram');
    });

    it('should generate engagement predictions', async () => {
      const input: ContentOptimizationInput = {
        text: 'Great content!',
        platform: 'TikTok',
        userEngagementData: {
          averageLikes: 100,
          averageComments: 20,
          averageShares: 5,
          clickThroughRate: 0.03
        }
      };

      const result = await engine.optimizeContent(input);

      expect(result.engagementPrediction).toBeDefined();
      expect(result.engagementPrediction?.predictedLikes).toBeGreaterThan(0);
      expect(result.engagementPrediction?.confidenceScore).toBeGreaterThan(0);
    });

    it('should cache optimization results', async () => {
      const input: ContentOptimizationInput = {
        text: 'Cached content test',
        platform: 'Instagram'
      };

      // First call
      const start1 = Date.now();
      const result1 = await engine.optimizeContent(input);
      const duration1 = Date.now() - start1;

      // Second call should be faster (cached)
      const start2 = Date.now();
      const result2 = await engine.optimizeContent(input);
      const duration2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('ProductionContextualBandit - Core Features', () => {
    it('should manage arms and make selections', async () => {
      const arm = {
        id: 'test-arm-1',
        name: 'Test Strategy',
        parameters: { strategy: 'aggressive' },
        features: [1, 0, 0.5, 0.8],
        createdAt: new Date(),
        version: 'v1.0'
      };

      await bandit.addArm(arm);

      const context: BanditContext = {
        platform: 'TikTok',
        contentType: 'video',
        audienceSegment: 'young-adults',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalEngagement: 100,
        contentLength: 150,
        hasHashtags: true,
        hasThumbnail: true,
        userId: 'test-user'
      };

      const selectedArm = await bandit.selectArm(context);
      expect(selectedArm).toBe('test-arm-1');
    });

    it('should learn from rewards and improve selections', async () => {
      // Add two competing arms
      const arm1 = {
        id: 'arm-1',
        name: 'Strategy 1',
        parameters: {},
        features: [1, 0, 0, 0, 0],
        createdAt: new Date(),
        version: 'v1.0'
      };

      const arm2 = {
        id: 'arm-2',
        name: 'Strategy 2',
        parameters: {},
        features: [0, 1, 0, 0, 0],
        createdAt: new Date(),
        version: 'v1.0'
      };

      await bandit.addArm(arm1);
      await bandit.addArm(arm2);

      const context: BanditContext = {
        platform: 'Instagram',
        contentType: 'image',
        audienceSegment: 'general',
        timeOfDay: 12,
        dayOfWeek: 1,
        historicalEngagement: 50,
        contentLength: 100,
        hasHashtags: true,
        hasThumbnail: false,
        userId: 'test-user'
      };

      // Train the bandit with rewards favoring arm-2
      for (let i = 0; i < 5; i++) {
        await bandit.updateReward({
          armId: 'arm-2',
          context,
          reward: 0.8,
          timestamp: new Date()
        });

        await bandit.updateReward({
          armId: 'arm-1',
          context,
          reward: 0.2,
          timestamp: new Date()
        });
      }

      // After training, selections should favor arm-2
      const selections: string[] = [];
      for (let i = 0; i < 10; i++) {
        selections.push(await bandit.selectArm(context));
      }

      const arm2Count = selections.filter(s => s === 'arm-2').length;
      expect(arm2Count).toBeGreaterThan(2); // Should prefer arm-2
    });

    it('should provide performance metrics', () => {
      const metrics = bandit.getMetrics();
      
      expect(metrics).toHaveProperty('armCount');
      expect(metrics).toHaveProperty('computationTime');
      expect(typeof metrics.armCount).toBe('number');
    });
  });

  describe('ContentOptimizationAgent - Core Features', () => {
    it('should start and stop successfully', async () => {
      await expect(agent.start()).resolves.not.toThrow();
      await expect(agent.stop()).resolves.not.toThrow();
    });

    it('should execute optimization tasks', async () => {
      const task = {
        type: 'optimize_content' as const,
        platform: 'TikTok' as const,
        baseContent: {
          caption: 'Test content for optimization',
          hashtags: ['#test']
        }
      };

      await agent.start();
      await expect(agent.executeTask(task)).resolves.not.toThrow();
      await agent.stop();
    });

    it('should handle model versioning', () => {
      const initialVersion = agent.getModelVersion();
      
      agent.deployModelVersion('v2.1');
      
      const newVersion = agent.getModelVersion();
      expect(newVersion).toBe('v2.1');
      expect(newVersion).not.toBe(initialVersion);
    });

    it('should configure A/B tests', () => {
      const config = {
        arms: ['arm-1', 'arm-2'],
        trafficSplit: [0.5, 0.5],
        duration: 7,
        metrics: ['engagement']
      };

      agent.configureABTest('test-experiment', config);
      
      const results = agent.getABTestResults('test-experiment');
      expect(results).toBeDefined();
      expect(results?.testName).toBe('test-experiment');
    });

    it('should provide bandit performance metrics', () => {
      const metrics = agent.getBanditMetrics();
      expect(metrics).toHaveProperty('armCount');
      
      const armPerformance = agent.getArmPerformance();
      expect(Array.isArray(armPerformance)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work end-to-end without external dependencies', async () => {
      // 1. Optimize content
      const input: ContentOptimizationInput = {
        text: 'End-to-end test content',
        platform: 'Instagram',
        userEngagementData: {
          averageLikes: 75,
          averageComments: 15,
          averageShares: 3,
          clickThroughRate: 0.025
        }
      };

      const optimizationResult = await engine.optimizeContent(input);
      expect(optimizationResult.contentScore).toBeGreaterThan(0);

      // 2. Use agent for strategy selection
      const task = {
        type: 'optimize_content' as const,
        platform: 'Instagram' as const,
        baseContent: {
          caption: optimizationResult.optimizedCaption || input.text,
          hashtags: optimizationResult.suggestedHashtags || []
        }
      };

      await agent.start();
      await agent.executeTask(task);
      await agent.stop();

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Test with empty/invalid input
      const input: ContentOptimizationInput = {
        platform: 'TikTok'
        // Missing text and other data
      };

      const result = await engine.optimizeContent(input);
      expect(result).toBeDefined();
      expect(result.warnings).toBeInstanceOf(Array);

      // Agent should handle invalid tasks
      const invalidTask = {
        type: 'optimize_content' as const,
        platform: 'Instagram' as const,
        baseContent: {
          caption: '',
          hashtags: []
        }
      };

      await agent.start();
      await expect(agent.executeTask(invalidTask)).resolves.not.toThrow();
      await agent.stop();
    });
  });

  describe('Performance and Caching', () => {
    it('should provide metrics and cache statistics', () => {
      const metrics = engine.getMetrics();
      
      expect(metrics).toHaveProperty('computationTime');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(typeof metrics.computationTime).toBe('number');
    });

    it('should reset metrics when requested', () => {
      engine.resetMetrics();
      
      const metrics = engine.getMetrics();
      expect(metrics.computationTime).toBe(0);
      expect(metrics.cacheHits).toBe(0);
    });

    it('should clear cache when requested', () => {
      engine.clearCache();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
});