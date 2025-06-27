import { Platform } from '../../deliverables/types/deliverables_types';
import { ContentNiche } from '../types/niche_types';
import { AIImprovementService } from './AIImprovementService';
import { DataCollectionAgent, DataGap } from './agents/DataCollectionAgent';
import { ContentOptimizationAgent } from './agents/ContentOptimizationAgent';
import { EngagementPredictionAgent } from '../../reports/services/EngagementPredictionAgent';
import { ABTestingAgent } from './agents/ABTestingAgent';
import { NicheSpecializationAgent } from './agents/NicheSpecializationAgent';
import { UIAgent } from './agents/UIAgent';
import { updateModel, evaluateModel } from '../functions/updateModel';

export interface SystemMetrics {
  averageEngagementRate: number;
  contentQualityScore: number;
  viralContentPercentage: number;
  userSatisfactionScore: number;
  systemEfficiency: number;
  modelAccuracy: number;
  dataQuality: number;
  systemUptime: number;
  averageResponseTime: number;
  agentConflictRate: number;
}

export interface AgentStatus {
  agentId: string;
  agentType: string;
  status: 'active' | 'idle' | 'error' | 'training';
  currentTask?: string;
  performance: number;
  resourceUtilization: number;
  lastUpdate: Date;
}

export interface OptimizationObjective {
  type: 'engagement' | 'quality' | 'efficiency' | 'virality';
  target: number;
  current: number;
  priority: 'high' | 'medium' | 'low';
  deadline?: Date;
}

export interface ResourceAllocation {
  agentId: string;
  cpuAllocation: number;
  memoryAllocation: number;
  gpuAllocation?: number;
  priority: number;
}

export interface CrossWorkflowOptimization {
  workflowId: string;
  optimizationType: string;
  expectedImprovement: number;
  implementation: string[];
  risks: string[];
}

export interface MasterOrchestratorDecision {
  timestamp: Date;
  agentTasks: Record<string, any>;
  resourceAllocations: ResourceAllocation[];
  modelTrainingSchedule: Record<string, Date>;
  abTestingPriorities: string[];
  crossWorkflowOptimizations: CrossWorkflowOptimization[];
  alertsAndNotifications: string[];
}

// --- PID Controller for resource allocation (T5.1) ---
class PIDController {
  private integral = 0;
  private previousError = 0;
  constructor(private kp: number, private ki: number, private kd: number) {}
  update(setpoint: number, measured: number, dt: number): number {
    const error = setpoint - measured;
    this.integral += error * dt;
    const derivative = (error - this.previousError) / dt;
    this.previousError = error;
    return this.kp * error + this.ki * this.integral + this.kd * derivative;
  }
}

/**
 * Master Orchestrator Agent - The primary coordinator for all AI improvement activities
 * 
 * This agent manages the entire multi-agent system, making high-level decisions about:
 * - Agent coordination and task assignment
 * - Resource allocation and optimization
 * - Model training schedules
 * - Cross-workflow optimization priorities
 * - System performance monitoring
 */
export class MasterOrchestratorAgent {
  private agents: Map<string, any>;
  private systemMetrics: SystemMetrics;
  private activeObjectives: OptimizationObjective[];
  private resourceAllocations: ResourceAllocation[];
  private aiImprovementService: AIImprovementService;
  private isRunning: boolean = false;
  private cycleInterval: NodeJS.Timeout | null = null;
  private lastEngagementModelTrainTime: Date | null = null;
  private lastContentPatternsUpdateTime: Date | null = null;
  private lastDataGapCheckTime: Date | null = null;

  constructor() {
    this.agents = new Map();
    this.activeObjectives = [];
    this.resourceAllocations = [];
    this.aiImprovementService = new AIImprovementService();
    this.systemMetrics = this.initializeSystemMetrics();
    this.initializeAgents();
  }

