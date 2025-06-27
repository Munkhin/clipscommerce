/**
 * Enhanced scanner service with advanced caching, monitoring, and resilience patterns
 */
import { Platform, ScanResult, ScanOptions, PostMetrics, ScanStatus } from './types';
import { OptimizedPostAnalyzer } from './analysis/PostAnalyzer';
import { CacheSystem } from './cache/CacheSystem';
import { MonitoringSystem } from './monitoring/MonitoringSystem';
import EventEmitter from 'events';
import { Platform as DeliverablePlatform } from '../../deliverables/types/deliverables_types';
import { retryWithBackoff } from '../../../shared_infra';
import PlatformFactory from '../lib/platforms/consolidated/PlatformFactory';
import { TikTokClient } from '../lib/platforms/TikTokClient';
import { InstagramClient } from '../lib/platforms/InstagramClient';
import { ApiConfig } from '../lib/platforms/types';
import { IAuthTokenManager, PlatformCredentials, PlatformClientIdentifier, AuthStrategy } from '../lib/auth.types';

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'closed',   // Normal operation
  OPEN = 'open',       // Failing, not allowing requests
  HALF_OPEN = 'half-open' // Testing if service is back to normal
}

// Enhanced scanner service with improved caching, monitoring, and resilience
export class EnhancedScannerService {
  private readonly platformClients: Map<Platform, any> = new Map();
  private readonly scanResults: Map<string, ScanResult> = new Map();
  private readonly SCAN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SCAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval?: NodeJS.Timeout;
  private readonly eventEmitter = new EventEmitter();
  
  // Enhanced caching system
  private readonly cacheSystem: CacheSystem;
  
  // Monitoring and metrics system
  private readonly monitoringSystem: MonitoringSystem;
  
  // Circuit breakers for platform API resilience
  private readonly circuitBreakers: Map<string, {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastStateChange: number;
    failureThreshold: number;
    successThreshold: number;
    resetTimeout: number;
  }> = new Map();
  
