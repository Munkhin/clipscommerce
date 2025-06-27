import { z } from 'zod';
import { schemas, InputSanitizer } from './inputSanitizer';

/**
 * Comprehensive validation schemas for all API endpoints and forms
 * 
 * These schemas provide type-safe validation for:
 * - AI API endpoints
 * - User authentication
 * - Content management
 * - File uploads
 * - Database operations
 */

// AI Content Generation Schemas
export const aiContentSchemas = {
  generateVariations: z.object({
    caption: schemas.aiPrompt,
    hashtags: z.array(schemas.hashtag).optional(),
    platform: schemas.platform,
    targetAudience: z.string().max(100).optional().default('general')
  }),

  optimizeContent: z.object({
    caption: schemas.aiPrompt,
    hashtags: z.array(schemas.hashtag).optional(),
    platform: schemas.platform,
    targetAudience: z.string().max(100).optional().default('general')
  }),

  predictPerformance: z.object({
    content: schemas.aiPrompt,
    platform: schemas.platform,
    publishTime: z.string().datetime().optional(),
    hashtags: z.array(schemas.hashtag).optional(),
    targetAudience: z.string().max(100).optional()
  }),

  engagementPrediction: z.object({
    content: schemas.userContent,
    platform: schemas.platform,
    contentType: z.enum(['image', 'video', 'text', 'carousel']),
    publishTime: z.string().datetime().optional(),
    hashtags: z.array(schemas.hashtag).max(30).optional(),
    mentions: z.array(z.string().regex(/^@[a-zA-Z0-9_]+$/)).max(10).optional()
  })
};

// User Authentication Schemas
export const authSchemas = {
  signUp: z.object({
    email: schemas.email,
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
             'Password must contain uppercase, lowercase, number and special character'),
    confirmPassword: z.string(),
    firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/, 'Invalid characters in first name'),
    lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/, 'Invalid characters in last name'),
    agreeToTerms: z.boolean().refine(val => val === true, 'Must agree to terms')
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),

  signIn: z.object({
    email: schemas.email,
    password: z.string().min(1, 'Password is required').max(128, 'Password too long')
  }),

  resetPassword: z.object({
    email: schemas.email
  }),

  updatePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
             'Password must contain uppercase, lowercase, number and special character'),
    confirmNewPassword: z.string()
  }).refine(data => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"]
  })
};

// User Profile Schemas
export const profileSchemas = {
  updateProfile: z.object({
    firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/, 'Invalid characters in first name'),
    lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/, 'Invalid characters in last name'),
    bio: z.string().max(500).optional(),
    website: schemas.url.optional(),
    location: z.string().max(100).optional(),
    timezone: z.string().regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, 'Invalid timezone format').optional()
  }),

  updateSettings: z.object({
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      marketing: z.boolean()
    }),
    privacy: z.object({
      profileVisibility: z.enum(['public', 'private', 'friends']),
      analyticsSharing: z.boolean()
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      language: z.string().length(2).regex(/^[a-z]{2}$/, 'Invalid language code'),
      defaultPlatform: schemas.platform.optional()
    })
  })
};

// Content Management Schemas
export const contentSchemas = {
  createPost: z.object({
    title: z.string().min(1).max(200),
    content: schemas.userContent,
    platform: schemas.platform,
    scheduledAt: z.string().datetime().optional(),
    hashtags: z.array(schemas.hashtag).max(30).optional(),
    mentions: z.array(z.string().regex(/^@[a-zA-Z0-9_]+$/)).max(10).optional(),
    isPublic: z.boolean().default(true),
    allowComments: z.boolean().default(true)
  }),

  updatePost: z.object({
    id: schemas.id,
    title: z.string().min(1).max(200).optional(),
    content: schemas.userContent.optional(),
    hashtags: z.array(schemas.hashtag).max(30).optional(),
    mentions: z.array(z.string().regex(/^@[a-zA-Z0-9_]+$/)).max(10).optional(),
    isPublic: z.boolean().optional(),
    allowComments: z.boolean().optional()
  }),

  deletePost: z.object({
    id: schemas.id
  }),

  uploadMedia: z.object({
    filename: z.string().min(1).max(255),
    contentType: z.string().regex(/^(image|video|audio)\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*$/),
    size: z.number().positive().max(100 * 1024 * 1024), // 100MB limit
    caption: z.string().max(2000).optional(),
    altText: z.string().max(500).optional()
  })
};