  /**
   * Initialize all specialized agents
   */
  private initializeAgents(): void {
    // Initialize core agents
    this.agents.set('data_collector', new DataCollectionAgent());
    this.agents.set('content_optimizer', new ContentOptimizationAgent());
    this.agents.set('engagement_predictor', new EngagementPredictionAgent({} as any));
    this.agents.set('ab_tester', new ABTestingAgent());
    this.agents.set('ui_agent', new UIAgent());

    // Initialize niche specialization agents
    for (const niche of Object.values(ContentNiche)) {
      this.agents.set(`niche_${niche}`, new NicheSpecializationAgent(niche));
    }

    console.log(`Initialized ${this.agents.size} specialized agents`);
  }

  /**
   * Initialize system metrics with baseline values
   */
  private initializeSystemMetrics(): SystemMetrics {
    return {
      averageEngagementRate: 0,
      contentQualityScore: 0,
      viralContentPercentage: 0,
      userSatisfactionScore: 0,
      systemEfficiency: 0,
      modelAccuracy: 0,
      dataQuality: 0,
      systemUptime: 99.9,
      averageResponseTime: 200,
      agentConflictRate: 0,
    };
  }

  /**
   * Start the master orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Master Orchestrator is already running');
      return;
    }

    console.log('🚀 Starting Master AI Improvement Orchestrator...');
    
    try {
      // Initialize AI improvement service
      await this.aiImprovementService.initialize();
      
      // Set optimization objectives
      this.setOptimizationObjectives();
      
      // Start all agents
      await this.startAllAgents();
      
      // Begin orchestration cycle
      this.isRunning = true;
      this.cycleInterval = setInterval(
        () => this.runOrchestrationCycle().catch(console.error),
        30000 // Run every 30 seconds
      );
      
      console.log('✅ Master Orchestrator started successfully');
    } catch (error) {
      console.error('❌ Failed to start Master Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Stop the master orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Master AI Improvement Orchestrator...');
    
    this.isRunning = false;
    
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    
    // Stop all agents
    await this.stopAllAgents();
    
    console.log('✅ Master Orchestrator stopped');
  }

  /**
   * Main orchestration cycle - runs every 30 seconds
   */
  private async runOrchestrationCycle(): Promise<void> {
    // Feedback loop for objectives
    this.updateObjectiveWeights();
    try {
      console.log('🔄 Running orchestration cycle...');

      // 1. Update system metrics
      await this.updateSystemMetrics();

      // 2. Monitor agent statuses
      const agentStatuses = await this.getAgentStatuses();

      // 2.5. Get current data gaps from DataCollectionAgent
      const dataCollector = this.agents.get('data_collector') as DataCollectionAgent;
      let currentDataGaps: DataGap[] = [];
      if (dataCollector && typeof dataCollector.getDataGaps === 'function') {
        currentDataGaps = dataCollector.getDataGaps();
        // Periodically trigger a data gap analysis by the DataCollectionAgent if it's idle
        const dcStatus = agentStatuses.find(s => s.agentId === 'data_collector');
        if (dcStatus && dcStatus.status === 'idle' && (!this.lastDataGapCheckTime || new Date().getTime() - this.lastDataGapCheckTime.getTime() > 6 * 60 * 60 * 1000)) { // e.g. every 6 hours
          console.log('Triggering periodic data gap monitoring for DataCollectionAgent.');
          // This task assignment will be handled more formally in makeOrchestrationDecision if needed
          // For now, let's assume this might prompt the agent internally or through a task.
          // A more direct way: await dataCollector.executeTask({ type: 'monitor_gaps', niche: ContentNiche.FITNESS, platform: Platform.TIKTOK, priority: 'low', requirements: {} as any });
          // However, tasking agents should ideally be part of the decision logic.
          this.lastDataGapCheckTime = new Date(); 
        }
      } else {
        console.warn('DataCollectionAgent not found or getDataGaps method missing.');
      }

      // 3. Make orchestration decision
      const decision = await this.makeOrchestrationDecision(agentStatuses, currentDataGaps);

      // 4. Execute decision
      await this.executeDecision(decision);

      // 5. Log cycle completion
      console.log('✅ Orchestration cycle completed');

    } catch (error) {
      console.error('❌ Error in orchestration cycle:', error);
    }
  }

