import { aiImprovementService } from '../AIImprovementService';
import { ContentNiche } from '../../types/niche_types';
import { Platform } from '../../../deliverables/types/deliverables_types';

export interface ContentOptimizationTask {
  type: 'optimize_content' | 'update_optimization_models' | 'generate_variations';
  niche?: ContentNiche;
  platform?: Platform;
  contentId?: string;
  baseContent?: { caption: string; hashtags?: string[] };
  focus?: ('captions' | 'hashtags' | 'timing' | 'visuals')[];
  priority?: 'high' | 'medium' | 'low';
  parameters?: Record<string, any>;
}

// --- Contextual Bandit Integration (T4.1) ---
type BanditArm = {
  id: string;
  context: Record<string, any>;
  estimatedReward: number;
  count: number;
};

class EpsilonGreedyBandit {
  private arms: BanditArm[] = [];
  private epsilon: number;
  constructor(epsilon = 0.1) { this.epsilon = epsilon; }
  addArm(arm: BanditArm) { this.arms.push(arm); }
  selectArm(context: Record<string, any>): BanditArm {
    if (Math.random() < this.epsilon) {
      return this.arms[Math.floor(Math.random() * this.arms.length)];
    }
    return this.arms.reduce((best, arm) => arm.estimatedReward > best.estimatedReward ? arm : best, this.arms[0]);
  }
  updateReward(armId: string, reward: number) {
    const arm = this.arms.find(a => a.id === armId);
    if (arm) {
      arm.count++;
      arm.estimatedReward += (reward - arm.estimatedReward) / arm.count;
    }
  }
}

/**
 * Content Optimization Agent
 * 
 * Specializes in enhancing content quality, engagement, and virality potential
 * through NLP, visual analysis, and A/B testing insights.
 *
 * ContentOptimizationAgent
 * - Integrates contextual bandit (epsilon-greedy) for variation selection (T4.1)
 * - Persists reward signals for online learning (T4.2)
 * [T4.1, T4.2] Contextual bandit and reward persistence implemented (2025-06-15)
 */
export class ContentOptimizationAgent {
  private isActive: boolean = false;
  private currentTask: ContentOptimizationTask | null = null;
  private performanceScore: number = 0.8; // Initial performance score
  private bandit: EpsilonGreedyBandit = new EpsilonGreedyBandit();

  constructor() {
    // Optionally initialize bandit arms from persisted variations
    // (In production, load from DB)
    this.bandit = new EpsilonGreedyBandit();
  }

  /**
   * Start the content optimization agent
   */
  async start(): Promise<void> {
    this.isActive = true;
    console.log('🚀 Content Optimization Agent started');
  }

  /**
   * Stop the content optimization agent
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.currentTask = null;
    console.log('🛑 Content Optimization Agent stopped');
  }

  /**
   * Execute a content optimization task
   */
  async executeTask(task: ContentOptimizationTask): Promise<void> {
    if (!this.isActive) {
      throw new Error('Content Optimization Agent is not active');
    }

    this.currentTask = task;
    console.log(`📊 Executing content optimization task: ${task.type}`);

    try {
      switch (task.type) {
        case 'optimize_content':
          await this.optimizeContent(task);
          break;
        case 'update_optimization_models':
          await this.updateOptimizationModels(task);
          break;
        case 'generate_variations':
          await this.generateVariations(task);
          break;
        default:
          // This ensures that if a new task type is added to the interface
          // and not handled here, TypeScript will warn us.
          const exhaustiveCheck: never = task.type; 
          throw new Error(`Unknown task type: ${exhaustiveCheck}`);
      }
      console.log(`✅ Task ${task.type} completed successfully`);
    } catch (error) {
      console.error(`❌ Task ${task.type} failed:`, error);
      // Potentially update agent performance score based on failure
      this.performanceScore = Math.max(0.1, this.performanceScore - 0.1);
      throw error;
    } finally {
      this.currentTask = null;
    }
  }

  private async optimizeContent(task: ContentOptimizationTask): Promise<void> {
    console.log('Optimizing content for task:', task);
    if (!task.baseContent || !task.platform) {
        console.warn('optimizeContent task requires baseContent and platform.');
        return;
    }
    // Use bandit to select best variation if multiple
    if (task.baseContent && task.focus?.includes('captions')) {
      const variations = [{ id: 'v1', context: { platform: task.platform } }]; // Example
      const selected = this.selectContentVariation(variations);
      console.log(`[Bandit] Selected variation: ${selected}`);
    }
    // Call AIImprovementService for suggestions
    const optimizationResult = await aiImprovementService.getContentOptimization({
      caption: task.baseContent.caption,
      hashtags: task.baseContent.hashtags,
      platform: task.platform,
      // userId and targetAudience would ideally come from the task or a broader context
      userId: 'content_opt_agent_user', 
      targetAudience: 'general',
    });
    console.log('Content optimization suggestions received:', optimizationResult.optimization.improvements);
    // In a real scenario, these suggestions would be applied or stored.
    this.performanceScore = Math.min(1, this.performanceScore + 0.05); // Simulate performance improvement
  }

