import { NodeTracerProvider } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { B3Propagator, B3InjectEncoding } from '@opentelemetry/propagator-b3';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { context, trace, SpanStatusCode, SpanKind, propagation } from '@opentelemetry/api';

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  otlpEndpoint?: string;
  exporterType: 'console' | 'otlp' | 'jaeger' | 'multi';
  sampling: {
    rate: number;
    parentBased: boolean;
  };
  performance: {
    batchTimeout: number;
    maxExportBatchSize: number;
    maxQueueSize: number;
  };
  customAttributes: Record<string, string>;
}

export interface CorrelationIds {
  traceId: string;
  spanId: string;
  userId?: string;
  sessionId?: string;
  operationId?: string;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  serviceName: 'clipscommerce',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  environment: (process.env.NODE_ENV as any) || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  exporterType: process.env.NODE_ENV === 'production' ? 'otlp' : 'console',
  sampling: {
    rate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    parentBased: true
  },
  performance: {
    batchTimeout: 2000,
    maxExportBatchSize: 512,
    maxQueueSize: 2048
  },
  customAttributes: {
    'deployment.environment': process.env.NODE_ENV || 'development',
    'service.namespace': 'clipscommerce',
    'service.instance.id': process.env.HOSTNAME || 'local'
  }
};

class TelemetryManager {
  private provider: NodeTracerProvider | null = null;
  private initialized = false;
  private config: TelemetryConfig;