  /**
   * Generate orchestration decision using GPT-4o
   */
  private async makeOrchestrationDecision(agentStatuses: AgentStatus[], dataGaps: DataGap[]): Promise<MasterOrchestratorDecision> {
    const prompt = this.generateOrchestratorPrompt(agentStatuses);
    
    // In a real implementation, this would call GPT-4o
    // For now, we'll create a mock decision based on current state
    return this.generateMockDecision(agentStatuses, dataGaps);
  }

  /**
   * Generate the master orchestrator prompt
   */
  private generateOrchestratorPrompt(agentStatuses: AgentStatus[]): string {
    return `You are the Master AI Improvement Orchestrator managing a complex social media optimization system. Your role is to coordinate multiple specialized agents to continuously improve performance across all workflows.

CURRENT SYSTEM STATE:
- Active Workflows: [${Array.from(this.agents.keys()).join(', ')}]
- Performance Metrics: ${JSON.stringify(this.systemMetrics, null, 2)}
- Resource Utilization: ${JSON.stringify(this.resourceAllocations, null, 2)}
- Agent Status: ${JSON.stringify(agentStatuses, null, 2)}

OPTIMIZATION OBJECTIVES:
1. Maximize overall engagement rates across all niches (Target: 25% increase)
2. Improve content quality scores by 15% monthly (Current: ${this.systemMetrics.contentQualityScore})
3. Reduce manual intervention by 30% (Current efficiency: ${this.systemMetrics.systemEfficiency}%)
4. Increase viral content production by 25% (Current: ${this.systemMetrics.viralContentPercentage}%)

CURRENT OBJECTIVES STATUS:
${this.activeObjectives.map(obj => 
  `- ${obj.type}: ${obj.current}/${obj.target} (${obj.priority} priority)`
).join('\n')}

Make strategic decisions on:
- Agent task prioritization
- Resource allocation
- Model training schedules
- A/B testing priorities
- Cross-workflow optimizations

Respond with structured JSON containing specific actions for each sub-agent.`;
  }

