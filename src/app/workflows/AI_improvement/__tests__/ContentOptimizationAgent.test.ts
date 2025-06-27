import { ContentOptimizationAgent, ContentOptimizationTask } from '../services/agents/ContentOptimizationAgent';
import { aiImprovementService } from '../services/AIImprovementService';
// Platform will be required inside the mock factory
// import { Platform } from '../../deliverables/types/deliverables_types'; 
import { ContentNiche } from '../types/niche_types';

// Mock the AIImprovementService
jest.mock('../services/AIImprovementService', () => {
  const Platform = jest.requireActual('../../deliverables/types/deliverables_types').Platform;
  return {
    aiImprovementService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      updateContentOptimizationPatterns: jest.fn().mockResolvedValue(undefined),
      getContentOptimization: jest.fn().mockResolvedValue({
        sentiment: { sentiment: 'neutral', score: 0, confidence: 0.5, emotions: {}, keywords: [] },
        tone: { tone: 'neutral', confidence: 0.5, characteristics: [] },
        optimization: { originalText: '', optimizedText: '', improvements: ['mock improvement'], expectedEngagementIncrease: 10, platform: Platform.TIKTOK },
        captionVariations: [],
        hashtagRecommendations: [],
        aiSuggestions: [],
      }),
    },
  };
});

describe('ContentOptimizationAgent', () => {
  let agent: ContentOptimizationAgent;
  // Need to import Platform here for use in tests, if not imported at top level
  let PlatformEnum: any; 

  beforeEach(async () => { // Made async for dynamic import
    PlatformEnum = (await import('../../deliverables/types/deliverables_types')).Platform;
    agent = new ContentOptimizationAgent();
    jest.clearAllMocks();
  });

  it('should instantiate correctly', () => {
    expect(agent).toBeInstanceOf(ContentOptimizationAgent);
  });

  it('should start and stop correctly', async () => {
    await agent.start();
    expect(await agent.getStatus()).toBe('idle'); // Starts idle
    await agent.stop();
    expect(await agent.getStatus()).toBe('idle'); // Remains idle when not active
  });

  it('should execute update_optimization_models task', async () => {
    await agent.start();
    const task: ContentOptimizationTask = { type: 'update_optimization_models' };
    await agent.executeTask(task);
    expect(aiImprovementService.updateContentOptimizationPatterns).toHaveBeenCalled();
    expect(await agent.getPerformance()).toBeCloseTo(0.82); // 0.8 initial + 0.02
  });

  it('should execute optimize_content task', async () => {
    await agent.start();
    const task: ContentOptimizationTask = { 
      type: 'optimize_content',
      baseContent: { caption: 'test caption', hashtags: ['#test'] },
      platform: PlatformEnum.TIKTOK, // Use the dynamically imported Platform
      niche: ContentNiche.FITNESS,
    };
    await agent.executeTask(task);
    expect(aiImprovementService.getContentOptimization).toHaveBeenCalledWith(expect.objectContaining({
      caption: 'test caption',
      platform: PlatformEnum.TIKTOK, // Use the dynamically imported Platform
    }));
    expect(await agent.getPerformance()).toBeCloseTo(0.85); // 0.8 initial + 0.05
  });

  it('should handle unknown task type', async () => {
    await agent.start();
    const task = { type: 'unknown_task' } as any;
    await expect(agent.executeTask(task)).rejects.toThrow('Unknown task type: unknown_task');
  });
  
  it('should report active status when busy and idle when not', async () => {
    await agent.start();
    expect(await agent.getStatus()).toBe('idle');
    
    const promise = agent.executeTask({ type: 'update_optimization_models' });
    expect(await agent.getStatus()).toBe('active'); // Should be active immediately after task starts
    await promise;
    expect(await agent.getStatus()).toBe('idle'); // Should be idle after task completes
  });

  it('performance should decrease on task failure', async () => {
    await agent.start();
    // Make a service call fail
    (aiImprovementService.updateContentOptimizationPatterns as jest.Mock).mockRejectedValueOnce(new Error('Service failure'));
    
    const initialPerformance = await agent.getPerformance();
    const task: ContentOptimizationTask = { type: 'update_optimization_models' };
    
    await expect(agent.executeTask(task)).rejects.toThrow('Service failure');
    
    const finalPerformance = await agent.getPerformance();
    expect(finalPerformance).toBeLessThan(initialPerformance);
    expect(finalPerformance).toBeCloseTo(0.7); // 0.8 - 0.1
  });

}); 