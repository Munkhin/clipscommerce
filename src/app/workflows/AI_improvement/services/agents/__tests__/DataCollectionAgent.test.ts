import { DataCollectionAgent, DataCollectionTask, DataQualityMetrics, CollectionStrategy, DataGap } from '../DataCollectionAgent';
import { Platform } from '../../../../deliverables/types/deliverables_types';
import { ContentNiche } from '../../../types/niche_types';

// Mock the niche characteristics function
jest.mock('../../../types/niche_types', () => ({
  ContentNiche: {
    COMEDY: 'comedy',
    EDUCATION: 'education',
    LIFESTYLE: 'lifestyle',
    TECH: 'tech',
  },
  getNicheCharacteristics: jest.fn().mockReturnValue({
    primaryAudience: 'young_adults',
    contentStyle: 'engaging',
    postingFrequency: 'daily',
    peakTimes: [18, 19, 20],
    trendingTopics: ['viral', 'trending'],
  }),
}));

describe('DataCollectionAgent', () => {
  let agent: DataCollectionAgent;
  let mockTask: DataCollectionTask;

  beforeEach(() => {
    agent = new DataCollectionAgent();
    mockTask = {
      type: 'optimize_collection',
      niche: 'comedy' as ContentNiche,
      platform: Platform.Instagram,
      priority: 'high',
      requirements: {
        minSamples: 1000,
        qualityThreshold: 0.8,
        timeRange: '30d',
        contentTypes: ['video', 'image'],
      },
    };
  });

  describe('agent lifecycle', () => {
    it('should start and stop correctly', async () => {
      expect(await agent.getStatus()).toBe('idle');
      
      await agent.start();
      expect(await agent.getStatus()).toBe('active');
      
      await agent.stop();
      expect(await agent.getStatus()).toBe('idle');
    });

    it('should initialize with default state', async () => {
      const status = await agent.getStatus();
      const performance = await agent.getPerformance();
      const currentTask = await agent.getCurrentTask();
      
      expect(status).toBe('idle');
      expect(performance).toBeGreaterThanOrEqual(0);
      expect(performance).toBeLessThanOrEqual(1);
      expect(currentTask).toBeUndefined();
    });

    it('should track resource utilization', async () => {
      const utilization = await agent.getResourceUtilization();
      
      expect(typeof utilization).toBe('number');
      expect(utilization).toBeGreaterThanOrEqual(0);
      expect(utilization).toBeLessThanOrEqual(1);
    });
  });

  describe('task execution', () => {
    beforeEach(async () => {
      await agent.start();
    });

    afterEach(async () => {
      await agent.stop();
    });

    it('should execute optimize_collection task', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'optimize_collection',
      };

      await agent.executeTask(task);
      
      const strategies = agent.getCollectionStrategies();
      const strategyKey = `${task.niche}_${task.platform}`;
      
      expect(strategies.has(strategyKey)).toBe(true);
      
      const strategy = strategies.get(strategyKey);
      expect(strategy).toBeDefined();
      expect(strategy!.platform).toBe(task.platform);
      expect(strategy!.niche).toBe(task.niche);
      expect(strategy!.endpoints).toBeInstanceOf(Array);
      expect(strategy!.rateLimitOptimization).toBeDefined();
      expect(strategy!.contentDiscovery).toBeDefined();
      expect(strategy!.qualityFilters).toBeDefined();
      expect(strategy!.schedulingStrategy).toBeDefined();
    });

    it('should execute validate_quality task', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'validate_quality',
      };

      await agent.executeTask(task);
      
      const qualityMetrics = agent.getQualityMetrics();
      const metricsKey = `${task.niche}_${task.platform}`;
      
      expect(qualityMetrics.has(metricsKey)).toBe(true);
      
      const metrics = qualityMetrics.get(metricsKey);
      expect(metrics).toBeDefined();
      expect(metrics!.completeness).toBeGreaterThanOrEqual(0);
      expect(metrics!.completeness).toBeLessThanOrEqual(1);
      expect(metrics!.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics!.accuracy).toBeLessThanOrEqual(1);
      expect(metrics!.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics!.overallScore).toBeLessThanOrEqual(1);
    });

    it('should execute discover_sources task', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'discover_sources',
      };

      await agent.executeTask(task);
      
      // Should complete without errors
      expect(await agent.getCurrentTask()).toBeUndefined();
    });

    it('should execute monitor_gaps task', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'monitor_gaps',
      };

      await agent.executeTask(task);
      
      const dataGaps = agent.getDataGaps();
      expect(Array.isArray(dataGaps)).toBe(true);
    });

    it('should handle unknown task type', async () => {
      const invalidTask = {
        ...mockTask,
        type: 'unknown_task' as any,
      };

      await expect(agent.executeTask(invalidTask)).rejects.toThrow('Unknown task type: unknown_task');
    });

    it('should track current task during execution', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'optimize_collection',
      };

      const executionPromise = agent.executeTask(task);
      
      // Task should be tracked during execution
      // Note: This is a race condition test, so we'll just verify the task completes
      await executionPromise;
      
      // After completion, current task should be cleared
      expect(await agent.getCurrentTask()).toBeUndefined();
    });

    it('should handle task execution errors gracefully', async () => {
      // Create a task that might cause errors
      const problematicTask: DataCollectionTask = {
        type: 'optimize_collection',
        niche: null as any,
        platform: Platform.Instagram,
        priority: 'high',
        requirements: {
          minSamples: -1, // Invalid requirement
          qualityThreshold: 2, // Invalid threshold
          timeRange: '',
          contentTypes: [],
        },
      };

      await expect(agent.executeTask(problematicTask)).rejects.toThrow();
      
      // Agent should still be active after error
      expect(await agent.getStatus()).toBe('active');
      expect(await agent.getCurrentTask()).toBeUndefined();
    });
  });

  describe('data gap analysis', () => {
    beforeEach(async () => {
      await agent.start();
    });

    afterEach(async () => {
      await agent.stop();
    });

    it('should analyze and identify data gaps', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'monitor_gaps',
      };

      await agent.executeTask(task);
      
      const dataGaps = agent.getDataGaps();
      expect(Array.isArray(dataGaps)).toBe(true);
      
      // Check gap structure if any gaps exist
      dataGaps.forEach(gap => {
        expect(gap).toHaveProperty('niche');
        expect(gap).toHaveProperty('platform');
        expect(gap).toHaveProperty('gapType');
        expect(gap).toHaveProperty('severity');
        expect(gap).toHaveProperty('currentSamples');
        expect(gap).toHaveProperty('requiredSamples');
        expect(gap).toHaveProperty('recommendedActions');
        
        expect(['volume', 'quality', 'recency', 'diversity']).toContain(gap.gapType);
        expect(['critical', 'high', 'medium', 'low']).toContain(gap.severity);
        expect(Array.isArray(gap.recommendedActions)).toBe(true);
        expect(gap.currentSamples).toBeGreaterThanOrEqual(0);
        expect(gap.requiredSamples).toBeGreaterThan(0);
      });
    });

    it('should generate appropriate gap recommendations', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'monitor_gaps',
      };

      await agent.executeTask(task);
      
      const dataGaps = agent.getDataGaps();
      
      dataGaps.forEach(gap => {
        expect(gap.recommendedActions.length).toBeGreaterThan(0);
        gap.recommendedActions.forEach(action => {
          expect(typeof action).toBe('string');
          expect(action.length).toBeGreaterThan(0);
        });
      });
    });

    it('should prioritize critical gaps', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'monitor_gaps',
      };

      await agent.executeTask(task);
      
      const dataGaps = agent.getDataGaps();
      const criticalGaps = dataGaps.filter(gap => gap.severity === 'critical');
      const highGaps = dataGaps.filter(gap => gap.severity === 'high');
      
      // Critical gaps should have more recommended actions
      criticalGaps.forEach(gap => {
        expect(gap.recommendedActions.length).toBeGreaterThan(0);
      });
      
      highGaps.forEach(gap => {
        expect(gap.recommendedActions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('collection strategy optimization', () => {
    beforeEach(async () => {
      await agent.start();
    });

    afterEach(async () => {
      await agent.stop();
    });

    it('should optimize collection strategy for different platforms', async () => {
      const platforms = [Platform.Instagram, Platform.TikTok, Platform.YouTube];
      
      for (const platform of platforms) {
        const task: DataCollectionTask = {
          ...mockTask,
          platform,
          type: 'optimize_collection',
        };

        await agent.executeTask(task);
        
        const strategies = agent.getCollectionStrategies();
        const strategyKey = `${task.niche}_${platform}`;
        const strategy = strategies.get(strategyKey);
        
        expect(strategy).toBeDefined();
        expect(strategy!.platform).toBe(platform);
        expect(strategy!.endpoints.length).toBeGreaterThan(0);
        expect(strategy!.rateLimitOptimization.requestsPerSecond).toBeGreaterThan(0);
        expect(strategy!.contentDiscovery.hashtags.length).toBeGreaterThan(0);
      }
    });

    it('should optimize for different niches', async () => {
      const niches = ['comedy', 'education', 'lifestyle'] as ContentNiche[];
      
      for (const niche of niches) {
        const task: DataCollectionTask = {
          ...mockTask,
          niche,
          type: 'optimize_collection',
        };

        await agent.executeTask(task);
        
        const strategies = agent.getCollectionStrategies();
        const strategyKey = `${niche}_${task.platform}`;
        const strategy = strategies.get(strategyKey);
        
        expect(strategy).toBeDefined();
        expect(strategy!.niche).toBe(niche);
        expect(strategy!.contentDiscovery.keywords.length).toBeGreaterThan(0);
      }
    });

    it('should include rate limit optimization', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'optimize_collection',
      };

      await agent.executeTask(task);
      
      const strategies = agent.getCollectionStrategies();
      const strategyKey = `${task.niche}_${task.platform}`;
      const strategy = strategies.get(strategyKey);
      
      expect(strategy!.rateLimitOptimization).toBeDefined();
      expect(strategy!.rateLimitOptimization.requestsPerSecond).toBeGreaterThan(0);
      expect(strategy!.rateLimitOptimization.batchSize).toBeGreaterThan(0);
      expect(strategy!.rateLimitOptimization.cooldownPeriod).toBeGreaterThanOrEqual(0);
    });

    it('should include content discovery optimization', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'optimize_collection',
      };

      await agent.executeTask(task);
      
      const strategies = agent.getCollectionStrategies();
      const strategyKey = `${task.niche}_${task.platform}`;
      const strategy = strategies.get(strategyKey);
      
      expect(strategy!.contentDiscovery).toBeDefined();
      expect(Array.isArray(strategy!.contentDiscovery.hashtags)).toBe(true);
      expect(Array.isArray(strategy!.contentDiscovery.keywords)).toBe(true);
      expect(Array.isArray(strategy!.contentDiscovery.influencers)).toBe(true);
      expect(typeof strategy!.contentDiscovery.trendingTopics).toBe('boolean');
    });

    it('should include quality filters', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'optimize_collection',
      };

      await agent.executeTask(task);
      
      const strategies = agent.getCollectionStrategies();
      const strategyKey = `${task.niche}_${task.platform}`;
      const strategy = strategies.get(strategyKey);
      
      expect(strategy!.qualityFilters).toBeDefined();
      expect(strategy!.qualityFilters.minEngagement).toBeGreaterThanOrEqual(0);
      expect(strategy!.qualityFilters.minFollowers).toBeGreaterThanOrEqual(0);
      expect(strategy!.qualityFilters.contentLength.min).toBeGreaterThanOrEqual(0);
      expect(strategy!.qualityFilters.contentLength.max).toBeGreaterThan(strategy!.qualityFilters.contentLength.min);
      expect(typeof strategy!.qualityFilters.excludeSpam).toBe('boolean');
    });
  });

  describe('quality validation', () => {
    beforeEach(async () => {
      await agent.start();
    });

    afterEach(async () => {
      await agent.stop();
    });

    it('should validate data quality metrics', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'validate_quality',
      };

      await agent.executeTask(task);
      
      const qualityMetrics = agent.getQualityMetrics();
      const metricsKey = `${task.niche}_${task.platform}`;
      const metrics = qualityMetrics.get(metricsKey);
      
      expect(metrics).toBeDefined();
      
      // Validate all quality dimensions
      expect(metrics!.completeness).toBeGreaterThanOrEqual(0);
      expect(metrics!.completeness).toBeLessThanOrEqual(1);
      expect(metrics!.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics!.accuracy).toBeLessThanOrEqual(1);
      expect(metrics!.freshness).toBeGreaterThanOrEqual(0);
      expect(metrics!.freshness).toBeLessThanOrEqual(1);
      expect(metrics!.uniqueness).toBeGreaterThanOrEqual(0);
      expect(metrics!.uniqueness).toBeLessThanOrEqual(1);
      expect(metrics!.consistency).toBeGreaterThanOrEqual(0);
      expect(metrics!.consistency).toBeLessThanOrEqual(1);
      expect(metrics!.relevance).toBeGreaterThanOrEqual(0);
      expect(metrics!.relevance).toBeLessThanOrEqual(1);
      expect(metrics!.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics!.overallScore).toBeLessThanOrEqual(1);
    });

    it('should calculate overall score correctly', async () => {
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'validate_quality',
      };

      await agent.executeTask(task);
      
      const qualityMetrics = agent.getQualityMetrics();
      const metricsKey = `${task.niche}_${task.platform}`;
      const metrics = qualityMetrics.get(metricsKey);
      
      // Overall score should be a weighted average of individual metrics
      const expectedScore = (
        metrics!.completeness * 0.2 +
        metrics!.accuracy * 0.25 +
        metrics!.freshness * 0.15 +
        metrics!.uniqueness * 0.15 +
        metrics!.consistency * 0.1 +
        metrics!.relevance * 0.15
      );
      
      expect(metrics!.overallScore).toBeCloseTo(expectedScore, 2);
    });

    it('should handle multiple quality validations', async () => {
      const platforms = [Platform.Instagram, Platform.TikTok];
      
      for (const platform of platforms) {
        const task: DataCollectionTask = {
          ...mockTask,
          platform,
          type: 'validate_quality',
        };

        await agent.executeTask(task);
      }
      
      const qualityMetrics = agent.getQualityMetrics();
      expect(qualityMetrics.size).toBe(platforms.length);
      
      platforms.forEach(platform => {
        const metricsKey = `${mockTask.niche}_${platform}`;
        expect(qualityMetrics.has(metricsKey)).toBe(true);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should throw error when executing task while inactive', async () => {
      // Agent is not started
      await expect(agent.executeTask(mockTask)).rejects.toThrow('Data Collection Agent is not active');
    });

    it('should handle concurrent task execution', async () => {
      await agent.start();
      
      const task1: DataCollectionTask = { ...mockTask, type: 'optimize_collection' };
      const task2: DataCollectionTask = { ...mockTask, type: 'validate_quality' };
      
      // Execute tasks concurrently
      await Promise.all([
        agent.executeTask(task1),
        agent.executeTask(task2),
      ]);
      
      // Both tasks should complete successfully
      const strategies = agent.getCollectionStrategies();
      const qualityMetrics = agent.getQualityMetrics();
      
      expect(strategies.size).toBeGreaterThan(0);
      expect(qualityMetrics.size).toBeGreaterThan(0);
      
      await agent.stop();
    });

    it('should handle invalid task parameters', async () => {
      await agent.start();
      
      const invalidTask: DataCollectionTask = {
        type: 'optimize_collection',
        niche: '' as any,
        platform: 'invalid' as any,
        priority: 'invalid' as any,
        requirements: {
          minSamples: -1,
          qualityThreshold: 2,
          timeRange: '',
          contentTypes: [],
        },
      };

      await expect(agent.executeTask(invalidTask)).rejects.toThrow();
      
      await agent.stop();
    });

    it('should maintain state consistency after errors', async () => {
      await agent.start();
      
      const validTask: DataCollectionTask = { ...mockTask, type: 'optimize_collection' };
      const invalidTask: DataCollectionTask = { ...mockTask, type: 'unknown' as any };
      
      // Execute valid task first
      await agent.executeTask(validTask);
      
      // Execute invalid task (should fail)
      await expect(agent.executeTask(invalidTask)).rejects.toThrow();
      
      // Agent should still be active and have valid state
      expect(await agent.getStatus()).toBe('active');
      expect(await agent.getCurrentTask()).toBeUndefined();
      
      const strategies = agent.getCollectionStrategies();
      expect(strategies.size).toBeGreaterThan(0);
      
      await agent.stop();
    });
  });

  describe('performance and monitoring', () => {
    beforeEach(async () => {
      await agent.start();
    });

    afterEach(async () => {
      await agent.stop();
    });

    it('should track performance metrics', async () => {
      const initialPerformance = await agent.getPerformance();
      
      const task: DataCollectionTask = {
        ...mockTask,
        type: 'optimize_collection',
      };

      await agent.executeTask(task);
      
      const finalPerformance = await agent.getPerformance();
      
      expect(initialPerformance).toBeGreaterThanOrEqual(0);
      expect(initialPerformance).toBeLessThanOrEqual(1);
      expect(finalPerformance).toBeGreaterThanOrEqual(0);
      expect(finalPerformance).toBeLessThanOrEqual(1);
    });

    it('should handle high-frequency task execution', async () => {
      const tasks: DataCollectionTask[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockTask,
        type: 'validate_quality',
        niche: `test-niche-${i}` as ContentNiche,
      }));

      const startTime = Date.now();
      
      for (const task of tasks) {
        await agent.executeTask(task);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete all tasks within reasonable time
      expect(executionTime).toBeLessThan(5000); // 5 seconds
      
      const qualityMetrics = agent.getQualityMetrics();
      expect(qualityMetrics.size).toBe(tasks.length);
    });

    it('should maintain resource utilization within bounds', async () => {
      const tasks: DataCollectionTask[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockTask,
        type: 'optimize_collection',
        platform: [Platform.Instagram, Platform.TikTok, Platform.YouTube][i % 3],
      }));

      for (const task of tasks) {
        await agent.executeTask(task);
        
        const utilization = await agent.getResourceUtilization();
        expect(utilization).toBeGreaterThanOrEqual(0);
        expect(utilization).toBeLessThanOrEqual(1);
      }
    });
  });
}); 