import { Platform } from '../../deliverables/types/deliverables_types';
import { featureStore } from './feedbackLoop';

// Core NLP utilities for AI Improvement Workflow





// Enhanced NLP utilities for AI Improvement Workflow

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
  keywords: string[];
}

export interface ToneAnalysis {
  tone: 'formal' | 'casual' | 'excited' | 'neutral' | 'professional' | 'humorous';
  confidence: number;
  characteristics: string[];
}

export interface ContentOptimization {
  originalText: string;
  optimizedText: string;
  improvements: string[];
  expectedEngagementIncrease: number;
  platform: Platform;
}

export interface HashtagRecommendation {
  hashtag: string;
  relevanceScore: number;
  trendingScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  estimatedReach: number;
}

export interface CaptionVariation {
  variation: string;
  type: 'shortened' | 'expanded' | 'tone_adjusted' | 'emoji_enhanced' | 'cta_added';
  expectedPerformance: number;
  targetAudience: string;
}

/**
 * Advanced sentiment analysis with emotion detection
 */
export function analyzeSentiment(text: string): SentimentAnalysis {
  const lower = text.toLowerCase();
  
  // Enhanced keyword-based sentiment analysis
  const positiveKeywords = [
    'love', 'amazing', 'great', 'awesome', 'fantastic', 'wonderful', 'excellent',
    'perfect', 'beautiful', 'incredible', 'outstanding', 'brilliant', 'superb',
    'marvelous', 'spectacular', 'phenomenal', 'extraordinary', 'magnificent'
  ];
  
  const negativeKeywords = [
    'hate', 'terrible', 'awful', 'bad', 'horrible', 'disgusting', 'pathetic',
    'disappointing', 'frustrating', 'annoying', 'useless', 'worthless', 'dreadful',
    'appalling', 'atrocious', 'abysmal', 'deplorable', 'repulsive'
  ];

  const joyKeywords = ['happy', 'joy', 'excited', 'thrilled', 'delighted', 'cheerful'];
  const angerKeywords = ['angry', 'furious', 'mad', 'irritated', 'outraged', 'livid'];
  const fearKeywords = ['scared', 'afraid', 'terrified', 'worried', 'anxious', 'nervous'];
  const sadnessKeywords = ['sad', 'depressed', 'heartbroken', 'disappointed', 'melancholy'];
  const surpriseKeywords = ['surprised', 'shocked', 'amazed', 'astonished', 'stunned'];
  const disgustKeywords = ['disgusted', 'revolted', 'repulsed', 'sickened', 'nauseated'];

  // Calculate sentiment scores
  const positiveCount = positiveKeywords.filter(word => lower.includes(word)).length;
  const negativeCount = negativeKeywords.filter(word => lower.includes(word)).length;
  
  // Calculate emotion scores
  const emotions = {
    joy: joyKeywords.filter(word => lower.includes(word)).length / joyKeywords.length,
    anger: angerKeywords.filter(word => lower.includes(word)).length / angerKeywords.length,
    fear: fearKeywords.filter(word => lower.includes(word)).length / fearKeywords.length,
    sadness: sadnessKeywords.filter(word => lower.includes(word)).length / sadnessKeywords.length,
    surprise: surpriseKeywords.filter(word => lower.includes(word)).length / surpriseKeywords.length,
    disgust: disgustKeywords.filter(word => lower.includes(word)).length / disgustKeywords.length,
  };

  // Determine overall sentiment
  let sentiment: 'positive' | 'neutral' | 'negative';
  let score: number;
  let confidence: number;

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    score = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1);
    confidence = Math.min(0.95, 0.6 + positiveCount * 0.1);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    score = Math.max(-0.9, -0.5 - (negativeCount - positiveCount) * 0.1);
    confidence = Math.min(0.95, 0.6 + negativeCount * 0.1);
  } else {
    sentiment = 'neutral';
    score = 0;
    confidence = 0.5;
  }

  // Extract keywords
  const allKeywords = [...positiveKeywords, ...negativeKeywords];
  const keywords = allKeywords.filter(word => lower.includes(word));

  return {
    sentiment,
    score,
    confidence,
    emotions,
    keywords,
  };
}

/**
 * Enhanced tone analysis with multiple tone categories
 */
