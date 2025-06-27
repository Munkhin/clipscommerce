/**
 * Advanced metrics collection and monitoring system with distributed tracing
 */
import EventEmitter from 'events';

// Metric type definition
export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels: Record<string, string>;
  value: number;
  timestamp: Date;
}

// Span interface for distributed tracing
export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
  status: 'unset' | 'ok' | 'error';
  recordException(error: Error): void;
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  finish(endTime?: number): void;
}

// Performance budget configuration
export interface PerformanceBudget {
  operationName: string;
  maxDuration: number;           // Maximum duration in ms
  errorRateThreshold: number;    // Maximum error rate (0-1)
  p95Threshold?: number;         // 95th percentile threshold
  maxMemoryUsage?: number;       // Maximum memory usage in MB
}

// Base metrics provider interface
export interface MetricsProvider {
  recordMetric(metric: Metric): void;
  startSpan(operation: string, parentSpan?: Span): Span;
  flush(): Promise<void>;
}

// In-memory metrics provider for local development and testing
class InMemoryMetricsProvider implements MetricsProvider {
  private metrics: Metric[] = [];
  private spans: Record<string, Span> = {};
  private readonly maxMetricsCount = 10000;
  private eventEmitter: EventEmitter | null = null;

  constructor(eventEmitter?: EventEmitter) {
    this.eventEmitter = eventEmitter || null;
  }

  recordMetric(metric: Metric): void {
    // Prevent unbounded growth
    if (this.metrics.length >= this.maxMetricsCount) {
      this.metrics.shift();
    }
    
    this.metrics.push(metric);
    
    if (this.eventEmitter) {
      this.eventEmitter.emit('metric', metric);
    }
  }

  startSpan(operation: string, parentSpan?: Span): Span {
    const id = this.generateId();
    const traceId = parentSpan?.traceId || this.generateId();
    
    const span: Span = {
      id,
      traceId,
      parentId: parentSpan?.id,
      operation,
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: 'unset',
      
      recordException(error: Error): void {
        this.events.push({
          name: 'exception',
          timestamp: Date.now(),
          attributes: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        });
        this.status = 'error';
      },
      
      setAttribute(key: string, value: any): void {
        this.attributes[key] = value;
      },
      
      addEvent(name: string, attributes?: Record<string, any>): void {
        this.events.push({
          name,
          timestamp: Date.now(),
          attributes
        });
      },
      
      finish(endTime?: number): void {
        this.endTime = endTime || Date.now();
        if (this.status === 'unset') {
          this.status = 'ok';
        }
      }
    };
    
    this.spans[id] = span;
    
    return span;
  }

