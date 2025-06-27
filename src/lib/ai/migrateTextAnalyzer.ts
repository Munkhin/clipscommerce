/**
 * Migration utility to help transition from legacy TextAnalyzer to EnhancedTextAnalyzer
 * This provides backward compatibility and easy upgrade path
 */

import { TextAnalyzer as LegacyTextAnalyzer, TextAnalyzerConfig as LegacyConfig } from './textAnalyzer';
import { EnhancedTextAnalyzer, TextAnalyzerConfig } from './enhancedTextAnalyzer';

/**
 * Convert legacy TextAnalyzer configuration to the new format
 * @param legacyConfig Legacy configuration
 * @returns New configuration format
 */
export function convertLegacyConfig(legacyConfig: LegacyConfig): TextAnalyzerConfig {
  return {
    useLocalModel: legacyConfig.useLocalModel,
    openaiApiKey: legacyConfig.openaiApiKey,
    confidenceThreshold: legacyConfig.confidenceThreshold,
    maxCacheSize: legacyConfig.maxCacheSize,
    cacheTtlMs: legacyConfig.cacheTtlMs,
    costTrackingEnabled: legacyConfig.costTrackingEnabled,
    // Default values for new configuration options
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
    },
    batchConfig: {
      maxBatchSize: 5,
      maxWaitMs: 100,
    },
    circuitBreakerConfig: {
      resetTimeout: 30000,
      failureThreshold: 5,
      successThreshold: 2,
    }
  };
}

/**
 * Create a new EnhancedTextAnalyzer from a legacy TextAnalyzer
 * @param legacyAnalyzer Legacy TextAnalyzer instance
 * @returns New EnhancedTextAnalyzer instance
 */
export function migrateTextAnalyzer(legacyAnalyzer: LegacyTextAnalyzer): EnhancedTextAnalyzer {
  // Extract legacy metrics
  const legacyMetrics = legacyAnalyzer.getMetrics();
  
  // Create new analyzer with converted config
  const enhancedAnalyzer = new EnhancedTextAnalyzer(
    convertLegacyConfig(legacyAnalyzer['config'])
  );
  
  // Log migration
  console.info('Successfully migrated from legacy TextAnalyzer to EnhancedTextAnalyzer');
  console.info('Legacy metrics:', legacyMetrics);
  
  return enhancedAnalyzer;
}

/**
 * Create a compatibility wrapper that mimics the legacy TextAnalyzer API
 * but uses the enhanced implementation internally
 * @param config Legacy configuration
 * @returns Legacy-compatible TextAnalyzer instance
 */
export function createCompatibilityWrapper(config: LegacyConfig): LegacyTextAnalyzer {
  const enhancedAnalyzer = new EnhancedTextAnalyzer(convertLegacyConfig(config));
  
  // Create a proxy that mimics the legacy API
  // This is a simplified implementation - in practice, you'd need to implement
  // all methods from the legacy API
  const compatWrapper = {
    // Core functionality
    summarizeContent: (text: string, forceAI = false) => 
      enhancedAnalyzer.summarizeContent(text, forceAI),
    
    // Metrics
    getMetrics: () => {
      const enhancedMetrics = enhancedAnalyzer.getMetrics();
      // Convert enhanced metrics to legacy format
      return {
        localAnalysisCount: enhancedMetrics.counts.localSummarization || 0,
        openaiAnalysisCount: enhancedMetrics.counts.openAISummarization || 0,
        cacheHitCount: enhancedMetrics.cacheHits,
        totalTokensUsed: enhancedMetrics.counts.totalTokensUsed || 0,
        estimatedCost: enhancedMetrics.counts.estimatedCost || 0,
      };
    },
    
    resetMetrics: () => enhancedAnalyzer.resetMetrics(),
    
    // Other methods would be implemented similarly
    
    // Include a reference to the enhanced analyzer for advanced usage
    _enhancedAnalyzer: enhancedAnalyzer,
  };
  
  return compatWrapper as unknown as LegacyTextAnalyzer;
}