  /**
   * Generate a mock decision for demonstration
   */
  private generateMockDecision(agentStatuses: AgentStatus[], dataGaps: DataGap[]): MasterOrchestratorDecision {
    const decision: MasterOrchestratorDecision = {
      timestamp: new Date(),
      agentTasks: {},
      resourceAllocations: [],
      modelTrainingSchedule: {},
      abTestingPriorities: [],
      crossWorkflowOptimizations: [],
      alertsAndNotifications: [],
    };

    // Assign tasks based on agent performance
    for (const status of agentStatuses) {
      if (status.status === 'idle' || status.performance < 0.8) {
        decision.agentTasks[status.agentId] = this.generateTaskForAgent(status);
      }
    }

    // Schedule engagement model training based on refined criteria
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let shouldTrainEngagementModel = false;

    if (this.systemMetrics.modelAccuracy < 0.85) {
      decision.alertsAndNotifications.push("Engagement model accuracy below threshold, scheduling training.");
      shouldTrainEngagementModel = true;
    }
    if (this.systemMetrics.averageEngagementRate < 0.05) {
      decision.alertsAndNotifications.push("Average engagement rate below target, scheduling engagement model training.");
      shouldTrainEngagementModel = true;
    }
    if (!this.lastEngagementModelTrainTime || this.lastEngagementModelTrainTime < twentyFourHoursAgo) {
      decision.alertsAndNotifications.push("Engagement model not trained recently, scheduling training.");
      shouldTrainEngagementModel = true;
    }
    // Placeholder for data drift detection
    // if (this.checkForSignificantDataDrift()) {
    //   decision.alertsAndNotifications.push("Significant data drift detected, scheduling engagement model training.");
    //   shouldTrainEngagementModel = true;
    // }

    if (shouldTrainEngagementModel) {
      decision.modelTrainingSchedule['engagement_prediction'] = new Date(Date.now() + 1 * 60 * 1000); // Schedule in 1 minute for quick effect
    }
    
    // Schedule content optimization pattern updates (Task 3.4)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    let shouldUpdateContentPatterns = false;

    if (!this.lastContentPatternsUpdateTime || this.lastContentPatternsUpdateTime < twelveHoursAgo) {
      decision.alertsAndNotifications.push("Content optimization patterns not updated recently, scheduling update.");
      shouldUpdateContentPatterns = true;
    }
    // Placeholder for other triggers like low suggestion performance or large new data volume
    // if (this.systemMetrics.contentSuggestionEffectiveness < 0.7) { // Assuming such a metric exists
    //   decision.alertsAndNotifications.push("Content suggestion effectiveness low, scheduling pattern update.");
    //   shouldUpdateContentPatterns = true;
    // }

    if (shouldUpdateContentPatterns) {
      // Check data quality for content optimization before scheduling update
      const generalDataQualityGood = !dataGaps.some(gap => gap.severity === 'critical' || gap.severity === 'high');
      if (generalDataQualityGood) {
        decision.modelTrainingSchedule['content_optimization_patterns'] = new Date(Date.now() + 2 * 60 * 1000); // Schedule in 2 minutes
      } else {
        decision.alertsAndNotifications.push("Skipping content optimization pattern update due to critical/high data gaps. Prioritizing data collection.");
        // Prioritize data collection tasks
        const dcAgentStatus = agentStatuses.find(s => s.agentType === 'DataCollectionAgent');
        if (dcAgentStatus && dcAgentStatus.status === 'idle') {
            const criticalGap = dataGaps.find(g => g.severity === 'critical' || g.severity === 'high');
            if (criticalGap) {
                 decision.agentTasks[dcAgentStatus.agentId] = {
                    type: 'monitor_gaps',
                    niche: criticalGap.niche, // Focus on the specific gapped niche
                    platform: criticalGap.platform,
                    priority: 'high',
                    requirements: {} // Placeholder for actual requirements
                };
            }
        }
      }
    }

    // Prioritize A/B tests for low-performing areas or specific objectives
    const viralityObjective = this.activeObjectives.find(obj => obj.type === 'virality');
    let abTestDirectives: Record<string, boolean> = {};

    if (this.systemMetrics.averageEngagementRate < 0.05) {
      decision.alertsAndNotifications.push("Low engagement detected, prioritizing engagement-focused A/B tests.");
      abTestDirectives.engagement_focus = true;
    }

    if (viralityObjective && this.systemMetrics.viralContentPercentage < viralityObjective.target) {
      decision.alertsAndNotifications.push("Low virality detected, prioritizing virality-focused A/B tests (e.g., targeting shares/views).");
      abTestDirectives.virality_focus = true; // ABTestingAgent should interpret this to focus on proxy metrics
    }

    if (Object.keys(abTestDirectives).length > 0) {
      // Check if ABTestingAgent is idle or underperforming to assign prioritization task
      const abAgentStatus = agentStatuses.find(s => s.agentType === 'ABTestingAgent');
      if (abAgentStatus && (abAgentStatus.status === 'idle' || abAgentStatus.performance < 0.75)) {
         decision.agentTasks[abAgentStatus.agentId] = { 
            type: 'prioritize_experiments', 
            parameters: abTestDirectives 
        };
      } else if (abAgentStatus) {
        // If agent is busy but directives exist, perhaps log or queue?
        decision.alertsAndNotifications.push("A/B testing directives identified, but agent is currently busy or performing well. Directives will be considered for next suitable task.");
      }
    }
    // Note: The actual generation of experiment opportunities and creation tasks 
    // will be handled in generateTaskForAgent if ABTestingAgent is idle and no specific directives are pushing prioritization.

    // Task Linkage: If ContentOptimizationAgent is tasked, check data gaps for its target niche/platform
    for (const agentId in decision.agentTasks) {
        const task = decision.agentTasks[agentId];
        const agentStatus = agentStatuses.find(s => s.agentId === agentId);

        if (agentStatus && agentStatus.agentType === 'ContentOptimizationAgent' && task.type === 'optimize_content' && task.niche && task.platform) {
            const relevantGap = dataGaps.find(gap => gap.niche === task.niche && gap.platform === task.platform && (gap.severity === 'critical' || gap.severity === 'high'));
            if (relevantGap) {
                decision.alertsAndNotifications.push(`High severity data gap detected for ${task.niche} on ${task.platform}. Prioritizing data collection.`);
                // Task DataCollectionAgent to fill this gap
                const dcAgentStatus = agentStatuses.find(s => s.agentType === 'DataCollectionAgent');
                if (dcAgentStatus && (dcAgentStatus.status === 'idle' || !decision.agentTasks[dcAgentStatus.agentId])) { // Task if idle or not already tasked
                    decision.agentTasks[dcAgentStatus.agentId] = {
                        type: 'optimize_collection', // Or 'monitor_gaps'
                        niche: task.niche,
                        platform: task.platform,
                        priority: 'high',
                        requirements: { minSamples: relevantGap.requiredSamples, qualityThreshold: 0.9, timeRange: '7d', contentTypes: [] } // Example requirements
                    };
                } else if (dcAgentStatus) {
                    decision.alertsAndNotifications.push(`DataCollectionAgent already tasked or not idle. Gap for ${task.niche} on ${task.platform} needs attention.`);
                }
                // Optionally, deprioritize or modify the ContentOptimizationAgent task
                // task.priority = 'low'; 
                // task.parameters = { ...task.parameters, dataGapWarning: true };
            }
        }
    }

    // Generate cross-workflow optimizations
    decision.crossWorkflowOptimizations = this.generateCrossWorkflowOptimizations();

    // Resource allocation optimization
    decision.resourceAllocations = this.optimizeResourceAllocations(agentStatuses);

    return decision;
  }

