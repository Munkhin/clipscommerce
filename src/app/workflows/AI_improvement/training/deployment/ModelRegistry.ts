import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

export interface ModelMetadata {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  
  // Training information
  trainingDate: Date;
  trainingDuration: number; // in minutes
  trainingDataSize: number;
  
  // Performance metrics
  performanceMetrics: Record<string, number>;
  overallScore: number;
  
  // Model artifacts
  modelPath?: string;
  modelSize: number; // in bytes
  checksum: string;
  
  // Deployment information
  status: 'training' | 'trained' | 'deployed' | 'deprecated' | 'failed';
  deploymentDate?: Date;
  deploymentEnvironment?: 'development' | 'staging' | 'production';
  
  // Versioning
  parentVersion?: string;
  isLatest: boolean;
  
  // Usage statistics
  predictionCount: number;
  lastUsed?: Date;
  
  // Metadata
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelComparison {
  model1: ModelMetadata;
  model2: ModelMetadata;
  performanceComparison: Record<string, {
    model1Value: number;
    model2Value: number;
    improvement: number;
    significantDifference: boolean;
  }>;
  recommendation: 'use_model1' | 'use_model2' | 'no_clear_winner';
  reasoning: string;
}

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  replicas: number;
  resourceLimits: {
    cpu: string;
    memory: string;
  };
  autoScaling: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilization: number;
  };
  healthCheck: {
    enabled: boolean;
    endpoint: string;
    intervalSeconds: number;
    timeoutSeconds: number;
  };
}

