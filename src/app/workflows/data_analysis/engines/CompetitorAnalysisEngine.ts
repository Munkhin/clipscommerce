import { SupabaseClient } from '@supabase/supabase-js';
import {
  CompetitorAnalysis,
  ContentAnalysis,
  EngagementMetrics,
  Recommendation,
  CompetitorIdSchema,
  NicheSchema,
  CompetitorApiDataSchema,
  CompetitorVideoSchema,
  CompetitorVideo,
  CompetitorContextTopPerformingContent,
  BaseAnalysisRequest,
  AnalysisResult
} from '../types';
import { EnhancedTextAnalyzer } from '@/lib/ai/enhancedTextAnalyzer';

interface CompetitorEngineRequest extends Partial<BaseAnalysisRequest> {
  competitorId: string;
  niche: string;
  // Potentially add platform if it becomes relevant for fetching competitor data from different sources
  // correlationId is now inherited from BaseAnalysisRequest
}

export class CompetitorAnalysisEngine {
  private readonly assumedWeeksOfDataForFrequency: number = 4; // Default assumption

  constructor(
    private supabase: SupabaseClient,
    private textAnalyzer: EnhancedTextAnalyzer
  ) {}

  async analyzeCompetitor(
    request: CompetitorEngineRequest
  ): Promise<AnalysisResult<CompetitorAnalysis>> { // Aligning to common AnalysisResult structure
    const idValidation = CompetitorIdSchema.safeParse(request.competitorId);
    const nicheValidation = NicheSchema.safeParse(request.niche);

    if (!idValidation.success) {
      console.error(`[CompetitorAnalysisEngine] Invalid competitorId: ${request.competitorId}`, idValidation.error.flatten());
      return {
        success: false,
        data: {} as CompetitorAnalysis,
        metadata: { generatedAt: new Date(), source: 'CompetitorAnalysisEngine', warnings: ['Invalid competitorId'], correlationId: request.correlationId },
      };
    }
    if (!nicheValidation.success) {
      console.error(`[CompetitorAnalysisEngine] Invalid niche: ${request.niche}`, nicheValidation.error.flatten());
      return {
        success: false,
        data: {} as CompetitorAnalysis,
        metadata: { generatedAt: new Date(), source: 'CompetitorAnalysisEngine', warnings: ['Invalid niche'], correlationId: request.correlationId },
      };
    }

    const validatedCompetitorId = idValidation.data;
    const validatedNiche = nicheValidation.data;

    const { data: competitorData, error: competitorError } = await this.supabase
      .from('competitors')
      .select('username, platform')
      .eq('id', validatedCompetitorId)
      .single();

    if (competitorError) {
      console.error(`[CompetitorAnalysisEngine] Error fetching competitor ${validatedCompetitorId}:`, competitorError);
      return { 
        success: false,
        data: {} as CompetitorAnalysis, 
        metadata: { 
          generatedAt: new Date(), 
          source: 'CompetitorAnalysisEngine', 
          warnings: [`Error fetching competitor: ${competitorError.message}`], 
          correlationId: request.correlationId 
        } 
      };
    }
    if (!competitorData) {
      console.error(`[CompetitorAnalysisEngine] Competitor ${validatedCompetitorId} not found.`);
      return { 
        success: false,
        data: {} as CompetitorAnalysis, 
        metadata: { 
          generatedAt: new Date(), 
          source: 'CompetitorAnalysisEngine', 
          warnings: ['Competitor not found'], 
          correlationId: request.correlationId 
        } 
      };
    }

    const competitorApiDataValidation = CompetitorApiDataSchema.safeParse(competitorData);
    if (!competitorApiDataValidation.success) {
      console.error(`[CompetitorAnalysisEngine] Invalid competitor data structure for ${validatedCompetitorId}:`, competitorApiDataValidation.error.flatten());
      return { 
        success: false,
        data: {} as CompetitorAnalysis, 
        metadata: { 
          generatedAt: new Date(), 
          source: 'CompetitorAnalysisEngine', 
          warnings: ['Invalid competitor data structure from DB'], 
          correlationId: request.correlationId 
        } 
      };
    }
    const validatedCompetitorData = competitorApiDataValidation.data;

    const { data: videosData, error: videosError } = await this.supabase
      .from('videos')
      .select('id, published_at, caption, tags, like_count, comment_count, share_count, view_count, duration')
      .eq('competitor_id', validatedCompetitorId)
      .order('published_at', { ascending: false })
      .limit(50);

    if (videosError) {
      console.error(`[CompetitorAnalysisEngine] Error fetching videos for competitor ${validatedCompetitorId}:`, videosError);
      return { 
        success: false,
        data: {} as CompetitorAnalysis, 
        metadata: { 
          generatedAt: new Date(), 
          source: 'CompetitorAnalysisEngine', 
          warnings: [`Error fetching competitor videos: ${videosError.message}`], 
          correlationId: request.correlationId 
        } 
      };
    }
    
    if (!videosData || videosData.length === 0) {
      console.log(`[CompetitorAnalysisEngine] No videos found for competitor ${validatedCompetitorId}.`);
      const emptyAnalysis: CompetitorAnalysis = {
        competitorId: validatedCompetitorId,
        competitorName: validatedCompetitorData.username,
        niche: validatedNiche,
        contentAnalysis: { commonTopics: [], popularHashtags: [], postingFrequency: 0, bestPerformingFormats: [], sentimentDistribution: { positive: 0, neutral: 0, negative: 0 } },
        engagementMetrics: { averageLikes: 0, averageComments: 0, averageShares: 0, averageViews: 0, averageEngagementRate: 0 },
        topPerformingContent: { videos: [], keySuccessFactors: [] },
        recommendations: [],
        lastAnalyzed: new Date().toISOString(),
      };
      return { 
        success: true,
        data: emptyAnalysis, 
        metadata: { 
          generatedAt: new Date(), 
          source: 'CompetitorAnalysisEngine', 
          warnings: ['No videos found for competitor'], 
          correlationId: request.correlationId 
        } 
      };
    }

    const videosValidation = CompetitorVideoSchema.array().safeParse(videosData);
    if (!videosValidation.success) {
      console.error(`[CompetitorAnalysisEngine] Invalid video data structure for competitor ${validatedCompetitorId}:`, videosValidation.error.flatten());
      return { 
        success: false,
        data: {} as CompetitorAnalysis, 
        metadata: { 
          generatedAt: new Date(), 
          source: 'CompetitorAnalysisEngine', 
          warnings: ['Invalid video data structure for competitor from DB'], 
          correlationId: request.correlationId 
        } 
      };
    }
    const videos: CompetitorVideo[] = videosValidation.data;

    const contentAnalysis = await this._analyzeContentPatterns(videos);
    const engagementMetrics = this._calculateEngagementMetrics(videos);
    const topPerforming = this._identifyTopPerforming(videos);
    const recommendations = this._generateRecommendations(contentAnalysis, engagementMetrics, topPerforming, validatedNiche);

    const analysisData: CompetitorAnalysis = {
      competitorId: validatedCompetitorId,
      competitorName: validatedCompetitorData.username,
      niche: validatedNiche,
      contentAnalysis,
      engagementMetrics,
      topPerformingContent: topPerforming,
      recommendations,
      lastAnalyzed: new Date().toISOString(),
    };
    
    return { 
      success: true,
      data: analysisData, 
      metadata: { 
        generatedAt: new Date(), 
        source: 'CompetitorAnalysisEngine', 
        correlationId: request.correlationId 
      } 
    };
  }

