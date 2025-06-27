/**
 * Comprehensive example demonstrating the EnhancedScannerService with advanced
 * caching and monitoring capabilities
 */
import { EnhancedScannerService } from '../functions/EnhancedScannerService';
import { CacheSystem } from '../functions/cache/CacheSystem';
import { MonitoringSystem } from '../functions/monitoring/MonitoringSystem';
import { Platform, ScanOptions, ScanStatus, PostMetrics } from '../functions/types';

/**
 * Example of how to configure and use the EnhancedScannerService
 * This class shows various practical usage patterns including:
 * - Service initialization with monitoring and caching
 * - Handling scan lifecycle and events
 * - Resilience through circuit breakers
 * - Cache management
 * - Metric collection and monitoring
 */
export class EnhancedScannerExample {
  private scannerService: EnhancedScannerService;
  private readonly userId: string;
  private readonly platforms: { platform: Platform; accessToken: string }[];
  
  constructor(userId: string) {
    this.userId = userId;
    
    // Initialize platform tokens - in production, fetch these from a secure source
    this.platforms = [
      { 
        platform: 'INSTAGRAM' as any,
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || 'demo_token'
      },
      { 
        platform: 'TIKTOK' as any,
        accessToken: process.env.TIKTOK_ACCESS_TOKEN || 'demo_token'
      }
    ];
    
    // Create scanner service
    this.scannerService = new EnhancedScannerService();
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Set up event handlers for monitoring service events
   */
  private setupEventHandlers(): void {
    // Monitor scan lifecycle events
    // this.scannerService.on('scan.started', (scan) => {
    //   console.log(`Scan ${scan.id} started for user ${scan.userId}`);
    // });
    // Only allowed events are: 'scan.completed', 'scan.failed', 'log', 'metrics'
    
    this.scannerService.on('scan.completed', (scan) => {
      console.log(`Scan ${scan.id} completed with ${scan.totalPosts} posts analyzed`);
      console.log(`Average engagement: ${scan.averageEngagement.toFixed(2)}`);
      console.log(`Peak posting times: ${this.formatPeakTimes(scan.peakTimes)}`);
    });
    
    this.scannerService.on('scan.failed', (data) => {
      console.error(`Scan ${data.scan.id} failed with error: ${data.error}`);
    });
    
    // Monitor cache events
    // this.scannerService.on('cache.hit', (data) => {
    //   console.log(`Cache hit: ${data.segment}/${data.key}`);
    // });
    // this.scannerService.on('cache.miss', (data) => {
    //   console.log(`Cache miss: ${data.segment}/${data.key}`);
    // });
    // Only allowed events are: 'scan.completed', 'scan.failed', 'log', 'metrics'
    
    // Monitor performance metrics
    this.scannerService.on('metrics', (metrics) => {
      if (metrics.duration > 1000) {
        console.warn(`Slow operation detected: ${metrics.operationName} took ${metrics.duration}ms`);
      }
    });
    
    // Monitor circuit breaker state changes
    // this.scannerService.on('circuitBreaker.open', (data) => {
    //   console.error(`Circuit breaker for ${data.platform} is now OPEN due to ${data.failureCount} consecutive failures`);
    // });
    // this.scannerService.on('circuitBreaker.halfOpen', (data) => {
    //   console.log(`Circuit breaker for ${data.platform} is attempting to recover (HALF-OPEN)`);
    // });
    // this.scannerService.on('circuitBreaker.closed', (data) => {
    //   console.log(`Circuit breaker for ${data.platform} is now CLOSED and healthy`);
    // });
    // Only allowed events are: 'scan.completed', 'scan.failed', 'log', 'metrics'
  }
  
  /**
   * Initialize the scanner service
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize platform clients with access tokens
      await this.scannerService.initializePlatforms(this.platforms);
      console.log('Scanner service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize scanner service:', error);
      throw error;
    }
  }
  
  /**
   * Run a complete scan with the given options
   * @param options Scan options
   * @returns Scan result
   */
  public async runScan(options: ScanOptions): Promise<any> {
    try {
      // Start a new scan
      const scanId = await this.scannerService.startScan(this.userId, options);
      console.log(`Started scan with ID: ${scanId}`);
      
      // Poll for scan completion
      return this.pollForScanCompletion(scanId);
    } catch (error) {
      console.error('Error running scan:', error);
      throw error;
    }
  }
  
  /**
   * Poll for scan completion
   * @param scanId Scan ID to poll
   * @returns Final scan result
   */
  private async pollForScanCompletion(scanId: string): Promise<any> {
    const maxAttempts = 30;
    const pollIntervalMs = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      
      // Check scan status
      const scanResult = await this.scannerService.getScanResult(scanId);
      
      if (!scanResult) {
        throw new Error(`Scan ${scanId} not found`);
      }
      
      // If scan is completed or failed, return the result
      if (scanResult.status === 'completed' || scanResult.status === 'failed') {
        return scanResult;
      }
      
      console.log(`Polling scan ${scanId}, status: ${scanResult.status} (attempt ${attempt + 1}/${maxAttempts})`);
    }
    
    throw new Error(`Scan ${scanId} did not complete within the expected time`);
  }
  