  constructor(
    cacheSystem?: CacheSystem,
    monitoringSystem?: MonitoringSystem
  ) {
    // Initialize enhanced caching system
    this.cacheSystem = cacheSystem || new CacheSystem({
      namespace: 'socialschedule',
      environment: process.env.NODE_ENV as any || 'development',
      redis: process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined,
      ttl: 60 * 60 * 1000, // 1 hour default
      maxSize: 5000,
      staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
      version: 'v1'
    });
    
    // Initialize monitoring system
    this.monitoringSystem = monitoringSystem || new MonitoringSystem({
      serviceName: 'scanner-service',
      environment: process.env.NODE_ENV as any || 'development',
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
    
    // Initialize circuit breakers for each platform
    for (const platform of ['tiktok', 'instagram', 'youtube'] as Platform[]) {
      this.initCircuitBreaker(`${platform}_api`, {
        failureThreshold: 5,
        successThreshold: 2,
        resetTimeout: 60000 // 1 minute
      });
    }
    
    // Forward cache metrics to monitoring system
    this.cacheSystem.on('cache.metric', (metric) => {
      this.monitoringSystem.getMetricsCollector().recordMetric({
        name: metric.name,
        type: 'gauge',
        labels: metric,
        value: typeof metric.value === 'number' ? metric.value : 1
      });
    });
    
    // Schedule periodic cleanup
    this.scheduleCleanup();
  }
  
  /**
   * Initialize a circuit breaker for a specific service
   * @param key Unique key for the service
   * @param options Circuit breaker configuration
   */
  private initCircuitBreaker(
    key: string,
    options: {
      failureThreshold: number;
      successThreshold: number;
      resetTimeout: number;
    }
  ): void {
    this.circuitBreakers.set(key, {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastStateChange: Date.now(),
      ...options
    });
    
    this.logStructured('info', `Circuit breaker initialized for ${key}`, {
      key,
      options
    });
  }
  
  /**
   * Check if an operation can be performed based on circuit breaker state
   * @param key Circuit breaker key
   * @returns True if operation can be performed
   */
  private canPerformOperation(key: string): boolean {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return true;
    
    if (breaker.state === CircuitBreakerState.OPEN) {
      // Check if reset timeout has passed
      if (Date.now() - breaker.lastStateChange > breaker.resetTimeout) {
        // Transition to half-open state
        breaker.state = CircuitBreakerState.HALF_OPEN;
        breaker.lastStateChange = Date.now();
        
        this.logStructured('info', `Circuit breaker for ${key} transitioning to half-open state`, {
          key,
          previousState: CircuitBreakerState.OPEN,
          newState: CircuitBreakerState.HALF_OPEN
        });
        
        return true;
      }
      return false;
    }
    
    return true;
  }
  
  /**
   * Record a successful operation in the circuit breaker
   * @param key Circuit breaker key
   */
  private recordSuccess(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;
    
    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      breaker.successCount++;
      
      if (breaker.successCount >= breaker.successThreshold) {
        // Transition back to closed state
        breaker.state = CircuitBreakerState.CLOSED;
        breaker.failureCount = 0;
        breaker.successCount = 0;
        breaker.lastStateChange = Date.now();
        
        this.logStructured('info', `Circuit breaker for ${key} transitioning to closed state`, {
          key,
          previousState: CircuitBreakerState.HALF_OPEN,
          newState: CircuitBreakerState.CLOSED
        });
      }
    } else if (breaker.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      breaker.failureCount = 0;
    }
  }
  
  /**
   * Record a failed operation in the circuit breaker
   * @param key Circuit breaker key
   */
  private recordFailure(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;
    
    if (breaker.state === CircuitBreakerState.CLOSED) {
      breaker.failureCount++;
      
      if (breaker.failureCount >= breaker.failureThreshold) {
        // Transition to open state
        breaker.state = CircuitBreakerState.OPEN;
        breaker.lastStateChange = Date.now();
        
        this.logStructured('warn', `Circuit breaker for ${key} transitioning to open state`, {
          key,
          previousState: CircuitBreakerState.CLOSED,
          newState: CircuitBreakerState.OPEN,
          failureCount: breaker.failureCount,
          threshold: breaker.failureThreshold
        });
      }
    } else if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      // Transition back to open state on failure in half-open state
      breaker.state = CircuitBreakerState.OPEN;
      breaker.lastStateChange = Date.now();
      breaker.successCount = 0;
      
      this.logStructured('warn', `Circuit breaker for ${key} transitioning back to open state after failure in half-open state`, {
        key,
        previousState: CircuitBreakerState.HALF_OPEN,
        newState: CircuitBreakerState.OPEN
      });
    }
  }
  
  /**
   * Execute a function with retry logic
   * @param fn Function to execute
   * @param maxRetries Maximum number of retries
   * @param baseDelay Base delay between retries in ms (default: 1000)
   * @param maxDelay Maximum delay between retries in ms (default: 10000)
   * @returns Result of the function
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000
  ): Promise<T> {
    return retryWithBackoff(fn, {
      maxRetries,
      initialDelayMs: baseDelay,
      maxDelayMs: maxDelay,
      backoffFactor: 2,
      jitter: true,
      onError: (err, attempt) => this.logStructured('warn', 'Retry attempt', { attempt, err: err.message })
    });
  }
  
  /**
   * Structured logging with different log levels
   * @param level Log level
   * @param message Message to log
   * @param context Additional context
   */
  private logStructured(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context: Record<string, any> = {}
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'ScannerService',
      ...context
    };
    
    // Emit log event
    this.eventEmitter.emit('log', logEntry);
    
    // Console logging based on level
    switch (level) {
      case 'error':
        console.error(message, context);
        break;
      case 'warn':
        console.warn(message, context);
        break;
      case 'info':
        console.info(message, context);
        break;
      case 'debug':
        console.debug(message, context);
        break;
    }
    