  /**
   * Execute the orchestration decision
   */
  private async executeDecision(decision: MasterOrchestratorDecision): Promise<void> {
    console.log('📋 Executing orchestration decision:', {
      agentTasks: Object.keys(decision.agentTasks).length,
      resourceAllocations: decision.resourceAllocations.length,
      abTestPriorities: decision.abTestingPriorities.length,
      crossWorkflowOptimizations: decision.crossWorkflowOptimizations.length,
    });

    // Execute agent tasks
    for (const [agentId, task] of Object.entries(decision.agentTasks)) {
      const agent = this.agents.get(agentId);
      if (agent && typeof agent.executeTask === 'function') {
        try {
          await agent.executeTask(task);
        } catch (error) {
          console.error(`Error executing task for agent ${agentId}:`, error);
        }
      }
    }

    // Update resource allocations
    this.resourceAllocations = decision.resourceAllocations;

    // Schedule model training
    for (const [model, schedule] of Object.entries(decision.modelTrainingSchedule)) {
      setTimeout(() => this.trainModel(model), schedule.getTime() - Date.now());
    }

    // Process alerts
    for (const alert of decision.alertsAndNotifications) {
      console.log('🚨 System Alert:', alert);
    }
  }

  /**
   * Update system metrics from all sources
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // In a real implementation, this would aggregate metrics from all workflows
      // For now, we'll simulate metric updates
      this.systemMetrics = {
        ...this.systemMetrics,
        averageEngagementRate: Math.random() * 0.15 + 0.05, // 5-20%
        contentQualityScore: Math.random() * 2 + 7, // 7-9
        viralContentPercentage: Math.random() * 10 + 5, // 5-15%
        userSatisfactionScore: Math.random() * 10 + 85, // 85-95%
        systemEfficiency: Math.random() * 20 + 75, // 75-95%
        modelAccuracy: Math.random() * 0.15 + 0.80, // 80-95%
        dataQuality: Math.random() * 0.05 + 0.95, // 95-100%
        averageResponseTime: Math.random() * 100 + 150, // 150-250ms
      };

      console.log('📊 System metrics updated:', this.systemMetrics);
    } catch (error) {
      console.error('Error updating system metrics:', error);
    }
  }

  /**
   * Get status of all agents
   */
  private async getAgentStatuses(): Promise<AgentStatus[]> {
    const statuses: AgentStatus[] = [];

    for (const [agentId, agent] of this.agents.entries()) {
      try {
        const status: AgentStatus = {
          agentId,
          agentType: agent.constructor.name,
          status: agent.getStatus ? await agent.getStatus() : 'active',
          performance: agent.getPerformance ? await agent.getPerformance() : Math.random(),
          resourceUtilization: agent.getResourceUtilization ? await agent.getResourceUtilization() : Math.random() * 0.8,
          lastUpdate: new Date(),
        };

        if (agent.getCurrentTask) {
          status.currentTask = await agent.getCurrentTask();
        }

        statuses.push(status);
      } catch (error) {
        console.error(`Error getting status for agent ${agentId}:`, error);
        statuses.push({
          agentId,
          agentType: 'unknown',
          status: 'error',
          performance: 0,
          resourceUtilization: 0,
          lastUpdate: new Date(),
        });
      }
    }

    return statuses;
  }