export function analyzeTone(text: string): ToneAnalysis {
  const lower = text.toLowerCase();
  const characteristics: string[] = [];
  
  // Tone indicators
  const formalIndicators = [
    /\b(please|regards|sincerely|furthermore|therefore|consequently)\b/i,
    /\b(we are pleased to|we would like to|it is our pleasure)\b/i,
  ];
  
  const casualIndicators = [
    /\b(hey|yo|lol|cool|awesome|dude|guys|totally)\b/i,
    /[!]{2,}/, // Multiple exclamation marks
    /\b(gonna|wanna|gotta|kinda|sorta)\b/i,
  ];
  
  const excitedIndicators = [
    /[!]{2,}/, // Multiple exclamation marks
    /\b(amazing|incredible|fantastic|wow|omg|yay)\b/i,
    /[A-Z]{3,}/, // All caps words
  ];
  
  const professionalIndicators = [
    /\b(expertise|professional|industry|business|strategy|optimize)\b/i,
    /\b(we recommend|our analysis|best practices|proven methods)\b/i,
  ];
  
  const humorousIndicators = [
    /\b(haha|lol|lmao|funny|hilarious|joke|comedy)\b/i,
    /😂|😄|😆|🤣/, // Laughing emojis
  ];

  // Calculate tone scores
  const scores = {
    formal: formalIndicators.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0),
    casual: casualIndicators.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0),
    excited: excitedIndicators.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0),
    professional: professionalIndicators.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0),
    humorous: humorousIndicators.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0),
  };

  // Determine primary tone
  const maxScore = Math.max(...Object.values(scores));
  let tone: ToneAnalysis['tone'] = 'neutral';
  let confidence = 0.5;

  if (maxScore > 0) {
    const toneEntry = Object.entries(scores).find(([, score]) => score === maxScore);
    if (toneEntry) {
      tone = toneEntry[0] as ToneAnalysis['tone'];
      confidence = Math.min(0.9, 0.6 + maxScore * 0.1);
      
      // Add characteristics
      if (tone === 'formal') characteristics.push('structured', 'polite', 'respectful');
      if (tone === 'casual') characteristics.push('relaxed', 'friendly', 'conversational');
      if (tone === 'excited') characteristics.push('energetic', 'enthusiastic', 'passionate');
      if (tone === 'professional') characteristics.push('authoritative', 'knowledgeable', 'business-focused');
      if (tone === 'humorous') characteristics.push('entertaining', 'lighthearted', 'engaging');
    }
  }

  return { tone, confidence, characteristics };
}

/**
 * Generate optimized caption and hashtag suggestions based on performance data
 */
export function suggestCaptionsAndHashtags(post: { 
  caption: string; 
  hashtags?: string[]; 
  platform: Platform;
  targetAudience?: string;
}): { 
  captions: CaptionVariation[]; 
  hashtags: HashtagRecommendation[]; 
  optimization: ContentOptimization;
} {
  const { caption, hashtags = [], platform, targetAudience = 'general' } = post;
  
  // Generate caption variations
  const captions = generateCaptionVariations(caption, platform, targetAudience);
  
  // Generate hashtag recommendations
  const hashtagRecommendations = generateHashtagRecommendations(caption, platform, hashtags);
  
  // Create content optimization
  const optimization = optimizeContent(caption, platform);

  return {
    captions,
    hashtags: hashtagRecommendations,
    optimization,
  };
}

/**
 * Generate multiple caption variations for A/B testing
 */
export function generateCaptionVariations(
  originalCaption: string, 
  platform: Platform,
  targetAudience: string = 'general'
): CaptionVariation[] {
  const variations: CaptionVariation[] = [];
  
  // Shortened version
  const shortened = shortenCaption(originalCaption);
  variations.push({
    variation: shortened,
    type: 'shortened',
    expectedPerformance: calculateExpectedPerformance(shortened, platform, 'shortened'),
    targetAudience: 'mobile users',
  });

  // Expanded version
  const expanded = expandCaption(originalCaption, platform);
  variations.push({
    variation: expanded,
    type: 'expanded',
    expectedPerformance: calculateExpectedPerformance(expanded, platform, 'expanded'),
    targetAudience: 'engaged followers',
  });

  // Tone-adjusted version
  const toneAdjusted = adjustToneForPlatform(originalCaption, platform);
  variations.push({
    variation: toneAdjusted,
    type: 'tone_adjusted',
    expectedPerformance: calculateExpectedPerformance(toneAdjusted, platform, 'tone_adjusted'),
    targetAudience,
  });

  // Emoji-enhanced version
  const emojiEnhanced = addPlatformSpecificEmojis(originalCaption, platform);
  variations.push({
    variation: emojiEnhanced,
    type: 'emoji_enhanced',
    expectedPerformance: calculateExpectedPerformance(emojiEnhanced, platform, 'emoji_enhanced'),
    targetAudience: 'younger demographics',
  });

  // CTA-added version
  const ctaAdded = addCallToAction(originalCaption, platform);
  variations.push({
    variation: ctaAdded,
    type: 'cta_added',
    expectedPerformance: calculateExpectedPerformance(ctaAdded, platform, 'cta_added'),
    targetAudience: 'conversion-focused',
  });

  return variations.sort((a, b) => b.expectedPerformance - a.expectedPerformance);
}