    // Record as metric for monitoring
    this.monitoringSystem.getMetricsCollector().recordMetric({
      name: 'log_entry',
      type: 'counter',
      labels: { level, ...context },
      value: 1
    });
  }
  
  /**
   * Schedule periodic cleanup of expired scan results
   */
  private scheduleCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Schedule new cleanup interval (every hour)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredScans()
        .catch(error => {
          this.logStructured('error', 'Failed to clean up expired scans', {
            error: error.message
          });
        });
    }, 60 * 60 * 1000);
  }
  
  /**
   * Cleanup expired scan results
   */
  private async cleanupExpiredScans(): Promise<void> {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [scanId, scan] of this.scanResults.entries()) {
      if (now - scan.timestamp > this.SCAN_EXPIRATION_MS) {
        this.scanResults.delete(scanId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logStructured('info', `Cleaned up ${expiredCount} expired scan results`);
    }
  }
  
  /**
   * Initialize platform clients with access tokens
   * @param platforms Platform configurations with access tokens
   */
  async initializePlatforms(platforms: { platform: Platform; accessToken: string, userId?: string }[]): Promise<void> {
    for (const p of platforms) {
      const { platform, accessToken, userId } = p;

      // Create a default ApiConfig
      let defaultConfig: ApiConfig = {
        baseUrl: '', // Will be set per platform
        version: '', // Will be set per platform
        rateLimit: { requests: 10, perSeconds: 1 }, // Default placeholder
        timeout: 20000,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      };

      if (platform === 'tiktok') {
        defaultConfig.baseUrl = 'https://open.tiktokapis.com/v2';
        defaultConfig.version = 'v2';
      } else if (platform === 'instagram') {
        defaultConfig.baseUrl = 'https://graph.instagram.com'; // Common base
        defaultConfig.version = 'v19.0'; // Example version, adjust as needed
      }
      // Add other platforms as needed

      // Create a simple AuthTokenManager for the given accessToken
      const authTokenManager: IAuthTokenManager = {
        getValidCredentials: async (id: PlatformClientIdentifier): Promise<PlatformCredentials | null> => {
          if (id.platform === platform && (!id.userId || id.userId === userId)) {
            return {
              strategy: AuthStrategy.OAUTH2,
              accessToken: accessToken,
              lastRefreshedAt: new Date().toISOString(),
            };
          }
          return null;
        },
        storeCredentials: async (id: PlatformClientIdentifier, credentials: PlatformCredentials) => { /* no-op for this simple case */ },
        clearCredentials: async (id: PlatformClientIdentifier) => { /* no-op for this simple case */ },
      };

      try {
        switch (platform) {
          case 'tiktok':
            this.platformClients.set(platform, new TikTokClient(defaultConfig, authTokenManager, userId));
            break;
          case 'instagram':
            this.platformClients.set(platform, new InstagramClient(defaultConfig, authTokenManager, userId));
            break;
          // Add other platform initializations here
          default:
            this.logStructured('warn', `Platform client initialization not implemented for ${platform}`, { platform });
            continue; // Skip if platform client is not implemented
        }
        this.logStructured('info', `Successfully initialized ${platform} client directly with token.`, { platform, userId });
      } catch (error) {
        this.logStructured('error', `Failed to initialize ${platform} client directly with token.`, { platform, userId, error });
        // Optionally, re-throw or handle specific errors
      }
    }
  }
  
  /**
   * Start a new scan
   * @param userId User ID to scan
   * @param options Scan options
   * @returns Scan ID
   */
  async startScan(userId: string, options: ScanOptions): Promise<string> {
    return this.monitoringSystem.monitor('startScan', async () => {
      // Generate a unique scan ID
      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create scan result
      const scan: ScanResult = {
        id: scanId,
        userId,
        timestamp: Date.now(),
        status: 'pending',
        options,
        totalPosts: 0,
        averageEngagement: 0,
        peakTimes: [],
        topPerformingPosts: []
      };
      
      // Store scan result
      this.scanResults.set(scanId, scan);
      
      // Store in cache
      await this.cacheSystem.set('scans', scanId, scan, {
        tags: ['scan', `user:${userId}`]
      });
      
      // Process scan asynchronously
      this.processScan(scanId, options).catch(error => {
        this.logStructured('error', `Failed to process scan ${scanId}`, {
          scanId,
          userId,
          error: error.message
        });
        
        // Update scan status to failed
        const scan = this.scanResults.get(scanId);
        if (scan) {
          scan.status = 'failed';
          scan.error = error.message;
          this.scanResults.set(scanId, scan);
          
          // Update cache
          this.cacheSystem.set('scans', scanId, scan).catch(console.error);
        }
      });
      
      return scanId;
    });
  }
  
  /**
   * Get posts for a specific user with retry and circuit breaker logic
   * @param platform The platform to fetch posts from
   * @param userId The user ID to fetch posts for
   * @param lookbackDays Number of days to look back
   * @returns Array of post metrics
   */
  async getUserPosts(platform: Platform, userId: string, lookbackDays: number): Promise<PostMetrics[]> {
    const cacheKey = `posts:${platform}:${userId}:${lookbackDays}`;
    // Check circuit breaker before entering retry logic
    const circuitBreakerKey = `${platform}_api`;
    if (!this.canPerformOperation(circuitBreakerKey)) {
      this.logStructured('warn', `Circuit breaker open for ${platform}, using empty posts`, {
        platform,
        userId
      });
      const err = new Error(`Service unavailable: ${platform} API is currently unavailable`);
      // @ts-ignore
      err.code = 'CIRCUIT_BREAKER_OPEN';
      throw err;
    }
    // Only enter retry logic if circuit is closed
    try {
      const posts = await this.withRetry(async () => {
        const client = this.platformClients.get(platform);
        if (!client) {
          throw new Error(`No client configured for platform: ${platform}`);
        }
        const result = await client.getUserPosts(userId, lookbackDays);
        return Array.isArray(result) ? result : result.data;
      }, 3);
      await this.cacheSystem.set('posts', cacheKey, posts, {
        tags: ['posts', `platform:${platform}`, `user:${userId}`],
        ttl: this.cacheSystem.calculateAdaptiveTTL('posts', cacheKey, 60 * 60 * 1000)
      });
      this.recordSuccess(circuitBreakerKey);
      return posts;
    } catch (error) {
      this.recordFailure(circuitBreakerKey);
      throw error;
    }
  }
  
  /**
   * Get posts for a specific competitor with retry and circuit breaker logic
   * @param platform The platform to fetch posts from
   * @param competitorId The competitor ID to fetch posts for
   * @param lookbackDays Number of days to look back
   * @returns Array of post metrics
   */
  async getCompetitorPosts(platform: Platform, competitorId: string, lookbackDays: number): Promise<PostMetrics[]> {
    return this.monitoringSystem.monitor('getCompetitorPosts', async () => {
      const cacheKey = `posts:${platform}:competitor:${competitorId}:${lookbackDays}`;
      
      // Try to get from cache first
      const cachedPosts = await this.cacheSystem.get<PostMetrics[]>('posts', cacheKey);
      if (cachedPosts) {
        this.logStructured('info', `Cache hit for competitor posts ${platform}:${competitorId}`, {
          platform,
          competitorId,
          lookbackDays,
          postCount: cachedPosts.length
        });
        return cachedPosts;
      }
      
      // Check circuit breaker
      const circuitBreakerKey = `${platform}_api`;
      if (!this.canPerformOperation(circuitBreakerKey)) {
        this.logStructured('warn', `Circuit breaker open for ${platform}, using empty posts`, {
          platform,
          competitorId
        });
        throw new Error(`Service unavailable: ${platform} API is currently unavailable`);
      }
      
      // Fetch with retry
      try {
        const posts = await this.withRetry(async () => {
          const client = this.platformClients.get(platform);
          if (!client) {
            throw new Error(`No client configured for platform: ${platform}`);
          }
          const result = await client.getCompetitorPosts(competitorId, lookbackDays);
          // If result is a PaginatedResponse, return result.data, else return result
          return Array.isArray(result) ? result : result.data;
        }, 3);
        // Cache the results
        await this.cacheSystem.set('posts', cacheKey, posts, {
          tags: ['posts', `platform:${platform}`, `competitor:${competitorId}`],
          ttl: this.cacheSystem.calculateAdaptiveTTL('posts', cacheKey, 60 * 60 * 1000) // 1 hour base TTL
        });
        // Record success in circuit breaker
        this.recordSuccess(circuitBreakerKey);
        return posts;
      } catch (error) {
        // Record failure in circuit breaker
        this.recordFailure(circuitBreakerKey);
        throw error;
      }
    });
  }
  
  /**
   * Perform scan analysis on collected posts
   * @param scan Scan result
   * @param options Scan options
   * @returns Scan metrics
   */
  private async performScan(scan: ScanResult, options: ScanOptions): Promise<{
    totalPosts: number;
    averageEngagement: number;
    peakTimes: Array<{ hour: number; engagementScore: number; day: number; dayOfWeek: string; timezone: string }>;
    topPerformingPosts: PostMetrics[];
  }> {
    return this.monitoringSystem.monitor('performScan', async (span) => {
      try {
        span.setAttribute('userId', scan.userId);
        span.setAttribute('platforms', options.platforms.join(','));
        
        // 1. Collect posts from all sources
        const allPosts: PostMetrics[] = [];
        
        // Initialize analytics cache key
        const analyticsCacheKey = `analysis:${scan.userId}:${options.platforms.join(',')}:${options.lookbackDays}`;
        
        // Get posts for each platform
        for (const platform of options.platforms) {
          const client = this.platformClients.get(platform);
          if (!client) {
            throw new Error(`No client configured for platform: ${platform}`);
          }
          
          span.addEvent('fetching_platform_posts', { platform });
          
          // Get user's posts
          if (options.includeOwnPosts) {
            try {
              const userPosts = await this.getUserPosts(platform, scan.userId, options.lookbackDays);
              allPosts.push(...userPosts);
              span.addEvent('user_posts_fetched', { platform, count: userPosts.length });
            } catch (error) {
              span.recordException(error as Error);
              this.logStructured('error', `Failed to fetch user posts for ${platform}`, {
                userId: scan.userId,
                platform,
                error: (error as Error).message
              });
              // Continue with other platforms even if one fails
            }
          }
          
          // Get competitor posts
          if (options.competitors?.length) {
            await Promise.all(
              options.competitors.map(async (competitorId) => {
                try {
                  const competitorPosts = await this.getCompetitorPosts(platform, competitorId, options.lookbackDays);
                  allPosts.push(...competitorPosts);
                  span.addEvent('competitor_posts_fetched', { platform, competitorId, count: competitorPosts.length });
                } catch (error) {
                  span.recordException(error as Error);
                  this.logStructured('error', `Failed to fetch posts for competitor ${competitorId} on ${platform}`, {
                    competitorId,
                    platform,
                    error: (error as Error).message
                  });
                  // Continue with other competitors even if one fails
                }
              })
            );
          }
        }
        
        span.addEvent('all_posts_collected', { count: allPosts.length });
        
        if (allPosts.length === 0) {
          return {
            totalPosts: 0,
            averageEngagement: 0,
            peakTimes: [],
            topPerformingPosts: []
          };
        }
        
        // 2. Analyze the collected data
        span.addEvent('starting_analysis');
        
        // Use analytics cache if possible
        const cachedAnalysis = await this.cacheSystem.get('analytics', analyticsCacheKey);
        
        if (cachedAnalysis) {
          span.addEvent('using_cached_analysis');
          return cachedAnalysis as {
            totalPosts: number;
            averageEngagement: number;
            peakTimes: Array<{ hour: number; engagementScore: number; day: number; dayOfWeek: string; timezone: string }>;
            topPerformingPosts: PostMetrics[];
          };
        }
        
        // Create analyzer with optimized performance
        const analyzer = new OptimizedPostAnalyzer(allPosts, {
          ttl: 30 * 60 * 1000, // 30 minute TTL for internal analyzer cache
          compressionThreshold: 1000, // Compress cached items larger than 1KB
          maxSize: 100 // Maximum number of items in the analyzer's internal cache
        }, {
          batchSize: 50, // Process in batches of 50 posts
          processingDelay: 0 // No delay between batch processing
        });
        
        // Run analysis
        const peakTimes = await analyzer.findPeakTimesParallel(options.timezone);
        span.addEvent('peak_times_analyzed', { count: peakTimes.length });
        
        // For top performing posts, we'll sort by engagement score
        const postsWithScores = await Promise.all(
          allPosts.map(async (post) => {
            const engagementScore = await analyzer.getEngagementScore(post.id);
            return {
              ...post,
              engagementScore
            };
          })
        );
        
        span.addEvent('engagement_scores_calculated');
        
        // Sort by engagement score and get top 10
        const topPerformingPosts = [...postsWithScores]
          .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
          .slice(0, 10);
        
        // Calculate average engagement
        const totalEngagement = postsWithScores.reduce(
          (sum, post) => sum + (post.engagementScore || 0), 
          0
        );
        const averageEngagement = allPosts.length > 0 ? totalEngagement / allPosts.length : 0;
        
        const result = {
          totalPosts: allPosts.length,
          averageEngagement,
          peakTimes: peakTimes || [],
          topPerformingPosts: topPerformingPosts.map(({ engagementScore, ...post }) => post)
        };
        
        // Cache analysis results
        await this.cacheSystem.set('analytics', analyticsCacheKey, result, {
          tags: ['analysis', `user:${scan.userId}`],
          ttl: 4 * 60 * 60 * 1000, // 4 hours TTL for analysis results
          volatility: 0.3 // Analysis results change less frequently than raw data
        });
        
        span.addEvent('analysis_complete');
        
        return result;
      } catch (error) {
        span?.recordException?.(error as Error);
        this.logStructured('error', 'Error in performScan', { error: (error as Error).message });
        return {
          totalPosts: 0,
          averageEngagement: 0,
          peakTimes: [],
          topPerformingPosts: []
        };
      }
    });
  }
  
  /**
   * Process a scan asynchronously
   * @param scanId Scan ID
   * @param options Scan options
   */
  private async processScan(scanId: string, options: ScanOptions): Promise<void> {
    return this.monitoringSystem.monitor('processScan', async (span) => {
      span.setAttribute('scanId', scanId);
      
      const scan = this.scanResults.get(scanId);
      if (!scan) {
        throw new Error(`Scan not found: ${scanId}`);
      }
      
      // Set timeout for scan
      const timeoutId = setTimeout(() => {
        if (scan.status === 'pending') {
          scan.status = 'failed';
          scan.error = 'Scan timed out';
          this.scanResults.set(scanId, scan);
          
          // Update cache
          this.cacheSystem.set('scans', scanId, scan).catch(console.error);
          
          this.logStructured('error', `Scan ${scanId} timed out`, { scanId });
        }
      }, this.SCAN_TIMEOUT_MS);
      
      try {
        // Perform scan
        const results = await this.performScan(scan, options);
        
        // Update scan result
        scan.status = 'completed';
        scan.totalPosts = results.totalPosts;
        scan.averageEngagement = results.averageEngagement;
        scan.peakTimes = results.peakTimes;
        scan.topPerformingPosts = results.topPerformingPosts;
        scan.completedAt = Date.now();
        
        this.scanResults.set(scanId, scan);
        
        // Update cache
        await this.cacheSystem.set('scans', scanId, scan, {
          tags: ['scan', `user:${scan.userId}`, 'completed']
        });
        
        this.logStructured('info', `Scan ${scanId} completed successfully`, {
          scanId,
          userId: scan.userId,
          totalPosts: results.totalPosts
        });
        
        // Emit scan completed event
        this.eventEmitter.emit('scan.completed', scan);
      } catch (error) {
        // Update scan status to failed
        scan.status = 'failed';
        scan.error = (error as Error).message;
        this.scanResults.set(scanId, scan);
        
        // Update cache
        await this.cacheSystem.set('scans', scanId, scan, {
          tags: ['scan', `user:${scan.userId}`, 'failed']
        });
        
        this.logStructured('error', `Scan ${scanId} failed`, {
          scanId,
          userId: scan.userId,
          error: (error as Error).message
        });
        
        // Emit scan failed event
        this.eventEmitter.emit('scan.failed', { scan, error });
        
        throw error;
      } finally {
        // Clear timeout
        clearTimeout(timeoutId);
      }
    });
  }
  
  /**
   * Get a scan result, trying cache first
   * @param scanId Scan ID
   * @returns Scan result or undefined if not found
   */
  async getScanResult(scanId: string): Promise<ScanResult | undefined> {
    // Try to get from cache first
    const cachedScan = await this.cacheSystem.get<ScanResult>('scans', scanId);
    if (cachedScan) {
      // Update in-memory store if not present
      if (!this.scanResults.has(scanId)) {
        this.scanResults.set(scanId, cachedScan);
      }
      return cachedScan;
    }
    
    // If not in cache, try in-memory store
    return this.scanResults.get(scanId);
  }
  
  /**
   * Invalidate cache entries for a specific platform and user
   * @param platform The platform to invalidate
   * @param userId The user ID to invalidate
   */
  async invalidateUserCache(platform: Platform, userId: string): Promise<void> {
    // Invalidate by tags
    await this.cacheSystem.invalidateByTag('posts', `platform:${platform}`);
    await this.cacheSystem.invalidateByTag('posts', `user:${userId}`);
    await this.cacheSystem.invalidateByTag('analytics', `user:${userId}`);
    
    this.logStructured('info', `Invalidated cache for user ${userId} on ${platform}`, {
      userId,
      platform
    });
  }
  
  /**
   * Subscribe to scanner events
   * @param event Event name
   * @param handler Event handler
   */
  on(event: 'log' | 'metrics' | 'scan.completed' | 'scan.failed', handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }
  
  /**
   * Unsubscribe from scanner events
   * @param event Event name
   * @param handler Event handler
   */
  off(event: 'log' | 'metrics' | 'scan.completed' | 'scan.failed', handler: (data: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
  
  /**
   * Destroy the service and cleanup resources
   */
  async destroy(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Flush monitoring system
    await this.monitoringSystem.flush();
    
    // Shutdown monitoring
    this.monitoringSystem.shutdown();
    
    // Remove all event listeners
    this.eventEmitter.removeAllListeners();
    
    this.logStructured('info', 'Scanner service destroyed');
  }
  
  // Example: initialize platform clients (should be called during service setup)
  public initializePlatformClients(authTokenManager: any, userId?: string) {
    for (const platform of [
      'tiktok',
      'instagram',
      'youtube',
    ] as Platform[]) {
      if (PlatformFactory.isPlatformSupported(platform)) {
        const client = PlatformFactory.createClient(platform, authTokenManager, userId);
        this.platformClients.set(platform, client);
      }
    }
  }
}
