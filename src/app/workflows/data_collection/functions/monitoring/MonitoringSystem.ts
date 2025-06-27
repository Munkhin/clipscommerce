/**
 * Integrated monitoring system that combines metrics, tracing, and alerts
 */
import { MetricsCollector, PerformanceBudget } from './MetricsCollector';
import { Tracer, TracerConfig } from './TracingProvider';
import { AlertManager, AlertSeverity } from './AlertManager';
import EventEmitter from 'events';

// Monitoring system configuration
export interface MonitoringConfig {
  serviceName: string;
  environment: 'development' | 'test' | 'production';
  performanceBudgets?: PerformanceBudget[];
  tracing?: Partial<TracerConfig>;
  alertDeduplicationWindow?: number;
}

// Main monitoring system implementation
export class MonitoringSystem {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly metricsCollector: MetricsCollector;
  private readonly tracer: Tracer;
  private readonly alertManager: AlertManager;
  private readonly eventEmitter = new EventEmitter();
  
  constructor(config: MonitoringConfig) {
    this.serviceName = config.serviceName;
    this.environment = config.environment;
    
    // Initialize components
    this.metricsCollector = new MetricsCollector();
    this.tracer = new Tracer({
      serviceName: config.serviceName,
      environment: config.environment,
      ...config.tracing
    });
    this.alertManager = new AlertManager({
      serviceName: config.serviceName,
      environment: config.environment,
      deduplicationWindow: config.alertDeduplicationWindow
    });
    
    // Set up integrations
    this.tracer.setMetricsCollector(this.metricsCollector);
    
    // Set performance budgets
    if (config.performanceBudgets) {
      this.metricsCollector.setPerformanceBudgets(config.performanceBudgets);
    }
    
    // Set up alert handling for performance budget violations
    this.metricsCollector.onAlert((alert) => {
      this.alertManager.fireAlert(
        'performance_budget_exceeded',
        `Performance budget exceeded for ${alert.operation}: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`,
        'warning',
        alert
      );
    });
    
    // Forward events
    this.metricsCollector.on('metric', (metric) => {
      this.eventEmitter.emit('metric', metric);
    });
    
    this.alertManager.on('alert', (alert) => {
      this.eventEmitter.emit('alert', alert);
    });
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  // Run a function with full monitoring (metrics, tracing, and error handling)
  async monitor<T>(
    operation: string, 
    fn: (span: any) => Promise<T>, 
    options: { 
      parentSpan?: any;
      recordMetrics?: boolean;
      alertOnError?: boolean;
      errorSeverity?: AlertSeverity;
    } = {}
  ): Promise<T> {
    const { recordMetrics = true, alertOnError = true, errorSeverity = 'error' } = options;
    
    // Create and start a span
    return this.tracer.withSpan(operation, async (span) => {
      const startTime = Date.now();
      
      try {
        // Execute the function
        const result = await fn(span);
        
        // Record metrics if enabled
        if (recordMetrics) {
          this.metricsCollector.recordMetric({
            name: 'operation_duration',
            type: 'histogram',
            labels: { operation, service: this.serviceName, result: 'success' },
            value: Date.now() - startTime
          });
        }
        
        return result;
      } catch (error) {
        const err = error as Error;
        
        // Record metrics if enabled
        if (recordMetrics) {
          this.metricsCollector.recordMetric({
            name: 'operation_duration',
            type: 'histogram',
            labels: { operation, service: this.serviceName, result: 'failure', errorType: err.name },
            value: Date.now() - startTime
          });
          
          this.metricsCollector.recordMetric({
            name: 'operation_error',
            type: 'counter',
            labels: { operation, service: this.serviceName, errorType: err.name },
            value: 1
          });
        }
        
        // Fire alert if enabled
        if (alertOnError) {
          this.alertManager.fireAlert(
            'operation_error',
            `Error in operation ${operation}: ${err.message}`,
            errorSeverity,
            {
              operation,
              errorType: err.name,
              errorMessage: err.message,
              errorStack: err.stack
            }
          );
        }
        
        throw error;
      }
    }, options.parentSpan);
  }

  // Subscribe to events
  on(event: 'metric' | 'alert', handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }

  // Unsubscribe from events
  off(event: 'metric' | 'alert', handler: (data: any) => void): void {
    this.eventEmitter.off(event, handler);
  }

  // Flush all pending metrics and traces
  async flush(): Promise<void> {
    await Promise.all([
      this.metricsCollector.flush(),
      this.tracer.flush()
    ]);
  }

  // Shutdown the monitoring system
  shutdown(): void {
    this.tracer.shutdown();
  }
}

// Create a default monitoring system for development
export const createDevMonitoringSystem = (serviceName: string) => 
  new MonitoringSystem({
    serviceName,
    environment: 'development',
    performanceBudgets: [
      {
        operationName: 'performScan',
        maxDuration: 10000, // 10s
        errorRateThreshold: 0.1 // 10%
      },
      {
        operationName: 'getUserPosts',
        maxDuration: 5000, // 5s
        errorRateThreshold: 0.1 // 10%
      }
    ]
  });