/**
 * Generate hashtag recommendations based on content and performance data
 */
export function generateHashtagRecommendations(
  content: string,
  platform: Platform,
  existingHashtags: string[] = []
): HashtagRecommendation[] {
  // Analyze content for relevant topics
  const contentTopics = extractTopicsFromContent(content);
  
  // Get trending hashtags for platform
  const trendingHashtags = getTrendingHashtagsForPlatform(platform);
  
  // Get high-performing hashtags from historical data
  const historicalHashtags = getHighPerformingHashtags(platform);
  
  // Combine and score hashtags
  const allHashtags = new Set([...trendingHashtags, ...historicalHashtags]);
  const recommendations: HashtagRecommendation[] = [];

  for (const hashtag of allHashtags) {
    if (existingHashtags.includes(hashtag)) continue;
    
    const relevanceScore = calculateHashtagRelevance(hashtag, contentTopics);
    const trendingScore = getTrendingScore(hashtag, platform);
    const competitionLevel = getCompetitionLevel(hashtag, platform);
    const estimatedReach = estimateHashtagReach(hashtag, platform);

    if (relevanceScore > 0.3) { // Only include relevant hashtags
      recommendations.push({
        hashtag,
        relevanceScore,
        trendingScore,
        competitionLevel,
        estimatedReach,
      });
    }
  }

  return recommendations
    .sort((a, b) => (b.relevanceScore + b.trendingScore) - (a.relevanceScore + a.trendingScore))
    .slice(0, 15); // Return top 15 recommendations
}

/**
 * Optimize content for better engagement
 */
export function optimizeContent(text: string, platform: Platform): ContentOptimization {
  const improvements: string[] = [];
  let optimizedText = text;
  let expectedIncrease = 0;

  // Optimize length for platform
  const optimalLength = getOptimalLengthForPlatform(platform);
  if (text.length > optimalLength * 1.2) {
    optimizedText = text.substring(0, optimalLength) + '...';
    improvements.push('Shortened to optimal length');
    expectedIncrease += 5;
  } else if (text.length < optimalLength * 0.5) {
    optimizedText = expandCaption(text, platform);
    improvements.push('Expanded for better context');
    expectedIncrease += 3;
  }

  // Add platform-specific optimizations
  const platformOptimizations = getPlatformOptimizations(optimizedText, platform);
  optimizedText = platformOptimizations.text;
  improvements.push(...platformOptimizations.improvements);
  expectedIncrease += platformOptimizations.expectedIncrease;

  // Optimize for engagement
  const engagementOptimizations = optimizeForEngagement(optimizedText);
  optimizedText = engagementOptimizations.text;
  improvements.push(...engagementOptimizations.improvements);
  expectedIncrease += engagementOptimizations.expectedIncrease;

  return {
    originalText: text,
    optimizedText,
    improvements,
    expectedEngagementIncrease: Math.min(50, expectedIncrease), // Cap at 50%
    platform,
  };
}

/**
 * Analyze content performance patterns from historical data
 */
