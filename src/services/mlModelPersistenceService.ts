/**
 * Machine Learning Model Persistence Service
 * 
 * Provides production-grade model persistence, versioning, and A/B testing
 * capabilities for the content optimization system.
 */

import Redis from 'ioredis';
import { Pool } from 'pg';
import { MetricsTracker } from '@/lib/utils/metrics';
import { EnhancedCache } from '@/lib/utils/caching';
import crypto from 'crypto';

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  type: 'contextual_bandit' | 'content_optimization' | 'engagement_prediction';
  parameters: Record<string, any>;
  performance: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    customMetrics?: Record<string, number>;
  };
  trainingData: {
    samples: number;
    features: number;
    trainingTime: number;
    datasetHash: string;
  };
  deployment: {
    status: 'training' | 'staging' | 'production' | 'retired';
    deployedAt?: Date;
    trafficPercentage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  models: {
    control: string; // Model ID
    treatment: string[]; // Array of model IDs
  };
  trafficSplit: Record<string, number>; // modelId -> percentage
  metrics: string[];
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  results?: ABTestResults;
}

export interface ABTestResults {
  controlPerformance: Record<string, number>;
  treatmentPerformance: Record<string, Record<string, number>>;
  statisticalSignificance: Record<string, number>;
  winner?: string;
  confidenceLevel: number;
  analysisDate: Date;
}

export interface ModelSnapshot {
  modelId: string;
  version: string;
  snapshot: Buffer | string; // Serialized model data
  format: 'json' | 'binary' | 'tensorflow' | 'pytorch';
  size: number;
  checksum: string;
  createdAt: Date;
}

/**
 * Production-grade ML model persistence service
 */
export class MLModelPersistenceService {
  private redis: Redis | null = null;
  private postgres: Pool | null = null;
  private cache: EnhancedCache<string, any>;
  private metrics: MetricsTracker;

  constructor(redisUrl?: string, postgresConfig?: any) {
    this.cache = new EnhancedCache({ 
      namespace: 'ml-models',
      ttl: 1800000 // 30 minutes
    });
    this.metrics = new MetricsTracker();

    // Initialize Redis
    if (redisUrl || process.env.REDIS_URL) {
      try {
        this.redis = new Redis(redisUrl || process.env.REDIS_URL!);
        console.log('✅ ML Persistence Service connected to Redis');
      } catch (error) {
        console.warn('⚠️ Failed to connect to Redis:', error);
      }
    }

    // Initialize PostgreSQL
    if (postgresConfig || process.env.DATABASE_URL) {
      try {
        this.postgres = new Pool(postgresConfig || {
          connectionString: process.env.DATABASE_URL
        });
        console.log('✅ ML Persistence Service connected to PostgreSQL');
        this.initializeDatabase();
      } catch (error) {
        console.warn('⚠️ Failed to connect to PostgreSQL:', error);
      }
    }
  }

