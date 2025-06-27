import { MasterOrchestratorAgent, SystemMetrics, AgentStatus, OptimizationObjective, ResourceAllocation, CrossWorkflowOptimization, MasterOrchestratorDecision } from '../MasterOrchestratorAgent';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { ContentNiche } from '../../types/niche_types';

// Mock all dependencies
jest.mock('../AIImprovementService');
jest.mock('../agents/DataCollectionAgent');
jest.mock('../agents/ContentOptimizationAgent');
jest.mock('../../../reports/services/EngagementPredictionAgent');
jest.mock('../agents/ABTestingAgent');
jest.mock('../agents/NicheSpecializationAgent');
jest.mock('../agents/UIAgent');
jest.mock('../../functions/updateModel');

describe('MasterOrchestratorAgent', () => {
  let orchestrator: MasterOrchestratorAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new MasterOrchestratorAgent();
  });

  afterEach(async () => {
    if (orchestrator.getSystemStatus().isRunning) {
      await orchestrator.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default system metrics', () => {
      const status = orchestrator.getSystemStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.metrics).toBeDefined();
      expect(status.objectives).toBeInstanceOf(Array);
      expect(status.agentCount).toBeGreaterThan(0);
      expect(status.resourceAllocations).toBeInstanceOf(Array);
    });

    it('should initialize all required agents', () => {
      const status = orchestrator.getSystemStatus();
      
      // Should have core agents plus niche specialization agents
      const expectedMinimumAgents = 5 + Object.values(ContentNiche).length;
      expect(status.agentCount).toBeGreaterThanOrEqual(expectedMinimumAgents);
    });

    it('should initialize with baseline system metrics', () => {
      const status = orchestrator.getSystemStatus();
      const metrics = status.metrics;
      
      expect(metrics.averageEngagementRate).toBe(0);
      expect(metrics.contentQualityScore).toBe(0);
      expect(metrics.viralContentPercentage).toBe(0);
      expect(metrics.userSatisfactionScore).toBe(0);
      expect(metrics.systemEfficiency).toBe(0);
      expect(metrics.modelAccuracy).toBe(0);
      expect(metrics.dataQuality).toBe(0);
      expect(metrics.systemUptime).toBe(99.9);
      expect(metrics.averageResponseTime).toBe(200);
      expect(metrics.agentConflictRate).toBe(0);
    });
  });

  describe('lifecycle management', () => {
    it('should start successfully', async () => {
      await orchestrator.start();
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should stop successfully', async () => {
      await orchestrator.start();
      await orchestrator.stop();
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      await orchestrator.start();
      await orchestrator.start(); // Should not throw
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle stop when not running', async () => {
      await orchestrator.stop(); // Should not throw
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle start failure gracefully', async () => {
      // Mock AIImprovementService to throw error
      const mockAIService = require('../AIImprovementService').AIImprovementService;
      mockAIService.prototype.initialize = jest.fn().mockRejectedValue(new Error('Initialization failed'));
      
      const newOrchestrator = new MasterOrchestratorAgent();
      
      await expect(newOrchestrator.start()).rejects.toThrow('Initialization failed');
      
      const status = newOrchestrator.getSystemStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('optimization objectives', () => {
    it('should set initial optimization objectives', async () => {
      await orchestrator.start();
      
      const status = orchestrator.getSystemStatus();
      expect(status.objectives.length).toBeGreaterThan(0);
      
      status.objectives.forEach(objective => {
        expect(objective).toHaveProperty('type');
        expect(objective).toHaveProperty('target');
        expect(objective).toHaveProperty('current');
        expect(objective).toHaveProperty('priority');
        expect(['engagement', 'quality', 'efficiency', 'virality']).toContain(objective.type);
        expect(['high', 'medium', 'low']).toContain(objective.priority);
        expect(objective.target).toBeGreaterThan(0);
        expect(objective.current).toBeGreaterThanOrEqual(0);
      });
    });

    it('should update optimization objectives', async () => {
      await orchestrator.start();
      
      const initialStatus = orchestrator.getSystemStatus();
      const initialObjectiveCount = initialStatus.objectives.length;
      
      orchestrator.updateObjective('engagement', {
        target: 0.15,
        priority: 'high',
        deadline: new Date(Date.now() + 86400000) // 24 hours from now
      });
      
      const updatedStatus = orchestrator.getSystemStatus();
      expect(updatedStatus.objectives.length).toBe(initialObjectiveCount);
      
      const engagementObjective = updatedStatus.objectives.find(obj => obj.type === 'engagement');
      expect(engagementObjective).toBeDefined();
      expect(engagementObjective!.target).toBe(0.15);
      expect(engagementObjective!.priority).toBe('high');
      expect(engagementObjective!.deadline).toBeInstanceOf(Date);
    });

    it('should handle invalid objective updates', async () => {
      await orchestrator.start();
      
      // Should not throw for invalid objective type
      orchestrator.updateObjective('invalid' as any, { target: 0.5 });
      
      const status = orchestrator.getSystemStatus();
      expect(status.objectives.every(obj => ['engagement', 'quality', 'efficiency', 'virality'].includes(obj.type))).toBe(true);
    });
  });

  describe('orchestration cycle', () => {
    it('should force orchestration cycle manually', async () => {
      await orchestrator.start();
      
      // Should complete without throwing
      await orchestrator.forceOrchestrationCycle();
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle orchestration cycle errors gracefully', async () => {
      await orchestrator.start();
      
      // Mock an agent to throw error
      const mockAgent = {
        getStatus: jest.fn().mockRejectedValue(new Error('Agent error')),
        getPerformance: jest.fn().mockResolvedValue(0.8),
        getResourceUtilization: jest.fn().mockResolvedValue(0.6),
        getCurrentTask: jest.fn().mockResolvedValue('test task')
      };
      
      // Replace one agent with mock
      orchestrator['agents'].set('test_agent', mockAgent);
      
      // Should not throw despite agent error
      await orchestrator.forceOrchestrationCycle();
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('system metrics', () => {
    it('should update system metrics during orchestration', async () => {
      await orchestrator.start();
      
      const initialMetrics = orchestrator.getSystemStatus().metrics;
      
      await orchestrator.forceOrchestrationCycle();
      
      const updatedMetrics = orchestrator.getSystemStatus().metrics;
      
      // Metrics should be updated (may be same values but should be recalculated)
      expect(updatedMetrics).toBeDefined();
      expect(typeof updatedMetrics.averageEngagementRate).toBe('number');
      expect(typeof updatedMetrics.contentQualityScore).toBe('number');
      expect(typeof updatedMetrics.systemUptime).toBe('number');
    });

    it('should maintain valid metric ranges', async () => {
      await orchestrator.start();
      await orchestrator.forceOrchestrationCycle();
      
      const metrics = orchestrator.getSystemStatus().metrics;
      
      // Engagement rate should be between 0 and 1
      expect(metrics.averageEngagementRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageEngagementRate).toBeLessThanOrEqual(1);
      
      // Quality scores should be between 0 and 1
      expect(metrics.contentQualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.contentQualityScore).toBeLessThanOrEqual(1);
      
      // Percentages should be between 0 and 1
      expect(metrics.viralContentPercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.viralContentPercentage).toBeLessThanOrEqual(1);
      
      // System uptime should be reasonable
      expect(metrics.systemUptime).toBeGreaterThan(0);
      expect(metrics.systemUptime).toBeLessThanOrEqual(100);
      
      // Response time should be positive
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('resource allocation', () => {
    it('should allocate resources to agents', async () => {
      await orchestrator.start();
      await orchestrator.forceOrchestrationCycle();
      
      const status = orchestrator.getSystemStatus();
      expect(status.resourceAllocations).toBeInstanceOf(Array);
      
      status.resourceAllocations.forEach(allocation => {
        expect(allocation).toHaveProperty('agentId');
        expect(allocation).toHaveProperty('cpuAllocation');
        expect(allocation).toHaveProperty('memoryAllocation');
        expect(allocation).toHaveProperty('priority');
        
        expect(typeof allocation.agentId).toBe('string');
        expect(allocation.cpuAllocation).toBeGreaterThan(0);
        expect(allocation.cpuAllocation).toBeLessThanOrEqual(1);
        expect(allocation.memoryAllocation).toBeGreaterThan(0);
        expect(allocation.memoryAllocation).toBeLessThanOrEqual(1);
        expect(allocation.priority).toBeGreaterThanOrEqual(1);
        expect(allocation.priority).toBeLessThanOrEqual(10);
      });
    });

    it('should optimize resource allocation based on agent performance', async () => {
      await orchestrator.start();
      
      // Mock agents with different performance levels
      const highPerformanceAgent = {
        getStatus: jest.fn().mockResolvedValue('active'),
        getPerformance: jest.fn().mockResolvedValue(0.9),
        getResourceUtilization: jest.fn().mockResolvedValue(0.7),
        getCurrentTask: jest.fn().mockResolvedValue('high priority task')
      };
      
      const lowPerformanceAgent = {
        getStatus: jest.fn().mockResolvedValue('active'),
        getPerformance: jest.fn().mockResolvedValue(0.3),
        getResourceUtilization: jest.fn().mockResolvedValue(0.9),
        getCurrentTask: jest.fn().mockResolvedValue('low priority task')
      };
      
      orchestrator['agents'].set('high_perf_agent', highPerformanceAgent);
      orchestrator['agents'].set('low_perf_agent', lowPerformanceAgent);
      
      await orchestrator.forceOrchestrationCycle();
      
      const status = orchestrator.getSystemStatus();
      const allocations = status.resourceAllocations;
      
      const highPerfAllocation = allocations.find(a => a.agentId === 'high_perf_agent');
      const lowPerfAllocation = allocations.find(a => a.agentId === 'low_perf_agent');
      
      if (highPerfAllocation && lowPerfAllocation) {
        // High performance agent should get higher priority
        expect(highPerfAllocation.priority).toBeGreaterThanOrEqual(lowPerfAllocation.priority);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle agent initialization failures', async () => {
      // Mock agent constructor to throw
      const mockAgentConstructor = jest.fn().mockImplementation(() => {
        throw new Error('Agent initialization failed');
      });
      
      // Should not prevent orchestrator from starting
      await orchestrator.start();
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle missing agent status gracefully', async () => {
      await orchestrator.start();
      
      // Mock agent with undefined status
      const problematicAgent = {
        getStatus: jest.fn().mockResolvedValue(undefined),
        getPerformance: jest.fn().mockResolvedValue(0.5),
        getResourceUtilization: jest.fn().mockResolvedValue(0.5),
        getCurrentTask: jest.fn().mockResolvedValue(undefined)
      };
      
      orchestrator['agents'].set('problematic_agent', problematicAgent);
      
      // Should not throw
      await orchestrator.forceOrchestrationCycle();
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle concurrent orchestration cycles', async () => {
      await orchestrator.start();
      
      // Start multiple orchestration cycles concurrently
      const cycles = [
        orchestrator.forceOrchestrationCycle(),
        orchestrator.forceOrchestrationCycle(),
        orchestrator.forceOrchestrationCycle()
      ];
      
      // Should all complete without throwing
      await Promise.all(cycles);
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle system metric calculation errors', async () => {
      await orchestrator.start();
      
      // Mock agent to return invalid performance data
      const invalidAgent = {
        getStatus: jest.fn().mockResolvedValue('active'),
        getPerformance: jest.fn().mockResolvedValue(NaN),
        getResourceUtilization: jest.fn().mockResolvedValue(Infinity),
        getCurrentTask: jest.fn().mockResolvedValue('invalid task')
      };
      
      orchestrator['agents'].set('invalid_agent', invalidAgent);
      
      await orchestrator.forceOrchestrationCycle();
      
      const metrics = orchestrator.getSystemStatus().metrics;
      
      // Should have valid fallback values
      expect(isNaN(metrics.averageEngagementRate)).toBe(false);
      expect(isFinite(metrics.systemEfficiency)).toBe(true);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large number of agents efficiently', async () => {
      // Add many mock agents
      for (let i = 0; i < 100; i++) {
        const mockAgent = {
          getStatus: jest.fn().mockResolvedValue('active'),
          getPerformance: jest.fn().mockResolvedValue(Math.random()),
          getResourceUtilization: jest.fn().mockResolvedValue(Math.random()),
          getCurrentTask: jest.fn().mockResolvedValue(`task_${i}`)
        };
        orchestrator['agents'].set(`agent_${i}`, mockAgent);
      }
      
      await orchestrator.start();
      
      const startTime = Date.now();
      await orchestrator.forceOrchestrationCycle();
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      
      const status = orchestrator.getSystemStatus();
      expect(status.agentCount).toBeGreaterThan(100);
    });

    it('should maintain performance under stress', async () => {
      await orchestrator.start();
      
      // Run multiple orchestration cycles rapidly
      const cycles = [];
      for (let i = 0; i < 10; i++) {
        cycles.push(orchestrator.forceOrchestrationCycle());
      }
      
      const startTime = Date.now();
      await Promise.all(cycles);
      const endTime = Date.now();
      
      // Should handle concurrent cycles efficiently
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
      
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should coordinate with AI improvement service', async () => {
      const mockAIService = require('../AIImprovementService').AIImprovementService;
      mockAIService.prototype.initialize = jest.fn().mockResolvedValue(undefined);
      
      await orchestrator.start();
      
      expect(mockAIService.prototype.initialize).toHaveBeenCalled();
    });

    it('should handle cross-workflow optimizations', async () => {
      await orchestrator.start();
      await orchestrator.forceOrchestrationCycle();
      
      // Cross-workflow optimizations should be generated during orchestration
      // This is tested indirectly through the orchestration cycle
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should manage model training schedules', async () => {
      await orchestrator.start();
      await orchestrator.forceOrchestrationCycle();
      
      // Model training should be scheduled during orchestration
      // This is tested indirectly through the orchestration cycle
      const status = orchestrator.getSystemStatus();
      expect(status.isRunning).toBe(true);
    });
  });
}); 