/**
 * Content Niche Types for AI Improvement Workflow
 * 
 * These types define the different content niches that the system can optimize for.
 * Each niche has specific characteristics, audience preferences, and optimization strategies.
 */

export type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Twitter' | 'LinkedIn';

export enum ContentNiche {
  FITNESS = 'fitness',
  BUSINESS = 'business',
  ENTERTAINMENT = 'entertainment',
  EDUCATION = 'education',
  FOOD = 'food',
  TRAVEL = 'travel',
  TECH = 'tech',
  LIFESTYLE = 'lifestyle',
  HEALTH = 'health',
  FINANCE = 'finance',
  BEAUTY = 'beauty',
  GAMING = 'gaming',
  MUSIC = 'music',
  SPORTS = 'sports',
  PARENTING = 'parenting',
  PETS = 'pets',
  HOME_DECOR = 'home_decor',
  FASHION = 'fashion',
  AUTOMOTIVE = 'automotive',
  REAL_ESTATE = 'real_estate'
}

export interface NicheCharacteristics {
  niche: ContentNiche;
  audienceAgeRange: {
    primary: [number, number]; // [min, max]
    secondary?: [number, number];
  };
  platformPreferences: {
    tiktok: number; // 0-1 preference score
    instagram: number;
    youtube: number;
    facebook: number;
    twitter: number;
    linkedin: number;
  };
  contentTypes: {
    video: number; // Performance score 0-1
    image: number;
    carousel: number;
    story: number;
    reel: number;
    text: number;
  };
  postingFrequency: {
    optimal: number; // Posts per day
    minimum: number;
    maximum: number;
  };
  engagementPatterns: {
    peakHours: number[]; // Hours of day (0-23)
    peakDays: number[]; // Days of week (0-6)
    seasonality: 'high' | 'medium' | 'low';
  };
  keyTopics: string[];
  commonHashtags: string[];
  contentStyle: {
    tone: ('professional' | 'casual' | 'humorous' | 'inspirational' | 'educational')[];
    visualStyle: ('bright' | 'minimal' | 'bold' | 'natural' | 'artistic')[];
    musicStyle?: ('upbeat' | 'calm' | 'trending' | 'classical')[];
  };
  competitionLevel: 'low' | 'medium' | 'high' | 'extremely_high';
  averageEngagementRate: number;
  viralPotential: number; // 0-1 score
}

