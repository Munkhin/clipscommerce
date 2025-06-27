import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

export interface ModelPerformanceMetrics {
  modelId: string;
  timestamp: Date;
  predictionCount: number;
  averageLatency: number; // ms
  errorRate: number; // 0-1
  accuracy?: number;
  drift?: number; // Statistical drift metric
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // MB
    requests: number; // per minute
  };
}

export interface ModelAlert {
  id: string;
  modelId: string;
  type: 'performance_degradation' | 'high_error_rate' | 'resource_exhaustion' | 'drift_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Record<string, number>;
  threshold: number;
  actualValue: number;
  createdAt: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface ModelHealthStatus {
  modelId: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  lastUpdate: Date;
  uptime: number; // seconds
  recentMetrics: ModelPerformanceMetrics;
  alerts: ModelAlert[];
  recommendations: string[];
}

export class ModelMonitoringService extends EventEmitter {
  private supabase: SupabaseClient;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, ModelPerformanceMetrics[]> = new Map();
  private alerts: Map<string, ModelAlert[]> = new Map();
  private isMonitoring: boolean = false;

  // Configurable thresholds
  private thresholds = {
    maxLatency: 1000, // ms
    maxErrorRate: 0.05, // 5%
    maxDrift: 0.1, // 10%
    minAccuracy: 0.7, // 70%
    maxCpuUsage: 80, // 80%
    maxMemoryUsage: 1024, // MB
  };

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Start monitoring all deployed models
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    if (this.isMonitoring) {
      console.log('Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting model monitoring service...');

    // Initial scan
    await this.scanAllModels();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.scanAllModels();
      } catch (error) {
        console.error('Error during monitoring scan:', error);
        this.emit('monitoringError', { error });
      }
    }, intervalMs);

    this.emit('monitoringStarted', { intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Model monitoring service stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Record model performance metrics
   */
  async recordMetrics(metrics: ModelPerformanceMetrics): Promise<void> {
    try {
      // Store in database
      const { error } = await this.supabase
        .from('model_performance_metrics')
        .insert({
          model_id: metrics.modelId,
          timestamp: metrics.timestamp.toISOString(),
          prediction_count: metrics.predictionCount,
          average_latency: metrics.averageLatency,
          error_rate: metrics.errorRate,
          accuracy: metrics.accuracy,
          drift: metrics.drift,
          resource_usage: metrics.resourceUsage,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing metrics:', error);
        return;
      }

      // Cache locally
      if (!this.metrics.has(metrics.modelId)) {
        this.metrics.set(metrics.modelId, []);
      }
      
      const modelMetrics = this.metrics.get(metrics.modelId)!;
      modelMetrics.push(metrics);
      
      // Keep only last 100 metrics per model
      if (modelMetrics.length > 100) {
        modelMetrics.splice(0, modelMetrics.length - 100);
      }

      // Check for alerts
      await this.checkThresholds(metrics);

      this.emit('metricsRecorded', metrics);
    } catch (error) {
      console.error('Error recording metrics:', error);
    }
  }

  /**
   * Get health status for a specific model
   */
  async getModelHealth(modelId: string): Promise<ModelHealthStatus | null> {
    try {
      // Get latest metrics from database
      const { data: metricsData, error: metricsError } = await this.supabase
        .from('model_performance_metrics')
        .select('*')
        .eq('model_id', modelId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (metricsError || !metricsData || metricsData.length === 0) {
        return null;
      }

      const latestMetrics = this.mapDbRowToMetrics(metricsData[0]);

      // Get recent alerts
      const { data: alertsData, error: alertsError } = await this.supabase
        .from('model_alerts')
        .select('*')
        .eq('model_id', modelId)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);

      const alerts = alertsError ? [] : (alertsData || []).map(row => this.mapDbRowToAlert(row));

      // Determine status
      let status: ModelHealthStatus['status'] = 'healthy';
      if (alerts.some(a => a.severity === 'critical')) {
        status = 'critical';
      } else if (alerts.some(a => a.severity === 'high')) {
        status = 'warning';
      } else if (Date.now() - latestMetrics.timestamp.getTime() > 300000) { // 5 minutes
        status = 'offline';
      }

      // Calculate uptime (simplified)
      const uptime = Math.floor((Date.now() - latestMetrics.timestamp.getTime()) / 1000);

      // Generate recommendations
      const recommendations = this.generateRecommendations(latestMetrics, alerts);

      return {
        modelId,
        status,
        lastUpdate: latestMetrics.timestamp,
        uptime,
        recentMetrics: latestMetrics,
        alerts,
        recommendations
      };
    } catch (error) {
      console.error('Error getting model health:', error);
      return null;
    }
  }

  /**
   * Get health status for all models
   */
  async getAllModelHealth(): Promise<ModelHealthStatus[]> {
    try {
      // Get all deployed models
      const { data: modelsData, error: modelsError } = await this.supabase
        .from('trained_models')
        .select('id')
        .eq('status', 'deployed');

      if (modelsError || !modelsData) {
        return [];
      }

      const healthStatuses = await Promise.all(
        modelsData.map(model => this.getModelHealth(model.id))
      );

      return healthStatuses.filter(status => status !== null) as ModelHealthStatus[];
    } catch (error) {
      console.error('Error getting all model health:', error);
      return [];
    }
  }

  /**
   * Get performance metrics for a model over time
   */
  async getModelMetrics(
    modelId: string,
    hours: number = 24
  ): Promise<ModelPerformanceMetrics[]> {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('model_performance_metrics')
        .select('*')
        .eq('model_id', modelId)
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching metrics:', error);
        return [];
      }

      return (data || []).map(row => this.mapDbRowToMetrics(row));
    } catch (error) {
      console.error('Error in getModelMetrics:', error);
      return [];
    }
  }

  /**
   * Create an alert
   */
  async createAlert(alert: Omit<ModelAlert, 'id' | 'createdAt' | 'acknowledged'>): Promise<string> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullAlert: ModelAlert = {
        ...alert,
        id: alertId,
        createdAt: new Date(),
        acknowledged: false
      };

      // Store in database
      const { error } = await this.supabase
        .from('model_alerts')
        .insert({
          alert_id: alertId,
          model_id: alert.modelId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          metrics: alert.metrics,
          threshold: alert.threshold,
          actual_value: alert.actualValue,
          created_at: fullAlert.createdAt.toISOString(),
          acknowledged: false
        });

      if (error) {
        console.error('Error storing alert:', error);
        throw error;
      }

      // Cache locally
      if (!this.alerts.has(alert.modelId)) {
        this.alerts.set(alert.modelId, []);
      }
      this.alerts.get(alert.modelId)!.push(fullAlert);

      this.emit('alertCreated', fullAlert);
      return alertId;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, resolvedAt?: Date): Promise<void> {
    try {
      const updateData: any = {
        acknowledged: true,
        updated_at: new Date().toISOString()
      };

      if (resolvedAt) {
        updateData.resolved_at = resolvedAt.toISOString();
      }

      const { error } = await this.supabase
        .from('model_alerts')
        .update(updateData)
        .eq('alert_id', alertId);

      if (error) {
        console.error('Error acknowledging alert:', error);
        return;
      }

      this.emit('alertAcknowledged', { alertId, resolvedAt });
    } catch (error) {
      console.error('Error in acknowledgeAlert:', error);
    }
  }

  /**
   * Update monitoring thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholdsUpdated', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds };
  }

  // Private methods

  private async scanAllModels(): Promise<void> {
    const healthStatuses = await this.getAllModelHealth();
    
    for (const status of healthStatuses) {
      // Emit health updates
      this.emit('modelHealthUpdate', status);
      
      // Check for critical issues
      if (status.status === 'critical') {
        this.emit('criticalModelIssue', status);
      }
    }
  }

  private async checkThresholds(metrics: ModelPerformanceMetrics): Promise<void> {
    const alerts: Array<Omit<ModelAlert, 'id' | 'createdAt' | 'acknowledged'>> = [];

    // Check latency
    if (metrics.averageLatency > this.thresholds.maxLatency) {
      alerts.push({
        modelId: metrics.modelId,
        type: 'performance_degradation',
        severity: metrics.averageLatency > this.thresholds.maxLatency * 2 ? 'critical' : 'high',
        message: `High latency detected: ${metrics.averageLatency}ms`,
        metrics: { latency: metrics.averageLatency },
        threshold: this.thresholds.maxLatency,
        actualValue: metrics.averageLatency
      });
    }

    // Check error rate
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      alerts.push({
        modelId: metrics.modelId,
        type: 'high_error_rate',
        severity: metrics.errorRate > this.thresholds.maxErrorRate * 2 ? 'critical' : 'high',
        message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`,
        metrics: { errorRate: metrics.errorRate },
        threshold: this.thresholds.maxErrorRate,
        actualValue: metrics.errorRate
      });
    }

    // Check accuracy
    if (metrics.accuracy && metrics.accuracy < this.thresholds.minAccuracy) {
      alerts.push({
        modelId: metrics.modelId,
        type: 'performance_degradation',
        severity: metrics.accuracy < this.thresholds.minAccuracy * 0.8 ? 'critical' : 'medium',
        message: `Low accuracy detected: ${(metrics.accuracy * 100).toFixed(2)}%`,
        metrics: { accuracy: metrics.accuracy },
        threshold: this.thresholds.minAccuracy,
        actualValue: metrics.accuracy
      });
    }

    // Check drift
    if (metrics.drift && metrics.drift > this.thresholds.maxDrift) {
      alerts.push({
        modelId: metrics.modelId,
        type: 'drift_detected',
        severity: metrics.drift > this.thresholds.maxDrift * 2 ? 'high' : 'medium',
        message: `Model drift detected: ${(metrics.drift * 100).toFixed(2)}%`,
        metrics: { drift: metrics.drift },
        threshold: this.thresholds.maxDrift,
        actualValue: metrics.drift
      });
    }

    // Check resource usage
    if (metrics.resourceUsage.cpu > this.thresholds.maxCpuUsage) {
      alerts.push({
        modelId: metrics.modelId,
        type: 'resource_exhaustion',
        severity: metrics.resourceUsage.cpu > 95 ? 'critical' : 'medium',
        message: `High CPU usage: ${metrics.resourceUsage.cpu}%`,
        metrics: { cpu: metrics.resourceUsage.cpu },
        threshold: this.thresholds.maxCpuUsage,
        actualValue: metrics.resourceUsage.cpu
      });
    }

    if (metrics.resourceUsage.memory > this.thresholds.maxMemoryUsage) {
      alerts.push({
        modelId: metrics.modelId,
        type: 'resource_exhaustion',
        severity: metrics.resourceUsage.memory > this.thresholds.maxMemoryUsage * 1.5 ? 'critical' : 'medium',
        message: `High memory usage: ${metrics.resourceUsage.memory}MB`,
        metrics: { memory: metrics.resourceUsage.memory },
        threshold: this.thresholds.maxMemoryUsage,
        actualValue: metrics.resourceUsage.memory
      });
    }

    // Create alerts
    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  private generateRecommendations(
    metrics: ModelPerformanceMetrics,
    alerts: ModelAlert[]
  ): string[] {
    const recommendations: string[] = [];

    if (alerts.some(a => a.type === 'performance_degradation')) {
      recommendations.push('Consider retraining the model with recent data');
      recommendations.push('Review model architecture for optimization opportunities');
    }

    if (alerts.some(a => a.type === 'high_error_rate')) {
      recommendations.push('Investigate input data quality');
      recommendations.push('Check for changes in data distribution');
    }

    if (alerts.some(a => a.type === 'resource_exhaustion')) {
      recommendations.push('Scale up model resources or optimize model size');
      recommendations.push('Implement model quantization or pruning');
    }

    if (alerts.some(a => a.type === 'drift_detected')) {
      recommendations.push('Retrain model with recent data');
      recommendations.push('Implement adaptive learning mechanisms');
    }

    if (metrics.averageLatency > this.thresholds.maxLatency * 0.8) {
      recommendations.push('Optimize inference pipeline');
      recommendations.push('Consider caching frequently requested predictions');
    }

    return recommendations;
  }

  private mapDbRowToMetrics(row: any): ModelPerformanceMetrics {
    return {
      modelId: row.model_id,
      timestamp: new Date(row.timestamp),
      predictionCount: row.prediction_count || 0,
      averageLatency: row.average_latency || 0,
      errorRate: row.error_rate || 0,
      accuracy: row.accuracy,
      drift: row.drift,
      resourceUsage: row.resource_usage || { cpu: 0, memory: 0, requests: 0 }
    };
  }

  private mapDbRowToAlert(row: any): ModelAlert {
    return {
      id: row.alert_id,
      modelId: row.model_id,
      type: row.type,
      severity: row.severity,
      message: row.message,
      metrics: row.metrics || {},
      threshold: row.threshold || 0,
      actualValue: row.actual_value || 0,
      createdAt: new Date(row.created_at),
      acknowledged: row.acknowledged || false,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined
    };
  }
}