  /**
   * Set optimization objectives
   */
  private setOptimizationObjectives(): void {
    this.activeObjectives = [
      {
        type: 'engagement',
        target: 0.15, // 15% engagement rate
        current: this.systemMetrics.averageEngagementRate,
        priority: 'high',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        type: 'quality',
        target: 8.5,
        current: this.systemMetrics.contentQualityScore,
        priority: 'high',
      },
      {
        type: 'virality',
        target: 15, // 15% viral rate
        current: this.systemMetrics.viralContentPercentage,
        priority: 'medium',
      },
      {
        type: 'efficiency',
        target: 95, // 95% efficiency
        current: this.systemMetrics.systemEfficiency,
        priority: 'medium',
      },
    ];
  }

  /**
   * Generate task for specific agent based on its status
   */
  private generateTaskForAgent(status: AgentStatus): any {
    switch (status.agentType) {
      case 'DataCollectionAgent':
        return {
          type: 'optimize_collection',
          niche: Object.values(ContentNiche)[Math.floor(Math.random() * Object.values(ContentNiche).length)],
          platform: Object.values(Platform)[Math.floor(Math.random() * Object.values(Platform).length)],
          priority: status.performance < 0.5 ? 'high' : 'medium',
        };

      case 'ContentOptimizationAgent':
        return {
          type: 'optimize_content',
          focus: ['captions', 'hashtags', 'timing'][Math.floor(Math.random() * 3)],
          niche: Object.values(ContentNiche)[Math.floor(Math.random() * Object.values(ContentNiche).length)],
        };

      case 'EngagementPredictionAgent':
        return {
          type: 'update_predictions',
          modelType: 'engagement_rate',
          retraining: status.performance < 0.7,
        };

      case 'ABTestingAgent':
        // If MasterOrchestrator already decided to send a prioritize_experiments task with directives,
        // that would have been set in decision.agentTasks[status.agentId] in generateMockDecision.
        // This part handles other scenarios for an idle or underperforming ABTestingAgent.
        const engagementObj = this.activeObjectives.find(obj => obj.type === 'engagement');
        if (engagementObj && this.systemMetrics.averageEngagementRate < engagementObj.target) {
            // Suggest creating a new experiment if engagement is low
            // This implicitly covers leveraging generateExperimentOpportunities
            return {
                type: 'create_experiment',
                priority: 'high',
                experimentDetails: {
                    name: `EngagementBoost_Exp_${Date.now()}`,
                    description: 'Experiment to boost low engagement rate.',
                    platform: Platform.TIKTOK, // Default or determine dynamically
                    baseContent: { caption: 'Current average caption style', hashtags: ['general'] }, // Placeholder
                    variationType: 'caption', // Default or determine dynamically
                    targetMetric: 'engagementRate',
                    duration: 7, 
                    userId: 'MasterOrchestrator',
                },
                parameters: { engagement_focus: true } // Reinforce focus
            };
        }
        // Default task if no specific action identified by generateMockDecision or above logic
        return {
            type: 'manage_experiment_lifecycle', // General check-up/management task
            priority: 'medium',
        };

      default:
        return {
          type: 'status_check',
          timestamp: new Date(),
        };
    }
  }

