// Test fixtures for ClipsCommerce application
export const mockUsers = {
  freeUser: {
    id: 'user-free-123',
    email: 'free@example.com',
    name: 'Free User',
    role: 'user' as const,
    subscription: 'free' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  
  liteUser: {
    id: 'user-lite-456',
    email: 'lite@example.com',
    name: 'Lite User',
    role: 'user' as const,
    subscription: 'lite' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  
  proUser: {
    id: 'user-pro-789',
    email: 'pro@example.com',
    name: 'Pro User',
    role: 'user' as const,
    subscription: 'pro' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  
  teamUser: {
    id: 'user-team-101',
    email: 'team@example.com',
    name: 'Team User',
    role: 'team_member' as const,
    subscription: 'team' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  
  adminUser: {
    id: 'user-admin-999',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    subscription: 'team' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockPricingTiers = {
  lite: {
    id: 'lite',
    name: 'Lite Plan',
    price: 20,
    yearlyPrice: 240,
    description: '$20/month',
    features: [
      'Viral Blitz Cycle Framework (15 uses)',
      'Idea Generator Framework (15 uses)',
      '15 autoposts/month',
      'Basic analytics (no e-commerce)',
    ],
    isPopular: false,
    ctaText: 'Select Plan',
    stripePriceId: 'price_lite_test',
  },
  
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 70,
    yearlyPrice: 840,
    description: '$70/month',
    features: [
      'Viral Blitz Cycle Framework (unlimited)',
      'Idea Generator Framework (unlimited)',
      'Unlimited posts',
      'Multiple account sets',
      'E-commerce integration',
      'Advanced analytics & reporting',
    ],
    isPopular: true,
    ctaText: 'Get Started',
    stripePriceId: 'price_pro_test',
  },
  
  team: {
    id: 'team',
    name: 'Team Plan',
    price: 500,
    yearlyPrice: 6000,
    description: '$500/month',
    features: [
      'Everything in Pro',
      'Team dashboard access',
      'Manage unlimited accounts',
      'Brand Voice AI (for consistency)',
      'Team collaboration mode',
      'Priority support',
    ],
    isPopular: false,
    ctaText: 'Choose Team',
    stripePriceId: 'price_team_test',
  },
};

export const mockContent = {
  tiktokVideo: {
    id: 'content-tiktok-123',
    title: 'Viral TikTok Dance',
    description: 'Amazing dance video that went viral',
    url: 'https://tiktok.com/@user/video/123',
    platform: 'tiktok',
    thumbnail: 'https://example.com/thumbnail.jpg',
    duration: 30,
    metrics: {
      views: 1500000,
      likes: 125000,
      shares: 8500,
      comments: 2300,
      engagement_rate: 8.9,
    },
    tags: ['dance', 'viral', 'trending'],
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  
  instagramPost: {
    id: 'content-instagram-456',
    title: 'Product Showcase',
    description: 'Beautiful product photography',
    url: 'https://instagram.com/p/ABC123',
    platform: 'instagram',
    thumbnail: 'https://example.com/instagram-thumb.jpg',
    metrics: {
      views: 45000,
      likes: 3200,
      shares: 150,
      comments: 89,
      engagement_rate: 7.2,
    },
    tags: ['product', 'photography', 'lifestyle'],
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-14T14:20:00Z',
  },
  
  youtubeVideo: {
    id: 'content-youtube-789',
    title: 'How-to Tutorial',
    description: 'Step-by-step tutorial for beginners',
    url: 'https://youtube.com/watch?v=ABC123',
    platform: 'youtube',
    thumbnail: 'https://example.com/youtube-thumb.jpg',
    duration: 600,
    metrics: {
      views: 25000,
      likes: 1800,
      shares: 320,
      comments: 156,
      engagement_rate: 9.1,
    },
    tags: ['tutorial', 'howto', 'education'],
    created_at: '2024-01-13T09:15:00Z',
    updated_at: '2024-01-13T09:15:00Z',
  },
};

export const mockAnalytics = {
  overview: {
    totalViews: 2500000,
    totalLikes: 185000,
    totalShares: 12500,
    totalComments: 4200,
    averageEngagementRate: 8.4,
    topPerformingPlatform: 'tiktok',
    growthRate: 15.3,
    period: '30d',
  },
  
  platformBreakdown: {
    tiktok: {
      views: 1500000,
      likes: 125000,
      shares: 8500,
      engagement_rate: 8.9,
      content_count: 45,
    },
    instagram: {
      views: 750000,
      likes: 45000,
      shares: 2800,
      engagement_rate: 6.4,
      content_count: 32,
    },
    youtube: {
      views: 250000,
      likes: 15000,
      shares: 1200,
      engagement_rate: 6.5,
      content_count: 8,
    },
  },
  
  timeSeriesData: [
    { date: '2024-01-01', views: 50000, likes: 3500, shares: 250 },
    { date: '2024-01-02', views: 65000, likes: 4200, shares: 320 },
    { date: '2024-01-03', views: 78000, likes: 5100, shares: 410 },
    { date: '2024-01-04', views: 92000, likes: 6300, shares: 480 },
    { date: '2024-01-05', views: 110000, likes: 7800, shares: 590 },
  ],
};

export const mockWorkflows = {
  contentGeneration: {
    id: 'workflow-content-123',
    name: 'Daily Content Generation',
    description: 'Automated content creation workflow',
    status: 'active',
    triggers: ['schedule', 'manual'],
    actions: [
      { type: 'generate_ideas', count: 5 },
      { type: 'create_content', platform: 'tiktok' },
      { type: 'schedule_post', time: '10:00' },
    ],
    schedule: '0 9 * * *', // Daily at 9 AM
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  
  analyticsReporting: {
    id: 'workflow-analytics-456',
    name: 'Weekly Analytics Report',
    description: 'Generate and send weekly performance reports',
    status: 'active',
    triggers: ['schedule'],
    actions: [
      { type: 'collect_metrics', period: '7d' },
      { type: 'generate_report', format: 'pdf' },
      { type: 'send_email', recipients: ['team@example.com'] },
    ],
    schedule: '0 9 * * 1', // Weekly on Monday at 9 AM
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-08T09:00:00Z',
  },
};

export const mockApiResponses = {
  success: {
    data: { message: 'Success' },
    status: 200,
    ok: true,
  },
  
  error: {
    error: { message: 'Something went wrong' },
    status: 500,
    ok: false,
  },
  
  unauthorized: {
    error: { message: 'Unauthorized' },
    status: 401,
    ok: false,
  },
  
  notFound: {
    error: { message: 'Not found' },
    status: 404,
    ok: false,
  },
  
  validationError: {
    error: { 
      message: 'Validation failed',
      details: {
        email: 'Invalid email format',
        password: 'Password too short',
      }
    },
    status: 422,
    ok: false,
  },
};

export const mockSupabaseResponses = {
  authSuccess: {
    data: {
      user: mockUsers.proUser,
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUsers.proUser,
      },
    },
    error: null,
  },
  
  authError: {
    data: { user: null, session: null },
    error: {
      message: 'Invalid login credentials',
      status: 400,
    },
  },
  
  dataSuccess: {
    data: [mockContent.tiktokVideo, mockContent.instagramPost],
    error: null,
    count: 2,
  },
  
  dataError: {
    data: null,
    error: {
      message: 'Database connection failed',
      code: 'PGRST301',
    },
  },
};

// Helper functions for creating test data
export function createMockUser(overrides = {}) {
  return {
    ...mockUsers.freeUser,
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
    ...overrides,
  };
}

export function createMockContent(overrides = {}) {
  return {
    ...mockContent.tiktokVideo,
    id: `content-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

export function createMockWorkflow(overrides = {}) {
  return {
    ...mockWorkflows.contentGeneration,
    id: `workflow-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
} 