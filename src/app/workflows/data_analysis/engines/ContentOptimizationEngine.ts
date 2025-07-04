import { EnhancedTextAnalyzer } from '@/lib/ai/enhancedTextAnalyzer';
import { MetricsTracker } from '@/lib/utils/metrics';
import { EnhancedCache } from '@/lib/utils/caching';
import { Platform } from '@/types/platform';
import crypto from 'crypto';

export interface ContentOptimizationInput {
  text?: string; // For caption/script analysis
  imageUrl?: string; // For thumbnail analysis
  videoUrl?: string; // For video content analysis (future)
  currentHashtags?: string[];
  topic?: string;
  platform: Platform;
  userEngagementData?: {
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    clickThroughRate: number;
  };
}

export interface ContentOptimizationOutput {
  optimizedCaption?: string;
  suggestedHashtags?: string[];
  thumbnailFeedback?: ThumbnailAnalysisResult;
  contentScore?: number; // 0 to 1, overall optimization score
  warnings?: string[];
  engagementPrediction?: {
    predictedLikes: number;
    predictedComments: number;
    predictedShares: number;
    confidenceScore: number;
  };
}

export interface ThumbnailAnalysisResult {
  feedback: string;
  improvementSuggestions: string[];
  visualElements: {
    hasText: boolean;
    textReadability: 'high' | 'medium' | 'low';
    colorContrast: 'high' | 'medium' | 'low';
    faceDetected: boolean;
    emotionalAppeal: 'high' | 'medium' | 'low';
  };
  platformOptimization: {
    aspectRatio: string;
    resolution: string;
    sizeOptimized: boolean;
  };
  overallScore: number; // 0 to 1
  processingTimeMs: number;
}

export class ContentOptimizationEngine {
  private textAnalyzer: EnhancedTextAnalyzer;
  private metrics: MetricsTracker;
  private cache: EnhancedCache<string, any>;
  private readonly visionApiKey: string;
  private readonly openaiApiKey: string;