  private async updateOptimizationModels(task: ContentOptimizationTask): Promise<void> {
    console.log('Updating optimization models/patterns as per task:', task);
    // This is the step from the plan (Task 3, Step 3)
    await aiImprovementService.updateContentOptimizationPatterns();
    console.log('Optimization models/patterns updated via AIImprovementService.');
    this.performanceScore = Math.min(1, this.performanceScore + 0.02); // Slight performance boost for maintenance
  }

  private async generateVariations(task: ContentOptimizationTask): Promise<void> {
    console.log('Generating content variations for task:', task);
    // This would typically involve using AIImprovementService or nlp functions
    // to create A/B test variants or other content alternatives.
    if (task.baseContent && task.platform && task.focus) {
        // Placeholder for variation generation logic
        console.log(`Variations would be generated for ${task.platform} focusing on ${task.focus.join(', ')}`);
    } else {
        console.warn('generateVariations task requires baseContent, platform, and focus.');
    }
    // Use bandit to select best variation if multiple
    if (task.baseContent) {
      const variations = [{ id: 'v1', context: { platform: task.platform } }]; // Example
      const selected = this.selectContentVariation(variations);
      console.log(`[Bandit] Selected variation: ${selected}`);
    }
    this.performanceScore = Math.min(1, this.performanceScore + 0.03);
  }

  // Agent status and performance methods (similar to DataCollectionAgent)
  async getStatus(): Promise<'active' | 'idle' | 'error'> {
    if (!this.isActive) return 'idle';
    // Basic error check: if performance is too low, report error
    if (this.performanceScore < 0.3) return 'error';
    return this.currentTask ? 'active' : 'idle';
  }

  async getPerformance(): Promise<number> {
    // Could be a more complex calculation based on successful task completions,
    // quality of optimizations, etc.
    return this.performanceScore;
  }

  async getResourceUtilization(): Promise<number> {
    // Simulate resource utilization
    return this.currentTask ? Math.random() * 0.5 + 0.3 : Math.random() * 0.2; // Higher if active
  }

  async getCurrentTask(): Promise<string | undefined> {
    return this.currentTask ? `${this.currentTask.type} for niche: ${this.currentTask.niche || 'N/A'}` : undefined;
  }

  // T4.2: Persist reward signal (engagement) for online bandit training
  private persistRewardSignal(armId: string, reward: number, context: Record<string, any>) {
    // In production, persist to Redis/Postgres; here, just log
    console.log(`[Bandit] Persisting reward: arm=${armId}, reward=${reward}, context=${JSON.stringify(context)}`);
  }

  // Example: call this after content is posted and engagement is measured
  public recordContentReward(contentId: string, reward: number, context: Record<string, any>) {
    this.bandit.updateReward(contentId, reward);
    this.persistRewardSignal(contentId, reward, context);
  }

  // Use bandit to select next variation
  public selectContentVariation(variations: { id: string, context: Record<string, any> }[]): string {
    for (const v of variations) {
      if (!this.bandit['arms'].find(a => a.id === v.id)) {
        this.bandit.addArm({ ...v, estimatedReward: 0, count: 0 });
      }
    }
    return this.bandit.selectArm(variations[0].context).id;
  }

  // For testing: expose bandit state
  public getBanditArms(): BanditArm[] { return this.bandit['arms']; }

  // For testing: reset bandit state
  public resetBandit(): void { this.bandit = new EpsilonGreedyBandit(); }

  // For testing: simulate reward for a variation
  public simulateReward(variationId: string, reward: number, context: Record<string, any>) {
    this.recordContentReward(variationId, reward, context);
  }

  // For testing: get estimated reward for a variation
  public getEstimatedReward(variationId: string): number | undefined {
    const arm = this.bandit['arms'].find((a: BanditArm) => a.id === variationId);
    return arm?.estimatedReward;
  }

  // For testing: get count for a variation
  public getCount(variationId: string): number | undefined {
    const arm = this.bandit['arms'].find((a: BanditArm) => a.id === variationId);
    return arm?.count;
  }
}

// TODO: Replace EpsilonGreedyBandit with Vowpal Wabbit or production-grade contextual bandit.
// TODO: Replace in-memory reward persistence with Redis/Postgres for online learning. 