  /**
   * Generate cross-workflow optimizations
   */
  private generateCrossWorkflowOptimizations(): CrossWorkflowOptimization[] {
    return [
      {
        workflowId: 'data_collection',
        optimizationType: 'api_rate_optimization',
        expectedImprovement: 15,
        implementation: [
          'Implement intelligent rate limiting',
          'Optimize API call batching',
          'Add predictive rate limit management',
        ],
        risks: ['Potential API throttling', 'Increased complexity'],
      },
      {
        workflowId: 'autoposting',
        optimizationType: 'engagement_prediction_integration',
        expectedImprovement: 25,
        implementation: [
          'Integrate real-time engagement predictions',
          'Implement dynamic posting schedule optimization',
          'Add content quality pre-filtering',
        ],
        risks: ['Model dependency', 'Prediction accuracy requirements'],
      },
    ];
  }

  /**
   * Optimize resource allocations based on agent performance
   */
  private optimizeResourceAllocations(agentStatuses: AgentStatus[]): ResourceAllocation[] {
    // PID controller for CPU allocation
    const pid = new PIDController(0.5, 0.1, 0.05);
    const allocations: ResourceAllocation[] = [];
    for (const status of agentStatuses) {
      // Target utilization: 0.7 (70%)
      const setpoint = 0.7;
      const measured = status.resourceUtilization;
      // Assume dt = 1 for simplicity
      const cpu = Math.max(0.1, Math.min(2, 1 + pid.update(setpoint, measured, 1)));
      allocations.push({
        agentId: status.agentId,
        cpuAllocation: cpu,
        memoryAllocation: 1024,
        gpuAllocation: 0,
        priority: this.calculatePriority(status, this.systemMetrics, this.activeObjectives),
      });
    }
    return allocations;
  }

  /**
   * Calculate priority for agent
   */
  private calculatePriority(status: AgentStatus, systemMetrics: SystemMetrics, activeObjectives: OptimizationObjective[]): number {
    let priority: number;

    if (status.status === 'error') {
      priority = 10; // Highest priority for error recovery
    } else if (status.performance < 0.5) {
      priority = 8; // High priority for poor performance
    } else if (status.resourceUtilization > 0.9) {
      priority = 6; // Medium-high for resource constrained
    } else {
      priority = Math.floor(status.performance * 5) + 1; // 1-5 based on performance
    }

    // Boost priority based on system objectives
    for (const objective of activeObjectives) {
      if (objective.priority === 'high') {
        let isCriticalAgentForObjective = false;
        switch (objective.type) {
          case 'engagement':
            if (systemMetrics.averageEngagementRate < objective.target && 
                (status.agentType === 'EngagementPredictionAgent' || status.agentType === 'ABTestingAgent' || status.agentType === 'ContentOptimizationAgent')) {
              isCriticalAgentForObjective = true;
            }
            break;
          case 'quality':
            if (systemMetrics.contentQualityScore < objective.target && 
                (status.agentType === 'ContentOptimizationAgent' || status.agentType === 'DataCollectionAgent')) {
              isCriticalAgentForObjective = true;
            }
            break;
          case 'virality':
            if (systemMetrics.viralContentPercentage < objective.target &&
                (status.agentType === 'ContentOptimizationAgent' || status.agentType === 'ABTestingAgent')) {
              isCriticalAgentForObjective = true;
            }
            break;
          // Add cases for other objective types like 'efficiency' if specific agents are critical
        }

        if (isCriticalAgentForObjective) {
          priority = Math.min(10, priority + 2); // Boost by 2, capped at 10
        }
      }
    }
    return priority;
  }

