import { ABTestingAgent, ABTestingTask } from '../services/agents/ABTestingAgent';
import { aiImprovementService } from '../services/AIImprovementService';
import { Platform, Experiment, ExperimentVariant, ExperimentAnalysis, ExperimentResult } from '../functions/abTesting';
import { ContentNiche } from '../types/niche_types';

// Mock the AIImprovementService for A/B testing related functions
let mockExperimentCounter = 0;
jest.mock('../services/AIImprovementService', () => ({
  aiImprovementService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    createABTest: jest.fn().mockImplementation((request) => {
      mockExperimentCounter++;
      return Promise.resolve({
        experiment: {
          id: `exp_mock_${mockExperimentCounter}`,
          name: request.name,
          description: request.description,
          platform: request.platform,
          status: 'draft',
          variants: request.variationType === 'caption' ? [
              { id: 'v1', name: 'Original', description: 'Original', config: {}, weight: 50 }, 
              { id: 'v2', name: 'Optimized', description: 'Optimized', config: {}, weight: 50 }
          ] : [],
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          targetMetric: request.targetMetric,
          minimumSampleSize: 100,
          confidenceLevel: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: request.userId,
        } as Experiment,
        variants: [],
        assignmentInstructions: 'Assign users using assignVariant()',
      });
    }),
    analyzeABTest: jest.fn().mockImplementation((experimentId) => Promise.resolve({
      analysis: {
        experimentId,
        status: 'insufficient_data',
        results: [] as ExperimentResult[],
        confidenceLevel: 0.95,
        recommendations: ['Collect more data'],
        analysisDate: new Date(),
      } as ExperimentAnalysis,
      insights: ['Needs more data'],
      nextSteps: ['Continue running'],
    })),
    // Add other mocks if ContentOptimizationAgent was calling them, but ABTestingAgent doesn't seem to.
  },
}));