// Data Collection Schemas
export const dataCollectionSchemas = {
  initiateCollection: z.object({
    platform: schemas.platform,
    accountId: z.string().min(1).max(100),
    dataTypes: z.array(z.enum(['posts', 'analytics', 'followers', 'engagement'])),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    includeHistorical: z.boolean().default(false)
  }),

  collectionStatus: z.object({
    scanId: schemas.id
  }),

  updateCollectionSettings: z.object({
    platforms: z.array(schemas.platform),
    refreshInterval: z.number().min(3600).max(86400), // 1 hour to 24 hours
    includeAnalytics: z.boolean(),
    includeComments: z.boolean(),
    maxPostsPerCollection: z.number().min(10).max(10000)
  })
};

// Team Management Schemas
export const teamSchemas = {
  createTeam: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(false)
  }),

  inviteTeamMember: z.object({
    teamId: schemas.id,
    email: schemas.email,
    role: z.enum(['admin', 'member', 'viewer']),
    permissions: z.array(z.enum(['read', 'write', 'delete', 'manage_users', 'manage_settings']))
  }),

  updateTeamMember: z.object({
    teamId: schemas.id,
    userId: schemas.id,
    role: z.enum(['admin', 'member', 'viewer']).optional(),
    permissions: z.array(z.enum(['read', 'write', 'delete', 'manage_users', 'manage_settings'])).optional()
  }),

  removeTeamMember: z.object({
    teamId: schemas.id,
    userId: schemas.id
  })
};

// Analytics and Reporting Schemas
export const analyticsSchemas = {
  getAnalytics: z.object({
    platform: schemas.platform.optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    metrics: z.array(z.enum(['engagement', 'reach', 'impressions', 'clicks', 'shares', 'comments', 'likes'])),
    groupBy: z.enum(['day', 'week', 'month']).default('day')
  }),

  generateReport: z.object({
    title: z.string().min(1).max(200),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    platforms: z.array(schemas.platform),
    includeCharts: z.boolean().default(true),
    includeRecommendations: z.boolean().default(true),
    format: z.enum(['pdf', 'excel', 'json']).default('pdf')
  })
};

// API Usage and Billing Schemas
export const usageSchemas = {
  trackUsage: z.object({
    feature: z.string().min(1).max(50),
    action: z.string().min(1).max(50),
    metadata: z.record(z.any()).optional()
  }),

  updateSubscription: z.object({
    planId: z.string().min(1).max(50),
    billingCycle: z.enum(['monthly', 'yearly'])
  }),

  processPayout: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/),
    paymentMethodId: z.string().min(1).max(100)
  })
};

// File and Media Validation
export const mediaSchemas = {
  validateImage: z.object({
    filename: z.string().refine(filename => {
      const sanitized = InputSanitizer.sanitizeFilename(filename);
      return sanitized === filename && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
    }, 'Invalid image file'),
    size: z.number().positive().max(10 * 1024 * 1024), // 10MB
    width: z.number().positive().max(8192).optional(),
    height: z.number().positive().max(8192).optional()
  }),

  validateVideo: z.object({
    filename: z.string().refine(filename => {
      const sanitized = InputSanitizer.sanitizeFilename(filename);
      return sanitized === filename && /\.(mp4|mov|avi|webm)$/i.test(filename);
    }, 'Invalid video file'),
    size: z.number().positive().max(100 * 1024 * 1024), // 100MB
    duration: z.number().positive().max(600).optional(), // 10 minutes
    bitrate: z.number().positive().optional()
  }),

  validateDocument: z.object({
    filename: z.string().refine(filename => {
      const sanitized = InputSanitizer.sanitizeFilename(filename);
      return sanitized === filename && /\.(pdf|doc|docx|txt|csv|json|xml)$/i.test(filename);
    }, 'Invalid document file'),
    size: z.number().positive().max(50 * 1024 * 1024) // 50MB
  })
};

// Search and Filter Schemas
export const searchSchemas = {
  searchContent: z.object({
    query: z.string().min(1).max(200),
    platform: schemas.platform.optional(),
    contentType: z.enum(['post', 'image', 'video', 'story']).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    sortBy: z.enum(['relevance', 'date', 'engagement']).default('relevance'),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0)
  }),

  filterContent: z.object({
    hashtags: z.array(schemas.hashtag).optional(),
    mentions: z.array(z.string().regex(/^@[a-zA-Z0-9_]+$/)).optional(),
    platforms: z.array(schemas.platform).optional(),
    engagementMin: z.number().min(0).optional(),
    engagementMax: z.number().min(0).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional()
  })
};