  /**
   * Initialize database tables for model persistence
   */
  private async initializeDatabase(): Promise<void> {
    if (!this.postgres) return;

    try {
      await this.postgres.query(`
        CREATE TABLE IF NOT EXISTS ml_models (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(100) NOT NULL,
          type VARCHAR(100) NOT NULL,
          parameters JSONB,
          performance JSONB,
          training_data JSONB,
          deployment JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(name, version)
        );
      `);

      await this.postgres.query(`
        CREATE TABLE IF NOT EXISTS ab_tests (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          models JSONB NOT NULL,
          traffic_split JSONB NOT NULL,
          metrics JSONB NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          status VARCHAR(50) NOT NULL,
          results JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await this.postgres.query(`
        CREATE TABLE IF NOT EXISTS model_snapshots (
          id SERIAL PRIMARY KEY,
          model_id VARCHAR(255) NOT NULL,
          version VARCHAR(100) NOT NULL,
          snapshot_data BYTEA,
          format VARCHAR(50) NOT NULL,
          size BIGINT NOT NULL,
          checksum VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          INDEX(model_id, version)
        );
      `);

      await this.postgres.query(`
        CREATE TABLE IF NOT EXISTS model_performance_logs (
          id SERIAL PRIMARY KEY,
          model_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW(),
          metrics JSONB NOT NULL,
          context JSONB,
          INDEX(model_id, timestamp)
        );
      `);

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database tables:', error);
    }
  }

  /**
   * Save model metadata and snapshot
   */
  async saveModel(
    metadata: ModelMetadata, 
    modelData?: Buffer | string
  ): Promise<void> {
    return this.metrics.timeAsync('saveModel', async () => {
      // Save metadata to PostgreSQL
      if (this.postgres) {
        await this.postgres.query(`
          INSERT INTO ml_models (
            id, name, version, type, parameters, performance, 
            training_data, deployment, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (name, version) 
          DO UPDATE SET 
            parameters = $5,
            performance = $6,
            training_data = $7,
            deployment = $8,
            updated_at = $10
        `, [
          metadata.id,
          metadata.name,
          metadata.version,
          metadata.type,
          JSON.stringify(metadata.parameters),
          JSON.stringify(metadata.performance),
          JSON.stringify(metadata.trainingData),
          JSON.stringify(metadata.deployment),
          metadata.createdAt,
          metadata.updatedAt
        ]);
      }

      // Save model snapshot if provided
      if (modelData) {
        await this.saveModelSnapshot({
          modelId: metadata.id,
          version: metadata.version,
          snapshot: modelData,
          format: typeof modelData === 'string' ? 'json' : 'binary',
          size: Buffer.isBuffer(modelData) ? modelData.length : Buffer.byteLength(modelData),
          checksum: this.calculateChecksum(modelData),
          createdAt: new Date()
        });
      }

      // Cache metadata
      this.cache.set(`model:${metadata.id}`, metadata);
      
      this.metrics.increment('modelsSaved');
      console.log(`Saved model ${metadata.name} v${metadata.version}`);
    });
  }

  /**
   * Load model metadata
   */
  async loadModel(modelId: string): Promise<ModelMetadata | null> {
    return this.metrics.timeAsync('loadModel', async () => {
      // Check cache first
      const cached = this.cache.get(`model:${modelId}`);
      if (cached) {
        this.metrics.increment('cacheHits');
        return cached;
      }

      if (!this.postgres) return null;

      try {
        const result = await this.postgres.query(
          'SELECT * FROM ml_models WHERE id = $1',
          [modelId]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        const metadata: ModelMetadata = {
          id: row.id,
          name: row.name,
          version: row.version,
          type: row.type,
          parameters: row.parameters,
          performance: row.performance,
          trainingData: row.training_data,
          deployment: row.deployment,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        this.cache.set(`model:${modelId}`, metadata);
        this.metrics.increment('modelsLoaded');
        
        return metadata;
      } catch (error) {
        console.error('Failed to load model:', error);
        this.metrics.recordError(error);
        return null;
      }
    });
  }

  /**
   * Save model snapshot to storage
   */
  async saveModelSnapshot(snapshot: ModelSnapshot): Promise<void> {
    if (!this.postgres) return;

    await this.postgres.query(`
      INSERT INTO model_snapshots (
        model_id, version, snapshot_data, format, size, checksum
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      snapshot.modelId,
      snapshot.version,
      snapshot.snapshot,
      snapshot.format,
      snapshot.size,
      snapshot.checksum
    ]);

    // Also cache in Redis for faster access
    if (this.redis && snapshot.size < 10 * 1024 * 1024) { // Only cache if < 10MB
      await this.redis.setex(
        `snapshot:${snapshot.modelId}:${snapshot.version}`,
        3600, // 1 hour
        snapshot.snapshot.toString()
      );
    }
  }

  /**
   * Load model snapshot from storage
   */
  async loadModelSnapshot(modelId: string, version: string): Promise<ModelSnapshot | null> {
    // Try Redis first
    if (this.redis) {
      const cached = await this.redis.get(`snapshot:${modelId}:${version}`);
      if (cached) {
        return {
          modelId,
          version,
          snapshot: cached,
          format: 'json',
          size: Buffer.byteLength(cached),
          checksum: this.calculateChecksum(cached),
          createdAt: new Date()
        };
      }
    }

    if (!this.postgres) return null;

    try {
      const result = await this.postgres.query(
        'SELECT * FROM model_snapshots WHERE model_id = $1 AND version = $2',
        [modelId, version]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        modelId: row.model_id,
        version: row.version,
        snapshot: row.snapshot_data,
        format: row.format,
        size: row.size,
        checksum: row.checksum,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Failed to load model snapshot:', error);
      return null;
    }
  }

  /**
   * Create A/B test configuration
   */
  async createABTest(config: ABTestConfig): Promise<void> {
    if (!this.postgres) return;

    await this.postgres.query(`
      INSERT INTO ab_tests (
        id, name, description, models, traffic_split, metrics,
        start_date, end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      config.id,
      config.name,
      config.description,
      JSON.stringify(config.models),
      JSON.stringify(config.trafficSplit),
      JSON.stringify(config.metrics),
      config.startDate,
      config.endDate,
      config.status
    ]);

    this.cache.set(`abtest:${config.id}`, config);
    console.log(`Created A/B test: ${config.name}`);
  }

  /**
   * Update A/B test results
   */
  async updateABTestResults(testId: string, results: ABTestResults): Promise<void> {
    if (!this.postgres) return;

    await this.postgres.query(`
      UPDATE ab_tests 
      SET results = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(results), testId]);

    // Update cache
    const config = await this.getABTest(testId);
    if (config) {
      config.results = results;
      this.cache.set(`abtest:${testId}`, config);
    }
  }

  /**
   * Get A/B test configuration
   */
  async getABTest(testId: string): Promise<ABTestConfig | null> {
    const cached = this.cache.get(`abtest:${testId}`);
    if (cached) return cached;

    if (!this.postgres) return null;

    try {
      const result = await this.postgres.query(
        'SELECT * FROM ab_tests WHERE id = $1',
        [testId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const config: ABTestConfig = {
        id: row.id,
        name: row.name,
        description: row.description,
        models: row.models,
        trafficSplit: row.traffic_split,
        metrics: row.metrics,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        results: row.results
      };

      this.cache.set(`abtest:${testId}`, config);
      return config;
    } catch (error) {
      console.error('Failed to get A/B test:', error);
      return null;
    }
  }

  /**
   * Log model performance metrics
   */
  async logPerformance(
    modelId: string, 
    metrics: Record<string, number>,
    context?: Record<string, any>
  ): Promise<void> {
    if (!this.postgres) return;

    await this.postgres.query(`
      INSERT INTO model_performance_logs (model_id, metrics, context)
      VALUES ($1, $2, $3)
    `, [modelId, JSON.stringify(metrics), JSON.stringify(context || {})]);

    // Also store in Redis for real-time monitoring
    if (this.redis) {
      await this.redis.lpush(
        `perf:${modelId}`,
        JSON.stringify({ metrics, context, timestamp: new Date() })
      );
      await this.redis.ltrim(`perf:${modelId}`, 0, 999); // Keep last 1000 entries
    }
  }

  /**
   * Get model performance history
   */
  async getPerformanceHistory(
    modelId: string, 
    limit = 100
  ): Promise<Array<{timestamp: Date, metrics: Record<string, number>, context?: any}>> {
    if (!this.postgres) return [];

    try {
      const result = await this.postgres.query(`
        SELECT timestamp, metrics, context 
        FROM model_performance_logs 
        WHERE model_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [modelId, limit]);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        metrics: row.metrics,
        context: row.context
      }));
    } catch (error) {
      console.error('Failed to get performance history:', error);
      return [];
    }
  }

  /**
   * List models by type or status
   */
  async listModels(
    filters: {
      type?: string;
      status?: string;
      limit?: number;
    } = {}
  ): Promise<ModelMetadata[]> {
    if (!this.postgres) return [];

    let query = 'SELECT * FROM ml_models WHERE 1=1';
    const params: any[] = [];

    if (filters.type) {
      query += ' AND type = $' + (params.length + 1);
      params.push(filters.type);
    }

    if (filters.status) {
      query += ' AND deployment->\'status\' = $' + (params.length + 1);
      params.push(`"${filters.status}"`);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT $' + (params.length + 1);
      params.push(filters.limit);
    }

    try {
      const result = await this.postgres.query(query, params);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        version: row.version,
        type: row.type,
        parameters: row.parameters,
        performance: row.performance,
        trainingData: row.training_data,
        deployment: row.deployment,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  /**
   * Deploy model to production
   */
  async deployModel(
    modelId: string, 
    trafficPercentage = 100
  ): Promise<void> {
    const model = await this.loadModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    model.deployment.status = 'production';
    model.deployment.deployedAt = new Date();
    model.deployment.trafficPercentage = trafficPercentage;
    model.updatedAt = new Date();

    await this.saveModel(model);
    console.log(`Deployed model ${model.name} v${model.version} to production`);
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: Buffer | string): string {
    if (typeof data === 'string') {
      return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    } else {
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Close database connections
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    if (this.postgres) {
      await this.postgres.end();
    }
  }
}

// Export singleton instance
export const mlModelPersistenceService = new MLModelPersistenceService();