  constructor(
    textAnalyzer?: EnhancedTextAnalyzer,
    visionApiKey?: string,
    openaiApiKey?: string
  ) {
    this.textAnalyzer = textAnalyzer || new EnhancedTextAnalyzer({});
    this.metrics = new MetricsTracker();
    this.cache = new EnhancedCache({ 
      namespace: 'content-optimization',
      ttl: 3600000 // 1 hour cache
    });
    this.visionApiKey = visionApiKey || process.env.GOOGLE_VISION_API_KEY || '';
    this.openaiApiKey = openaiApiKey || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Optimizes content elements like captions and hashtags using AI-driven insights.
   * @param input - The content elements to optimize.
   * @returns Optimized content suggestions.
   */
  async optimizeContent(input: ContentOptimizationInput): Promise<ContentOptimizationOutput> {
    return this.metrics.timeAsync('optimizeContent', async () => {
      console.log(`ContentOptimizationEngine: Optimizing content for platform: ${input.platform}`);
      
      const cacheKey = this.generateCacheKey(input);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.metrics.increment('cacheHits');
        return cached;
      }
      this.metrics.increment('cacheMisses');

      let optimizedCaption = input.text;
      let suggestedHashtags: string[] = input.currentHashtags || [];
      let thumbnailFeedback: ThumbnailAnalysisResult | undefined;
      let engagementPrediction: any;

      // AI-enhanced caption optimization
      if (input.text) {
        optimizedCaption = await this.optimizeCaptionWithAI(input.text, input.platform, input.userEngagementData);
      }

      // AI-enhanced hashtag generation
      if (input.topic || input.text) {
        suggestedHashtags = await this.generateHashtagsWithAI(
          input.topic || input.text || '',
          input.platform,
          input.userEngagementData
        );
      }

      // Thumbnail analysis if image provided
      if (input.imageUrl) {
        thumbnailFeedback = await this.analyzeThumbnail(input.imageUrl);
      }

      // Engagement prediction based on historical data
      if (input.userEngagementData && optimizedCaption) {
        engagementPrediction = await this.predictEngagement(input, optimizedCaption, suggestedHashtags);
      }

      const captionLength = optimizedCaption ? optimizedCaption.length : 0;
      const contentScore = this.calculateContentScore({
        captionLength,
        hashtagCount: suggestedHashtags.length,
        thumbnailScore: thumbnailFeedback?.overallScore || 0.5,
        platform: input.platform
      });

      const warnings = this.generateWarnings(optimizedCaption, suggestedHashtags, input.platform);

      const result = {
        optimizedCaption,
        suggestedHashtags: [...new Set(suggestedHashtags)], // Remove duplicates
        thumbnailFeedback,
        contentScore,
        warnings,
        engagementPrediction
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    });
  }

  /**
   * Analyzes a thumbnail image for effectiveness using computer vision APIs.
   * @param imageUrl - URL of the thumbnail image.
   * @returns Detailed feedback on the thumbnail.
   */
  async analyzeThumbnail(imageUrl: string): Promise<ThumbnailAnalysisResult> {
    return this.metrics.timeAsync('analyzeThumbnail', async () => {
      console.log(`ContentOptimizationEngine: Analyzing thumbnail: ${imageUrl}`);
      
      const cacheKey = `thumbnail:${crypto.createHash('md5').update(imageUrl).digest('hex')}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.metrics.increment('cacheHits');
        return cached;
      }
      this.metrics.increment('cacheMisses');

      const startTime = Date.now();
      let result: ThumbnailAnalysisResult;

      try {
        // Use Google Vision API for comprehensive analysis
        const visionAnalysis = await this.analyzeWithGoogleVision(imageUrl);
        
        // Use OpenAI GPT-4 Vision for contextual analysis
        const aiAnalysis = await this.analyzeWithOpenAIVision(imageUrl);
        
        result = this.combineAnalysisResults(visionAnalysis, aiAnalysis, Date.now() - startTime);
        
      } catch (error) {
        console.error('Error in thumbnail analysis:', error);
        this.metrics.recordError(error);
        
        // Fallback to basic analysis
        result = await this.basicThumbnailAnalysis(imageUrl, Date.now() - startTime);
      }

      // Cache the result
      this.cache.set(cacheKey, result, 7200000); // 2 hour cache for thumbnails
      return result;
    });
  }

  /**
   * Generate cache key for content optimization input
   */
  private generateCacheKey(input: ContentOptimizationInput): string {
    const keyData = {
      text: input.text,
      imageUrl: input.imageUrl,
      topic: input.topic,
      platform: input.platform,
      hashtags: input.currentHashtags?.sort().join(','),
      engagement: input.userEngagementData
    };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Optimize caption using AI with engagement data
   */
  private async optimizeCaptionWithAI(
    text: string, 
    platform: string, 
    engagementData?: any
  ): Promise<string> {
    if (!this.openaiApiKey) {
      // Fallback to basic optimization
      const cta = 'Follow for more!';
      return text.includes(cta) ? text : `${text} ${cta}`;
    }

    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: this.openaiApiKey });
      
      const prompt = `Optimize this ${platform} caption for maximum engagement:

Original: "${text}"

${engagementData ? `Historical performance: avg ${engagementData.averageLikes} likes, ${engagementData.averageComments} comments, ${engagementData.clickThroughRate}% CTR\n` : ''}Provide an optimized version that:
1. Maintains the original message
2. Adds appropriate CTAs for ${platform}
3. Uses engaging hooks
4. Optimizes for ${platform}'s algorithm

Return only the optimized caption, no explanations.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      });

      this.metrics.increment('apiCalls');
      return response.choices[0].message.content?.trim() || text;
      
    } catch (error) {
      console.error('AI caption optimization failed:', error);
      this.metrics.recordError(error);
      
      // Fallback to basic optimization
      const cta = platform === 'TikTok' ? 'Follow for more!' : 
                  platform === 'instagram' ? 'Double tap if you agree! 👍' : 
                  'Subscribe for more content!';
      return text.includes(cta) ? text : `${text}\n\n${cta}`;
    }
  }

