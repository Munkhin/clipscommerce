/**
 * Adapter that provides backwards compatibility between the original ScannerService
 * and the enhanced implementation with advanced caching and monitoring
 */
import { Platform, ScanResult, ScanOptions, PostMetrics, ScanStatus } from './types';
import { EnhancedScannerService } from './EnhancedScannerService';
import { EventEmitter } from 'events';
import { Platform as DeliverablePlatform } from '../../deliverables/types/deliverables_types';

export class ScannerServiceAdapter {
  private readonly enhancedService: EnhancedScannerService;
  private readonly eventEmitter = new EventEmitter();
  
  constructor() {
    this.enhancedService = new EnhancedScannerService();
    
    // Forward events from enhanced service
    this.enhancedService.on('scan.completed', (data) => {
      this.eventEmitter.emit('scan.completed', this.adaptScanResult(data));
    });
    
    this.enhancedService.on('scan.failed', (data) => {
      this.eventEmitter.emit('scan.failed', {
        scan: this.adaptScanResult(data.scan),
        error: data.error
      });
    });
    
    this.enhancedService.on('log', (data) => {
      this.eventEmitter.emit('log', data);
    });
  }
  
  /**
   * Initialize platforms with access tokens
   * @param platforms Platform configurations with access tokens
   */
  async initializePlatforms(platforms: { platform: Platform; accessToken: string }[]): Promise<void> {
    await this.enhancedService.initializePlatforms(platforms);
  }
  
  /**
   * Starts a scan with the given options
   * @param userId User ID to scan
   * @param options Scan options
   * @returns Scan ID
   */
  async startScan(userId: string, options: ScanOptions): Promise<string> {
    return this.enhancedService.startScan(userId, options);
  }
  
  /**
   * Gets a scan result by ID
   * @param scanId Scan ID
   * @returns Scan result or undefined if not found
   */
  async getScan(scanId: string): Promise<any> {
    const enhancedResult = await this.enhancedService.getScanResult(scanId);
    
    if (!enhancedResult) {
      return undefined;
    }
    
    return this.adaptScanResult(enhancedResult);
  }
  
  /**
   * Adapts the enhanced scan result to the format expected by the legacy code
   * @param enhancedScan Enhanced scan result
   * @returns Legacy-formatted scan result
   */
  private adaptScanResult(enhancedScan: ScanResult): any {
    // Create a compatible format with legacy ScannerService
    return {
      id: enhancedScan.id,
      userId: enhancedScan.userId,
      platform: enhancedScan.options.platforms[0], // First platform in the options
      status: enhancedScan.status,
      startTime: new Date(enhancedScan.timestamp),
      endTime: enhancedScan.completedAt ? new Date(enhancedScan.completedAt) : undefined,
      metrics: {
        totalPosts: enhancedScan.totalPosts,
        averageEngagement: enhancedScan.averageEngagement,
        peakTimes: enhancedScan.peakTimes.map(pt => ({
          hour: pt.hour,
          engagementScore: pt.engagementScore
        })),
        topPerformingPosts: enhancedScan.topPerformingPosts
      },
      error: enhancedScan.error
    };
  }
  
  /**
   * Subscribe to scanner service events
   * @param event Event name
   * @param handler Event handler
   */
  on(event: string, handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }
  
  /**
   * Unsubscribe from scanner service events
   * @param event Event name
   * @param handler Event handler
   */
  off(event: string, handler: (data: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
  
  /**
   * Get user posts from a specific platform
   * @param platform Platform to get posts from
   * @param userId User ID to get posts for
   * @param lookbackDays Number of days to look back
   * @returns Array of post metrics
   */
  async getUserPosts(platform: Platform, userId: string, lookbackDays: number): Promise<PostMetrics[]> {
    return this.enhancedService.getUserPosts(platform, userId, lookbackDays);
  }
  
  /**
   * Get competitor posts from a specific platform
   * @param platform Platform to get posts from
   * @param competitorId Competitor ID to get posts for
   * @param lookbackDays Number of days to look back
   * @returns Array of post metrics
   */
  async getCompetitorPosts(platform: Platform, competitorId: string, lookbackDays: number): Promise<PostMetrics[]> {
    return this.enhancedService.getCompetitorPosts(platform, competitorId, lookbackDays);
  }
  
  /**
   * Invalidate user cache for a specific platform
   * @param platform Platform to invalidate
   * @param userId User ID to invalidate
   */
  async invalidateUserCache(platform: Platform, userId: string): Promise<void> {
    await this.enhancedService.invalidateUserCache(platform, userId);
  }
  
  /**
   * Destroy the service and clean up resources
   */
  async destroy(): Promise<void> {
    await this.enhancedService.destroy();
    this.eventEmitter.removeAllListeners();
  }
}