  constructor(config?: Partial<TelemetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public initialize(): void {
    if (this.initialized) {
      console.warn('Telemetry already initialized');
      return;
    }

    try {
      // Create resource with service information
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        ...this.config.customAttributes
      });

      // Create tracer provider
      this.provider = new NodeTracerProvider({
        resource,
        sampler: this.createSampler()
      });

      // Configure exporters based on environment
      this.configureExporters();

      // Configure context propagation
      this.configurePropagation();

      // Register the provider
      this.provider.register();

      // Register instrumentations
      this.registerInstrumentations();

      this.initialized = true;
      console.info(`OpenTelemetry initialized for ${this.config.serviceName} in ${this.config.environment} mode`);

    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  private createSampler() {
    // Import sampler classes at runtime to avoid issues
    const { TraceIdRatioBasedSampler, ParentBasedSampler } = require('@opentelemetry/sdk-trace-node');
    
    const baseSampler = new TraceIdRatioBasedSampler(this.config.sampling.rate);
    
    if (this.config.sampling.parentBased) {
      return new ParentBasedSampler({
        root: baseSampler
      });
    }
    
    return baseSampler;
  }

  private configureExporters(): void {
    if (!this.provider) return;

    const { performance } = this.config;

    switch (this.config.exporterType) {
      case 'console':
        this.provider.addSpanProcessor(
          new SimpleSpanProcessor(new ConsoleSpanExporter())
        );
        break;

      case 'otlp':
        const otlpExporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
          headers: {},
        });
        this.provider.addSpanProcessor(
          new BatchSpanProcessor(otlpExporter, {
            scheduledDelayMillis: performance.batchTimeout,
            maxExportBatchSize: performance.maxExportBatchSize,
            maxQueueSize: performance.maxQueueSize,
          })
        );
        break;

      case 'multi':
        // Console for development visibility
        this.provider.addSpanProcessor(
          new SimpleSpanProcessor(new ConsoleSpanExporter())
        );
        
        // OTLP for production telemetry
        const multiOtlpExporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        });
        this.provider.addSpanProcessor(
          new BatchSpanProcessor(multiOtlpExporter, {
            scheduledDelayMillis: performance.batchTimeout,
            maxExportBatchSize: performance.maxExportBatchSize,
            maxQueueSize: performance.maxQueueSize,
          })
        );
        break;

      default:
        console.warn(`Unknown exporter type: ${this.config.exporterType}, falling back to console`);
        this.provider.addSpanProcessor(
          new SimpleSpanProcessor(new ConsoleSpanExporter())
        );
    }
  }

  private configurePropagation(): void {
    // Configure multiple propagators for compatibility
    propagation.setGlobalPropagator(
      new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator(),
          new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
          new JaegerPropagator(),
        ],
      })
    );
  }

  private registerInstrumentations(): void {
    registerInstrumentations({
      instrumentations: [
        // Auto-instrumentations for common libraries
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req) => {
              // Ignore health checks and static assets
              const url = req.url || '';
              return (
                url.includes('/_next/') ||
                url.includes('/health') ||
                url.includes('/favicon.ico') ||
                url.includes('/robots.txt') ||
                url.includes('/.well-known/')
              );
            },
            ignoredOutgoingUrls: [
              /localhost:3000/, // Ignore self-requests
            ]
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),

        // Custom instrumentations
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.header.user-agent': request.getHeader?.('user-agent') || '',
              'http.request.header.x-forwarded-for': request.getHeader?.('x-forwarded-for') || '',
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.header.content-length': response.getHeader?.('content-length') || '',
            });
          }
        }),
      ],
    });
  }

  public shutdown(): Promise<void> {
    if (this.provider) {
      return this.provider.shutdown();
    }
    return Promise.resolve();
  }

  public getTracer(name: string, version?: string) {
    return trace.getTracer(name, version);
  }

  // Utility methods for custom instrumentation
  public createSpan(tracer: any, name: string, options?: any) {
    return tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      ...options,
    });
  }

  public withSpan<T>(tracer: any, name: string, fn: (span: any) => Promise<T>, options?: any): Promise<T> {
    const span = this.createSpan(tracer, name, options);
    
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: (error as Error).message 
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Context propagation utilities
  public extractContext(headers: Record<string, string | string[]>) {
    return propagation.extract(context.active(), headers);
  }

  public injectContext(ctx: any, headers: Record<string, string>) {
    propagation.inject(ctx, headers);
    return headers;
  }

  public getCurrentSpan() {
    return trace.getActiveSpan();
  }

  public getCorrelationIds(): CorrelationIds {
    const activeSpan = this.getCurrentSpan();
    const spanContext = activeSpan?.spanContext();
    
    return {
      traceId: spanContext?.traceId || '',
      spanId: spanContext?.spanId || '',
      userId: activeSpan?.getAttribute('user.id') as string,
      sessionId: activeSpan?.getAttribute('session.id') as string,
      operationId: activeSpan?.getAttribute('operation.id') as string,
    };
  }

  public addUserContext(userId: string, userEmail?: string) {
    const activeSpan = this.getCurrentSpan();
    if (activeSpan) {
      activeSpan.setAttributes({
        'user.id': userId,
        'user.email': userEmail || '',
      });
    }
  }

  public addBusinessContext(attributes: Record<string, string | number | boolean>) {
    const activeSpan = this.getCurrentSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  public recordError(error: Error, context?: Record<string, any>) {
    const activeSpan = this.getCurrentSpan();
    if (activeSpan) {
      activeSpan.recordException(error);
      if (context) {
        activeSpan.setAttributes(context);
      }
    }
  }
}

// Singleton instance
let telemetryManager: TelemetryManager | null = null;

export function initializeTelemetry(config?: Partial<TelemetryConfig>): TelemetryManager {
  if (!telemetryManager) {
    telemetryManager = new TelemetryManager(config);
    telemetryManager.initialize();
  }
  return telemetryManager;
}

export function getTelemetry(): TelemetryManager {
  if (!telemetryManager) {
    throw new Error('Telemetry not initialized. Call initializeTelemetry() first.');
  }
  return telemetryManager;
}

// Export for use in instrumentation
export { TelemetryManager };

// Helper function to get tracer for different modules
export function getTracer(moduleName: string) {
  return getTelemetry().getTracer(`clipscommerce.${moduleName}`);
} 