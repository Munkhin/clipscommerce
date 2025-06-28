import { BaseAnalysisRequest, AudioVirality, AnalysisResult } from '../types/analysis_types';
import { AudioAnalysisService } from '@/services/audioAnalysisService';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export class ViralityEngine {
  private audioAnalysisService: AudioAnalysisService;
  private supabase;

  constructor() {
    this.audioAnalysisService = new AudioAnalysisService();
    this.supabase = createClientComponentClient();
  }

  async analyzeAudioVirality(
    request: BaseAnalysisRequest,
    audioIds?: string[] // Optional: analyze specific audios, or discover trending ones
  ): Promise<AnalysisResult<AudioVirality[]>> {
    const startTime = Date.now();
    console.log(`ViralityEngine: Analyzing audio virality for userId: ${request.userId}`);

    try {
      // Get user's niche for better suitability scoring
      const userNiche = await this.getUserNiche(request.userId);
      let audioViralityData: AudioVirality[];

      if (audioIds && audioIds.length > 0) {
        // Analyze specific audio IDs provided
        console.log(`Analyzing ${audioIds.length} specific audio IDs`);
        audioViralityData = await this.audioAnalysisService.analyzeAudioVirality(
          audioIds,
          request.platform,
          userNiche
        );
      } else {
        // Discover and analyze trending audios
        console.log(`Discovering trending audios for platform: ${request.platform}`);
        audioViralityData = await this.audioAnalysisService.discoverTrendingAudiosWithVirality(
          request.platform,
          userNiche,
          20 // Limit to top 20 trending audios
        );
      }

      // Filter and enhance results based on time range if needed
      const filteredData = await this.filterByTimeRange(audioViralityData, request.timeRange);

      // Store analysis results for future reference and caching
      await this.storeAnalysisResults(request.userId, request.platform, filteredData);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: filteredData,
        metadata: {
          generatedAt: new Date(),
          source: 'ViralityEngine',
          correlationId: request.correlationId,
          processingTime,
          cacheStatus: 'miss', // Fresh analysis
          warnings: filteredData.length === 0 ? ['No audio data found for analysis'] : undefined
        },
      };

    } catch (error) {
      console.error('ViralityEngine analysis failed:', error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          message: 'Audio virality analysis failed',
          code: 'VIRALITY_ANALYSIS_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata: {
          generatedAt: new Date(),
          source: 'ViralityEngine',
          correlationId: request.correlationId,
          processingTime,
          warnings: ['Analysis failed - check platform API connectivity']
        },
      };
    }
  }

  private async getUserNiche(userId: string): Promise<string | undefined> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .select('niche, industry, content_category')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn('Could not fetch user niche:', error);
        return undefined;
      }

      // Return the most specific niche information available
      return profile?.niche || profile?.industry || profile?.content_category;
    } catch (error) {
      console.warn('Error fetching user niche:', error);
      return undefined;
    }
  }

  private async filterByTimeRange(
    audioData: AudioVirality[],
    timeRange: BaseAnalysisRequest['timeRange']
  ): Promise<AudioVirality[]> {
    // In a real implementation, this would filter audios based on when they became trending
    // within the specified time range. For now, we'll return all data since we're working
    // with current trending audios.
    
    // Future enhancement: Track audio trending history in database and filter accordingly
    return audioData;
  }

  private async storeAnalysisResults(
    userId: string,
    platform: string,
    results: AudioVirality[]
  ): Promise<void> {
    try {
      // Store analysis results for caching and historical tracking
      await this.supabase
        .from('audio_virality_analyses')
        .insert({
          user_id: userId,
          platform,
          analysis_data: results,
          analyzed_at: new Date().toISOString(),
          result_count: results.length
        });
    } catch (error) {
      // Non-blocking error - analysis can succeed even if storage fails
      console.warn('Failed to store virality analysis results:', error);
    }
  }

  async getCachedAnalysis(
    userId: string,
    platform: string,
    maxAgeMinutes: number = 30
  ): Promise<AnalysisResult<AudioVirality[]> | null> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('audio_virality_analyses')
        .select('analysis_data, analyzed_at')
        .eq('user_id', userId)
        .eq('platform', platform)
        .gte('analyzed_at', cutoffTime)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        success: true,
        data: data.analysis_data,
        metadata: {
          generatedAt: new Date(data.analyzed_at),
          source: 'ViralityEngine',
          cacheStatus: 'hit'
        }
      };
    } catch (error) {
      console.warn('Error retrieving cached analysis:', error);
      return null;
    }
  }

  async getAudioRecommendations(
    userId: string,
    platform: string,
    contentType?: string,
    limit: number = 10
  ): Promise<AnalysisResult<AudioVirality[]>> {
    try {
      // Check for cached results first
      const cached = await this.getCachedAnalysis(userId, platform, 15); // 15 minute cache
      if (cached && cached.data && cached.data.length > 0) {
        // Return top recommendations from cache
        const recommendations = cached.data.slice(0, limit);
        return {
          ...cached,
          data: recommendations,
          metadata: {
            ...cached.metadata,
            warnings: ['Using cached recommendations']
          }
        };
      }

      // Generate fresh recommendations
      const baseRequest: BaseAnalysisRequest = {
        userId,
        platform: platform as any,
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          end: new Date().toISOString()
        }
      };

      const result = await this.analyzeAudioVirality(baseRequest);
      
      if (result.success && result.data) {
        // Filter and sort recommendations
        const recommendations = result.data
          .filter(audio => audio.viralityScore > 0.6 && audio.suitabilityScore > 0.5)
          .sort((a, b) => {
            // Weight virality and suitability equally for recommendations
            const scoreA = (a.viralityScore + a.suitabilityScore) / 2;
            const scoreB = (b.viralityScore + b.suitabilityScore) / 2;
            return scoreB - scoreA;
          })
          .slice(0, limit);

        return {
          success: true,
          data: recommendations,
          metadata: {
            ...result.metadata,
            source: 'ViralityEngine',
            warnings: recommendations.length < limit ? ['Limited recommendations available'] : undefined
          }
        };
      }

      return result;

    } catch (error) {
      console.error('Error getting audio recommendations:', error);
      return {
        success: false,
        error: {
          message: 'Failed to get audio recommendations',
          code: 'RECOMMENDATION_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata: {
          generatedAt: new Date(),
          source: 'ViralityEngine'
        }
      };
    }
  }
}