export function analyzeContentPerformancePatterns(): {
  topPerformingWords: string[];
  optimalCaptionLength: Record<Platform, number>;
  bestPerformingTones: Record<Platform, string[]>;
  highEngagementHashtags: Record<Platform, string[]>;
} {
  const contentData = featureStore.contentPerformance;
  
  // Analyze top-performing words
  const wordPerformance: Record<string, number[]> = {};
  
  for (const content of contentData) {
    const words = content.caption.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) { // Only consider meaningful words
        if (!wordPerformance[word]) wordPerformance[word] = [];
        wordPerformance[word].push(content.engagementRate);
      }
    }
  }

  const topPerformingWords = Object.entries(wordPerformance)
    .map(([word, rates]) => ({
      word,
      avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      usage: rates.length,
    }))
    .filter(w => w.usage >= 3) // Only words used multiple times
    .sort((a, b) => b.avgRate - a.avgRate)
    .slice(0, 20)
    .map(w => w.word);

  // Analyze optimal caption length by platform
  const optimalCaptionLength: Record<Platform, number> = {} as any;
  const bestPerformingTones: Record<Platform, string[]> = {} as any;
  const highEngagementHashtags: Record<Platform, string[]> = {} as any;

  for (const platform of Object.values(Platform)) {
    const platformContent = contentData.filter(c => c.platform === platform);
    
    if (platformContent.length > 0) {
      // Calculate optimal length
      const lengthPerformance = platformContent.map(c => ({
        length: c.caption.length,
        engagement: c.engagementRate,
      }));
      
      const topPerforming = lengthPerformance
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, Math.ceil(lengthPerformance.length * 0.2)); // Top 20%
      
      optimalCaptionLength[platform] = Math.round(
        topPerforming.reduce((sum, p) => sum + p.length, 0) / topPerforming.length
      );

      // Analyze hashtag performance
      const hashtagPerf: Record<string, number[]> = {};
      for (const content of platformContent) {
        for (const hashtag of content.hashtags) {
          if (!hashtagPerf[hashtag]) hashtagPerf[hashtag] = [];
          hashtagPerf[hashtag].push(content.engagementRate);
        }
      }

      highEngagementHashtags[platform] = Object.entries(hashtagPerf)
        .map(([hashtag, rates]) => ({
          hashtag,
          avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
        }))
        .sort((a, b) => b.avgRate - a.avgRate)
        .slice(0, 10)
        .map(h => h.hashtag);
    }
  }

  return {
    topPerformingWords,
    optimalCaptionLength,
    bestPerformingTones,
    highEngagementHashtags,
  };
}

// Helper functions

function shortenCaption(caption: string): string {
  const sentences = caption.split(/[.!?]+/);
  return sentences[0] + (sentences.length > 1 ? '...' : '');
}

function expandCaption(caption: string, platform: Platform): string {
  const platformExpansions = {
    [Platform.TIKTOK]: ' What do you think? Drop a comment below! 👇',
    [Platform.INSTAGRAM]: ' Double tap if you agree! Share your thoughts in the comments ✨',
    [Platform.YOUTUBE]: ' Let me know what you think in the comments and don\'t forget to subscribe!',
    [Platform.FACEBOOK]: ' What\'s your experience with this? Share your story!',
    [Platform.TWITTER]: ' What are your thoughts? Retweet if you agree!',
    [Platform.LINKEDIN]: ' I\'d love to hear your professional perspective on this.',
  };

  return caption + (platformExpansions[platform] || ' Let me know your thoughts!');
}

function adjustToneForPlatform(caption: string, platform: Platform): string {
  const currentTone = analyzeTone(caption);
  
  const platformTones = {
    [Platform.TIKTOK]: 'excited',
    [Platform.INSTAGRAM]: 'casual',
    [Platform.YOUTUBE]: 'professional',
    [Platform.FACEBOOK]: 'casual',
    [Platform.TWITTER]: 'casual',
    [Platform.LINKEDIN]: 'professional',
  };

  const targetTone = platformTones[platform];
  
  if (currentTone.tone === targetTone) return caption;

  // Adjust tone based on target
  switch (targetTone) {
    case 'excited':
      return caption.replace(/[.]/g, '!') + ' 🔥';
    case 'professional':
      return caption.replace(/[!]+/g, '.').replace(/😊|😍|🔥|✨/g, '');
    case 'casual':
    default:
      return caption + ' 😊';
  }
}