export const NICHE_DEFINITIONS: Record<ContentNiche, NicheCharacteristics> = {
  [ContentNiche.FITNESS]: {
    niche: ContentNiche.FITNESS,
    audienceAgeRange: {
      primary: [18, 35],
      secondary: [35, 50]
    },
    platformPreferences: {
      tiktok: 0.9,
      instagram: 0.95,
      youtube: 0.8,
      facebook: 0.6,
      twitter: 0.4,
      linkedin: 0.3
    },
    contentTypes: {
      video: 0.9,
      image: 0.7,
      carousel: 0.8,
      story: 0.85,
      reel: 0.95,
      text: 0.3
    },
    postingFrequency: {
      optimal: 1.5,
      minimum: 0.5,
      maximum: 3
    },
    engagementPatterns: {
      peakHours: [6, 7, 8, 17, 18, 19, 20],
      peakDays: [1, 2, 3, 4, 5],
      seasonality: 'high'
    },
    keyTopics: [
      'workout routines', 'nutrition', 'weight loss', 'muscle building',
      'healthy recipes', 'gym tips', 'home workouts', 'motivation'
    ],
    commonHashtags: [
      '#fitness', '#workout', '#gym', '#health', '#fitnessmotivation',
      '#bodybuilding', '#weightloss', '#nutrition', '#fit', '#training'
    ],
    contentStyle: {
      tone: ['inspirational', 'educational', 'casual'],
      visualStyle: ['bold', 'bright', 'natural'],
      musicStyle: ['upbeat', 'trending']
    },
    competitionLevel: 'extremely_high',
    averageEngagementRate: 0.08,
    viralPotential: 0.7
  },

  [ContentNiche.BUSINESS]: {
    niche: ContentNiche.BUSINESS,
    audienceAgeRange: {
      primary: [25, 45],
      secondary: [45, 65]
    },
    platformPreferences: {
      tiktok: 0.6,
      instagram: 0.7,
      youtube: 0.9,
      facebook: 0.8,
      twitter: 0.8,
      linkedin: 0.95
    },
    contentTypes: {
      video: 0.8,
      image: 0.9,
      carousel: 0.95,
      story: 0.6,
      reel: 0.7,
      text: 0.85
    },
    postingFrequency: {
      optimal: 1,
      minimum: 0.3,
      maximum: 2
    },
    engagementPatterns: {
      peakHours: [8, 9, 12, 13, 17, 18],
      peakDays: [1, 2, 3, 4, 5],
      seasonality: 'low'
    },
    keyTopics: [
      'entrepreneurship', 'leadership', 'productivity', 'marketing',
      'business tips', 'success stories', 'industry insights', 'networking'
    ],
    commonHashtags: [
      '#business', '#entrepreneur', '#leadership', '#success', '#marketing',
      '#productivity', '#businesstips', '#startup', '#growth', '#innovation'
    ],
    contentStyle: {
      tone: ['professional', 'educational', 'inspirational'],
      visualStyle: ['minimal', 'bold']
    },
    competitionLevel: 'high',
    averageEngagementRate: 0.06,
    viralPotential: 0.4
  },

  [ContentNiche.ENTERTAINMENT]: {
    niche: ContentNiche.ENTERTAINMENT,
    audienceAgeRange: {
      primary: [13, 30],
      secondary: [30, 45]
    },
    platformPreferences: {
      tiktok: 0.95,
      instagram: 0.9,
      youtube: 0.85,
      facebook: 0.7,
      twitter: 0.8,
      linkedin: 0.2
    },
    contentTypes: {
      video: 0.95,
      image: 0.6,
      carousel: 0.7,
      story: 0.9,
      reel: 0.98,
      text: 0.4
    },
    postingFrequency: {
      optimal: 2,
      minimum: 1,
      maximum: 5
    },
    engagementPatterns: {
      peakHours: [15, 16, 17, 18, 19, 20, 21, 22],
      peakDays: [5, 6, 0],
      seasonality: 'medium'
    },
    keyTopics: [
      'comedy', 'memes', 'trending topics', 'pop culture',
      'celebrity news', 'viral challenges', 'funny videos', 'entertainment news'
    ],
    commonHashtags: [
      '#entertainment', '#funny', '#viral', '#trending', '#comedy',
      '#memes', '#fun', '#humor', '#fyp', '#explore'
    ],
    contentStyle: {
      tone: ['humorous', 'casual'],
      visualStyle: ['bright', 'bold', 'artistic'],
      musicStyle: ['trending', 'upbeat']
    },
    competitionLevel: 'extremely_high',
    averageEngagementRate: 0.12,
    viralPotential: 0.9
  },

  [ContentNiche.EDUCATION]: {
    niche: ContentNiche.EDUCATION,
    audienceAgeRange: {
      primary: [16, 35],
      secondary: [35, 55]
    },
    platformPreferences: {
      tiktok: 0.8,
      instagram: 0.8,
      youtube: 0.95,
      facebook: 0.7,
      twitter: 0.7,
      linkedin: 0.8
    },
    contentTypes: {
      video: 0.9,
      image: 0.8,
      carousel: 0.95,
      story: 0.7,
      reel: 0.85,
      text: 0.7
    },
    postingFrequency: {
      optimal: 1,
      minimum: 0.5,
      maximum: 2
    },
    engagementPatterns: {
      peakHours: [9, 10, 11, 14, 15, 16, 19, 20],
      peakDays: [1, 2, 3, 4, 0],
      seasonality: 'high'
    },
    keyTopics: [
      'tutorials', 'how-to guides', 'skill development', 'learning tips',
      'educational content', 'study tips', 'career advice', 'knowledge sharing'
    ],
    commonHashtags: [
      '#education', '#learning', '#tutorial', '#howto', '#tips',
      '#knowledge', '#study', '#skills', '#educational', '#learn'
    ],
    contentStyle: {
      tone: ['educational', 'professional', 'inspirational'],
      visualStyle: ['minimal', 'bright', 'natural']
    },
    competitionLevel: 'medium',
    averageEngagementRate: 0.07,
    viralPotential: 0.5
  },

  [ContentNiche.FOOD]: {
    niche: ContentNiche.FOOD,
    audienceAgeRange: {
      primary: [20, 50],
      secondary: [50, 70]
    },
    platformPreferences: {
      tiktok: 0.9,
      instagram: 0.95,
      youtube: 0.85,
      facebook: 0.8,
      twitter: 0.5,
      linkedin: 0.3
    },
    contentTypes: {
      video: 0.95,
      image: 0.9,
      carousel: 0.85,
      story: 0.8,
      reel: 0.9,
      text: 0.4
    },
    postingFrequency: {
      optimal: 1.5,
      minimum: 0.5,
      maximum: 3
    },
    engagementPatterns: {
      peakHours: [11, 12, 13, 17, 18, 19],
      peakDays: [1, 2, 3, 4, 5, 6, 0],
      seasonality: 'medium'
    },
    keyTopics: [
      'recipes', 'cooking tips', 'food reviews', 'baking',
      'healthy eating', 'meal prep', 'restaurant reviews', 'food trends'
    ],
    commonHashtags: [
      '#food', '#recipe', '#cooking', '#foodie', '#delicious',
      '#homemade', '#yummy', '#foodstagram', '#chef', '#nutrition'
    ],
    contentStyle: {
      tone: ['casual', 'educational', 'inspirational'],
      visualStyle: ['bright', 'natural', 'artistic'],
      musicStyle: ['calm', 'trending']
    },
    competitionLevel: 'high',
    averageEngagementRate: 0.09,
    viralPotential: 0.6
  },

  // Adding default values for remaining niches
  [ContentNiche.TRAVEL]: {
    niche: ContentNiche.TRAVEL,
    audienceAgeRange: { primary: [20, 40] },
    platformPreferences: { tiktok: 0.8, instagram: 0.95, youtube: 0.8, facebook: 0.7, twitter: 0.6, linkedin: 0.4 },
    contentTypes: { video: 0.9, image: 0.95, carousel: 0.9, story: 0.9, reel: 0.85, text: 0.5 },
    postingFrequency: { optimal: 1, minimum: 0.3, maximum: 2 },
    engagementPatterns: { peakHours: [8, 9, 19, 20, 21], peakDays: [5, 6, 0], seasonality: 'high' },
    keyTopics: ['travel tips', 'destinations', 'adventure', 'culture'],
    commonHashtags: ['#travel', '#wanderlust', '#adventure', '#explore'],
    contentStyle: { tone: ['inspirational', 'casual'], visualStyle: ['bright', 'natural'] },
    competitionLevel: 'high',
    averageEngagementRate: 0.08,
    viralPotential: 0.7
  },

  [ContentNiche.TECH]: {
    niche: ContentNiche.TECH,
    audienceAgeRange: { primary: [18, 40] },
    platformPreferences: { tiktok: 0.7, instagram: 0.7, youtube: 0.9, facebook: 0.6, twitter: 0.85, linkedin: 0.8 },
    contentTypes: { video: 0.8, image: 0.7, carousel: 0.8, story: 0.6, reel: 0.75, text: 0.7 },
    postingFrequency: { optimal: 1, minimum: 0.5, maximum: 2 },
    engagementPatterns: { peakHours: [9, 10, 14, 15, 20, 21], peakDays: [1, 2, 3, 4, 5], seasonality: 'low' },
    keyTopics: ['technology', 'gadgets', 'software', 'AI', 'innovation'],
    commonHashtags: ['#tech', '#technology', '#innovation', '#gadgets'],
    contentStyle: { tone: ['educational', 'professional'], visualStyle: ['minimal', 'bold'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.06,
    viralPotential: 0.4
  },

  [ContentNiche.LIFESTYLE]: {
    niche: ContentNiche.LIFESTYLE,
    audienceAgeRange: { primary: [20, 45] },
    platformPreferences: { tiktok: 0.8, instagram: 0.9, youtube: 0.7, facebook: 0.7, twitter: 0.5, linkedin: 0.4 },
    contentTypes: { video: 0.8, image: 0.9, carousel: 0.85, story: 0.9, reel: 0.8, text: 0.5 },
    postingFrequency: { optimal: 1.5, minimum: 0.5, maximum: 3 },
    engagementPatterns: { peakHours: [8, 9, 17, 18, 19, 20], peakDays: [1, 2, 3, 4, 5, 6, 0], seasonality: 'medium' },
    keyTopics: ['lifestyle', 'daily routine', 'wellness', 'self-care'],
    commonHashtags: ['#lifestyle', '#wellness', '#selfcare', '#daily'],
    contentStyle: { tone: ['casual', 'inspirational'], visualStyle: ['natural', 'minimal'] },
    competitionLevel: 'high',
    averageEngagementRate: 0.07,
    viralPotential: 0.5
  },

  [ContentNiche.HEALTH]: {
    niche: ContentNiche.HEALTH,
    audienceAgeRange: { primary: [25, 55] },
    platformPreferences: { tiktok: 0.7, instagram: 0.8, youtube: 0.9, facebook: 0.8, twitter: 0.6, linkedin: 0.6 },
    contentTypes: { video: 0.8, image: 0.8, carousel: 0.9, story: 0.7, reel: 0.75, text: 0.7 },
    postingFrequency: { optimal: 1, minimum: 0.3, maximum: 2 },
    engagementPatterns: { peakHours: [7, 8, 12, 13, 18, 19], peakDays: [1, 2, 3, 4, 5], seasonality: 'medium' },
    keyTopics: ['health tips', 'wellness', 'mental health', 'nutrition'],
    commonHashtags: ['#health', '#wellness', '#mentalhealth', '#nutrition'],
    contentStyle: { tone: ['educational', 'professional', 'inspirational'], visualStyle: ['natural', 'minimal'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.06,
    viralPotential: 0.4
  },

  [ContentNiche.FINANCE]: {
    niche: ContentNiche.FINANCE,
    audienceAgeRange: { primary: [25, 50] },
    platformPreferences: { tiktok: 0.6, instagram: 0.7, youtube: 0.9, facebook: 0.7, twitter: 0.8, linkedin: 0.9 },
    contentTypes: { video: 0.8, image: 0.8, carousel: 0.9, story: 0.6, reel: 0.7, text: 0.8 },
    postingFrequency: { optimal: 0.8, minimum: 0.3, maximum: 1.5 },
    engagementPatterns: { peakHours: [8, 9, 12, 13, 17, 18], peakDays: [1, 2, 3, 4, 5], seasonality: 'low' },
    keyTopics: ['investing', 'financial planning', 'money tips', 'budgeting'],
    commonHashtags: ['#finance', '#investing', '#money', '#financialtips'],
    contentStyle: { tone: ['educational', 'professional'], visualStyle: ['minimal'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.05,
    viralPotential: 0.3
  },

  // Simplified definitions for remaining niches
  [ContentNiche.BEAUTY]: {
    niche: ContentNiche.BEAUTY,
    audienceAgeRange: { primary: [16, 35] },
    platformPreferences: { tiktok: 0.9, instagram: 0.95, youtube: 0.8, facebook: 0.6, twitter: 0.5, linkedin: 0.2 },
    contentTypes: { video: 0.9, image: 0.9, carousel: 0.8, story: 0.85, reel: 0.9, text: 0.4 },
    postingFrequency: { optimal: 1.5, minimum: 0.5, maximum: 3 },
    engagementPatterns: { peakHours: [10, 11, 18, 19, 20], peakDays: [1, 2, 3, 4, 5, 6, 0], seasonality: 'medium' },
    keyTopics: ['makeup', 'skincare', 'beauty tips', 'tutorials'],
    commonHashtags: ['#beauty', '#makeup', '#skincare', '#beautytips'],
    contentStyle: { tone: ['casual', 'inspirational'], visualStyle: ['bright', 'artistic'] },
    competitionLevel: 'extremely_high',
    averageEngagementRate: 0.1,
    viralPotential: 0.8
  },

  [ContentNiche.GAMING]: {
    niche: ContentNiche.GAMING,
    audienceAgeRange: { primary: [13, 30] },
    platformPreferences: { tiktok: 0.8, instagram: 0.7, youtube: 0.95, facebook: 0.6, twitter: 0.8, linkedin: 0.2 },
    contentTypes: { video: 0.95, image: 0.6, carousel: 0.7, story: 0.8, reel: 0.9, text: 0.5 },
    postingFrequency: { optimal: 2, minimum: 1, maximum: 4 },
    engagementPatterns: { peakHours: [15, 16, 17, 18, 19, 20, 21, 22], peakDays: [5, 6, 0], seasonality: 'low' },
    keyTopics: ['gaming', 'esports', 'game reviews', 'gameplay'],
    commonHashtags: ['#gaming', '#gamer', '#esports', '#gameplay'],
    contentStyle: { tone: ['casual', 'humorous'], visualStyle: ['bold', 'bright'] },
    competitionLevel: 'high',
    averageEngagementRate: 0.09,
    viralPotential: 0.7
  },

  [ContentNiche.MUSIC]: {
    niche: ContentNiche.MUSIC,
    audienceAgeRange: { primary: [13, 35] },
    platformPreferences: { tiktok: 0.95, instagram: 0.9, youtube: 0.9, facebook: 0.6, twitter: 0.7, linkedin: 0.2 },
    contentTypes: { video: 0.95, image: 0.7, carousel: 0.7, story: 0.9, reel: 0.95, text: 0.4 },
    postingFrequency: { optimal: 2, minimum: 1, maximum: 4 },
    engagementPatterns: { peakHours: [16, 17, 18, 19, 20, 21, 22], peakDays: [5, 6, 0], seasonality: 'medium' },
    keyTopics: ['music', 'songs', 'artists', 'concerts'],
    commonHashtags: ['#music', '#song', '#artist', '#musician'],
    contentStyle: { tone: ['casual', 'inspirational'], visualStyle: ['artistic', 'bright'] },
    competitionLevel: 'extremely_high',
    averageEngagementRate: 0.11,
    viralPotential: 0.9
  },

  [ContentNiche.SPORTS]: {
    niche: ContentNiche.SPORTS,
    audienceAgeRange: { primary: [16, 45] },
    platformPreferences: { tiktok: 0.8, instagram: 0.85, youtube: 0.9, facebook: 0.8, twitter: 0.9, linkedin: 0.4 },
    contentTypes: { video: 0.9, image: 0.8, carousel: 0.7, story: 0.8, reel: 0.85, text: 0.6 },
    postingFrequency: { optimal: 1.5, minimum: 0.5, maximum: 3 },
    engagementPatterns: { peakHours: [18, 19, 20, 21, 22], peakDays: [5, 6, 0], seasonality: 'high' },
    keyTopics: ['sports', 'athletes', 'games', 'training'],
    commonHashtags: ['#sports', '#athlete', '#training', '#game'],
    contentStyle: { tone: ['inspirational', 'casual'], visualStyle: ['bold', 'bright'] },
    competitionLevel: 'high',
    averageEngagementRate: 0.08,
    viralPotential: 0.7
  },

  [ContentNiche.PARENTING]: {
    niche: ContentNiche.PARENTING,
    audienceAgeRange: { primary: [25, 45] },
    platformPreferences: { tiktok: 0.7, instagram: 0.8, youtube: 0.85, facebook: 0.9, twitter: 0.6, linkedin: 0.5 },
    contentTypes: { video: 0.8, image: 0.8, carousel: 0.85, story: 0.8, reel: 0.75, text: 0.7 },
    postingFrequency: { optimal: 1, minimum: 0.3, maximum: 2 },
    engagementPatterns: { peakHours: [9, 10, 14, 15, 20, 21], peakDays: [1, 2, 3, 4, 5, 6, 0], seasonality: 'low' },
    keyTopics: ['parenting tips', 'child development', 'family', 'education'],
    commonHashtags: ['#parenting', '#family', '#kids', '#mom'],
    contentStyle: { tone: ['educational', 'inspirational', 'casual'], visualStyle: ['natural', 'bright'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.07,
    viralPotential: 0.5
  },

  [ContentNiche.PETS]: {
    niche: ContentNiche.PETS,
    audienceAgeRange: { primary: [18, 50] },
    platformPreferences: { tiktok: 0.9, instagram: 0.9, youtube: 0.8, facebook: 0.8, twitter: 0.6, linkedin: 0.3 },
    contentTypes: { video: 0.95, image: 0.9, carousel: 0.8, story: 0.85, reel: 0.9, text: 0.4 },
    postingFrequency: { optimal: 1.5, minimum: 0.5, maximum: 3 },
    engagementPatterns: { peakHours: [8, 9, 17, 18, 19, 20], peakDays: [1, 2, 3, 4, 5, 6, 0], seasonality: 'low' },
    keyTopics: ['pets', 'dogs', 'cats', 'pet care'],
    commonHashtags: ['#pets', '#dogs', '#cats', '#petlove'],
    contentStyle: { tone: ['casual', 'humorous'], visualStyle: ['natural', 'bright'] },
    competitionLevel: 'high',
    averageEngagementRate: 0.12,
    viralPotential: 0.8
  },

  [ContentNiche.HOME_DECOR]: {
    niche: ContentNiche.HOME_DECOR,
    audienceAgeRange: { primary: [25, 50] },
    platformPreferences: { tiktok: 0.7, instagram: 0.9, youtube: 0.8, facebook: 0.8, twitter: 0.4, linkedin: 0.3 },
    contentTypes: { video: 0.8, image: 0.95, carousel: 0.9, story: 0.8, reel: 0.8, text: 0.5 },
    postingFrequency: { optimal: 1, minimum: 0.3, maximum: 2 },
    engagementPatterns: { peakHours: [10, 11, 14, 15, 19, 20], peakDays: [1, 2, 3, 4, 5, 6, 0], seasonality: 'medium' },
    keyTopics: ['home decor', 'interior design', 'DIY', 'organization'],
    commonHashtags: ['#homedecor', '#interior', '#diy', '#home'],
    contentStyle: { tone: ['inspirational', 'educational'], visualStyle: ['minimal', 'artistic'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.07,
    viralPotential: 0.5
  },

  [ContentNiche.FASHION]: {
    niche: ContentNiche.FASHION,
    audienceAgeRange: { primary: [16, 35] },
    platformPreferences: { tiktok: 0.9, instagram: 0.95, youtube: 0.7, facebook: 0.6, twitter: 0.5, linkedin: 0.3 },
    contentTypes: { video: 0.9, image: 0.95, carousel: 0.9, story: 0.9, reel: 0.9, text: 0.4 },
    postingFrequency: { optimal: 1.5, minimum: 0.5, maximum: 3 },
    engagementPatterns: { peakHours: [10, 11, 17, 18, 19, 20], peakDays: [1, 2, 3, 4, 5, 6, 0], seasonality: 'high' },
    keyTopics: ['fashion', 'style', 'outfits', 'trends'],
    commonHashtags: ['#fashion', '#style', '#outfit', '#ootd'],
    contentStyle: { tone: ['inspirational', 'casual'], visualStyle: ['artistic', 'bright'] },
    competitionLevel: 'extremely_high',
    averageEngagementRate: 0.09,
    viralPotential: 0.7
  },

  [ContentNiche.AUTOMOTIVE]: {
    niche: ContentNiche.AUTOMOTIVE,
    audienceAgeRange: { primary: [18, 45] },
    platformPreferences: { tiktok: 0.7, instagram: 0.8, youtube: 0.9, facebook: 0.8, twitter: 0.7, linkedin: 0.4 },
    contentTypes: { video: 0.9, image: 0.8, carousel: 0.7, story: 0.7, reel: 0.8, text: 0.6 },
    postingFrequency: { optimal: 1, minimum: 0.3, maximum: 2 },
    engagementPatterns: { peakHours: [17, 18, 19, 20, 21], peakDays: [5, 6, 0], seasonality: 'low' },
    keyTopics: ['cars', 'automotive', 'reviews', 'maintenance'],
    commonHashtags: ['#cars', '#automotive', '#vehicle', '#auto'],
    contentStyle: { tone: ['educational', 'casual'], visualStyle: ['bold', 'bright'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.06,
    viralPotential: 0.4
  },

  [ContentNiche.REAL_ESTATE]: {
    niche: ContentNiche.REAL_ESTATE,
    audienceAgeRange: { primary: [25, 55] },
    platformPreferences: { tiktok: 0.6, instagram: 0.8, youtube: 0.8, facebook: 0.8, twitter: 0.6, linkedin: 0.9 },
    contentTypes: { video: 0.9, image: 0.9, carousel: 0.85, story: 0.8, reel: 0.8, text: 0.7 },
    postingFrequency: { optimal: 0.8, minimum: 0.3, maximum: 1.5 },
    engagementPatterns: { peakHours: [9, 10, 12, 13, 17, 18], peakDays: [1, 2, 3, 4, 5, 6], seasonality: 'medium' },
    keyTopics: ['real estate', 'property', 'home buying', 'investment'],
    commonHashtags: ['#realestate', '#property', '#home', '#investment'],
    contentStyle: { tone: ['professional', 'educational'], visualStyle: ['minimal'] },
    competitionLevel: 'medium',
    averageEngagementRate: 0.05,
    viralPotential: 0.3
  }
};

/**
 * Get niche characteristics for a specific niche
 */
export function getNicheCharacteristics(niche: ContentNiche): NicheCharacteristics {
  return NICHE_DEFINITIONS[niche];
}

/**
 * Classify content into a niche based on text analysis
 */
export function classifyContentNiche(text: string, hashtags: string[] = []): {
  niche: ContentNiche;
  confidence: number;
  alternativeNiches: { niche: ContentNiche; confidence: number }[];
} {
  const scores: Record<ContentNiche, number> = {} as any;
  const allText = (text + ' ' + hashtags.join(' ')).toLowerCase();

  // Calculate scores for each niche based on keyword matching
  for (const [niche, characteristics] of Object.entries(NICHE_DEFINITIONS)) {
    let score = 0;
    
    // Score based on key topics
    for (const topic of characteristics.keyTopics) {
      if (allText.includes(topic.toLowerCase())) {
        score += 2;
      }
    }
    
    // Score based on common hashtags
    for (const hashtag of characteristics.commonHashtags) {
      if (hashtags.some(h => h.toLowerCase() === hashtag.toLowerCase())) {
        score += 3;
      }
    }
    
    scores[niche as ContentNiche] = score;
  }

  // Find the best match
  const sortedNiches = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([niche, score]) => ({
      niche: niche as ContentNiche,
      confidence: Math.min(0.95, score / 10), // Normalize to 0-1
    }));

  const primary = sortedNiches[0];
  const alternatives = sortedNiches.slice(1, 4).filter(n => n.confidence > 0.1);

  return {
    niche: primary?.niche || ContentNiche.LIFESTYLE,
    confidence: primary?.confidence || 0.1,
    alternativeNiches: alternatives,
  };
}

/**
 * Get optimal posting strategy for a niche
 */
export function getOptimalPostingStrategy(niche: ContentNiche): {
  bestTimes: number[];
  bestDays: number[];
  frequency: number;
  contentTypes: string[];
  platforms: string[];
} {
  const characteristics = getNicheCharacteristics(niche);
  
  return {
    bestTimes: characteristics.engagementPatterns.peakHours,
    bestDays: characteristics.engagementPatterns.peakDays,
    frequency: characteristics.postingFrequency.optimal,
    contentTypes: Object.entries(characteristics.contentTypes)
      .filter(([, score]) => score > 0.8)
      .map(([type]) => type),
    platforms: Object.entries(characteristics.platformPreferences)
      .filter(([, score]) => score > 0.7)
      .map(([platform]) => platform),
  };
} 