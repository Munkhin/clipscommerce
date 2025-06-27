/**
 * Distributed tracing system for tracking request flows across services
 */
import EventEmitter from 'events';
import { Span, MetricsCollector } from './MetricsCollector';

// Context propagation interface
export interface TraceContext {
  traceId: string;
  spanId: string;
  baggage: Record<string, string>;
}

// Span exporter interface for sending spans to external systems
export interface SpanExporter {
  exportSpans(spans: Span[]): Promise<void>;
}

// Console span exporter for development
class ConsoleSpanExporter implements SpanExporter {
  async exportSpans(spans: Span[]): Promise<void> {
    for (const span of spans) {
      console.log('[Trace]', JSON.stringify(span, null, 2));
    }
  }
}

// Trace sampling decision
export type SamplingDecision = 'record_and_sample' | 'record' | 'drop';

// Trace sampler interface
export interface TraceSampler {
  shouldSample(traceId: string, operation: string): SamplingDecision;
}

// Always sample for development
class AlwaysSampleSampler implements TraceSampler {
  shouldSample(_traceId: string, _operation: string): SamplingDecision {
    return 'record_and_sample';
  }
}

// Rate limiting sampler for production
class RateLimitingSampler implements TraceSampler {
  private readonly samplesPerSecond: number;
  private tokenBucket: number;
  private lastRefillTime: number;

  constructor(samplesPerSecond: number) {
    this.samplesPerSecond = samplesPerSecond;
    this.tokenBucket = samplesPerSecond;
    this.lastRefillTime = Date.now();
  }

  shouldSample(_traceId: string, _operation: string): SamplingDecision {
    const now = Date.now();
    const elapsedSecs = (now - this.lastRefillTime) / 1000;
    
    // Refill the bucket
    if (elapsedSecs > 0) {
      this.tokenBucket = Math.min(
        this.samplesPerSecond,
        this.tokenBucket + this.samplesPerSecond * elapsedSecs
      );
      this.lastRefillTime = now;
    }
    
    if (this.tokenBucket >= 1) {
      this.tokenBucket -= 1;
      return 'record_and_sample';
    }
    
    // Always record, but only sample at the configured rate
    return 'record';
  }
}

// Tracer configuration
export interface TracerConfig {
  serviceName: string;
  environment: 'development' | 'test' | 'production';
  samplingRate?: number;
  exportBatchSize?: number;
  exportInterval?: number;
}

// Main tracer implementation
export class Tracer {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly sampler: TraceSampler;
  private readonly exporters: SpanExporter[] = [];
  private readonly activeSpans: Map<string, Span> = new Map();
  private readonly finishedSpans: Span[] = [];
  private readonly exportBatchSize: number;
  private readonly exportInterval: number;
  private exportTimer: NodeJS.Timeout | null = null;
  private metricsCollector: MetricsCollector | null = null;
  private eventEmitter = new EventEmitter();
  
  constructor(config: TracerConfig) {
    this.serviceName = config.serviceName;
    this.environment = config.environment;
    
    // Configure sampler
    if (config.environment === 'development') {
      this.sampler = new AlwaysSampleSampler();
    } else {
      this.sampler = new RateLimitingSampler(config.samplingRate || 10);
    }
    
    // Configure export settings
    this.exportBatchSize = config.exportBatchSize || 100;
    this.exportInterval = config.exportInterval || 5000;
    
    // Add default console exporter in development
    if (config.environment === 'development') {
      this.addExporter(new ConsoleSpanExporter());
    }
    
    // Start export timer
    this.startExportTimer();
  }

  setMetricsCollector(collector: MetricsCollector): void {
    this.metricsCollector = collector;
  }

  addExporter(exporter: SpanExporter): void {
    this.exporters.push(exporter);
  }

  createTraceContext(): TraceContext {
    return {
      traceId: this.generateId(),
      spanId: this.generateId(),
      baggage: {}
    };
  }

  startSpan(operation: string, parentContext?: TraceContext): Span & { context: TraceContext } {
    const spanId = this.generateId();
    const traceId = parentContext?.traceId || this.generateId();
    const parentId = parentContext?.spanId;
    
    // Apply sampling decision
    const samplingDecision = this.sampler.shouldSample(traceId, operation);
    
    const span: Span & { context: TraceContext } = {
      id: spanId,
      traceId,
      parentId,
      operation,
      startTime: Date.now(),
      attributes: {
        'service.name': this.serviceName,
        'environment': this.environment,
        'span.kind': 'internal'
      },
      events: [],
      status: 'unset',
      
      context: {
        traceId,
        spanId,
        baggage: parentContext?.baggage || {}
      },
      
      recordException(error: Error): void {
        this.events.push({
          name: 'exception',
          timestamp: Date.now(),
          attributes: {
            'exception.type': error.name,
            'exception.message': error.message,
            'exception.stacktrace': error.stack
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
    
    // Track active span
    this.activeSpans.set(spanId, span);
    
    // Emit event for span started
    this.eventEmitter.emit('span.start', span);
    
    return span;
  }

  finishSpan(span: Span): void {
    if (!span.endTime) {
      span.finish();
    }
    
    // Record metric if available
    if (this.metricsCollector) {
      const duration = (span.endTime || Date.now()) - span.startTime;
      this.metricsCollector.recordMetric({
        name: 'span_duration',
        type: 'histogram',
        labels: {
          operation: span.operation,
          service: this.serviceName,
          status: span.status
        },
        value: duration
      });
    }
    
    // Remove from active spans
    this.activeSpans.delete(span.id);
    
    // Add to finished spans for export
    this.finishedSpans.push(span);
    
    // Emit event for span finished
    this.eventEmitter.emit('span.finish', span);
    
    // Export if batch size reached
    if (this.finishedSpans.length >= this.exportBatchSize) {
      this.exportSpans();
    }
  }

  async withSpan<T>(operation: string, fn: (span: Span & { context: TraceContext }) => Promise<T>, parentContext?: TraceContext): Promise<T> {
    const span = this.startSpan(operation, parentContext);
    
    try {
      const result = await fn(span);
      this.finishSpan(span);
      return result;
    } catch (error) {
      const err = error as Error;
      span.recordException(err);
      this.finishSpan(span);
      throw error;
    }
  }

  private startExportTimer(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }
    
    this.exportTimer = setInterval(() => {
      this.exportSpans();
    }, this.exportInterval);
  }

  private async exportSpans(): Promise<void> {
    if (this.finishedSpans.length === 0) return;
    
    const spans = [...this.finishedSpans];
    this.finishedSpans.length = 0;
    
    // Export to all exporters
    const promises = this.exporters.map(exporter => exporter.exportSpans(spans));
    await Promise.all(promises);
  }

  on(event: 'span.start' | 'span.finish', handler: (span: Span) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: 'span.start' | 'span.finish', handler: (span: Span) => void): void {
    this.eventEmitter.off(event, handler);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  async flush(): Promise<void> {
    await this.exportSpans();
  }

  shutdown(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }
    
    this.exportSpans().catch(console.error);
  }
}

// Create a default tracer for development
export const createDevTracer = (serviceName: string) => 
  new Tracer({
    serviceName,
    environment: 'development',
    exportInterval: 1000
  });