  /**
   * Train a specific model
   */
  private async trainModel(modelName: string): Promise<void> {
    console.log(`🎯 Training model: ${modelName}`);
    
    try {
      if (modelName === 'engagement_prediction') {
        console.log('Initiating engagement prediction model training (updateModel, evaluateModel)...');
        updateModel();
        const newMSE = evaluateModel();
        this.lastEngagementModelTrainTime = new Date();
        console.log(`✅ Engagement prediction model training completed. New MSE: ${newMSE.toFixed(4)}`);

      } else if (modelName === 'content_optimization_patterns') {
        console.log('Initiating content optimization patterns update...');
        await this.aiImprovementService.updateContentOptimizationPatterns();
        this.lastContentPatternsUpdateTime = new Date();
        console.log('✅ Content optimization patterns update completed.');

      } else {
        console.warn(`Unknown model name "${modelName}" passed to trainModel.`);
        // Simulate training time for other potential models
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`✅ Model ${modelName} (simulated) training completed`);
      }
    } catch (error) {
      console.error(`❌ Model ${modelName} training failed:`, error);
    }
  }

  /**
   * Start all agents
   */
  private async startAllAgents(): Promise<void> {
    console.log('🚀 Starting all agents...');
    
    for (const [agentId, agent] of this.agents.entries()) {
      try {
        if (typeof agent.start === 'function') {
          await agent.start();
        }
        console.log(`✅ Agent ${agentId} started`);
      } catch (error) {
        console.error(`❌ Failed to start agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Stop all agents
   */
  private async stopAllAgents(): Promise<void> {
    console.log('🛑 Stopping all agents...');
    
    for (const [agentId, agent] of this.agents.entries()) {
      try {
        if (typeof agent.stop === 'function') {
          await agent.stop();
        }
        console.log(`✅ Agent ${agentId} stopped`);
      } catch (error) {
        console.error(`❌ Failed to stop agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    isRunning: boolean;
    metrics: SystemMetrics;
    objectives: OptimizationObjective[];
    agentCount: number;
    resourceAllocations: ResourceAllocation[];
  } {
    return {
      isRunning: this.isRunning,
      metrics: this.systemMetrics,
      objectives: this.activeObjectives,
      agentCount: this.agents.size,
      resourceAllocations: this.resourceAllocations,
    };
  }

  /**
   * Update optimization objective
   */
  updateObjective(type: OptimizationObjective['type'], updates: Partial<OptimizationObjective>): void {
    const objectiveIndex = this.activeObjectives.findIndex(obj => obj.type === type);
    if (objectiveIndex >= 0) {
      this.activeObjectives[objectiveIndex] = {
        ...this.activeObjectives[objectiveIndex],
        ...updates,
      };
    }
  }

  /**
   * Force immediate orchestration cycle
   */
  async forceOrchestrationCycle(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Master Orchestrator is not running');
    }
    
    await this.runOrchestrationCycle();
  }

  // T5.2: Feedback loop for objective weights
  private updateObjectiveWeights(): void {
    // Example: if system efficiency drops, increase weight on efficiency
    const eff = this.systemMetrics.systemEfficiency;
    for (const obj of this.activeObjectives) {
      if (obj.type === 'efficiency') {
        if (eff < 0.8) obj.priority = 'high';
        else if (eff < 0.9) obj.priority = 'medium';
        else obj.priority = 'low';
      }
    }
  }
}

// Export singleton instance
export const masterOrchestratorAgent = new MasterOrchestratorAgent();