  private async _analyzeContentPatterns(videos: CompetitorVideo[]): Promise<ContentAnalysis> {
    let allCaptions = '';
    const hashtagsCount: Record<string, number> = {};
    const sentimentScores = { positive: 0, negative: 0, neutral: 0 };

    const durationCategories: Record<string, { rates: number[]; count: number; label: string }> = {
      short: { rates: [], count: 0, label: "Short-form videos (< 60s)" },
      medium: { rates: [], count: 0, label: "Medium-form videos (60s-300s)" },
      long: { rates: [], count: 0, label: "Long-form videos (> 300s)" },
    };

    for (const video of videos) {
      if (video.caption) {
        allCaptions += video.caption + ' '; // Aggregate for topic modeling
        try {
          // Use summarizeContent to get sentiment analysis
          const summary = await this.textAnalyzer.summarizeContent(video.caption);
          
          // Map the sentiment to our scores
          if (summary.sentiment === 'positive') {
            sentimentScores.positive += 1;
          } else if (summary.sentiment === 'negative') {
            sentimentScores.negative += 1;
          } else {
            sentimentScores.neutral += 1;
          }
        } catch (error) {
          console.warn(`[CompetitorAnalysisEngine] Failed to analyze sentiment for caption of video ${video.id}:`, error);
          sentimentScores.neutral += 1;
        }
      }
      (video.tags || []).forEach(tag => {
        hashtagsCount[tag] = (hashtagsCount[tag] || 0) + 1;
      });

      // Duration-based format analysis
      if (typeof video.duration === 'number' && video.duration > 0) {
        const engagement = (video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0);
        const engagementRate = (video.view_count || 1) > 0 ? engagement / (video.view_count || 1) : 0;

        if (video.duration < 60) {
          durationCategories.short.rates.push(engagementRate);
          durationCategories.short.count++;
        } else if (video.duration <= 300) {
          durationCategories.medium.rates.push(engagementRate);
          durationCategories.medium.count++;
        } else {
          durationCategories.long.rates.push(engagementRate);
          durationCategories.long.count++;
        }
      }
    }

    let extractedTopics: string[] = [];
    if (allCaptions.trim().length > 0) {
      try {
        // Use summarizeContent to get key points as topics
        const summary = await this.textAnalyzer.summarizeContent(allCaptions);
        extractedTopics = summary.keyPoints || [];
        
        // If we don't have enough key points, fall back to a simple word frequency approach
        if (extractedTopics.length < 3) {
          const words = allCaptions.toLowerCase().split(/\s+/);
          const wordFreq: Record<string, number> = {};
          
          words.forEach(word => {
            // Remove punctuation and filter out common words
            const cleanWord = word.replace(/[^\w\s]/g, '');
            if (cleanWord.length > 3) { // Only consider words longer than 3 characters
              wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
          });
          
          // Sort by frequency and take top 5
          extractedTopics = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
        }
      } catch (error) {
        console.warn('[CompetitorAnalysisEngine] Failed to extract topics:', error);
      }
    }
    
    const totalSentiments = sentimentScores.positive + sentimentScores.negative + sentimentScores.neutral;
    const aggregatedSentiment = totalSentiments > 0 ? {
      positive: sentimentScores.positive / totalSentiments,
      negative: sentimentScores.negative / totalSentiments,
      neutral: sentimentScores.neutral / totalSentiments,
    } : { positive: 0, negative: 0, neutral: 0 };

    let postingFrequency = 0;
    if (videos.length > 1) {
      const sortedVideos = [...videos].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      const firstPostDate = new Date(sortedVideos[0].published_at);
      const lastPostDate = new Date(sortedVideos[sortedVideos.length - 1].published_at);
      const diffTime = Math.abs(firstPostDate.getTime() - lastPostDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeks = Math.max(1, diffDays / 7);
      postingFrequency = videos.length / weeks;
    } else if (videos.length === 1) {
      postingFrequency = 1 / this.assumedWeeksOfDataForFrequency;
    }

    const popularHashtags = Object.entries(hashtagsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    const bestPerformingFormats: string[] = [];
    let maxAvgRate = -1;
    let bestFormatLabel = '';

    for (const key in durationCategories) {
      const category = durationCategories[key];
      if (category.count > 0) {
        const avgRate = category.rates.reduce((sum, rate) => sum + rate, 0) / category.count;
        if (avgRate > maxAvgRate) {
          maxAvgRate = avgRate;
          bestFormatLabel = `${category.label} show high engagement (Avg Rate: ${(avgRate * 100).toFixed(2)}%).`;
        }
      }
    }
    if (bestFormatLabel) {
      bestPerformingFormats.push(bestFormatLabel);
    }

    return {
      commonTopics: extractedTopics,
      popularHashtags,
      postingFrequency,
      bestPerformingFormats, // Updated from placeholder
      sentimentDistribution: aggregatedSentiment,
    };
  }

  private _calculateEngagementMetrics(videos: CompetitorVideo[]): EngagementMetrics {
    if (videos.length === 0) return { averageLikes: 0, averageComments: 0, averageShares: 0, averageViews: 0, averageEngagementRate: 0 };
    let totalLikes = 0, totalComments = 0, totalShares = 0, totalViews = 0, totalEngagementRateSum = 0;
    videos.forEach(v => {
      totalLikes += v.like_count || 0;
      totalComments += v.comment_count || 0;
      totalShares += v.share_count || 0;
      totalViews += v.view_count || 0;
      const engagement = (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0);
      totalEngagementRateSum += (v.view_count || 1) > 0 ? engagement / (v.view_count || 1) : 0;
    });
    return {
      averageLikes: totalLikes / videos.length,
      averageComments: totalComments / videos.length,
      averageShares: totalShares / videos.length,
      averageViews: totalViews / videos.length,
      averageEngagementRate: totalEngagementRateSum / videos.length,
    };
  }

  private _identifyTopPerforming(videos: CompetitorVideo[]): CompetitorContextTopPerformingContent {
    if (videos.length === 0) return { videos: [], keySuccessFactors: ['No video data to analyze.'] };
    const sortedByEngagementRate = [...videos].sort((a, b) => {
      const engagementA = (a.like_count || 0) + (a.comment_count || 0) + (a.share_count || 0);
      const engagementB = (b.like_count || 0) + (b.comment_count || 0) + (b.share_count || 0);
      const rateA = (a.view_count || 1) > 0 ? engagementA / (a.view_count || 1) : 0;
      const rateB = (b.view_count || 1) > 0 ? engagementB / (b.view_count || 1) : 0;
      return rateB - rateA;
    });
    const topVideos = sortedByEngagementRate.slice(0, Math.min(5, videos.length));
    // Simplified key success factors
    const factors: string[] = [];
    if (topVideos.length > 0) {
      const avgTopLikes = topVideos.reduce((sum, v) => sum + (v.like_count || 0), 0) / topVideos.length;
      factors.push(`High average likes on top content (Avg: ${avgTopLikes.toFixed(0)}).`);
      const commonTags = Array.from(new Set(topVideos.flatMap(v => v.tags || []))).slice(0,3);
      if (commonTags.length > 0) factors.push(`Common themes/tags: ${commonTags.join(', ')}.`);
    }
    return { videos: topVideos, keySuccessFactors: factors.length > 0 ? factors : ['General high engagement.'] };
  }

  private _generateRecommendations(contentAnalysis: ContentAnalysis, metrics: EngagementMetrics, topContent: CompetitorContextTopPerformingContent, niche: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const engagementRatePercent = (metrics.averageEngagementRate * 100).toFixed(2);

    // Engagement-based recommendations
    if (metrics.averageEngagementRate > 0.05) { // Threshold for 'strong' engagement
      recommendations.push({
        type: 'engagement',
        description: `Competitor achieves a strong average engagement rate of ${engagementRatePercent}%. Analyze their content interaction patterns (likes, comments) to understand drivers.`,
        priority: 'high',
      });
    } else if (metrics.averageEngagementRate < 0.02 && metrics.averageEngagementRate > 0) { // Threshold for 'low' engagement
      recommendations.push({
        type: 'engagement',
        description: `Competitor's average engagement rate is relatively low at ${engagementRatePercent}%. Identify potential gaps in their engagement strategy (e.g., calls-to-action, community interaction).`,
        priority: 'medium',
      });
    } else {
       recommendations.push({
        type: 'engagement',
        description: `Competitor's average engagement rate is ${engagementRatePercent}%. Evaluate if this aligns with typical performance in the ${niche} niche.`,
        priority: 'medium',
      });
    }

    // Content-based recommendations
    if (contentAnalysis.commonTopics.length > 0) {
      recommendations.push({
        type: 'content',
        description: `Commonly featured topics by this competitor in the ${niche} niche include: ${contentAnalysis.commonTopics.slice(0, 3).join(', ')}. Assess relevance for your audience.`,
        priority: 'medium',
        actionableSteps: [`Research audience interest in: ${contentAnalysis.commonTopics.slice(0, 3).join(', ')}.`, 'Brainstorm content ideas around these topics.'],
      });
    }
    if (contentAnalysis.popularHashtags.length > 0) {
      recommendations.push({
        type: 'content',
        description: `Competitor frequently uses hashtags like: ${contentAnalysis.popularHashtags.slice(0, 3).join(', ')}. Consider their relevance and potential reach.`,
        priority: 'low',
        actionableSteps: [`Analyze the performance of posts using these hashtags.`, `Test incorporating relevant hashtags into your content.`]
      });
    }

    // Top performing content recommendations
    if (topContent.videos.length > 0) {
      const firstTopVideo = topContent.videos[0];
      let topContentDescription = `One of their top videos (ID: ${firstTopVideo.id}, Views: ${firstTopVideo.view_count || 'N/A'}, Likes: ${firstTopVideo.like_count || 'N/A'}) exemplifies success factors such as: ${topContent.keySuccessFactors.join(' ')}.`;
      if (firstTopVideo.caption && firstTopVideo.caption.length > 50) {
        topContentDescription += ` Its caption starts with: "${firstTopVideo.caption.substring(0, 50)}...".`;
      }
      recommendations.push({
        type: 'optimization',
        description: topContentDescription,
        priority: 'high',
        actionableSteps: ['Deep dive into the structure, style, and call-to-action of their top-performing content.', 'Identify replicable elements for your own strategy.']
      });
    }

    // Posting frequency recommendation
    if (contentAnalysis.postingFrequency > 0) {
      recommendations.push({
        type: 'timing',
        description: `Competitor posts approximately ${contentAnalysis.postingFrequency.toFixed(1)} times per week. Evaluate if a similar posting cadence aligns with your content goals and audience expectations in the ${niche} niche.`,
        priority: 'medium',
      });
    }

    // Sentiment-based recommendation
    const positiveSentiment = contentAnalysis.sentimentDistribution.positive || 0;
    const negativeSentiment = contentAnalysis.sentimentDistribution.negative || 0;
    if (positiveSentiment > 0.6 && positiveSentiment > negativeSentiment * 2) { // Example: predominantly positive
      recommendations.push({
        type: 'content',
        description: `The competitor's content predominantly (${(positiveSentiment * 100).toFixed(0)}%) carries a positive sentiment. Consider if this tone resonates with the ${niche} audience.`,
        priority: 'low',
      });
    }

    // General strategy recommendation
    recommendations.push({
      type: 'strategy',
      description: `Continuously monitor this competitor's activities and content evolution in the ${niche} niche to adapt your own strategy effectively.`,
      priority: 'low',
    });

    return recommendations; // Removed slice to allow more recommendations
  }
}