describe('ABTestingAgent', () => {
  let agent: ABTestingAgent;

  beforeEach(() => {
    agent = new ABTestingAgent();
    mockExperimentCounter = 0; // Reset counter for each test
    jest.clearAllMocks();
  });

  it('should instantiate correctly', () => {
    expect(agent).toBeInstanceOf(ABTestingAgent);
  });

  it('should start and stop correctly', async () => {
    await agent.start();
    expect(await agent.getStatus()).toBe('idle');
    await agent.stop();
    expect(await agent.getStatus()).toBe('idle');
  });

  it('should execute create_experiment task', async () => {
    await agent.start();
    const task: ABTestingTask = {
      type: 'create_experiment',
      experimentDetails: {
        name: 'Test Experiment',
        description: 'A test A/B experiment',
        platform: Platform.TIKTOK,
        baseContent: { caption: 'Hello', hashtags: ['#world'] },
        variationType: 'caption',
        targetMetric: 'engagementRate',
        duration: 7,
        userId: 'testUser',
      },
    };
    const result = await agent.executeTask(task);
    expect(aiImprovementService.createABTest).toHaveBeenCalled();
    expect(result).toHaveProperty('id', 'exp_mock_1');
    expect((await agent.getActiveExperiments()).length).toBe(1);
  });

  it('should execute analyze_experiment task', async () => {
    await agent.start();
    // First, create an experiment to analyze
    const createTask: ABTestingTask = {
      type: 'create_experiment',
      experimentDetails: { name: 'AnalyzeThis', platform: Platform.INSTAGRAM, baseContent: {caption: 'c', hashtags:[]}, variationType: 'caption', targetMetric: 'views', userId: 'user1' }
    };
    const createdExp = await agent.executeTask(createTask) as Experiment;

    const task: ABTestingTask = { type: 'analyze_experiment', experimentId: createdExp.id };
    const result = await agent.executeTask(task);
    expect(aiImprovementService.analyzeABTest).toHaveBeenCalledWith(createdExp.id);
    expect(result).toHaveProperty('experimentId', createdExp.id);
    expect(result.status).toBe('insufficient_data');
  });

  it('should execute prioritize_experiments task', async () => {
    await agent.start();
    const task: ABTestingTask = { 
        type: 'prioritize_experiments', 
        parameters: { engagement_focus: true } 
    };
    const result = await agent.executeTask(task);
    expect(result).toBeInstanceOf(Array);
    // Further assertions can be added if the mock logic for prioritization becomes more complex
  });

  it('should handle unknown task type gracefully', async () => {
    await agent.start();
    const task = { type: 'some_unknown_task' } as any;
    await expect(agent.executeTask(task)).rejects.toThrow('Unknown task type: some_unknown_task');
  });
  
  it('performance should decrease on task failure', async () => {
    await agent.start();
    (aiImprovementService.createABTest as jest.Mock).mockRejectedValueOnce(new Error('Service create failure'));
    
    const initialPerformance = await agent.getPerformance();
    const task: ABTestingTask = {
      type: 'create_experiment',
      experimentDetails: { name: 'FailExp', platform: Platform.FACEBOOK, baseContent: {caption:'c', hashtags:[]}, variationType:'caption', targetMetric:'likes', userId:'u2' }
    };
    
    await expect(agent.executeTask(task)).rejects.toThrow('Service create failure');
    
    const finalPerformance = await agent.getPerformance();
    expect(finalPerformance).toBeLessThan(initialPerformance);
    expect(finalPerformance).toBeCloseTo(0.7); // 0.8 - 0.1
  });

  describe('experiment management', () => {
    beforeEach(async () => {
      await agent.start();
    });

    it('should track multiple active experiments', async () => {
      const experiments = [
        {
          name: 'Caption Test 1',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Test 1', hashtags: ['#test1'] },
          variationType: 'caption' as const,
          targetMetric: 'engagementRate' as const,
          duration: 7,
          userId: 'user1',
        },
        {
          name: 'Caption Test 2',
          platform: Platform.INSTAGRAM,
          baseContent: { caption: 'Test 2', hashtags: ['#test2'] },
          variationType: 'caption' as const,
          targetMetric: 'likes' as const,
          duration: 5,
          userId: 'user2',
        },
      ];

      for (const expDetails of experiments) {
        const task: ABTestingTask = {
          type: 'create_experiment',
          experimentDetails: expDetails,
        };
        await agent.executeTask(task);
      }

      const activeExperiments = await agent.getActiveExperiments();
      expect(activeExperiments.length).toBe(2);
      expect(activeExperiments.map(e => e.name)).toContain('Caption Test 1');
      expect(activeExperiments.map(e => e.name)).toContain('Caption Test 2');
    });

    it('should handle different variation types', async () => {
      const variationTypes = ['caption', 'hashtags', 'timing'] as const;
      
      for (const variationType of variationTypes) {
        const task: ABTestingTask = {
          type: 'create_experiment',
          experimentDetails: {
            name: `${variationType} Test`,
            description: `Testing ${variationType} variations`,
            platform: Platform.TIKTOK,
            baseContent: { caption: 'Base content', hashtags: ['#base'] },
            variationType,
            targetMetric: 'engagementRate',
            duration: 7,
            userId: 'testUser',
          },
        };
        
        const result = await agent.executeTask(task);
        expect(result).toHaveProperty('id');
        expect(result.name).toBe(`${variationType} Test`);
      }

      const activeExperiments = await agent.getActiveExperiments();
      expect(activeExperiments.length).toBe(3);
    });

    it('should handle different target metrics', async () => {
      const targetMetrics = ['engagementRate', 'likes', 'comments', 'shares', 'views'] as const;
      
      for (const targetMetric of targetMetrics) {
        const task: ABTestingTask = {
          type: 'create_experiment',
          experimentDetails: {
            name: `${targetMetric} Test`,
            platform: Platform.INSTAGRAM,
            baseContent: { caption: 'Metric test', hashtags: ['#metric'] },
            variationType: 'caption',
            targetMetric,
            duration: 7,
            userId: 'testUser',
          },
        };
        
        const result = await agent.executeTask(task);
        expect(result.targetMetric).toBe(targetMetric);
      }
    });

    it('should handle different platforms consistently', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.LINKEDIN];
      
      for (const platform of platforms) {
        const task: ABTestingTask = {
          type: 'create_experiment',
          experimentDetails: {
            name: `${platform} Test`,
            platform,
            baseContent: { caption: 'Platform test', hashtags: ['#platform'] },
            variationType: 'caption',
            targetMetric: 'engagementRate',
            duration: 7,
            userId: 'testUser',
          },
        };
        
        const result = await agent.executeTask(task);
        expect(result.platform).toBe(platform);
      }
    });
  });

  describe('experiment analysis', () => {
    beforeEach(async () => {
      await agent.start();
    });

    it('should analyze experiments with different statuses', async () => {
      // Mock different analysis results
      (aiImprovementService.analyzeABTest as jest.Mock)
        .mockResolvedValueOnce({
          analysis: {
            experimentId: 'exp1',
            status: 'running',
            results: [],
            confidenceLevel: 0.95,
            recommendations: ['Continue collecting data'],
            analysisDate: new Date(),
          },
          insights: ['Experiment is progressing well'],
          nextSteps: ['Monitor for 3 more days'],
        })
        .mockResolvedValueOnce({
          analysis: {
            experimentId: 'exp2',
            status: 'completed',
            results: [
              {
                variantId: 'v1',
                variantName: 'Original',
                sampleSize: 1000,
                conversionRate: 0.05,
                confidenceInterval: { lower: 0.04, upper: 0.06 },
                isWinner: false,
              },
              {
                variantId: 'v2',
                variantName: 'Optimized',
                sampleSize: 1000,
                conversionRate: 0.07,
                confidenceInterval: { lower: 0.06, upper: 0.08 },
                isWinner: true,
              },
            ],
            confidenceLevel: 0.95,
            recommendations: ['Implement winning variant'],
            analysisDate: new Date(),
          },
          insights: ['Optimized variant shows 40% improvement'],
          nextSteps: ['Deploy winning variant to all users'],
        });

      // Create experiments first
      const createTask1: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Running Experiment',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Running test', hashtags: ['#running'] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: 'user1',
        },
      };
      const exp1 = await agent.executeTask(createTask1) as Experiment;

      const createTask2: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Completed Experiment',
          platform: Platform.INSTAGRAM,
          baseContent: { caption: 'Completed test', hashtags: ['#completed'] },
          variationType: 'caption',
          targetMetric: 'likes',
          duration: 7,
          userId: 'user2',
        },
      };
      const exp2 = await agent.executeTask(createTask2) as Experiment;

      // Analyze running experiment
      const runningAnalysis = await agent.executeTask({
        type: 'analyze_experiment',
        experimentId: exp1.id,
      });
      expect(runningAnalysis.status).toBe('running');
      expect(runningAnalysis.insights).toContain('Experiment is progressing well');

      // Analyze completed experiment
      const completedAnalysis = await agent.executeTask({
        type: 'analyze_experiment',
        experimentId: exp2.id,
      });
      expect(completedAnalysis.status).toBe('completed');
      expect(completedAnalysis.results.length).toBe(2);
      expect(completedAnalysis.results.some(r => r.isWinner)).toBe(true);
    });

    it('should handle analysis errors gracefully', async () => {
      (aiImprovementService.analyzeABTest as jest.Mock).mockRejectedValueOnce(new Error('Analysis service unavailable'));

      const createTask: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Error Test',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Error test', hashtags: ['#error'] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: 'user1',
        },
      };
      const experiment = await agent.executeTask(createTask) as Experiment;

      await expect(agent.executeTask({
        type: 'analyze_experiment',
        experimentId: experiment.id,
      })).rejects.toThrow('Analysis service unavailable');
    });

    it('should analyze non-existent experiment gracefully', async () => {
      await expect(agent.executeTask({
        type: 'analyze_experiment',
        experimentId: 'non-existent-id',
      })).rejects.toThrow();
    });
  });

  describe('experiment prioritization', () => {
    beforeEach(async () => {
      await agent.start();
    });

    it('should prioritize experiments based on different criteria', async () => {
      const prioritizationCriteria = [
        { engagement_focus: true },
        { conversion_focus: true },
        { revenue_focus: true },
        { user_retention_focus: true },
      ];

      for (const criteria of prioritizationCriteria) {
        const task: ABTestingTask = {
          type: 'prioritize_experiments',
          parameters: criteria,
        };
        
        const result = await agent.executeTask(task);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle empty experiment list in prioritization', async () => {
      const task: ABTestingTask = {
        type: 'prioritize_experiments',
        parameters: { engagement_focus: true },
      };
      
      const result = await agent.executeTask(task);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should prioritize experiments with multiple active experiments', async () => {
      // Create multiple experiments first
      const experiments = [
        { name: 'High Priority', targetMetric: 'engagementRate' as const },
        { name: 'Medium Priority', targetMetric: 'likes' as const },
        { name: 'Low Priority', targetMetric: 'views' as const },
      ];

      for (const exp of experiments) {
        const createTask: ABTestingTask = {
          type: 'create_experiment',
          experimentDetails: {
            name: exp.name,
            platform: Platform.TIKTOK,
            baseContent: { caption: 'Priority test', hashtags: ['#priority'] },
            variationType: 'caption',
            targetMetric: exp.targetMetric,
            duration: 7,
            userId: 'testUser',
          },
        };
        await agent.executeTask(createTask);
      }

      const prioritizationTask: ABTestingTask = {
        type: 'prioritize_experiments',
        parameters: { engagement_focus: true },
      };
      
      const result = await agent.executeTask(prioritizationTask);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('performance and resource management', () => {
    beforeEach(async () => {
      await agent.start();
    });

    it('should maintain performance under high load', async () => {
      const tasks: ABTestingTask[] = Array.from({ length: 20 }, (_, i) => ({
        type: 'create_experiment',
        experimentDetails: {
          name: `Load Test ${i}`,
          platform: Platform.TIKTOK,
          baseContent: { caption: `Load test ${i}`, hashtags: [`#load${i}`] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: `user${i}`,
        },
      }));

      const startTime = Date.now();
      
      for (const task of tasks) {
        await agent.executeTask(task);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should handle all tasks within reasonable time
      expect(executionTime).toBeLessThan(10000); // 10 seconds
      
      const activeExperiments = await agent.getActiveExperiments();
      expect(activeExperiments.length).toBe(20);
    });

    it('should handle concurrent task execution', async () => {
      const concurrentTasks: ABTestingTask[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'create_experiment',
        experimentDetails: {
          name: `Concurrent Test ${i}`,
          platform: Platform.INSTAGRAM,
          baseContent: { caption: `Concurrent test ${i}`, hashtags: [`#concurrent${i}`] },
          variationType: 'caption',
          targetMetric: 'likes',
          duration: 7,
          userId: `user${i}`,
        },
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        concurrentTasks.map(task => agent.executeTask(task))
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(results.length).toBe(5);
      expect(executionTime).toBeLessThan(5000); // 5 seconds
      
      results.forEach((result, index) => {
        expect(result).toHaveProperty('id');
        expect(result.name).toBe(`Concurrent Test ${index}`);
      });
    });

    it('should track resource utilization', async () => {
      const initialUtilization = await agent.getResourceUtilization();
      expect(initialUtilization).toBeGreaterThanOrEqual(0);
      expect(initialUtilization).toBeLessThanOrEqual(1);

      // Execute some tasks to increase utilization
      const task: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Resource Test',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Resource test', hashtags: ['#resource'] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: 'testUser',
        },
      };
      
      await agent.executeTask(task);
      
      const finalUtilization = await agent.getResourceUtilization();
      expect(finalUtilization).toBeGreaterThanOrEqual(0);
      expect(finalUtilization).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling and edge cases', () => {
    beforeEach(async () => {
      await agent.start();
    });

    it('should handle invalid experiment details', async () => {
      const invalidTask: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: '', // Empty name
          platform: 'invalid-platform' as Platform,
          baseContent: { caption: '', hashtags: [] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: -1, // Invalid duration
          userId: '',
        },
      };

      // Should handle gracefully (implementation dependent)
      try {
        await agent.executeTask(invalidTask);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle service unavailability', async () => {
      (aiImprovementService.createABTest as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const task: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Service Test',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Service test', hashtags: ['#service'] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: 'testUser',
        },
      };

      await expect(agent.executeTask(task)).rejects.toThrow('Service unavailable');
    });

    it('should handle malformed task data', async () => {
      const malformedTask = {
        type: 'create_experiment',
        // Missing experimentDetails
      } as ABTestingTask;

      await expect(agent.executeTask(malformedTask)).rejects.toThrow();
    });

    it('should maintain state consistency after errors', async () => {
      const initialExperimentCount = (await agent.getActiveExperiments()).length;
      
      // Cause an error
      (aiImprovementService.createABTest as jest.Mock).mockRejectedValueOnce(new Error('Temporary failure'));
      
      const failingTask: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Failing Test',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Failing test', hashtags: ['#fail'] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: 'testUser',
        },
      };

      try {
        await agent.executeTask(failingTask);
      } catch (error) {
        // Expected to fail
      }

      // State should remain consistent
      const finalExperimentCount = (await agent.getActiveExperiments()).length;
      expect(finalExperimentCount).toBe(initialExperimentCount);

      // Should still be able to execute successful tasks
      (aiImprovementService.createABTest as jest.Mock).mockResolvedValueOnce({
        experiment: {
          id: 'exp_recovery_123',
          name: 'Recovery Test',
          platform: Platform.TIKTOK,
          status: 'draft',
        },
        variants: [],
        assignmentInstructions: 'Recovery test',
      });

      const successTask: ABTestingTask = {
        type: 'create_experiment',
        experimentDetails: {
          name: 'Recovery Test',
          platform: Platform.TIKTOK,
          baseContent: { caption: 'Recovery test', hashtags: ['#recovery'] },
          variationType: 'caption',
          targetMetric: 'engagementRate',
          duration: 7,
          userId: 'testUser',
        },
      };

      const result = await agent.executeTask(successTask);
      expect(result).toHaveProperty('id', 'exp_recovery_123');
    });
  });

}); 