  /**
   * Generate hashtags using AI with engagement insights
   */
  private async generateHashtagsWithAI(
    content: string, 
    platform: string, 
    engagementData?: any
  ): Promise<string[]> {
    if (!this.openaiApiKey) {
      // Fallback to basic hashtag generation
      return [`#${platform.toLowerCase()}`, '#viral', '#trending', '#content'];
    }

    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: this.openaiApiKey });
      
      const prompt = `Generate the best performing hashtags for this ${platform} content:

"${content}"

${engagementData ? `High-performing content averages ${engagementData.averageLikes} likes and ${engagementData.averageComments} comments.\n` : ''}Provide 8-12 hashtags that:
1. Are relevant to the content
2. Include trending ${platform} hashtags
3. Mix popular and niche tags
4. Optimize for ${platform}'s algorithm

Return hashtags in a comma-separated list without explanations.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 150
      });

      this.metrics.increment('apiCalls');
      const hashtagsText = response.choices[0].message.content?.trim() || '';
      return hashtagsText.split(',').map(tag => tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`);
      
    } catch (error) {
      console.error('AI hashtag generation failed:', error);
      this.metrics.recordError(error);
      
      // Fallback hashtags
      return [`#${platform.toLowerCase()}`, '#viral', '#trending', '#content', '#fyp'];
    }
  }

  /**
   * Analyze thumbnail using Google Vision API
   */
  private async analyzeWithGoogleVision(imageUrl: string): Promise<any> {
    if (!this.visionApiKey) {
      throw new Error('Google Vision API key not provided');
    }

    try {
      // Note: In a real implementation, you'd install @google-cloud/vision
      // For now, we'll use a fetch-based approach
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.visionApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { source: { imageUri: imageUrl } },
              features: [
                { type: 'FACE_DETECTION', maxResults: 10 },
                { type: 'TEXT_DETECTION', maxResults: 10 },
                { type: 'IMAGE_PROPERTIES' },
                { type: 'SAFE_SEARCH_DETECTION' },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Vision API failed: ${response.statusText}`);
      }

      this.metrics.increment('apiCalls');
      return await response.json();
      
    } catch (error) {
      console.error('Google Vision analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze thumbnail using OpenAI GPT-4 Vision
   */
  private async analyzeWithOpenAIVision(imageUrl: string): Promise<any> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not provided');
    }

    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: this.openaiApiKey });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: 'Analyze this thumbnail for social media effectiveness. Rate (1-10) and provide specific feedback on: 1) Visual appeal 2) Text readability 3) Color contrast 4) Emotional impact 5) Click-worthiness. Return as JSON with scores and specific improvement suggestions.'
          }, {
            type: 'image_url',
            image_url: { url: imageUrl }
          }]
        }],
        max_tokens: 300
      });

      this.metrics.increment('apiCalls');
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      console.error('OpenAI Vision analysis failed:', error);
      throw error;
    }
  }

  /**
   * Combine analysis results from multiple sources
   */
  private combineAnalysisResults(
    visionData: any, 
    aiData: any, 
    processingTime: number
  ): ThumbnailAnalysisResult {
    const visionResponse = visionData.responses?.[0] || {};
    
    // Extract Vision API data
    const faces = visionResponse.faceAnnotations || [];
    const texts = visionResponse.textAnnotations || [];
    const colors = visionResponse.imagePropertiesAnnotation?.dominantColors?.colors || [];
    
    // Determine visual elements
    const hasText = texts.length > 0;
    const faceDetected = faces.length > 0;
    
    // Calculate color contrast (simplified)
    const colorContrast = this.calculateColorContrast(colors);
    
    // Determine text readability
    const textReadability = hasText ? this.assessTextReadability(texts) : 'high';
    
    // Combine AI insights
    const visualAppeal = aiData.visualAppeal || 5;
    const emotionalImpact = aiData.emotionalImpact || 5;
    const clickWorthiness = aiData.clickWorthiness || 5;
    
    // Generate overall score
    const overallScore = Math.min(1, (
      (visualAppeal + emotionalImpact + clickWorthiness) / 30 +
      (colorContrast === 'high' ? 0.2 : colorContrast === 'medium' ? 0.1 : 0) +
      (textReadability === 'high' ? 0.2 : textReadability === 'medium' ? 0.1 : 0) +
      (faceDetected ? 0.15 : 0)
    ));
    
    // Generate improvement suggestions
    const suggestions: string[] = [];
    if (colorContrast === 'low') suggestions.push('Increase color contrast for better visibility');
    if (textReadability === 'low') suggestions.push('Improve text size and font choice for better readability');
    if (!faceDetected && visualAppeal < 7) suggestions.push('Consider adding human faces to increase emotional connection');
    if (clickWorthiness < 6) suggestions.push('Add more compelling visual elements or curiosity gaps');
    
    // Add AI-specific suggestions
    if (aiData.suggestions && Array.isArray(aiData.suggestions)) {
      suggestions.push(...aiData.suggestions);
    }
    
    return {
      feedback: this.generateThumbnailFeedback(overallScore, {
        visualAppeal,
        emotionalImpact,
        colorContrast,
        textReadability,
        faceDetected
      }),
      improvementSuggestions: suggestions,
      visualElements: {
        hasText,
        textReadability: textReadability as 'high' | 'medium' | 'low',
        colorContrast: colorContrast as 'high' | 'medium' | 'low',
        faceDetected,
        emotionalAppeal: emotionalImpact > 7 ? 'high' : emotionalImpact > 4 ? 'medium' : 'low'
      },
      platformOptimization: {
        aspectRatio: '16:9', // Would detect actual ratio
        resolution: 'HD', // Would detect actual resolution
        sizeOptimized: true // Would check file size
      },
      overallScore,
      processingTimeMs: processingTime
    };
  }

  /**
   * Basic thumbnail analysis fallback
   */
  private async basicThumbnailAnalysis(imageUrl: string, processingTime: number): Promise<ThumbnailAnalysisResult> {
    return {
      feedback: 'Basic analysis completed. For detailed insights, configure Vision API keys.',
      improvementSuggestions: [
        'Ensure high contrast between text and background',
        'Use bright, attention-grabbing colors',
        'Keep text large and readable',
        'Include human faces when possible for better engagement'
      ],
      visualElements: {
        hasText: false, // Cannot detect without API
        textReadability: 'medium',
        colorContrast: 'medium',
        faceDetected: false,
        emotionalAppeal: 'medium'
      },
      platformOptimization: {
        aspectRatio: '16:9',
        resolution: 'Unknown',
        sizeOptimized: true
      },
      overallScore: 0.6, // Neutral score
      processingTimeMs: processingTime
    };
  }

  /**
   * Calculate color contrast level
   */
  private calculateColorContrast(colors: any[]): 'high' | 'medium' | 'low' {
    if (!colors || colors.length < 2) return 'medium';
    
    // Simplified contrast calculation
    // In a real implementation, you'd calculate actual contrast ratios
    const dominantColors = colors.slice(0, 3);
    const hasHighContrast = dominantColors.some((color, i) => 
      dominantColors.some((otherColor, j) => 
        i !== j && this.getColorBrightness(color) > 0.7 && 
        this.getColorBrightness(otherColor) < 0.3
      )
    );
    
    return hasHighContrast ? 'high' : 'medium';
  }

  /**
   * Get color brightness (0-1)
   */
  private getColorBrightness(color: any): number {
    const rgb = color.color || {};
    const r = (rgb.red || 0) / 255;
    const g = (rgb.green || 0) / 255;
    const b = (rgb.blue || 0) / 255;
    return (r * 0.299 + g * 0.587 + b * 0.114);
  }

  /**
   * Assess text readability
   */
  private assessTextReadability(texts: any[]): 'high' | 'medium' | 'low' {
    if (!texts || texts.length === 0) return 'high';
    
    // Check text size and positioning
    const mainText = texts[0]; // Usually the largest text block
    if (!mainText.boundingPoly) return 'medium';
    
    // Calculate text size (simplified)
    const vertices = mainText.boundingPoly.vertices || [];
    if (vertices.length >= 4) {
      const width = Math.abs(vertices[2].x - vertices[0].x);
      const height = Math.abs(vertices[2].y - vertices[0].y);
      const textArea = width * height;
      
      // Estimate based on text area (would need image dimensions for accuracy)
      return textArea > 5000 ? 'high' : textArea > 2000 ? 'medium' : 'low';
    }
    
    return 'medium';
  }

  /**
   * Generate thumbnail feedback message
   */
  private generateThumbnailFeedback(score: number, metrics: any): string {
    if (score >= 0.8) {
      return 'Excellent thumbnail! This image has strong visual appeal and should perform well across platforms.';
    } else if (score >= 0.6) {
      return 'Good thumbnail with room for improvement. Consider the suggestions below to boost engagement.';
    } else if (score >= 0.4) {
      return 'Decent thumbnail but needs optimization. Focus on improving contrast and visual appeal.';
    } else {
      return 'Thumbnail needs significant improvement. Low visual appeal may hurt click-through rates.';
    }
  }

  /**
   * Predict engagement based on content optimization
   */
  private async predictEngagement(
    input: ContentOptimizationInput,
    optimizedCaption: string,
    hashtags: string[]
  ): Promise<any> {
    if (!input.userEngagementData) {
      return {
        predictedLikes: 0,
        predictedComments: 0,
        predictedShares: 0,
        confidenceScore: 0
      };
    }

    const baseline = input.userEngagementData;
    
    // Calculate improvement factors based on optimization
    let improvementFactor = 1.0;
    
    // Caption optimization boost
    if (optimizedCaption && optimizedCaption !== input.text) {
      improvementFactor += 0.15; // 15% boost for optimized caption
    }
    
    // Hashtag optimization boost
    if (hashtags.length >= 5 && hashtags.length <= 15) {
      improvementFactor += 0.1; // 10% boost for optimal hashtag count
    }
    
    // Platform-specific adjustments
    const platformMultipliers: Record<string, number> = {
      'TikTok': 1.2,
      'tiktok': 1.2,
      'instagram': 1.0,
      'Instagram': 1.0,
      'youtube': 0.8,
      'YouTube': 0.8,
      'facebook': 1.0,
      'Facebook': 1.0,
      'twitter': 0.9,
      'Twitter': 0.9,
      'linkedin': 0.7,
      'LinkedIn': 0.7
    };
    const platformMultiplier = platformMultipliers[input.platform] || 1.0;
    
    const finalMultiplier = improvementFactor * platformMultiplier;
    
    return {
      predictedLikes: Math.round(baseline.averageLikes * finalMultiplier),
      predictedComments: Math.round(baseline.averageComments * finalMultiplier),
      predictedShares: Math.round(baseline.averageShares * finalMultiplier),
      confidenceScore: Math.min(0.95, 0.6 + (improvementFactor - 1) * 2) // Higher confidence with more optimizations
    };
  }

  /**
   * Calculate overall content score
   */
  private calculateContentScore(params: {
    captionLength: number;
    hashtagCount: number;
    thumbnailScore: number;
    platform: string;
  }): number {
    const { captionLength, hashtagCount, thumbnailScore, platform } = params;
    
    // Platform-specific optimal lengths
    const optimalLengths = {
      'TikTok': 100,
      ['instagram']: 150,
      ['youtube']: 200
    };
    
    const optimalLength = optimalLengths[platform as keyof typeof optimalLengths] || 150;
    
    // Caption score (0-1)
    const captionScore = captionLength > 0 ? 
      Math.max(0.1, 1 - Math.abs(captionLength - optimalLength) / optimalLength) : 0;
    
    // Hashtag score (0-1)
    const optimalHashtagCount = platform === 'instagram' ? 10 : 5;
    const hashtagScore = hashtagCount > 0 ? 
      Math.max(0.1, 1 - Math.abs(hashtagCount - optimalHashtagCount) / optimalHashtagCount) : 0;
    
    // Weighted average
    return Math.min(1, (
      captionScore * 0.4 +
      hashtagScore * 0.3 +
      thumbnailScore * 0.3
    ));
  }

  /**
   * Generate warnings for content optimization
   */
  private generateWarnings(caption?: string, hashtags?: string[], platform?: string): string[] {
    const warnings: string[] = [];
    
    if (caption) {
      const platformLimits = {
        'TikTok': 300,
        ['instagram']: 2200,
        ['youtube']: 5000
      };
      
      const limit = platformLimits[platform as keyof typeof platformLimits] || 300;
      
      if (caption.length > limit) {
        warnings.push(`Caption exceeds ${platform} character limit of ${limit}`);
      }
      
      if (caption.length < 50) {
        warnings.push('Caption may be too short for optimal engagement');
      }
    }
    
    if (hashtags) {
      if (hashtags.length > 30) {
        warnings.push('Too many hashtags may appear spammy');
      }
      
      if (hashtags.length < 3) {
        warnings.push('Consider adding more hashtags to improve discoverability');
      }
    }
    
    return warnings;
  }

  /**
   * Get optimization metrics
   */
  public getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Reset metrics
   */
  public resetMetrics() {
    this.metrics.reset();
  }

  /**
   * Clear cache
   */
  public clearCache() {
    this.cache.clear();
  }
}
