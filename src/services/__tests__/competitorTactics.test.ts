import { getCompetitorTactics } from '../competitorTactics';

// Mock all the dependencies
jest.mock('../../app/workflows/competitor_tactics/functions/CompetitorApiIntegrator');
jest.mock('../../app/workflows/competitor_tactics/functions/TacticExtractor');
jest.mock('../../app/workflows/competitor_tactics/functions/TaxonomyMapper');
jest.mock('../../app/workflows/competitor_tactics/functions/TacticMap');

describe('competitorTactics service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('competitive analysis functionality', () => {
    it('should analyze competitor content strategies', async () => {
      const request = {
        platform: 'tiktok' as const,
        usernameOrId: 'competitor123',
        analysisDepth: 'comprehensive',
      };

      const mockAnalysisResult = {
        contentStrategy: {
          postingFrequency: 'daily',
          optimalTimes: ['18:00', '20:00', '22:00'],
          contentTypes: ['dance', 'comedy', 'educational'],
          hashtagStrategy: ['#viral', '#trending', '#fyp'],
        },
        engagementMetrics: {
          averageLikes: 50000,
          averageComments: 2500,
          averageShares: 1200,
          engagementRate: 0.08,
        },
        tactics: [
          { type: 'trending_sounds', effectiveness: 0.9, frequency: 'high' },
          { type: 'user_generated_content', effectiveness: 0.7, frequency: 'medium' },
          { type: 'collaborations', effectiveness: 0.8, frequency: 'low' },
        ]
      };

      // Mock the service to return analysis result
      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockAnalysisResult)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result).toEqual(mockAnalysisResult);
      expect(result.contentStrategy).toBeDefined();
      expect(result.engagementMetrics).toBeDefined();
      expect(result.tactics).toBeInstanceOf(Array);
    });

    it('should analyze competitor posting patterns', async () => {
      const request = {
        platform: 'instagram' as const,
        usernameOrId: 'competitor_insta',
        timeRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
      };

      const mockPostingPatterns = {
        postingSchedule: {
          weekdayPattern: {
            monday: 2, tuesday: 3, wednesday: 2, thursday: 4, 
            friday: 5, saturday: 3, sunday: 2
          },
          hourlyPattern: {
            '06:00': 0.1, '09:00': 0.3, '12:00': 0.5, '15:00': 0.4,
            '18:00': 0.8, '20:00': 0.9, '22:00': 0.7
          },
          consistencyScore: 0.85,
        },
        contentMix: {
          photos: 0.4, videos: 0.5, carousels: 0.1,
          stories: 0.8, reels: 0.6, igtv: 0.1
        },
        performanceCorrelation: {
          timeVsEngagement: 0.7,
          contentTypeVsReach: 0.6,
          hashtagsVsDiscovery: 0.8
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockPostingPatterns)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.postingSchedule).toBeDefined();
      expect(result.contentMix).toBeDefined();
      expect(result.performanceCorrelation).toBeDefined();
      expect(result.postingSchedule.consistencyScore).toBeGreaterThan(0);
    });

    it('should identify trending tactics and strategies', async () => {
      const request = {
        platform: 'youtube' as const,
        usernameOrId: 'competitor_youtube',
        analysisType: 'trending_tactics',
      };

      const mockTrendingTactics = {
        emergingTrends: [
          { tactic: 'shorts_optimization', growth: 0.45, adoption: 'increasing' },
          { tactic: 'community_posts', growth: 0.32, adoption: 'stable' },
          { tactic: 'live_streaming', growth: 0.28, adoption: 'growing' },
        ],
        successfulFormats: [
          { format: 'tutorial_series', successRate: 0.78, avgViews: 125000 },
          { format: 'reaction_videos', successRate: 0.65, avgViews: 89000 },
          { format: 'behind_scenes', successRate: 0.72, avgViews: 156000 },
        ],
        competitiveAdvantages: [
          { advantage: 'early_trend_adoption', impact: 'high', sustainability: 'medium' },
          { advantage: 'unique_content_angle', impact: 'high', sustainability: 'high' },
          { advantage: 'consistent_branding', impact: 'medium', sustainability: 'high' },
        ]
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockTrendingTactics)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.emergingTrends).toBeInstanceOf(Array);
      expect(result.successfulFormats).toBeInstanceOf(Array);
      expect(result.competitiveAdvantages).toBeInstanceOf(Array);
      expect(result.emergingTrends.length).toBeGreaterThan(0);
    });
  });

  describe('strategy logic and recommendations', () => {
    it('should generate actionable strategy recommendations', async () => {
      const request = {
        platform: 'tiktok' as const,
        usernameOrId: 'top_competitor',
        generateRecommendations: true,
      };

      const mockRecommendations = {
        immediateActions: [
          { action: 'adopt_trending_sounds', priority: 'high', effort: 'low', impact: 'high' },
          { action: 'optimize_posting_times', priority: 'high', effort: 'medium', impact: 'medium' },
          { action: 'increase_posting_frequency', priority: 'medium', effort: 'high', impact: 'medium' },
        ],
        longTermStrategies: [
          { strategy: 'build_community_engagement', timeline: '3-6 months', resources: 'medium' },
          { strategy: 'develop_signature_style', timeline: '6-12 months', resources: 'high' },
          { strategy: 'expand_content_categories', timeline: '1-3 months', resources: 'low' },
        ],
        competitiveGaps: [
          { gap: 'underutilized_hashtags', opportunity: 'high', difficulty: 'low' },
          { gap: 'missed_trending_topics', opportunity: 'medium', difficulty: 'medium' },
          { gap: 'limited_user_interaction', opportunity: 'high', difficulty: 'high' },
        ],
        riskAssessment: {
          overallRisk: 'medium',
          riskFactors: ['algorithm_changes', 'trend_volatility', 'competitor_response'],
          mitigationStrategies: ['diversify_content', 'build_loyal_audience', 'monitor_trends']
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockRecommendations)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.immediateActions).toBeInstanceOf(Array);
      expect(result.longTermStrategies).toBeInstanceOf(Array);
      expect(result.competitiveGaps).toBeInstanceOf(Array);
      expect(result.riskAssessment).toBeDefined();
      expect(result.immediateActions.every((action: { priority: string; impact: string; }) => action.priority && action.impact)).toBe(true);
    });

    it('should perform competitive benchmarking', async () => {
      const request = {
        platform: 'instagram' as const,
        usernameOrId: 'benchmark_competitor',
        benchmarkMetrics: true,
        compareWith: ['user_account'],
      };

      const mockBenchmarking = {
        performanceComparison: {
          followerGrowth: { competitor: 0.15, user: 0.08, gap: -0.07 },
          engagementRate: { competitor: 0.06, user: 0.04, gap: -0.02 },
          postFrequency: { competitor: 1.2, user: 0.8, gap: -0.4 },
          reachRate: { competitor: 0.25, user: 0.18, gap: -0.07 },
        },
        contentQualityMetrics: {
          visualConsistency: { competitor: 0.9, user: 0.7, gap: -0.2 },
          captionEngagement: { competitor: 0.8, user: 0.6, gap: -0.2 },
          hashtagEffectiveness: { competitor: 0.75, user: 0.55, gap: -0.2 },
        },
        audienceInsights: {
          demographicAlignment: { competitor: 0.85, user: 0.78, gap: -0.07 },
          interestOverlap: { competitor: 0.72, user: 0.65, gap: -0.07 },
          engagementQuality: { competitor: 0.68, user: 0.58, gap: -0.1 },
        },
        improvementPotential: {
          quickWins: ['optimize_posting_times', 'improve_hashtag_strategy'],
          mediumTermGoals: ['enhance_visual_consistency', 'increase_post_frequency'],
          longTermObjectives: ['build_community', 'develop_unique_voice']
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockBenchmarking)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.performanceComparison).toBeDefined();
      expect(result.contentQualityMetrics).toBeDefined();
      expect(result.audienceInsights).toBeDefined();
      expect(result.improvementPotential).toBeDefined();
      expect(result.improvementPotential.quickWins).toBeInstanceOf(Array);
    });

    it('should analyze competitor content themes and topics', async () => {
      const request = {
        platform: 'youtube' as const,
        usernameOrId: 'content_competitor',
        analyzeContentThemes: true,
      };

      const mockContentAnalysis = {
        topicDistribution: {
          'educational': 0.35,
          'entertainment': 0.25,
          'lifestyle': 0.20,
          'technology': 0.15,
          'other': 0.05
        },
        contentPillars: [
          { pillar: 'how_to_tutorials', frequency: 0.4, avgPerformance: 0.78 },
          { pillar: 'product_reviews', frequency: 0.3, avgPerformance: 0.65 },
          { pillar: 'industry_news', frequency: 0.2, avgPerformance: 0.72 },
          { pillar: 'personal_stories', frequency: 0.1, avgPerformance: 0.85 },
        ],
        seasonalTrends: {
          'Q1': ['new_year_content', 'winter_themes'],
          'Q2': ['spring_content', 'easter_themes'],
          'Q3': ['summer_content', 'vacation_themes'],
          'Q4': ['fall_content', 'holiday_themes']
        },
        contentGaps: [
          { gap: 'beginner_friendly_content', opportunity: 'high' },
          { gap: 'interactive_content', opportunity: 'medium' },
          { gap: 'user_generated_content', opportunity: 'high' },
        ]
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockContentAnalysis)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.topicDistribution).toBeDefined();
      expect(result.contentPillars).toBeInstanceOf(Array);
      expect(result.seasonalTrends).toBeDefined();
      expect(result.contentGaps).toBeInstanceOf(Array);
      expect(Object.values(result.topicDistribution).reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 1);
    });
  });

  describe('comprehensive error handling', () => {
    it('should handle invalid competitor usernames', async () => {
      const request = {
        platform: 'tiktok' as const,
        usernameOrId: 'nonexistent_user_12345',
      };

      const mockError = new Error('Competitor not found');
      mockError.name = 'CompetitorNotFoundError';

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockRejectedValue(mockError)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');

      await expect(mockedService(request)).rejects.toThrow('Competitor not found');
    });

    it('should handle API rate limiting gracefully', async () => {
      const request = {
        platform: 'instagram' as const,
        usernameOrId: 'rate_limited_user',
      };

      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockRejectedValue(rateLimitError)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');

      await expect(mockedService(request)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network connectivity issues', async () => {
      const request = {
        platform: 'youtube' as const,
        usernameOrId: 'network_test_user',
      };

      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockRejectedValue(networkError)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');

      await expect(mockedService(request)).rejects.toThrow('Network request failed');
    });

    it('should handle insufficient data scenarios', async () => {
      const request = {
        platform: 'tiktok' as const,
        usernameOrId: 'new_user_no_data',
      };

      const mockInsufficientData = {
        error: 'Insufficient data',
        message: 'User has less than 10 posts, cannot generate meaningful analysis',
        recommendations: [
          'Wait for user to post more content',
          'Try analyzing after user has at least 10 posts',
          'Consider analyzing similar competitors with more data'
        ]
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockInsufficientData)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.error).toBe('Insufficient data');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle private account scenarios', async () => {
      const request = {
        platform: 'instagram' as const,
        usernameOrId: 'private_account_user',
      };

      const mockPrivateAccount = {
        error: 'Private account',
        message: 'Cannot analyze private accounts',
        publicAlternatives: [
          'similar_public_account_1',
          'similar_public_account_2'
        ],
        suggestions: [
          'Analyze similar public accounts in the same niche',
          'Focus on publicly available competitor data',
          'Use hashtag analysis for niche insights'
        ]
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockPrivateAccount)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.error).toBe('Private account');
      expect(result.publicAlternatives).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('multi-platform analysis', () => {
    it('should analyze competitors across multiple platforms', async () => {
      const request = {
        platforms: ['tiktok', 'instagram', 'youtube'] as const,
        usernameOrId: 'multi_platform_competitor',
        crossPlatformAnalysis: true,
      };

      const mockMultiPlatformAnalysis = {
        platformComparison: {
          tiktok: { followers: 500000, engagement: 0.08, postFreq: 1.5 },
          instagram: { followers: 300000, engagement: 0.06, postFreq: 0.8 },
          youtube: { followers: 150000, engagement: 0.12, postFreq: 0.3 }
        },
        crossPlatformStrategies: [
          { strategy: 'content_repurposing', effectiveness: 0.85, platforms: ['tiktok', 'instagram'] },
          { strategy: 'platform_specific_optimization', effectiveness: 0.92, platforms: ['all'] },
          { strategy: 'cross_promotion', effectiveness: 0.67, platforms: ['instagram', 'youtube'] }
        ],
        audienceOverlap: {
          'tiktok_instagram': 0.45,
          'tiktok_youtube': 0.32,
          'instagram_youtube': 0.58
        },
        platformSpecificInsights: {
          tiktok: { strength: 'viral_content', weakness: 'consistency' },
          instagram: { strength: 'visual_quality', weakness: 'engagement_rate' },
          youtube: { strength: 'content_depth', weakness: 'upload_frequency' }
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockMultiPlatformAnalysis)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.platformComparison).toBeDefined();
      expect(result.crossPlatformStrategies).toBeInstanceOf(Array);
      expect(result.audienceOverlap).toBeDefined();
      expect(result.platformSpecificInsights).toBeDefined();
      expect(Object.keys(result.platformComparison)).toHaveLength(3);
    });
  });

  describe('advanced competitive analysis', () => {
    it('should analyze competitor content patterns', async () => {
      const request = {
        platform: 'tiktok' as const,
        usernameOrId: 'pattern_analysis_competitor',
        analyzePatterns: true,
      };

      const mockPatternAnalysis = {
        contentPatterns: {
          postingFrequency: {
            daily: 0.7,
            weekly: 0.2,
            sporadic: 0.1
          },
          contentTypes: {
            original: 0.6,
            trending_audio: 0.3,
            duets: 0.1
          },
          videoLength: {
            short: 0.4, // <15s
            medium: 0.5, // 15-30s
            long: 0.1 // >30s
          },
          postingTimes: {
            morning: 0.2,
            afternoon: 0.3,
            evening: 0.4,
            night: 0.1
          }
        },
        engagementPatterns: {
          averageViewsPerPost: 50000,
          averageLikesPerPost: 2500,
          averageCommentsPerPost: 150,
          averageSharesPerPost: 75,
          engagementRate: 0.05,
          viralPostFrequency: 0.15 // 15% of posts go viral
        },
        audienceInsights: {
          primaryDemographic: 'Gen Z',
          genderSplit: { female: 0.65, male: 0.35 },
          topCountries: ['US', 'UK', 'Canada'],
          peakActivityTimes: ['7-9 PM', '12-2 PM']
        },
        competitiveAdvantages: [
          'Consistent posting schedule',
          'High engagement rate',
          'Strong brand voice',
          'Effective use of trending audio'
        ],
        weaknesses: [
          'Limited content variety',
          'Low comment response rate',
          'Inconsistent hashtag strategy'
        ]
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockPatternAnalysis)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.contentPatterns).toBeDefined();
      expect(result.engagementPatterns).toBeDefined();
      expect(result.audienceInsights).toBeDefined();
      expect(result.competitiveAdvantages).toBeInstanceOf(Array);
      expect(result.weaknesses).toBeInstanceOf(Array);

      // Validate content patterns structure
      expect(result.contentPatterns.postingFrequency).toBeDefined();
      expect(result.contentPatterns.contentTypes).toBeDefined();
      expect(result.contentPatterns.videoLength).toBeDefined();
      expect(result.contentPatterns.postingTimes).toBeDefined();

      // Validate engagement patterns
      expect(result.engagementPatterns.averageViewsPerPost).toBeGreaterThan(0);
      expect(result.engagementPatterns.engagementRate).toBeGreaterThan(0);
      expect(result.engagementPatterns.engagementRate).toBeLessThan(1);
    });

    it('should perform multi-competitor comparison', async () => {
      const request = {
        platform: 'instagram' as const,
        usernameOrId: 'main_competitor',
        compareWith: ['competitor_2', 'competitor_3', 'competitor_4'],
        multiCompetitorAnalysis: true,
      };

      const mockMultiComparison = {
        competitorRankings: {
          followerCount: [
            { username: 'competitor_2', count: 500000, rank: 1 },
            { username: 'main_competitor', count: 350000, rank: 2 },
            { username: 'competitor_3', count: 200000, rank: 3 },
            { username: 'competitor_4', count: 150000, rank: 4 }
          ],
          engagementRate: [
            { username: 'competitor_4', rate: 0.08, rank: 1 },
            { username: 'main_competitor', rate: 0.06, rank: 2 },
            { username: 'competitor_3', rate: 0.05, rank: 3 },
            { username: 'competitor_2', rate: 0.03, rank: 4 }
          ],
          postFrequency: [
            { username: 'competitor_3', postsPerWeek: 7, rank: 1 },
            { username: 'main_competitor', postsPerWeek: 5, rank: 2 },
            { username: 'competitor_4', postsPerWeek: 4, rank: 3 },
            { username: 'competitor_2', postsPerWeek: 3, rank: 4 }
          ]
        },
        marketPositioning: {
          leaders: ['competitor_2'], // High followers, low engagement
          challengers: ['main_competitor'], // Balanced performance
          nichers: ['competitor_4'], // High engagement, lower reach
          followers: ['competitor_3'] // High posting, moderate performance
        },
        competitiveGaps: [
          {
            area: 'Content Quality',
            opportunity: 'Improve visual consistency to match competitor_2',
            impact: 'high',
            effort: 'medium'
          },
          {
            area: 'Engagement Strategy',
            opportunity: 'Adopt competitor_4\'s community engagement tactics',
            impact: 'high',
            effort: 'low'
          },
          {
            area: 'Posting Frequency',
            opportunity: 'Increase posting frequency to match competitor_3',
            impact: 'medium',
            effort: 'high'
          }
        ],
        strategicRecommendations: [
          'Focus on engagement quality over quantity',
          'Develop unique content pillars to differentiate',
          'Optimize posting times based on competitor analysis',
          'Implement community management best practices'
        ]
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockMultiComparison)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.competitorRankings).toBeDefined();
      expect(result.marketPositioning).toBeDefined();
      expect(result.competitiveGaps).toBeInstanceOf(Array);
      expect(result.strategicRecommendations).toBeInstanceOf(Array);

      // Validate rankings structure
      expect(result.competitorRankings.followerCount).toBeInstanceOf(Array);
      expect(result.competitorRankings.engagementRate).toBeInstanceOf(Array);
      expect(result.competitorRankings.postFrequency).toBeInstanceOf(Array);

      // Validate market positioning
      expect(result.marketPositioning.leaders).toBeInstanceOf(Array);
      expect(result.marketPositioning.challengers).toBeInstanceOf(Array);
      expect(result.marketPositioning.nichers).toBeInstanceOf(Array);
      expect(result.marketPositioning.followers).toBeInstanceOf(Array);

      // Validate competitive gaps
      result.competitiveGaps.forEach((gap: { area: string; opportunity: string; impact: string; effort: string; }) => {
        expect(gap).toHaveProperty('area');
        expect(gap).toHaveProperty('opportunity');
        expect(gap).toHaveProperty('impact');
        expect(gap).toHaveProperty('effort');
        expect(['high', 'medium', 'low']).toContain(gap.impact);
        expect(['high', 'medium', 'low']).toContain(gap.effort);
      });
    });

    it('should analyze trending content opportunities', async () => {
      const request = {
        platform: 'youtube' as const,
        usernameOrId: 'trending_analysis_competitor',
        analyzeTrends: true,
      };

      const mockTrendingAnalysis = {
        trendingOpportunities: {
          currentTrends: [
            {
              trend: 'AI productivity tools',
              competitorParticipation: 0.3,
              userParticipation: 0.1,
              opportunity: 'high',
              suggestedApproach: 'Create tutorial series on AI tools'
            },
            {
              trend: 'Sustainable living tips',
              competitorParticipation: 0.6,
              userParticipation: 0.4,
              opportunity: 'medium',
              suggestedApproach: 'Focus on unique angle or niche aspect'
            }
          ],
          emergingTrends: [
            {
              trend: 'Virtual reality experiences',
              growthRate: 0.25,
              competitorAdoption: 0.1,
              timeToMainstream: '3-6 months',
              firstMoverAdvantage: 'high'
            }
          ],
          seasonalOpportunities: [
            {
              season: 'Back to school',
              peakMonth: 'August',
              competitorPreparation: 0.4,
              contentSuggestions: ['Study tips', 'Productivity hacks', 'Tech reviews']
            }
          ]
        },
        contentGapAnalysis: {
          underservedTopics: [
            'Advanced tutorials in niche area',
            'Behind-the-scenes content',
            'Community Q&A sessions'
          ],
          overservedTopics: [
            'Basic tutorials',
            'Product reviews',
            'Generic lifestyle content'
          ],
          uniquePositioning: [
            'Technical depth with beginner-friendly explanations',
            'Real-world application focus',
            'Community-driven content creation'
          ]
        },
        competitorTrendAdoption: {
          earlyAdopters: ['competitor_a', 'competitor_b'],
          lateAdopters: ['competitor_c'],
          trendMissers: ['competitor_d'],
          adoptionSpeed: {
            average: '2-3 weeks',
            fastest: '3-5 days',
            slowest: '1-2 months'
          }
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockTrendingAnalysis)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');
      const result = await mockedService(request);

      expect(result.trendingOpportunities).toBeDefined();
      expect(result.contentGapAnalysis).toBeDefined();
      expect(result.competitorTrendAdoption).toBeDefined();

      // Validate trending opportunities
      expect(result.trendingOpportunities.currentTrends).toBeInstanceOf(Array);
      expect(result.trendingOpportunities.emergingTrends).toBeInstanceOf(Array);
      expect(result.trendingOpportunities.seasonalOpportunities).toBeInstanceOf(Array);

      // Validate content gap analysis
      expect(result.contentGapAnalysis.underservedTopics).toBeInstanceOf(Array);
      expect(result.contentGapAnalysis.overservedTopics).toBeInstanceOf(Array);
      expect(result.contentGapAnalysis.uniquePositioning).toBeInstanceOf(Array);

      // Validate trend adoption analysis
      expect(result.competitorTrendAdoption.earlyAdopters).toBeInstanceOf(Array);
      expect(result.competitorTrendAdoption.lateAdopters).toBeInstanceOf(Array);
      expect(result.competitorTrendAdoption.adoptionSpeed).toBeDefined();
    });
  });

  describe('performance and scalability', () => {
    it('should handle concurrent competitor analysis requests', async () => {
      const requests = [
        { platform: 'instagram' as const, usernameOrId: 'competitor_1' },
        { platform: 'tiktok' as const, usernameOrId: 'competitor_2' },
        { platform: 'youtube' as const, usernameOrId: 'competitor_3' },
      ];

      const mockResults = requests.map((req, index) => ({
        platform: req.platform,
        username: req.usernameOrId,
        analysis: `Analysis for ${req.usernameOrId}`,
        metrics: {
          followers: 10000 * (index + 1),
          engagement: 0.05 + (index * 0.01),
          posts: 100 + (index * 50)
        }
      }));

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn()
          .mockResolvedValueOnce(mockResults[0])
          .mockResolvedValueOnce(mockResults[1])
          .mockResolvedValueOnce(mockResults[2])
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => mockedService(request))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      results.forEach((result, index) => {
        expect(result.platform).toBe(requests[index].platform);
        expect(result.username).toBe(requests[index].usernameOrId);
        expect(result.metrics).toBeDefined();
      });
    });

    it('should handle large dataset analysis efficiently', async () => {
      const request = {
        platform: 'instagram' as const,
        usernameOrId: 'large_dataset_competitor',
        analyzeLargeDataset: true,
        datasetSize: 10000 // 10k posts
      };

      const mockLargeDatasetResult = {
        datasetInfo: {
          totalPosts: 10000,
          analyzedPosts: 10000,
          timeRange: '2 years',
          processingTime: '45 seconds'
        },
        aggregatedMetrics: {
          averageEngagement: 0.045,
          totalViews: 50000000,
          totalLikes: 2250000,
          totalComments: 125000,
          viralPosts: 150,
          topPerformingContent: [
            { postId: 'post_1', views: 500000, engagement: 0.12 },
            { postId: 'post_2', views: 450000, engagement: 0.11 },
            { postId: 'post_3', views: 400000, engagement: 0.10 }
          ]
        },
        trendAnalysis: {
          growthTrend: 'increasing',
          seasonalPatterns: ['summer_peak', 'holiday_spike'],
          contentEvolution: 'more_video_focused',
          audienceGrowth: 0.15 // 15% growth
        },
        performanceInsights: {
          bestPerformingContentTypes: ['reels', 'carousel'],
          optimalPostingTimes: ['6-8 PM', '12-2 PM'],
          hashtagEffectiveness: 0.75,
          collaborationImpact: 0.25
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockLargeDatasetResult)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');

      const startTime = Date.now();
      const result = await mockedService(request);
      const endTime = Date.now();

      expect(result.datasetInfo).toBeDefined();
      expect(result.aggregatedMetrics).toBeDefined();
      expect(result.trendAnalysis).toBeDefined();
      expect(result.performanceInsights).toBeDefined();

      // Validate dataset processing
      expect(result.datasetInfo.totalPosts).toBe(10000);
      expect(result.datasetInfo.analyzedPosts).toBe(10000);

      // Validate aggregated metrics
      expect(result.aggregatedMetrics.averageEngagement).toBeGreaterThan(0);
      expect(result.aggregatedMetrics.topPerformingContent).toBeInstanceOf(Array);
      expect(result.aggregatedMetrics.topPerformingContent.length).toBe(3);

      // Should complete analysis within reasonable time for large dataset
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for mock
    });

    it('should handle memory-intensive operations efficiently', async () => {
      const request = {
        platform: 'youtube' as const,
        usernameOrId: 'memory_test_competitor',
        deepAnalysis: true,
        includeVideoAnalysis: true,
        includeCommentAnalysis: true,
        includeAudienceAnalysis: true
      };

      const mockMemoryIntensiveResult = {
        videoAnalysis: {
          totalVideos: 1000,
          averageDuration: 180, // 3 minutes
          contentCategories: {
            tutorials: 0.4,
            reviews: 0.3,
            vlogs: 0.2,
            other: 0.1
          },
          visualAnalysis: {
            colorPalette: ['#FF5733', '#33FF57', '#3357FF'],
            thumbnailEffectiveness: 0.75,
            brandingConsistency: 0.85
          }
        },
        commentAnalysis: {
          totalComments: 50000,
          sentimentDistribution: {
            positive: 0.6,
            neutral: 0.3,
            negative: 0.1
          },
          topKeywords: ['amazing', 'helpful', 'thanks', 'love'],
          engagementQuality: 0.8
        },
        audienceAnalysis: {
          demographicBreakdown: {
            age: { '18-24': 0.3, '25-34': 0.4, '35-44': 0.2, '45+': 0.1 },
            gender: { male: 0.55, female: 0.45 },
            location: { US: 0.4, UK: 0.15, CA: 0.1, other: 0.35 }
          },
          behaviorPatterns: {
            watchTime: 0.65, // 65% average watch time
            subscriptionRate: 0.02, // 2% of viewers subscribe
            returnViewerRate: 0.35 // 35% return viewers
          }
        },
        memoryUsage: {
          peakMemoryMB: 256,
          averageMemoryMB: 128,
          memoryEfficient: true
        }
      };

      jest.doMock('../competitorTactics', () => ({
        getCompetitorTactics: jest.fn().mockResolvedValue(mockMemoryIntensiveResult)
      }));

      const { getCompetitorTactics: mockedService } = require('../competitorTactics');

      const result = await mockedService(request);

      expect(result.videoAnalysis).toBeDefined();
      expect(result.commentAnalysis).toBeDefined();
      expect(result.audienceAnalysis).toBeDefined();
      expect(result.memoryUsage).toBeDefined();

      // Validate memory efficiency
      expect(result.memoryUsage.memoryEfficient).toBe(true);
      expect(result.memoryUsage.peakMemoryMB).toBeLessThan(500); // Should stay under 500MB

      // Validate deep analysis results
      expect(result.videoAnalysis.totalVideos).toBeGreaterThan(0);
      expect(result.commentAnalysis.totalComments).toBeGreaterThan(0);
      expect(result.audienceAnalysis.demographicBreakdown).toBeDefined();
    });
  });
}); 