  /**
   * Get posts for a specific user on a specific platform
   * @param platform Platform to get posts from
   * @param lookbackDays Number of days to look back
   * @returns Array of post metrics
   */
  public async getUserPosts(platform: Platform, lookbackDays = 30): Promise<PostMetrics[]> {
    try {
      return await this.scannerService.getUserPosts(platform, this.userId, lookbackDays);
    } catch (error) {
      console.error(`Error fetching user posts for ${platform}:`, error);
      
      // For demo purposes, return empty array - in production, you might want to handle this differently
      return [];
    }
  }
  
  /**
   * Invalidate cache for a specific user
   * @param platform Platform to invalidate cache for
   */
  public async invalidateCache(platform: Platform): Promise<void> {
    await this.scannerService.invalidateUserCache(platform, this.userId);
    console.log(`Cache invalidated for user ${this.userId} on ${platform}`);
  }
  
  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    await this.scannerService.destroy();
    console.log('Scanner service destroyed');
  }
  
  /**
   * Format peak times for display
   * @param peakTimes Array of peak times
   * @returns Formatted string
   */
  private formatPeakTimes(peakTimes: Array<{ hour: number; engagementScore: number }>): string {
    return peakTimes
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3)
      .map(pt => {
        const hour = pt.hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}${period} (score: ${pt.engagementScore.toFixed(1)})`;
      })
      .join(', ');
  }
}

/**
 * Example usage of the EnhancedScannerExample class
 */
async function runExample() {
  const userId = 'user123';
  const example = new EnhancedScannerExample(userId);
  
  try {
    // Initialize
    await example.initialize();
    
    // Run a scan
    const scanResult = await example.runScan({
      platforms: ['INSTAGRAM' as any, 'TIKTOK' as any],
      lookbackDays: 30,
      includeOwnPosts: true,
      competitors: ['competitor1', 'competitor2'],
      timezone: 'America/New_York'
    });
    
    console.log('Scan completed successfully!');
    console.log('Top performing posts:', 
      scanResult.topPerformingPosts.slice(0, 3).map((post: PostMetrics) => 
        `${post.platform}: ${post.engagementRate.toFixed(1)}% engagement`
      )
    );
    
    // Get user posts from a specific platform
    const posts = await example.getUserPosts('INSTAGRAM' as any);
    console.log(`Retrieved ${posts.length} posts from Instagram`);
    
    // Invalidate cache
    await example.invalidateCache('INSTAGRAM' as any);
    
  } catch (error) {
    console.error('Example failed:', error);
  } finally {
    // Clean up
    await example.destroy();
  }
}

// Run the example if called directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample };
