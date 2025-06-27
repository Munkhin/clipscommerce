/**
 * Next.js Instrumentation File - Initializes OpenTelemetry SDK
 * 
 * This file is automatically loaded by Next.js when the experimental.instrumentationHook
 * feature is enabled in next.config.js
 * 
 * Implements Task 4.1.1: Complete OpenTelemetry SDK Integration
 * - Finalize Span Context Propagation
 * - Complete Exporter Wiring  
 * - Ensure Trace/Span ID Emission
 */

export async function register() {
  // Only initialize telemetry on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeTelemetry } = await import('./src/instrumentation/telemetry');
    
    try {
      // Initialize OpenTelemetry with environment-specific configuration
      const telemetry = initializeTelemetry({
        serviceName: 'clipscommerce',
        serviceVersion: process.env.npm_package_version || '1.0.0',
        environment: (process.env.NODE_ENV as any) || 'development',
        otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        exporterType: process.env.OTEL_EXPORTER_TYPE as any || (process.env.NODE_ENV === 'production' ? 'otlp' : 'console'),
        sampling: {
          rate: process.env.OTEL_SAMPLING_RATE ? parseFloat(process.env.OTEL_SAMPLING_RATE) : (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),
          parentBased: true
        },
        customAttributes: {
          'deployment.environment': process.env.NODE_ENV || 'development',
          'service.namespace': 'clipscommerce',
          'service.instance.id': process.env.HOSTNAME || process.env.VERCEL_REGION || 'local',
          'deployment.version': process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
        }
      });

      console.info('🔍 OpenTelemetry instrumentation initialized successfully');
      
      // Add global error handlers with tracing
      process.on('uncaughtException', (error) => {
        telemetry.recordError(error, { 
          'error.type': 'uncaughtException',
          'process.pid': process.pid 
        });
        console.error('Uncaught Exception:', error);
      });

      process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        telemetry.recordError(error, { 
          'error.type': 'unhandledRejection',
          'process.pid': process.pid 
        });
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });

    } catch (error) {
      console.error('Failed to initialize OpenTelemetry instrumentation:', error);
      // Don't throw - allow the application to continue without telemetry
    }
  }
} 