function addPlatformSpecificEmojis(caption: string, platform: Platform): string {
  const platformEmojis = {
    [Platform.TIKTOK]: ['🔥', '✨', '💯', '🚀', '⚡'],
    [Platform.INSTAGRAM]: ['✨', '💕', '🌟', '💫', '🦋'],
    [Platform.YOUTUBE]: ['🎬', '📹', '🎥', '👍', '🔔'],
    [Platform.FACEBOOK]: ['👍', '❤️', '😊', '🎉', '👏'],
    [Platform.TWITTER]: ['🧵', '💭', '🔥', '📢', '⚡'],
    [Platform.LINKEDIN]: ['💼', '🚀', '💡', '📈', '🎯'],
  };

  const emojis = platformEmojis[platform] || ['✨'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  return caption + ' ' + randomEmoji;
}

function addCallToAction(caption: string, platform: Platform): string {
  const platformCTAs = {
    [Platform.TIKTOK]: 'Follow for more! 👆',
    [Platform.INSTAGRAM]: 'Save this post! 📌',
    [Platform.YOUTUBE]: 'Subscribe for more content! 🔔',
    [Platform.FACEBOOK]: 'Share with friends! 👥',
    [Platform.TWITTER]: 'Retweet to spread the word! 🔄',
    [Platform.LINKEDIN]: 'Connect with me for more insights! 🤝',
  };

  return caption + '\n\n' + (platformCTAs[platform] || 'Engage with this content!');
}

function calculateExpectedPerformance(
  caption: string, 
  platform: Platform, 
  variationType: string
): number {
  // Base performance calculation
  let performance = 50; // Base 50%

  // Adjust based on variation type
  const typeMultipliers = {
    shortened: 1.1,
    expanded: 1.05,
    tone_adjusted: 1.15,
    emoji_enhanced: 1.2,
    cta_added: 1.25,
  };

  performance *= typeMultipliers[variationType as keyof typeof typeMultipliers] || 1;

  // Adjust based on platform
  const platformMultipliers = {
    [Platform.TIKTOK]: 1.2,
    [Platform.INSTAGRAM]: 1.1,
    [Platform.YOUTUBE]: 1.0,
    [Platform.FACEBOOK]: 0.9,
    [Platform.TWITTER]: 0.95,
    [Platform.LINKEDIN]: 0.85,
  };

  performance *= platformMultipliers[platform] || 1;

  // Add some randomness
  performance += (Math.random() - 0.5) * 10;

  return Math.max(0, Math.min(100, performance));
}

function extractTopicsFromContent(content: string): string[] {
  // Simple topic extraction (in production, use advanced NLP)
  const words = content.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  return words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
}

function getTrendingHashtagsForPlatform(platform: Platform): string[] {
  // Mock trending hashtags (in production, fetch from real APIs)
  const trending = {
    [Platform.TIKTOK]: ['#fyp', '#viral', '#trending', '#foryou', '#tiktok'],
    [Platform.INSTAGRAM]: ['#instagood', '#photooftheday', '#love', '#beautiful', '#happy'],
    [Platform.YOUTUBE]: ['#youtube', '#subscribe', '#viral', '#trending', '#shorts'],
    [Platform.FACEBOOK]: ['#facebook', '#social', '#community', '#share', '#connect'],
    [Platform.TWITTER]: ['#twitter', '#trending', '#viral', '#news', '#social'],
    [Platform.LINKEDIN]: ['#linkedin', '#professional', '#career', '#business', '#networking'],
  };

  return trending[platform] || [];
}

function getHighPerformingHashtags(platform: Platform): string[] {
  // Get hashtags from historical high-performing content
  const platformContent = featureStore.contentPerformance.filter(c => c.platform === platform);
  
  if (platformContent.length === 0) {
    // Return default high-performing hashtags if no historical data
    const defaultHashtags = {
      [Platform.TIKTOK]: ['#fyp', '#viral', '#trending', '#foryou', '#content'],
      [Platform.INSTAGRAM]: ['#instagood', '#photooftheday', '#love', '#beautiful', '#content'],
      [Platform.YOUTUBE]: ['#youtube', '#subscribe', '#viral', '#trending', '#content'],
      [Platform.FACEBOOK]: ['#facebook', '#social', '#community', '#share', '#content'],
      [Platform.TWITTER]: ['#twitter', '#trending', '#viral', '#news', '#content'],
      [Platform.LINKEDIN]: ['#linkedin', '#professional', '#career', '#business', '#content'],
    };
    return defaultHashtags[platform] || ['#content', '#trending', '#viral'];
  }
  
  const topContent = platformContent
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, Math.ceil(platformContent.length * 0.2)); // Top 20%

  const hashtagCounts: Record<string, number> = {};
  for (const content of topContent) {
    for (const hashtag of content.hashtags) {
      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
    }
  }

  return Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([hashtag]) => hashtag);
}

