type FeatureFlag = 
  | 'INSTAGRAM_AUTH'
  | 'YOUTUBE_AUTH'
  | 'ADVANCED_ANALYTICS'
  | 'REALTIME_UPDATES'
  | 'CONTENT_IDEATION'
  | 'BULK_OPERATIONS'
  | 'API_DOCS'
  | 'TREND_SEEDING'
  | 'USAGE_QUOTAS'
  | 'ERROR_ANALYTICS';

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envVar = `FEATURE_${flag}`;
  const value = process.env[envVar];
  return value === 'true' || value === '1';
}

export function requireFeature(flag: FeatureFlag): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature ${flag} is not enabled`);
  }
}

export function getFeatureErrorResponse(flag: FeatureFlag) {
  return {
    error: 'Feature not enabled',
    code: 501,
    message: `The ${flag} feature is currently disabled. Please check back later.`,
    flag
  };
}

export function withFeatureFlag<T>(
  flag: FeatureFlag,
  implementation: () => T,
  fallback?: () => T
): T {
  if (isFeatureEnabled(flag)) {
    return implementation();
  }
  
  if (fallback) {
    return fallback();
  }
  
  throw new Error(`Feature ${flag} is not enabled`);
}