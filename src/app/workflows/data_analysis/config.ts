// Configuration for the Accelerate module

// Default configuration
export const DEFAULT_CONFIG = {
  // OpenAI API settings
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: 'gpt-4',
  
  // Redis settings
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Cache settings (in milliseconds)
  CACHE_TTL: {
    HOOKS: 24 * 60 * 60 * 1000, // 24 hours
    TRENDING_AUDIO: 6 * 60 * 60 * 1000, // 6 hours
    KEYWORDS: 12 * 60 * 60 * 1000, // 12 hours
    ANALYSIS_RESULTS: 1 * 60 * 60 * 1000, // 1 hour
  },
  
  // API rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 60, // 60 requests per minute
  },
  
  // Audio analysis settings
  AUDIO: {
    SAMPLE_RATE: 44100,
    CHANNELS: 1,
    BIT_DEPTH: 16,
  },
  
  // Content generation settings
  CONTENT: {
    MAX_HOOK_LENGTH: 150, // characters
    DEFAULT_NUM_HOOKS: 5,
    DEFAULT_TONE: 'curiosity',
  },
} as const;

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY is not set. Some features may not work.');
}

// Export config type
export type Config = typeof DEFAULT_CONFIG;
