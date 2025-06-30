// Fallback imports with error handling for missing OpenTelemetry dependencies
type NodeTracerProviderType = typeof import('@opentelemetry/sdk-node').NodeTracerProvider;
type ResourceType = typeof import('@opentelemetry/resources').Resource;
type SemanticResourceAttributesType = typeof import('@opentelemetry/semantic-conventions').SemanticResourceAttributes;
type SimpleSpanProcessorType = typeof import('@opentelemetry/sdk-trace-node').SimpleSpanProcessor;
type BatchSpanProcessorType = typeof import('@opentelemetry/sdk-trace-node').BatchSpanProcessor;
type TraceIdRatioBasedSamplerType = typeof import('@opentelemetry/sdk-trace-node').TraceIdRatioBasedSampler;
type ParentBasedSamplerType = typeof import('@opentelemetry/sdk-trace-node').ParentBasedSampler;
type ConsoleSpanExporterType = typeof import('@opentelemetry/sdk-trace-node').ConsoleSpanExporter;
type OTLPTraceExporterType = typeof import('@opentelemetry/exporter-otlp-http').OTLPTraceExporter;
type B3PropagatorType = typeof import('@opentelemetry/propagator-b3').B3Propagator;
type B3InjectEncodingType = typeof import('@opentelemetry/propagator-b3').B3InjectEncoding;
type JaegerPropagatorType = typeof import('@opentelemetry/propagator-jaeger').JaegerPropagator;
type CompositePropagatorType = typeof import('@opentelemetry/core').CompositePropagator;
type W3CTraceContextPropagatorType = typeof import('@opentelemetry/core').W3CTraceContextPropagator;
type W3CBaggagePropagatorType = typeof import('@opentelemetry/core').W3CBaggagePropagator;
type RegisterInstrumentationsType = typeof import('@opentelemetry/instrumentation').registerInstrumentations;
type HttpInstrumentationType = typeof import('@opentelemetry/instrumentation-http').HttpInstrumentation;
type ExpressInstrumentationType = typeof import('@opentelemetry/instrumentation-express').ExpressInstrumentation;
type RedisInstrumentationType = any; // Optional Redis instrumentation
type GetNodeAutoInstrumentationsType = typeof import('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
type ContextType = typeof import('@opentelemetry/api').context;
type TraceType = typeof import('@opentelemetry/api').trace;
type SpanStatusCodeType = typeof import('@opentelemetry/api').SpanStatusCode;
type SpanKindType = typeof import('@opentelemetry/api').SpanKind;
type PropagationType = typeof import('@opentelemetry/api').propagation;

let NodeTracerProvider: NodeTracerProviderType | null = null;
let Resource: ResourceType | null = null;
let SemanticResourceAttributes: SemanticResourceAttributesType | Record<string, string> = {};
let SimpleSpanProcessor: SimpleSpanProcessorType | null = null;
let BatchSpanProcessor: BatchSpanProcessorType | null = null;
let TraceIdRatioBasedSampler: TraceIdRatioBasedSamplerType | null = null;
let ParentBasedSampler: ParentBasedSamplerType | null = null;
let ConsoleSpanExporter: ConsoleSpanExporterType | null = null;
let OTLPTraceExporter: OTLPTraceExporterType | null = null;
let B3Propagator: B3PropagatorType | null = null;
let B3InjectEncoding: B3InjectEncodingType | Record<string, unknown> = {};
let JaegerPropagator: JaegerPropagatorType | null = null;
let CompositePropagator: CompositePropagatorType | null = null;
let W3CTraceContextPropagator: W3CTraceContextPropagatorType | null = null;
let W3CBaggagePropagator: W3CBaggagePropagatorType | null = null;
let registerInstrumentations: RegisterInstrumentationsType | null = null;
let HttpInstrumentation: HttpInstrumentationType | null = null;
let ExpressInstrumentation: ExpressInstrumentationType | null = null;
let RedisInstrumentation: RedisInstrumentationType | null = null;
let getNodeAutoInstrumentations: GetNodeAutoInstrumentationsType | null = null;
let context: ContextType | null = null;
let trace: TraceType | null = null;
let SpanStatusCode: SpanStatusCodeType | Record<string, number> = {};
let SpanKind: SpanKindType | Record<string, number> = {};
let propagation: PropagationType | null = null;

// Dynamic imports with fallbacks
(async () => {
  try {
    const sdkNode = await import('@opentelemetry/sdk-node');
    NodeTracerProvider = sdkNode.NodeTracerProvider;
    
    const resources = await import('@opentelemetry/resources');
    Resource = resources.Resource;
    
    const semanticConventions = await import('@opentelemetry/semantic-conventions');
    SemanticResourceAttributes = semanticConventions.SemanticResourceAttributes || {};
    
    const sdkTraceNode = await import('@opentelemetry/sdk-trace-node');
    SimpleSpanProcessor = sdkTraceNode.SimpleSpanProcessor;
    BatchSpanProcessor = sdkTraceNode.BatchSpanProcessor;
    TraceIdRatioBasedSampler = sdkTraceNode.TraceIdRatioBasedSampler;
    ParentBasedSampler = sdkTraceNode.ParentBasedSampler;
    ConsoleSpanExporter = sdkTraceNode.ConsoleSpanExporter;
    
    try {
      const otlpExporter = await import('@opentelemetry/exporter-otlp-http');
      OTLPTraceExporter = otlpExporter.OTLPTraceExporter;
    } catch (error) {
      console.warn('OTLP exporter not available:', (error as Error).message);
      OTLPTraceExporter = null;
    }
    
    try {
      const b3Propagator = await import('@opentelemetry/propagator-b3');
      B3Propagator = b3Propagator.B3Propagator;
      B3InjectEncoding = b3Propagator.B3InjectEncoding || {};
    } catch (error) {
      console.warn('B3 propagator not available:', (error as Error).message);
      B3Propagator = null;
      B3InjectEncoding = {};
    }
    
    try {
      const jaegerPropagator = await import('@opentelemetry/propagator-jaeger');
      JaegerPropagator = jaegerPropagator.JaegerPropagator;
    } catch (error) {
      console.warn('Jaeger propagator not available:', (error as Error).message);
      JaegerPropagator = null;
    }
    
    try {
      const core = await import('@opentelemetry/core');
      CompositePropagator = core.CompositePropagator;
      W3CTraceContextPropagator = core.W3CTraceContextPropagator;
      W3CBaggagePropagator = core.W3CBaggagePropagator;
    } catch (error) {
      console.warn('OpenTelemetry core modules not available:', (error as Error).message);
      CompositePropagator = null;
      W3CTraceContextPropagator = null;
      W3CBaggagePropagator = null;
    }
    
    try {
      const instrumentation = await import('@opentelemetry/instrumentation');
      registerInstrumentations = instrumentation.registerInstrumentations;
    } catch (error) {
      console.warn('OpenTelemetry instrumentation not available:', (error as Error).message);
      registerInstrumentations = null;
    }
    
    try {
      const httpInstrumentation = await import('@opentelemetry/instrumentation-http');
      HttpInstrumentation = httpInstrumentation.HttpInstrumentation;
    } catch (error) {
      console.warn('HTTP instrumentation not available:', (error as Error).message);
      HttpInstrumentation = null;
    }
    
    try {
      const expressInstrumentation = await import('@opentelemetry/instrumentation-express');
      ExpressInstrumentation = expressInstrumentation.ExpressInstrumentation;
    } catch (error) {
      console.warn('Express instrumentation not available:', (error as Error).message);
      ExpressInstrumentation = null;
    }
    
    try {
      const redisInstrumentation = await import('@opentelemetry/instrumentation-redis');
      RedisInstrumentation = redisInstrumentation.RedisInstrumentation;
    } catch (error) {
      console.warn('Redis instrumentation not available:', (error as Error).message);
      RedisInstrumentation = null;
    }
    
    try {
      const autoInstrumentations = await import('@opentelemetry/auto-instrumentations-node');
      getNodeAutoInstrumentations = autoInstrumentations.getNodeAutoInstrumentations;
    } catch (error) {
      console.warn('Auto instrumentations not available:', (error as Error).message);
      getNodeAutoInstrumentations = null;
    }
    
    const api = await import('@opentelemetry/api');
    context = api.context;
    trace = api.trace;
    SpanStatusCode = api.SpanStatusCode || {};
    SpanKind = api.SpanKind || {};
    propagation = api.propagation;
  } catch (error) {
    console.warn('OpenTelemetry dependencies not available:', error.message);
  }
})();

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
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
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
  private provider: InstanceType<NodeTracerProviderType> | null = null;
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

    // Check if OpenTelemetry dependencies are available
    if (!NodeTracerProvider || !Resource) {
      console.warn('OpenTelemetry dependencies not available, skipping telemetry initialization');
      this.initialized = true;
      return;
    }

    try {
      // Create resource with service information
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME || 'service.name']: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION || 'service.version']: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT || 'deployment.environment']: this.config.environment,
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
      // Don't throw error, just log it to prevent breaking the app
      this.initialized = true;
    }
  }

  private createSampler() {
    if (!TraceIdRatioBasedSampler || !ParentBasedSampler) {
      return null;
    }

    const baseSampler = new TraceIdRatioBasedSampler(this.config.sampling.rate);
    
    if (this.config.sampling.parentBased) {
      return new ParentBasedSampler({
        root: baseSampler
      });
    }
    
    return baseSampler;
  }

  private configureExporters(): void {
    if (!this.provider || !SimpleSpanProcessor || !ConsoleSpanExporter) return;

    const { performance } = this.config;

    switch (this.config.exporterType) {
      case 'console':
        if (ConsoleSpanExporter) {
          this.provider.addSpanProcessor(
            new SimpleSpanProcessor(new ConsoleSpanExporter())
          );
        }
        break;

      case 'otlp': {
        if (OTLPTraceExporter && BatchSpanProcessor) {
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
        }
        break;
      }

      case 'multi': {
        // Console for development visibility
        if (ConsoleSpanExporter) {
          this.provider.addSpanProcessor(
            new SimpleSpanProcessor(new ConsoleSpanExporter())
          );
        }
        
        // OTLP for production telemetry
        if (OTLPTraceExporter && BatchSpanProcessor) {
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
        }
        break;
      }

      default:
        console.warn(`Unknown exporter type: ${this.config.exporterType}, falling back to console`);
        if (ConsoleSpanExporter) {
          this.provider.addSpanProcessor(
            new SimpleSpanProcessor(new ConsoleSpanExporter())
          );
        }
    }
  }

  private configurePropagation(): void {
    if (!propagation || !CompositePropagator) return;

    try {
      // Configure multiple propagators for compatibility
      const propagators = [];
      
      if (W3CTraceContextPropagator) propagators.push(new W3CTraceContextPropagator());
      if (W3CBaggagePropagator) propagators.push(new W3CBaggagePropagator());
      if (B3Propagator) propagators.push(new B3Propagator({ injectEncoding: (B3InjectEncoding as any).MULTI_HEADER || 0 }));
      if (JaegerPropagator) propagators.push(new JaegerPropagator());
      
      if (propagators.length > 0) {
        propagation.setGlobalPropagator(
          new CompositePropagator({ propagators })
        );
      }
    } catch (error) {
      console.warn('Failed to configure propagation:', error.message);
    }
  }

  private registerInstrumentations(): void {
    if (!registerInstrumentations) return;

    try {
      const instrumentations = [];
      
      // Auto-instrumentations for common libraries
      if (getNodeAutoInstrumentations) {
        instrumentations.push(
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              ignoreIncomingRequestHook: (req: { url?: string }) => {
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
              enabled: false, // Redis instrumentation package not installed
            },
          })
        );
      }

      // Custom instrumentations
      if (HttpInstrumentation) {
        instrumentations.push(
          new HttpInstrumentation({
            requestHook: (span: any, request: any) => {
              if (span && span.setAttributes) {
                span.setAttributes({
                  'http.request.header.user-agent': request.getHeader?.('user-agent') || '',
                  'http.request.header.x-forwarded-for': request.getHeader?.('x-forwarded-for') || '',
                });
              }
            },
            responseHook: (span: any, response: any) => {
              if (span && span.setAttributes) {
                span.setAttributes({
                  'http.response.header.content-length': response.getHeader?.('content-length') || '',
                });
              }
            }
          })
        );
      }

      if (instrumentations.length > 0) {
        registerInstrumentations({ instrumentations });
      }
    } catch (error) {
      console.warn('Failed to register instrumentations:', error.message);
    }
  }

  public shutdown(): Promise<void> {
    if (this.provider) {
      return this.provider.shutdown();
    }
    return Promise.resolve();
  }

  public getTracer(name: string, version?: string) {
    if (trace && trace.getTracer) {
      return trace.getTracer(name, version);
    }
    return {
      startSpan: () => ({ end: () => {}, setAttributes: () => {}, setStatus: () => {}, recordException: () => {} })
    };
  }

  // Utility methods for custom instrumentation
  public createSpan(tracer: { startSpan?: (name: string, options?: unknown) => unknown }, name: string, options?: unknown) {
    if (tracer && tracer.startSpan) {
      return tracer.startSpan(name, {
        kind: SpanKind.INTERNAL || 'INTERNAL',
        ...options,
      });
    }
    return { end: () => {}, setAttributes: () => {}, setStatus: () => {}, recordException: () => {} };
  }

  public withSpan<T>(tracer: any, name: string, fn: (span: any) => Promise<T>, options?: unknown): Promise<T> {
    if (!context || !trace) {
      return fn({ end: () => {}, setAttributes: () => {}, setStatus: () => {}, recordException: () => {} });
    }

    const span = this.createSpan(tracer, name, options);
    
    return context.with(trace.setSpan(context.active(), span as any), async () => {
      try {
        const result = await fn(span);
        if (span.setStatus) {
          span.setStatus({ code: SpanStatusCode.OK || 1 });
        }
        return result;
      } catch (error) {
        if (span.recordException) {
          span.recordException(error as Error);
        }
        if (span.setStatus) {
          span.setStatus({ 
            code: SpanStatusCode.ERROR || 2, 
            message: (error as Error).message 
          });
        }
        throw error;
      } finally {
        if (span.end) {
          span.end();
        }
      }
    });
  }

  // Context propagation utilities
  public extractContext(headers: Record<string, string | string[]>) {
    if (propagation && propagation.extract && context) {
      return propagation.extract(context.active(), headers);
    }
    return {};
  }

  public injectContext(ctx: unknown, headers: Record<string, string>) {
    if (propagation && propagation.inject) {
      propagation.inject(ctx, headers);
    }
    return headers;
  }

  public getCurrentSpan() {
    if (trace && trace.getActiveSpan) {
      return trace.getActiveSpan();
    }
    return null;
  }

  public getCorrelationIds(): CorrelationIds {
    const activeSpan = this.getCurrentSpan();
    const spanContext = activeSpan?.spanContext?.();
    
    return {
      traceId: spanContext?.traceId || '',
      spanId: spanContext?.spanId || '',
      userId: activeSpan?.getAttribute?.('user.id') as string,
      sessionId: activeSpan?.getAttribute?.('session.id') as string,
      operationId: activeSpan?.getAttribute?.('operation.id') as string,
    };
  }

  public addUserContext(userId: string, userEmail?: string) {
    const activeSpan = this.getCurrentSpan();
    if (activeSpan && activeSpan.setAttributes) {
      activeSpan.setAttributes({
        'user.id': userId,
        'user.email': userEmail || '',
      });
    }
  }

  public addBusinessContext(attributes: Record<string, string | number | boolean>) {
    const activeSpan = this.getCurrentSpan();
    if (activeSpan && activeSpan.setAttributes) {
      activeSpan.setAttributes(attributes);
    }
  }

  public recordError(error: Error, context?: Record<string, unknown>) {
    const activeSpan = this.getCurrentSpan();
    if (activeSpan) {
      if (activeSpan.recordException) {
        activeSpan.recordException(error);
      }
      if (context && activeSpan.setAttributes) {
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