// Webhook and Integration Schemas
export const integrationSchemas = {
  createWebhook: z.object({
    url: schemas.url,
    events: z.array(z.enum(['post_created', 'post_updated', 'post_deleted', 'analytics_updated'])),
    secret: z.string().min(16).max(64).optional(),
    isActive: z.boolean().default(true)
  }),

  updateWebhook: z.object({
    id: schemas.id,
    url: schemas.url.optional(),
    events: z.array(z.enum(['post_created', 'post_updated', 'post_deleted', 'analytics_updated'])).optional(),
    secret: z.string().min(16).max(64).optional(),
    isActive: z.boolean().optional()
  }),

  oauthCallback: z.object({
    code: z.string().min(1).max(500),
    state: z.string().min(1).max(200),
    platform: schemas.platform
  }),

  connectPlatform: z.object({
    platform: schemas.platform,
    accessToken: z.string().min(1).max(500),
    refreshToken: z.string().min(1).max(500).optional(),
    expiresAt: z.string().datetime().optional(),
    accountId: z.string().min(1).max(100),
    accountName: z.string().min(1).max(100)
  })
};

// Export all schemas grouped by category
export const validationSchemas = {
  ai: aiContentSchemas,
  auth: authSchemas,
  profile: profileSchemas,
  content: contentSchemas,
  dataCollection: dataCollectionSchemas,
  team: teamSchemas,
  analytics: analyticsSchemas,
  usage: usageSchemas,
  media: mediaSchemas,
  search: searchSchemas,
  integration: integrationSchemas
};

// Helper function to get schema by endpoint path
export function getSchemaForEndpoint(path: string, method: string): z.ZodSchema<any> | null {
  const schemaMap: Record<string, z.ZodSchema<any>> = {
    // AI endpoints
    'POST /api/ai/generate/variations': aiContentSchemas.generateVariations,
    'POST /api/ai/optimize/content': aiContentSchemas.optimizeContent,
    'POST /api/ai/predict/performance': aiContentSchemas.predictPerformance,
    'POST /api/engagement-prediction': aiContentSchemas.engagementPrediction,
    
    // Auth endpoints
    'POST /api/auth/signup': authSchemas.signUp,
    'POST /api/auth/signin': authSchemas.signIn,
    'POST /api/auth/reset-password': authSchemas.resetPassword,
    'PUT /api/auth/update-password': authSchemas.updatePassword,
    
    // Profile endpoints
    'PUT /api/profile': profileSchemas.updateProfile,
    'PUT /api/profile/settings': profileSchemas.updateSettings,
    
    // Content endpoints
    'POST /api/content': contentSchemas.createPost,
    'PUT /api/content': contentSchemas.updatePost,
    'DELETE /api/content': contentSchemas.deletePost,
    'POST /api/content/upload': contentSchemas.uploadMedia,
    
    // Data collection endpoints
    'POST /api/data-collection/initiate': dataCollectionSchemas.initiateCollection,
    'GET /api/data-collection/status': dataCollectionSchemas.collectionStatus,
    'PUT /api/data-collection/settings': dataCollectionSchemas.updateCollectionSettings,
    
    // Team endpoints
    'POST /api/team': teamSchemas.createTeam,
    'POST /api/team/invite': teamSchemas.inviteTeamMember,
    'PUT /api/team/member': teamSchemas.updateTeamMember,
    'DELETE /api/team/member': teamSchemas.removeTeamMember,
    
    // Analytics endpoints
    'GET /api/analytics': analyticsSchemas.getAnalytics,
    'POST /api/analytics/report': analyticsSchemas.generateReport,
    
    // Usage endpoints
    'POST /api/usage': usageSchemas.trackUsage,
    'PUT /api/subscription': usageSchemas.updateSubscription,
    
    // Search endpoints
    'GET /api/search/content': searchSchemas.searchContent,
    'POST /api/search/filter': searchSchemas.filterContent,
    
    // Integration endpoints
    'POST /api/webhook': integrationSchemas.createWebhook,
    'PUT /api/webhook': integrationSchemas.updateWebhook,
    'GET /api/oauth/callback': integrationSchemas.oauthCallback,
    'POST /api/oauth/connect': integrationSchemas.connectPlatform
  };

  const key = `${method.toUpperCase()} ${path}`;
  return schemaMap[key] || null;
}