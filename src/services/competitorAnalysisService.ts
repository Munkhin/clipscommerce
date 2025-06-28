import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface CompetitorContent {
  id: string;
  title: string;
  views: string;
  engagement: string;
  url: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  thumbnail?: string;
  embedPreview?: string;
}

export interface CompetitorData {
  id: string;
  name: string;
  handle: string;
  followers: string;
  engagement: string;
  avgViews: string;
  topContent: CompetitorContent[];
  tactics: string[];
  hooks: string[];
}

export interface CompetitorAnalysisOptions {
  niche?: string;
  limit?: number;
  platform?: 'tiktok' | 'instagram' | 'youtube' | 'all';
  timeRange?: 'week' | 'month' | 'quarter';
}

export class CompetitorAnalysisService {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  async getTopCompetitors(options: CompetitorAnalysisOptions = {}): Promise<{
    success: boolean;
    data?: CompetitorData[];
    error?: string;
  }> {
    try {
      // Get user's niche from profile if not provided
      let niche = options.niche;
      if (!niche) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('niche')
          .single();
        niche = profile?.niche || 'general';
      }

      // Build query parameters
      const params = new URLSearchParams({
        niche: niche,
        limit: (options.limit || 5).toString(),
        ...(options.platform && options.platform !== 'all' && { platform: options.platform }),
        ...(options.timeRange && { timeRange: options.timeRange })
      });

      // Fetch competitor data from API
      const response = await fetch(`/api/competitors?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch competitor data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Unknown error occurred'
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('Error fetching competitors:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch competitor data'
      };
    }
  }

  async getCompetitorInsights(competitors: CompetitorData[]): Promise<{
    commonPatterns: string[];
    hookFormulas: string[];
    contentTypes: string[];
    averageEngagement: number;
    topPlatforms: { platform: string; percentage: number }[];
  }> {
    if (!competitors.length) {
      return {
        commonPatterns: [],
        hookFormulas: [],
        contentTypes: [],
        averageEngagement: 0,
        topPlatforms: []
      };
    }

    // Analyze common patterns
    const allTactics = competitors.flatMap(c => c.tactics);
    const tacticCounts = allTactics.reduce((acc, tactic) => {
      acc[tactic] = (acc[tactic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonPatterns = Object.entries(tacticCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Analyze hook formulas
    const allHooks = competitors.flatMap(c => c.hooks);
    const hookFormulas = [...new Set(allHooks)].slice(0, 6);

    // Analyze content types
    const contentTypes = [
      'Tutorial/How-to content',
      'Behind-the-scenes content',
      'Before/after transformations',
      'Product reviews and comparisons',
      'Trending topic commentary',
      'Educational entertainment'
    ];

    // Calculate average engagement
    const engagements = competitors.map(c => parseFloat(c.engagement.replace('%', '')));
    const averageEngagement = engagements.reduce((sum, eng) => sum + eng, 0) / engagements.length;

    // Analyze platform distribution
    const allContent = competitors.flatMap(c => c.topContent);
    const platformCounts = allContent.reduce((acc, content) => {
      acc[content.platform] = (acc[content.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalContent = allContent.length;
    const topPlatforms = Object.entries(platformCounts)
      .map(([platform, count]) => ({
        platform,
        percentage: Math.round((count / totalContent) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return {
      commonPatterns,
      hookFormulas,
      contentTypes,
      averageEngagement: Math.round(averageEngagement * 10) / 10,
      topPlatforms
    };
  }

  async saveCompetitorAnalysis(userId: string, competitors: CompetitorData[], insights: any): Promise<void> {
    try {
      // Store the analysis in the database for future reference
      await this.supabase
        .from('competitor_analyses')
        .insert({
          user_id: userId,
          analysis_data: {
            competitors,
            insights,
            analyzed_at: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Error saving competitor analysis:', error);
      // Non-blocking error - analysis can still be viewed even if save fails
    }
  }
}