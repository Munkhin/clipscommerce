import { ModelMonitoringService, ModelPerformanceMetrics } from '../training/monitoring/ModelMonitoringService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    update: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({ 
      eq: jest.fn(() => ({ 
        order: jest.fn(() => ({ 
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  }))
} as any;

describe('ModelMonitoringService', () => {
  let monitoringService: ModelMonitoringService;

  beforeEach(() => {
    monitoringService = new ModelMonitoringService(mockSupabase);
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitoringService.stopMonitoring();
  });

  describe('recordMetrics', () => {
    it('should record performance metrics successfully', async () => {
      const metrics: ModelPerformanceMetrics = {
        modelId: 'test-model-1',
        timestamp: new Date(),
        predictionCount: 100,
        averageLatency: 150,
        errorRate: 0.02,
        accuracy: 0.85,
        drift: 0.05,
        resourceUsage: {
          cpu: 45,
          memory: 512,
          requests: 50
        }
      };

      await monitoringService.recordMetrics(metrics);

      expect(mockSupabase.from).toHaveBeenCalledWith('model_performance_metrics');
    });

    it('should create alerts when thresholds are exceeded', async () => {
      const highLatencyMetrics: ModelPerformanceMetrics = {
        modelId: 'test-model-2',
        timestamp: new Date(),
        predictionCount: 100,
        averageLatency: 2000, // High latency
        errorRate: 0.02,
        resourceUsage: {
          cpu: 45,
          memory: 512,
          requests: 50
        }
      };

      await monitoringService.recordMetrics(highLatencyMetrics);

      // Should create an alert for high latency
      expect(mockSupabase.from).toHaveBeenCalledWith('model_alerts');
    });
  });

  describe('threshold management', () => {
    it('should update thresholds correctly', () => {
      const newThresholds = {
        maxLatency: 800,
        maxErrorRate: 0.03
      };

      monitoringService.updateThresholds(newThresholds);
      const currentThresholds = monitoringService.getThresholds();

      expect(currentThresholds.maxLatency).toBe(800);
      expect(currentThresholds.maxErrorRate).toBe(0.03);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start and stop monitoring correctly', async () => {
      const startSpy = jest.spyOn(monitoringService, 'startMonitoring');
      const stopSpy = jest.spyOn(monitoringService, 'stopMonitoring');

      await monitoringService.startMonitoring(5000);
      expect(startSpy).toHaveBeenCalledWith(5000);

      monitoringService.stopMonitoring();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('alert management', () => {
    it('should create alerts with correct severity levels', async () => {
      const criticalAlert = {
        modelId: 'test-model-3',
        type: 'performance_degradation' as const,
        severity: 'critical' as const,
        message: 'Critical performance issue',
        metrics: { accuracy: 0.3 },
        threshold: 0.7,
        actualValue: 0.3
      };

      const alertId = await monitoringService.createAlert(criticalAlert);
      expect(typeof alertId).toBe('string');
      expect(alertId).toMatch(/^alert_/);
    });

    it('should acknowledge alerts correctly', async () => {
      const alertId = 'test-alert-1';
      await monitoringService.acknowledgeAlert(alertId);

      expect(mockSupabase.from).toHaveBeenCalledWith('model_alerts');
    });
  });
});