  async flush(): Promise<void> {
    // In-memory provider doesn't need to flush data
    return;
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  getSpans(): Span[] {
    return Object.values(this.spans);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  clearSpans(): void {
    this.spans = {};
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Metrics collector with advanced monitoring capabilities
export class MetricsCollector {
  private providers: MetricsProvider[] = [];
  private eventEmitter = new EventEmitter();
  private performanceBudgets: PerformanceBudget[] = [];
  private operationMetrics: Map<string, number[]> = new Map();
  private errorRates: Map<string, { success: number; failure: number }> = new Map();
  private alertHandlers: ((alert: any) => void)[] = [];
  
  constructor() {
    // Default in-memory provider
    this.addProvider(new InMemoryMetricsProvider(this.eventEmitter));
    
    // Setup alert handler
    this.eventEmitter.on('metric', (metric) => {
      this.checkPerformanceBudgets(metric);
    });
  }

  addProvider(provider: MetricsProvider): void {
    this.providers.push(provider);
  }

  setPerformanceBudgets(budgets: PerformanceBudget[]): void {
    this.performanceBudgets = budgets;
  }

  onAlert(handler: (alert: any) => void): void {
    this.alertHandlers.push(handler);
  }

  recordMetric(metric: Omit<Metric, 'timestamp'>): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date()
    };
    
    for (const provider of this.providers) {
      provider.recordMetric(fullMetric);
    }
    
    // Track operation metrics for performance budgets
    if (metric.name.startsWith('operation_duration')) {
      const operation = metric.labels.operation;
      if (!this.operationMetrics.has(operation)) {
        this.operationMetrics.set(operation, []);
      }
      
      const metrics = this.operationMetrics.get(operation) || [];
      metrics.push(metric.value);
      
      // Keep only the last 100 measurements
      if (metrics.length > 100) {
        metrics.shift();
      }
      
      this.operationMetrics.set(operation, metrics);
    }
    
    // Track error rates
    if (metric.name === 'operation_result') {
      const operation = metric.labels.operation;
      const success = metric.labels.result === 'success';
      
      if (!this.errorRates.has(operation)) {
        this.errorRates.set(operation, { success: 0, failure: 0 });
      }
      
      const rates = this.errorRates.get(operation)!;
      if (success) {
        rates.success++;
      } else {
        rates.failure++;
      }
      
      this.errorRates.set(operation, rates);
    }
  }

  startSpan(operation: string, parentSpan?: Span): Span {
    // Use the first provider for spans
    if (this.providers.length === 0) {
      throw new Error('No metrics providers available');
    }
    
    return this.providers[0].startSpan(operation, parentSpan);
  }

  async withSpan<T>(operation: string, fn: (span: Span) => Promise<T>, parentSpan?: Span): Promise<T> {
    const span = this.startSpan(operation, parentSpan);
    const startTime = Date.now();
    
    try {
      const result = await fn(span);
      span.finish();
      
      this.recordMetric({
        name: 'operation_duration',
        type: 'histogram',
        labels: { operation },
        value: Date.now() - startTime
      });
      
      this.recordMetric({
        name: 'operation_result',
        type: 'counter',
        labels: { operation, result: 'success' },
        value: 1
      });
      
      return result;
    } catch (error) {
      const err = error as Error;
      span.recordException(err);
      span.finish();
      
      this.recordMetric({
        name: 'operation_duration',
        type: 'histogram',
        labels: { operation },
        value: Date.now() - startTime
      });
      
      this.recordMetric({
        name: 'operation_result',
        type: 'counter',
        labels: { operation, result: 'failure', errorType: err.name },
        value: 1
      });
      
      throw error;
    }
  }

  async withMetrics<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      
      this.recordMetric({
        name: 'operation_duration',
        type: 'histogram',
        labels: { operation },
        value: Date.now() - startTime
      });
      
      this.recordMetric({
        name: 'operation_result',
        type: 'counter',
        labels: { operation, result: 'success' },
        value: 1
      });
      
      return result;
    } catch (error) {
      const err = error as Error;
      
      this.recordMetric({
        name: 'operation_duration',
        type: 'histogram',
        labels: { operation },
        value: Date.now() - startTime
      });
      
      this.recordMetric({
        name: 'operation_result',
        type: 'counter',
        labels: { operation, result: 'failure', errorType: err.name },
        value: 1
      });
      
      throw error;
    }
  }

  getOperationMetrics(operation: string): number[] {
    return this.operationMetrics.get(operation) || [];
  }

  getErrorRate(operation: string): number {
    const rates = this.errorRates.get(operation);
    if (!rates) return 0;
    
    const total = rates.success + rates.failure;
    if (total === 0) return 0;
    
    return rates.failure / total;
  }

  getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private checkPerformanceBudgets(metric: Metric): void {
    if (metric.name !== 'operation_duration') return;
    
    const operation = metric.labels.operation;
    const budget = this.performanceBudgets.find(b => b.operationName === operation);
    if (!budget) return;
    
    // Check duration threshold
    if (metric.value > budget.maxDuration) {
      this.emitAlert({
        type: 'performance_budget_exceeded',
        operation,
        metric: 'duration',
        value: metric.value,
        threshold: budget.maxDuration,
        timestamp: new Date()
      });
    }
    
    // Check error rate threshold
    const errorRate = this.getErrorRate(operation);
    if (errorRate > budget.errorRateThreshold) {
      this.emitAlert({
        type: 'performance_budget_exceeded',
        operation,
        metric: 'error_rate',
        value: errorRate,
        threshold: budget.errorRateThreshold,
        timestamp: new Date()
      });
    }
    
    // Check p95 threshold if defined
    if (budget.p95Threshold) {
      const metrics = this.getOperationMetrics(operation);
      const p95 = this.getPercentile(metrics, 95);
      
      if (p95 > budget.p95Threshold) {
        this.emitAlert({
          type: 'performance_budget_exceeded',
          operation,
          metric: 'p95',
          value: p95,
          threshold: budget.p95Threshold,
          timestamp: new Date()
        });
      }
    }
  }

  private emitAlert(alert: any): void {
    for (const handler of this.alertHandlers) {
      handler(alert);
    }
    
    this.eventEmitter.emit('alert', alert);
  }

  async flush(): Promise<void> {
    const promises = this.providers.map(provider => provider.flush());
    await Promise.all(promises);
  }

  on(event: 'metric' | 'alert', handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: 'metric' | 'alert', handler: (data: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
}

// Export default in-memory provider
export const createInMemoryMetricsProvider = (eventEmitter?: EventEmitter) => 
  new InMemoryMetricsProvider(eventEmitter);
