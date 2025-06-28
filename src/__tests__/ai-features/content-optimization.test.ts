/**
 * Comprehensive tests for AI & ML Content Optimization Features
 * 
 * Tests the production-ready implementations:
 * - ContentOptimizationEngine with computer vision
 * - ProductionContextualBandit with Redis persistence
 * - MLModelPersistenceService with versioning
 */

import { ContentOptimizationEngine, ContentOptimizationInput } from '@/app/workflows/data_analysis/engines/ContentOptimizationEngine';
import { ContentOptimizationAgent, ProductionContextualBandit, BanditContext } from '@/app/workflows/AI_improvement/services/agents/ContentOptimizationAgent';
import { MLModelPersistenceService, ModelMetadata } from '@/services/mlModelPersistenceService';

// Mock external dependencies
jest.mock('openai');
jest.mock('ioredis');
jest.mock('pg');

describe('AI & ML Content Optimization Features', () => {
  let engine: ContentOptimizationEngine;
  let agent: ContentOptimizationAgent;
  let bandit: ProductionContextualBandit;
  let persistenceService: MLModelPersistenceService;

  beforeEach(() => {
    // Initialize services with mock configurations
    engine = new ContentOptimizationEngine(
      undefined, // textAnalyzer
      'mock-vision-key',
      'mock-openai-key'
    );
    agent = new ContentOptimizationAgent();
    bandit = new ProductionContextualBandit();
    persistenceService = new MLModelPersistenceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ContentOptimizationEngine', () => {
    describe('Content Optimization with AI', () => {
      it('should optimize content with AI-enhanced captions and hashtags', async () => {
        const input: ContentOptimizationInput = {
          text: 'Check out this amazing product!',
          platform: 'TikTok',
          topic: 'technology',
          userEngagementData: {
            averageLikes: 150,
            averageComments: 25,
            averageShares: 10,
            clickThroughRate: 0.05
          }
        };

        const result = await engine.optimizeContent(input);

        expect(result).toHaveProperty('optimizedCaption');
        expect(result).toHaveProperty('suggestedHashtags');
        expect(result).toHaveProperty('contentScore');
        expect(result).toHaveProperty('engagementPrediction');
        expect(result.suggestedHashtags).toBeInstanceOf(Array);
        expect(result.contentScore).toBeGreaterThan(0);
        expect(result.contentScore).toBeLessThanOrEqual(1);
      });

      it('should handle missing AI keys gracefully with fallback', async () => {
        const engineWithoutKeys = new ContentOptimizationEngine();
        const input: ContentOptimizationInput = {
          text: 'Test content',
          platform: 'Instagram'
        };

        const result = await engineWithoutKeys.optimizeContent(input);

        expect(result.optimizedCaption).toContain('Test content');
        expect(result.suggestedHashtags).toContain('#instagram');
        expect(result.contentScore).toBeGreaterThan(0);
      });

      it('should generate platform-specific warnings', async () => {
        const input: ContentOptimizationInput = {
          text: 'A'.repeat(400), // Very long caption
          platform: 'TikTok',
          currentHashtags: new Array(35).fill('#tag') // Too many hashtags
        };

        const result = await engine.optimizeContent(input);

        expect(result.warnings).toContain('Caption exceeds TikTok character limit of 300');
        expect(result.warnings).toContain('Too many hashtags may appear spammy');
      });
    });

    describe('Thumbnail Analysis with Computer Vision', () => {
      it('should analyze thumbnail with vision APIs', async () => {
        const imageUrl = 'https://example.com/thumbnail.jpg';
        
        const result = await engine.analyzeThumbnail(imageUrl);

        expect(result).toHaveProperty('feedback');
        expect(result).toHaveProperty('improvementSuggestions');
        expect(result).toHaveProperty('visualElements');
        expect(result).toHaveProperty('platformOptimization');
        expect(result).toHaveProperty('overallScore');
        expect(result).toHaveProperty('processingTimeMs');

        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(1);
        expect(result.visualElements).toHaveProperty('hasText');
        expect(result.visualElements).toHaveProperty('faceDetected');
        expect(result.improvementSuggestions).toBeInstanceOf(Array);
      });

      it('should provide fallback analysis when APIs fail', async () => {
        const engineWithoutKeys = new ContentOptimizationEngine();
        const imageUrl = 'https://example.com/thumbnail.jpg';

        const result = await engineWithoutKeys.analyzeThumbnail(imageUrl);

        expect(result.feedback).toContain('Basic analysis completed');
        expect(result.improvementSuggestions.length).toBeGreaterThan(0);
        expect(result.overallScore).toBe(0.6); // Neutral fallback score
      });

      it('should cache thumbnail analysis results', async () => {
        const imageUrl = 'https://example.com/thumbnail.jpg';

        // First call
        const result1 = await engine.analyzeThumbnail(imageUrl);
        
        // Second call should be faster (cached)
        const start = Date.now();
        const result2 = await engine.analyzeThumbnail(imageUrl);
        const duration = Date.now() - start;

        expect(result1).toEqual(result2);
        expect(duration).toBeLessThan(50); // Should be very fast from cache
      });
    });

    describe('Engagement Prediction', () => {
      it('should predict engagement based on optimization', async () => {
        const input: ContentOptimizationInput = {
          text: 'Great content here!',
          platform: 'Instagram',
          userEngagementData: {
            averageLikes: 100,
            averageComments: 20,
            averageShares: 5,
            clickThroughRate: 0.03
          }
        };

        const result = await engine.optimizeContent(input);

        expect(result.engagementPrediction).toBeDefined();
        expect(result.engagementPrediction.predictedLikes).toBeGreaterThan(0);
        expect(result.engagementPrediction.confidenceScore).toBeGreaterThan(0);
        expect(result.engagementPrediction.confidenceScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('ProductionContextualBandit', () => {
    describe('Arm Management', () => {
      it('should add and select arms correctly', async () => {
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

      it('should update rewards and improve selection over time', async () => {
        // Add two arms
        const arm1 = {
          id: 'arm-1',
          name: 'Strategy 1',
          parameters: {},
          features: [1, 0],
          createdAt: new Date(),
          version: 'v1.0'
        };

        const arm2 = {
          id: 'arm-2',
          name: 'Strategy 2',
          parameters: {},
          features: [0, 1],
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

        // Simulate reward feedback favoring arm-2
        for (let i = 0; i < 10; i++) {
          const reward = {
            armId: 'arm-2',
            context,
            reward: 0.8, // High reward
            timestamp: new Date()
          };
          await bandit.updateReward(reward);
        }

        // Give poor rewards to arm-1
        for (let i = 0; i < 10; i++) {
          const reward = {
            armId: 'arm-1',
            context,
            reward: 0.2, // Low reward
            timestamp: new Date()
          };
          await bandit.updateReward(reward);
        }

        // After training, arm-2 should be selected more often
        const selections = [];
        for (let i = 0; i < 20; i++) {
          selections.push(await bandit.selectArm(context));
        }

        const arm2Selections = selections.filter(s => s === 'arm-2').length;
        expect(arm2Selections).toBeGreaterThan(10); // Should favor arm-2
      });
    });

    describe('Feature Extraction', () => {
      it('should extract consistent feature vectors from context', async () => {
        const context: BanditContext = {
          platform: 'YouTube',
          contentType: 'video',
          audienceSegment: 'tech-enthusiasts',
          timeOfDay: 20,
          dayOfWeek: 5,
          historicalEngagement: 200,
          contentLength: 300,
          hasHashtags: true,
          hasThumbnail: true,
          userId: 'test-user'
        };

        // Extract features (this is internal, but we can test consistency)
        const arm = {
          id: 'test-arm',
          name: 'Test',
          parameters: {},
          features: [1, 0, 0, 0, 0],
          createdAt: new Date(),
          version: 'v1.0'
        };

        await bandit.addArm(arm);
        
        // Multiple selections should be consistent for same context
        const selection1 = await bandit.selectArm(context);
        const selection2 = await bandit.selectArm(context);
        
        expect(selection1).toBe(selection2);
      });
    });
  });

  describe('ContentOptimizationAgent', () => {
    describe('Task Execution', () => {
      it('should execute optimization tasks with bandit selection', async () => {
        const task = {
          type: 'optimize_content' as const,
          platform: 'TikTok' as const,
          baseContent: {
            caption: 'Test content for optimization',
            hashtags: ['#test']
          },
          parameters: {
            userId: 'test-user',
            audienceSegment: 'general'
          }
        };

        await agent.start();
        
        // This should not throw and should use the bandit for selection
        await expect(agent.executeTask(task)).resolves.not.toThrow();
      });

      it('should record content rewards for learning', async () => {
        const context: BanditContext = {
          platform: 'Instagram',
          contentType: 'image',
          audienceSegment: 'general',
          timeOfDay: 15,
          dayOfWeek: 3,
          historicalEngagement: 100,
          contentLength: 150,
          hasHashtags: true,
          hasThumbnail: true,
          userId: 'test-user'
        };

        const engagementMetrics = {
          likes: 200,
          comments: 35,
          shares: 15,
          clickThroughRate: 0.08,
          reachRate: 0.15
        };

        await expect(
          agent.recordContentReward('content-123', engagementMetrics, context, 'test-arm')
        ).resolves.not.toThrow();
      });
    });

    describe('A/B Testing', () => {
      it('should configure and manage A/B tests', () => {
        const testConfig = {
          arms: ['arm-1', 'arm-2'],
          trafficSplit: [0.5, 0.5],
          duration: 7,
          metrics: ['engagement', 'clicks']
        };

        agent.configureABTest('test-experiment', testConfig);

        const results = agent.getABTestResults('test-experiment');
        expect(results).toBeDefined();
        expect(results?.testName).toBe('test-experiment');
        expect(results?.config.arms).toEqual(['arm-1', 'arm-2']);
      });
    });

    describe('Model Versioning', () => {
      it('should handle model version deployment', () => {
        const initialVersion = agent.getModelVersion();
        
        agent.deployModelVersion('v2.0');
        
        const newVersion = agent.getModelVersion();
        expect(newVersion).toBe('v2.0');
        expect(newVersion).not.toBe(initialVersion);
      });
    });
  });

  describe('MLModelPersistenceService', () => {
    describe('Model Management', () => {
      it('should save and load model metadata', async () => {
        const metadata: ModelMetadata = {
          id: 'test-model-1',
          name: 'Test Content Optimizer',
          version: 'v1.0',
          type: 'content_optimization',
          parameters: { learningRate: 0.01, regularization: 0.1 },
          performance: { accuracy: 0.85, f1Score: 0.82 },
          trainingData: {
            samples: 10000,
            features: 20,
            trainingTime: 3600,
            datasetHash: 'abc123'
          },
          deployment: {
            status: 'production',
            deployedAt: new Date(),
            trafficPercentage: 100
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await persistenceService.saveModel(metadata);
        const loaded = await persistenceService.loadModel('test-model-1');

        expect(loaded).toBeDefined();
        expect(loaded?.name).toBe('Test Content Optimizer');
        expect(loaded?.version).toBe('v1.0');
        expect(loaded?.performance.accuracy).toBe(0.85);
      });

      it('should handle model snapshots', async () => {
        const modelData = JSON.stringify({ weights: [1, 2, 3, 4, 5] });
        const metadata: ModelMetadata = {
          id: 'test-model-2',
          name: 'Test Model with Snapshot',
          version: 'v1.0',
          type: 'contextual_bandit',
          parameters: {},
          performance: {},
          trainingData: { samples: 1000, features: 5, trainingTime: 600, datasetHash: 'xyz789' },
          deployment: { status: 'staging' },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await persistenceService.saveModel(metadata, modelData);
        const snapshot = await persistenceService.loadModelSnapshot('test-model-2', 'v1.0');

        expect(snapshot).toBeDefined();
        expect(snapshot?.format).toBe('json');
        expect(snapshot?.snapshot).toBe(modelData);
      });
    });

    describe('Performance Logging', () => {
      it('should log and retrieve performance metrics', async () => {
        const metrics = {
          accuracy: 0.88,
          precision: 0.85,
          recall: 0.90,
          latency: 45
        };

        const context = {
          platform: 'Instagram',
          batchSize: 32
        };

        await persistenceService.logPerformance('test-model-1', metrics, context);
        
        const history = await persistenceService.getPerformanceHistory('test-model-1', 10);
        
        expect(history).toBeInstanceOf(Array);
        expect(history.length).toBeGreaterThan(0);
        if (history.length > 0) {
          expect(history[0].metrics.accuracy).toBe(0.88);
        }
      });
    });

    describe('Model Deployment', () => {
      it('should deploy models to production', async () => {
        const metadata: ModelMetadata = {
          id: 'deploy-test-model',
          name: 'Deployment Test',
          version: 'v1.0',
          type: 'engagement_prediction',
          parameters: {},
          performance: { accuracy: 0.92 },
          trainingData: { samples: 5000, features: 15, trainingTime: 1800, datasetHash: 'deploy123' },
          deployment: { status: 'staging' },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await persistenceService.saveModel(metadata);
        await persistenceService.deployModel('deploy-test-model', 75);

        const deployed = await persistenceService.loadModel('deploy-test-model');
        
        expect(deployed?.deployment.status).toBe('production');
        expect(deployed?.deployment.trafficPercentage).toBe(75);
        expect(deployed?.deployment.deployedAt).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end: optimization -> bandit selection -> persistence', async () => {
      // 1. Optimize content with engine
      const input: ContentOptimizationInput = {
        text: 'Amazing new product launch!',
        platform: 'TikTok',
        userEngagementData: {
          averageLikes: 150,
          averageComments: 25,
          averageShares: 10,
          clickThroughRate: 0.05
        }
      };

      const optimizationResult = await engine.optimizeContent(input);
      expect(optimizationResult.contentScore).toBeGreaterThan(0);

      // 2. Use agent with bandit for strategy selection
      const task = {
        type: 'optimize_content' as const,
        platform: 'TikTok' as const,
        baseContent: {
          caption: optimizationResult.optimizedCaption || input.text,
          hashtags: optimizationResult.suggestedHashtags
        }
      };

      await agent.start();
      await agent.executeTask(task);

      // 3. Save optimization model to persistence
      const modelMetadata: ModelMetadata = {
        id: 'integration-test-model',
        name: 'Integration Test Model',
        version: 'v1.0',
        type: 'content_optimization',
        parameters: { optimizationVersion: '1.0' },
        performance: { 
          contentScore: optimizationResult.contentScore,
          predictionAccuracy: optimizationResult.engagementPrediction?.confidenceScore || 0.7
        },
        trainingData: { samples: 1000, features: 10, trainingTime: 600, datasetHash: 'integration123' },
        deployment: { status: 'production' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await persistenceService.saveModel(modelMetadata);
      const savedModel = await persistenceService.loadModel('integration-test-model');

      expect(savedModel).toBeDefined();
      expect(savedModel?.name).toBe('Integration Test Model');

      await agent.stop();
    });

    it('should handle errors gracefully across the pipeline', async () => {
      // Test with minimal input that might cause issues
      const input: ContentOptimizationInput = {
        platform: 'Instagram'
        // No text, no engagement data
      };

      // Should not throw
      const result = await engine.optimizeContent(input);
      expect(result).toBeDefined();
      expect(result.warnings).toBeInstanceOf(Array);

      // Agent should handle task with missing data
      const task = {
        type: 'optimize_content' as const,
        platform: 'Instagram' as const,
        baseContent: {
          caption: '',
          hashtags: []
        }
      };

      await agent.start();
      await expect(agent.executeTask(task)).resolves.not.toThrow();
      await agent.stop();
    });
  });

  describe('Performance and Metrics', () => {
    it('should track performance metrics', () => {
      const engineMetrics = engine.getMetrics();
      const banditMetrics = bandit.getMetrics();
      const persistenceMetrics = persistenceService.getMetrics();

      expect(engineMetrics).toHaveProperty('computationTime');
      expect(banditMetrics).toHaveProperty('armCount');
      expect(persistenceMetrics).toHaveProperty('computationTime');
    });

    it('should provide cache statistics', () => {
      const stats = engine.getMetrics();
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
    });
  });
});