export class ModelRegistry extends EventEmitter {
  private supabase: SupabaseClient;
  private models: Map<string, ModelMetadata> = new Map();

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  async registerModel(
    name: string,
    type: string,
    version: string,
    modelData: any,
    performanceMetrics: Record<string, number>,
    options: {
      description?: string;
      trainingDuration?: number;
      trainingDataSize?: number;
      tags?: string[];
      createdBy?: string;
    } = {}
  ): Promise<string> {
    try {
      const modelId = this.generateModelId(name, version);
      
      // Calculate model size and checksum
      const modelSize = this.calculateModelSize(modelData);
      const checksum = this.calculateChecksum(modelData);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(performanceMetrics);
      
      const metadata: ModelMetadata = {
        id: modelId,
        name,
        type,
        version,
        description: options.description,
        trainingDate: new Date(),
        trainingDuration: options.trainingDuration || 0,
        trainingDataSize: options.trainingDataSize || 0,
        performanceMetrics,
        overallScore,
        modelSize,
        checksum,
        status: 'trained',
        isLatest: true,
        predictionCount: 0,
        tags: options.tags || [],
        createdBy: options.createdBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update previous versions to not be latest
      await this.updatePreviousVersions(name);
      
      // Store in database
      const { error } = await this.supabase
        .from('trained_models')
        .insert({
          id: modelId,
          model_name: name,
          model_type: type,
          version,
          description: metadata.description,
          training_date: metadata.trainingDate.toISOString(),
          training_duration: metadata.trainingDuration,
          training_data_size: metadata.trainingDataSize,
          performance_metrics: performanceMetrics,
          overall_score: overallScore,
          model_data: modelData,
          model_size: modelSize,
          checksum,
          status: 'trained',
          is_latest: true,
          prediction_count: 0,
          tags: metadata.tags,
          created_by: metadata.createdBy,
          created_at: metadata.createdAt.toISOString(),
          updated_at: metadata.updatedAt.toISOString()
        });

      if (error) throw error;

      // Cache locally
      this.models.set(modelId, metadata);
      
      this.emit('modelRegistered', { modelId, metadata });
      
      return modelId;
      
    } catch (error) {
      this.emit('registrationError', { name, version, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    // Check cache first
    if (this.models.has(modelId)) {
      return this.models.get(modelId)!;
    }

    // Query database
    const { data, error } = await this.supabase
      .from('trained_models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (error || !data) return null;

    const metadata = this.mapDatabaseToMetadata(data);
    this.models.set(modelId, metadata);
    
    return metadata;
  }

  async getLatestModel(name: string): Promise<ModelMetadata | null> {
    const { data, error } = await this.supabase
      .from('trained_models')
      .select('*')
      .eq('model_name', name)
      .eq('is_latest', true)
      .single();

    if (error || !data) return null;

    const metadata = this.mapDatabaseToMetadata(data);
    this.models.set(metadata.id, metadata);
    
    return metadata;
  }

  async listModels(filters: {
    name?: string;
    type?: string;
    status?: string;
    environment?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<ModelMetadata[]> {
    let query = this.supabase.from('trained_models').select('*');

    // Apply filters
    if (filters.name) query = query.eq('model_name', filters.name);
    if (filters.type) query = query.eq('model_type', filters.type);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.environment) query = query.eq('deployment_environment', filters.environment);
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    // Apply pagination
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data.map(row => this.mapDatabaseToMetadata(row));
  }

  async getModelVersions(name: string): Promise<ModelMetadata[]> {
    const { data, error } = await this.supabase
      .from('trained_models')
      .select('*')
      .eq('model_name', name)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(row => this.mapDatabaseToMetadata(row));
  }

  async compareModels(modelId1: string, modelId2: string): Promise<ModelComparison> {
    const model1 = await this.getModel(modelId1);
    const model2 = await this.getModel(modelId2);

    if (!model1 || !model2) {
      throw new Error('One or both models not found');
    }

    const performanceComparison: Record<string, any> = {};
    const allMetrics = new Set([
      ...Object.keys(model1.performanceMetrics),
      ...Object.keys(model2.performanceMetrics)
    ]);

    allMetrics.forEach(metric => {
      const model1Value = model1.performanceMetrics[metric] || 0;
      const model2Value = model2.performanceMetrics[metric] || 0;
      const improvement = ((model2Value - model1Value) / Math.max(model1Value, 0.001)) * 100;
      
      performanceComparison[metric] = {
        model1Value,
        model2Value,
        improvement,
        significantDifference: Math.abs(improvement) > 5 // 5% threshold
      };
    });

    // Determine recommendation
    let recommendation: 'use_model1' | 'use_model2' | 'no_clear_winner';
    let reasoning = '';

    const overallImprovement = ((model2.overallScore - model1.overallScore) / Math.max(model1.overallScore, 0.001)) * 100;
    
    if (overallImprovement > 10) {
      recommendation = 'use_model2';
      reasoning = `Model 2 shows significant improvement (${overallImprovement.toFixed(1)}%) in overall performance`;
    } else if (overallImprovement < -10) {
      recommendation = 'use_model1';
      reasoning = `Model 1 performs significantly better (${Math.abs(overallImprovement).toFixed(1)}% better) than Model 2`;
    } else {
      recommendation = 'no_clear_winner';
      reasoning = `Both models show similar performance (${Math.abs(overallImprovement).toFixed(1)}% difference)`;
    }

    return {
      model1,
      model2,
      performanceComparison,
      recommendation,
      reasoning
    };
  }

  async deployModel(
    modelId: string,
    environment: 'development' | 'staging' | 'production',
    config?: DeploymentConfig
  ): Promise<void> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      // Validate deployment readiness
      await this.validateDeploymentReadiness(model, environment);

      // For production, ensure previous version is properly handled
      if (environment === 'production') {
        await this.handleProductionDeployment(model);
      }

      // Update model status
      const { error } = await this.supabase
        .from('trained_models')
        .update({
          status: 'deployed',
          deployment_date: new Date().toISOString(),
          deployment_environment: environment,
          deployment_config: config,
          updated_at: new Date().toISOString()
        })
        .eq('id', modelId);

      if (error) throw error;

      // Update local cache
      model.status = 'deployed';
      model.deploymentDate = new Date();
      model.deploymentEnvironment = environment;
      model.updatedAt = new Date();
      
      this.models.set(modelId, model);

      // Initialize monitoring for deployed model
      await this.initializeModelMonitoring(modelId, environment);

      this.emit('modelDeployed', { modelId, environment, config });

    } catch (error) {
      this.emit('deploymentError', { modelId, environment, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async retireModel(modelId: string, reason?: string): Promise<void> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      const { error } = await this.supabase
        .from('trained_models')
        .update({
          status: 'deprecated',
          retirement_reason: reason,
          retirement_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', modelId);

      if (error) throw error;

      // Update local cache
      model.status = 'deprecated';
      model.updatedAt = new Date();
      
      this.models.set(modelId, model);

      this.emit('modelRetired', { modelId, reason });

    } catch (error) {
      this.emit('retirementError', { modelId, error: error.message });
      throw error;
    }
  }

  async recordPrediction(modelId: string): Promise<void> {
    try {
      // Increment prediction count
      const { error } = await this.supabase
        .from('trained_models')
        .update({
          prediction_count: this.supabase.sql`prediction_count + 1`,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', modelId);

      if (error) throw error;

      // Update local cache
      const model = this.models.get(modelId);
      if (model) {
        model.predictionCount++;
        model.lastUsed = new Date();
        model.updatedAt = new Date();
        this.models.set(modelId, model);
      }

    } catch (error) {
      // Don't throw error for prediction recording failures
      this.emit('predictionRecordingError', { modelId, error: error.message });
    }
  }

  async getModelUsageStats(modelId: string, days: number = 30): Promise<{
    totalPredictions: number;
    dailyPredictions: Array<{ date: string; count: number }>;
    avgPredictionsPerDay: number;
    peakUsageDay: string;
  }> {
    // This would typically query a separate usage tracking table
    // For now, return basic stats from the model metadata
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Simulate daily usage data
    const dailyPredictions = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * (model.predictionCount / days))
      };
    }).reverse();

    const totalPredictions = model.predictionCount;
    const avgPredictionsPerDay = totalPredictions / days;
    const peakUsageDay = dailyPredictions.reduce((peak, current) => 
      current.count > peak.count ? current : peak
    ).date;

    return {
      totalPredictions,
      dailyPredictions,
      avgPredictionsPerDay,
      peakUsageDay
    };
  }

  async searchModels(query: string, filters: {
    type?: string;
    status?: string;
    minScore?: number;
    maxAge?: number; // in days
  } = {}): Promise<ModelMetadata[]> {
    let dbQuery = this.supabase
      .from('trained_models')
      .select('*')
      .or(`model_name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`);

    // Apply filters
    if (filters.type) dbQuery = dbQuery.eq('model_type', filters.type);
    if (filters.status) dbQuery = dbQuery.eq('status', filters.status);
    if (filters.minScore) dbQuery = dbQuery.gte('overall_score', filters.minScore);
    if (filters.maxAge) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.maxAge);
      dbQuery = dbQuery.gte('created_at', cutoffDate.toISOString());
    }

    dbQuery = dbQuery.order('overall_score', { ascending: false });

    const { data, error } = await dbQuery;
    if (error) throw error;

    return data.map(row => this.mapDatabaseToMetadata(row));
  }

  async exportModel(modelId: string, format: 'json' | 'onnx' | 'tensorflow' = 'json'): Promise<{
    modelData: any;
    metadata: ModelMetadata;
    exportFormat: string;
    exportDate: Date;
  }> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Get full model data
    const { data, error } = await this.supabase
      .from('trained_models')
      .select('model_data')
      .eq('id', modelId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to retrieve model data for ${modelId}`);
    }

    let exportedData = data.model_data;

    // Convert format if needed
    if (format !== 'json') {
      exportedData = await this.convertModelFormat(exportedData, format);
    }

    this.emit('modelExported', { modelId, format });

    return {
      modelData: exportedData,
      metadata: model,
      exportFormat: format,
      exportDate: new Date()
    };
  }

  // Private helper methods
  private generateModelId(name: string, version: string): string {
    return `${name}_${version}_${Date.now()}`;
  }

  private calculateModelSize(modelData: any): number {
    // Estimate model size in bytes
    return JSON.stringify(modelData).length;
  }

  private calculateChecksum(modelData: any): string {
    // Simple checksum calculation
    const str = JSON.stringify(modelData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private calculateOverallScore(metrics: Record<string, number>): number {
    const values = Object.values(metrics).filter(v => !isNaN(v) && v >= 0);
    if (values.length === 0) return 0;
    
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private async updatePreviousVersions(name: string): Promise<void> {
    await this.supabase
      .from('trained_models')
      .update({ is_latest: false })
      .eq('model_name', name)
      .eq('is_latest', true);
  }

  private mapDatabaseToMetadata(row: any): ModelMetadata {
    return {
      id: row.id,
      name: row.model_name,
      type: row.model_type,
      version: row.version,
      description: row.description,
      trainingDate: new Date(row.training_date),
      trainingDuration: row.training_duration || 0,
      trainingDataSize: row.training_data_size || 0,
      performanceMetrics: row.performance_metrics || {},
      overallScore: row.overall_score || 0,
      modelPath: row.model_path,
      modelSize: row.model_size || 0,
      checksum: row.checksum || '',
      status: row.status,
      deploymentDate: row.deployment_date ? new Date(row.deployment_date) : undefined,
      deploymentEnvironment: row.deployment_environment,
      parentVersion: row.parent_version,
      isLatest: row.is_latest || false,
      predictionCount: row.prediction_count || 0,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      tags: row.tags || [],
      createdBy: row.created_by || 'system',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async convertModelFormat(modelData: any, format: string): Promise<any> {
    // Placeholder for model format conversion
    // In a real implementation, this would convert between different model formats
    switch (format) {
      case 'onnx':
        return { ...modelData, format: 'onnx', converted: true };
      case 'tensorflow':
        return { ...modelData, format: 'tensorflow', converted: true };
      default:
        return modelData;
    }
  }

  /**
   * Create a new model version
   */
  async createModelVersion(
    baseModelId: string,
    updates: {
      performanceMetrics: Record<string, number>;
      modelData?: any;
      description?: string;
      tags?: string[];
    }
  ): Promise<string> {
    const baseModel = await this.getModel(baseModelId);
    if (!baseModel) {
      throw new Error(`Base model ${baseModelId} not found`);
    }

    // Generate new version
    const versionParts = baseModel.version.split('.');
    const majorVersion = parseInt(versionParts[0]) || 1;
    const minorVersion = parseInt(versionParts[1]) || 0;
    const patchVersion = parseInt(versionParts[2]) || 0;
    
    const newVersion = `${majorVersion}.${minorVersion}.${patchVersion + 1}`;

    // Register new version
    return this.registerModel(
      baseModel.name,
      baseModel.type,
      newVersion,
      updates.modelData || {},
      updates.performanceMetrics,
      {
        description: updates.description || `Version ${newVersion} of ${baseModel.name}`,
        tags: updates.tags || baseModel.tags,
        createdBy: baseModel.createdBy
      }
    );
  }

  /**
   * Rollback to previous model version
   */
  async rollbackModel(modelId: string): Promise<void> {
    const currentModel = await this.getModel(modelId);
    if (!currentModel) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Find previous version
    const versions = await this.getModelVersions(currentModel.name);
    const currentVersionIndex = versions.findIndex(v => v.id === modelId);
    
    if (currentVersionIndex === -1 || currentVersionIndex === versions.length - 1) {
      throw new Error('No previous version available for rollback');
    }

    const previousVersion = versions[currentVersionIndex + 1];

    // Deploy previous version
    await this.deployModel(
      previousVersion.id,
      currentModel.deploymentEnvironment || 'development'
    );

    // Retire current version
    await this.retireModel(modelId, 'Rolled back to previous version');

    this.emit('modelRolledBack', { 
      fromModelId: modelId, 
      toModelId: previousVersion.id 
    });
  }

  /**
   * Validate deployment readiness
   */
  private async validateDeploymentReadiness(
    model: ModelMetadata,
    environment: string
  ): Promise<void> {
    const validationErrors: string[] = [];

    // Check model status
    if (model.status !== 'trained') {
      validationErrors.push('Model must be in trained status');
    }

    // Check performance thresholds
    const minThresholds = {
      development: { overallScore: 0.5 },
      staging: { overallScore: 0.7 },
      production: { overallScore: 0.8 }
    };

    const threshold = minThresholds[environment as keyof typeof minThresholds];
    if (threshold && model.overallScore < threshold.overallScore) {
      validationErrors.push(
        `Model performance below ${environment} threshold: ${model.overallScore} < ${threshold.overallScore}`
      );
    }

    // Check model freshness (not older than 30 days for production)
    if (environment === 'production') {
      const daysSinceTraining = (Date.now() - model.trainingDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceTraining > 30) {
        validationErrors.push(`Model is too old for production: ${daysSinceTraining.toFixed(1)} days`);
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`Deployment validation failed: ${validationErrors.join(', ')}`);
    }
  }

  /**
   * Handle production deployment (retire previous version)
   */
  private async handleProductionDeployment(model: ModelMetadata): Promise<void> {
    // Find current production model of same type
    const { data: productionModels, error } = await this.supabase
      .from('trained_models')
      .select('*')
      .eq('model_name', model.name)
      .eq('deployment_environment', 'production')
      .eq('status', 'deployed');

    if (error) {
      console.error('Error checking production models:', error);
      return;
    }

    // Retire existing production model
    if (productionModels && productionModels.length > 0) {
      for (const prodModel of productionModels) {
        await this.retireModel(prodModel.id, `Replaced by version ${model.version}`);
      }
    }
  }

  /**
   * Initialize monitoring for deployed model
   */
  private async initializeModelMonitoring(
    modelId: string,
    environment: string
  ): Promise<void> {
    try {
      // Create initial health snapshot
      const { error } = await this.supabase
        .from('model_health_snapshots')
        .insert({
          model_id: modelId,
          status: 'healthy',
          health_score: 1.0,
          uptime_seconds: 0,
          active_alerts_count: 0,
          last_prediction_at: new Date().toISOString(),
          snapshot_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error initializing model monitoring:', error);
      }
    } catch (error) {
      console.error('Error in initializeModelMonitoring:', error);
    }
  }

  /**
   * Get deployment pipeline status
   */
  async getDeploymentPipeline(modelName: string): Promise<{
    development?: ModelMetadata;
    staging?: ModelMetadata;
    production?: ModelMetadata;
    nextVersion?: string;
  }> {
    const versions = await this.getModelVersions(modelName);
    
    const pipeline = {
      development: versions.find(v => v.deploymentEnvironment === 'development'),
      staging: versions.find(v => v.deploymentEnvironment === 'staging'),
      production: versions.find(v => v.deploymentEnvironment === 'production'),
      nextVersion: this.generateNextVersion(versions)
    };

    return pipeline;
  }

  /**
   * Generate next version number
   */
  private generateNextVersion(versions: ModelMetadata[]): string {
    if (versions.length === 0) {
      return '1.0.0';
    }

    const latestVersion = versions[0]; // Versions are sorted by creation date
    const versionParts = latestVersion.version.split('.');
    const majorVersion = parseInt(versionParts[0]) || 1;
    const minorVersion = parseInt(versionParts[1]) || 0;
    const patchVersion = parseInt(versionParts[2]) || 0;

    return `${majorVersion}.${minorVersion}.${patchVersion + 1}`;
  }

  // Getters
  getCachedModels(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  getCacheSize(): number {
    return this.models.size;
  }

  clearCache(): void {
    this.models.clear();
    this.emit('cacheCleared');
  }
} 