function calculateHashtagRelevance(hashtag: string, topics: string[]): number {
  const hashtagLower = hashtag.toLowerCase().replace('#', '');
  let relevance = 0.1; // Start with a base relevance to ensure some hashtags are included

  for (const topic of topics) {
    if (hashtagLower.includes(topic) || topic.includes(hashtagLower)) {
      relevance += 0.3;
    }
    // Also check for partial matches
    if (hashtagLower.indexOf(topic.substring(0, 3)) !== -1 || topic.indexOf(hashtagLower.substring(0, 3)) !== -1) {
      relevance += 0.1;
    }
  }

  // Give bonus to common/trending hashtags
  const commonHashtags = ['content', 'viral', 'trending', 'fyp', 'instagood', 'love', 'beautiful'];
  if (commonHashtags.some(common => hashtagLower.includes(common))) {
    relevance += 0.2;
  }

  return Math.min(1, relevance);
}

function getTrendingScore(hashtag: string, platform: Platform): number {
  const trending = getTrendingHashtagsForPlatform(platform);
  return trending.includes(hashtag) ? 0.8 : Math.random() * 0.5;
}

function getCompetitionLevel(hashtag: string, platform: Platform): 'low' | 'medium' | 'high' {
  // Mock competition analysis (in production, analyze actual usage data)
  const popularHashtags = ['#viral', '#trending', '#love', '#instagood', '#photooftheday'];
  
  if (popularHashtags.includes(hashtag)) return 'high';
  if (hashtag.length < 10) return 'medium';
  return 'low';
}

function estimateHashtagReach(hashtag: string, platform: Platform): number {
  // Mock reach estimation (in production, use real data)
  const competitionLevel = getCompetitionLevel(hashtag, platform);
  const baseReach = {
    low: 10000,
    medium: 50000,
    high: 200000,
  };

  return baseReach[competitionLevel] + Math.floor(Math.random() * baseReach[competitionLevel] * 0.5);
}

function getOptimalLengthForPlatform(platform: Platform): number {
  const optimalLengths = {
    [Platform.TIKTOK]: 150,
    [Platform.INSTAGRAM]: 125,
    [Platform.YOUTUBE]: 200,
    [Platform.FACEBOOK]: 250,
    [Platform.TWITTER]: 280,
    [Platform.LINKEDIN]: 300,
  };

  return optimalLengths[platform] || 150;
}

function getPlatformOptimizations(text: string, platform: Platform): {
  text: string;
  improvements: string[];
  expectedIncrease: number;
} {
  const improvements: string[] = [];
  let optimizedText = text;
  let expectedIncrease = 0;

  switch (platform) {
    case Platform.TIKTOK:
      if (!text.includes('#fyp')) {
        optimizedText += ' #fyp';
        improvements.push('Added #fyp for TikTok algorithm');
        expectedIncrease += 8;
      }
      break;
    
    case Platform.INSTAGRAM:
      if (!text.match(/[✨💕🌟]/)) {
        optimizedText += ' ✨';
        improvements.push('Added Instagram-style emoji');
        expectedIncrease += 5;
      }
      break;
    
    case Platform.LINKEDIN:
      if (!text.match(/\b(professional|business|career|industry)\b/i)) {
        improvements.push('Consider adding professional context');
        expectedIncrease += 3;
      }
      break;
  }

  return { text: optimizedText, improvements, expectedIncrease };
}

function optimizeForEngagement(text: string): {
  text: string;
  improvements: string[];
  expectedIncrease: number;
} {
  const improvements: string[] = [];
  let optimizedText = text;
  let expectedIncrease = 0;

  // Add question to encourage comments
  if (!text.match(/[?]/)) {
    optimizedText += ' What do you think?';
    improvements.push('Added question to encourage engagement');
    expectedIncrease += 10;
  }

  // Ensure proper capitalization
  if (text === text.toLowerCase()) {
    optimizedText = optimizedText.charAt(0).toUpperCase() + optimizedText.slice(1);
    improvements.push('Fixed capitalization');
    expectedIncrease += 2;
  }

  return { text: optimizedText, improvements, expectedIncrease };
} 