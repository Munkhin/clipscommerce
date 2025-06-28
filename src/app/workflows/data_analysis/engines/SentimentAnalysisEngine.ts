import { EnhancedTextAnalyzer } from '@/lib/ai/enhancedTextAnalyzer';

export interface SentimentInput {
  text: string;
  language?: string; // Optional, defaults to 'en'
}

export interface SentimentOutput {
  sentimentScore: number; // e.g., -1 (negative) to 1 (positive)
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  emotions?: Record<string, number>; // e.g., { joy: 0.8, sadness: 0.1 }
}

export class SentimentAnalysisEngine {
  private textAnalyzer: EnhancedTextAnalyzer;

  constructor(textAnalyzer?: EnhancedTextAnalyzer) {
    this.textAnalyzer = textAnalyzer || new EnhancedTextAnalyzer({});
  }

  /**
   * Analyzes the sentiment of a given text.
   * @param input - The text and optional language.
   * @returns The sentiment score, label, and detected emotions.
   */
  async analyzeSentiment(input: SentimentInput): Promise<SentimentOutput> {
    // Enhanced sentiment analysis with multiple approaches
    const lexiconBasedSentiment = this.analyzeLexiconBasedSentiment(input.text);
    const patternBasedSentiment = this.analyzePatternBasedSentiment(input.text);
    
    // Try to use the text analyzer for additional context
    let contextualSentiment = { score: 0, label: 'neutral' as const };
    try {
      const summary = await this.textAnalyzer.summarizeContent(input.text);
      contextualSentiment = this.extractSentimentFromSummary(summary);
    } catch (error) {
      // Fallback if text analyzer fails - use rule-based approach
    }

    // Combine different sentiment signals
    const combinedScore = this.combineSentimentScores([
      lexiconBasedSentiment,
      patternBasedSentiment,
      contextualSentiment
    ]);

    const sentimentLabel = this.scoresToLabel(combinedScore);
    const emotions = this.detectEmotions(input.text, sentimentLabel);

    return {
      sentimentScore: parseFloat(combinedScore.toFixed(3)),
      sentimentLabel,
      emotions,
    };
  }

  /**
   * Analyzes brand mentions within a text for sentiment.
   * @param text - The text to analyze.
   * @param brandNames - A list of brand names to look for.
   * @returns Sentiment analysis for each mentioned brand.
   */
  async analyzeBrandMentionSentiment(text: string, brandNames: string[]): Promise<Record<string, SentimentOutput>> {
    const results: Record<string, SentimentOutput> = {};
    
    for (const brand of brandNames) {
      const brandMentions = this.extractBrandMentionContexts(text, brand);
      
      if (brandMentions.length > 0) {
        // Analyze sentiment for each mention context
        const sentimentAnalyses = await Promise.all(
          brandMentions.map(context => this.analyzeSentiment({ text: context }))
        );
        
        // Aggregate sentiment scores for the brand
        const aggregatedSentiment = this.aggregateBrandSentiments(sentimentAnalyses);
        results[brand] = aggregatedSentiment;
      }
    }
    
    return results;
  }

  // Helper methods for sentiment analysis
  private analyzeLexiconBasedSentiment(text: string): number {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'like',
      'best', 'perfect', 'outstanding', 'brilliant', 'superb', 'incredible', 'magnificent',
      'beautiful', 'happy', 'pleased', 'satisfied', 'delighted', 'excited', 'thrilled'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'poor', 'disappointing',
      'frustrating', 'annoying', 'disgusting', 'pathetic', 'useless', 'worthless', 'broken',
      'sad', 'angry', 'upset', 'disappointed', 'furious', 'disgusted', 'depressed'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    // Normalize by text length
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  private analyzePatternBasedSentiment(text: string): number {
    let score = 0;
    
    // Exclamation patterns
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 0) score += Math.min(0.3, exclamationCount * 0.1);
    
    // Question patterns (often neutral to slightly negative)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 2) score -= 0.1;
    
    // Capitalization patterns
    const capsWords = text.match(/[A-Z]{2,}/g) || [];
    if (capsWords.length > 0) {
      // CAPS can be positive (AMAZING) or negative (TERRIBLE)
      score += capsWords.length > 3 ? -0.2 : 0.1;
    }
    
    // Repetition patterns (often emotional)
    const repeatedChars = text.match(/(.)\1{2,}/g) || [];
    if (repeatedChars.length > 0) score += 0.15;
    
    // Emoji-like patterns
    const positiveEmojis = text.match(/:\)|:-\)|:D|😊|😃|❤️|👍/g) || [];
    const negativeEmojis = text.match(/:\(|:-\(|😞|😠|👎|💔/g) || [];
    
    score += positiveEmojis.length * 0.2;
    score -= negativeEmojis.length * 0.2;
    
    return Math.max(-1, Math.min(1, score));
  }

  private extractSentimentFromSummary(summary: any): { score: number, label: 'positive' | 'negative' | 'neutral' } {
    if (summary.sentiment) {
      const sentimentText = summary.sentiment.toLowerCase();
      if (sentimentText.includes('positive') || sentimentText.includes('good')) {
        return { score: 0.6, label: 'positive' };
      } else if (sentimentText.includes('negative') || sentimentText.includes('bad')) {
        return { score: -0.6, label: 'negative' };
      }
    }
    return { score: 0, label: 'neutral' };
  }

  private combineSentimentScores(scores: Array<{ score: number } | number>): number {
    const numericScores = scores.map(s => typeof s === 'number' ? s : s.score);
    const weights = [0.4, 0.3, 0.3]; // Lexicon, Pattern, Contextual
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < numericScores.length && i < weights.length; i++) {
      weightedSum += numericScores[i] * weights[i];
      totalWeight += weights[i];
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private scoresToLabel(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private detectEmotions(text: string, sentimentLabel: string): Record<string, number> {
    const emotionKeywords = {
      joy: ['happy', 'joy', 'excited', 'thrilled', 'delighted', 'cheerful'],
      anger: ['angry', 'furious', 'mad', 'rage', 'annoyed', 'frustrated'],
      sadness: ['sad', 'depressed', 'disappointed', 'miserable', 'upset'],
      fear: ['scared', 'afraid', 'terrified', 'worried', 'anxious'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
      disgust: ['disgusting', 'revolting', 'repulsive', 'gross']
    };
    
    const emotions: Record<string, number> = {};
    const textLower = text.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      let emotionScore = 0;
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          emotionScore += 0.3;
        }
      }
      if (emotionScore > 0) {
        emotions[emotion] = Math.min(1, emotionScore);
      }
    }
    
    // Add base emotion based on sentiment
    if (sentimentLabel === 'positive' && !emotions.joy) {
      emotions.joy = 0.5;
    } else if (sentimentLabel === 'negative' && Object.keys(emotions).length === 0) {
      emotions.sadness = 0.4;
    }
    
    return emotions;
  }

  private extractBrandMentionContexts(text: string, brand: string): string[] {
    const brandLower = brand.toLowerCase();
    const textLower = text.toLowerCase();
    const sentences = text.split(/[.!?]+/);
    const contexts: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(brandLower)) {
        // Include surrounding context (previous and next sentence if available)
        const sentenceIndex = sentences.indexOf(sentence);
        let context = sentence.trim();
        
        if (sentenceIndex > 0) {
          context = sentences[sentenceIndex - 1].trim() + ' ' + context;
        }
        if (sentenceIndex < sentences.length - 1) {
          context = context + ' ' + sentences[sentenceIndex + 1].trim();
        }
        
        contexts.push(context);
      }
    }
    
    // If no sentence-level matches, check for word-level proximity
    if (contexts.length === 0 && textLower.includes(brandLower)) {
      const words = text.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase().includes(brandLower)) {
          // Extract context window around the brand mention
          const start = Math.max(0, i - 10);
          const end = Math.min(words.length, i + 10);
          const context = words.slice(start, end).join(' ');
          contexts.push(context);
          break;
        }
      }
    }
    
    return contexts;
  }

  private aggregateBrandSentiments(sentiments: SentimentOutput[]): SentimentOutput {
    if (sentiments.length === 0) {
      return {
        sentimentScore: 0,
        sentimentLabel: 'neutral',
        emotions: {}
      };
    }
    
    if (sentiments.length === 1) {
      return sentiments[0];
    }
    
    // Calculate weighted average (more recent mentions might be weighted higher)
    const avgScore = sentiments.reduce((sum, s) => sum + s.sentimentScore, 0) / sentiments.length;
    const finalLabel = this.scoresToLabel(avgScore);
    
    // Merge emotions
    const combinedEmotions: Record<string, number> = {};
    for (const sentiment of sentiments) {
      if (sentiment.emotions) {
        for (const [emotion, score] of Object.entries(sentiment.emotions)) {
          combinedEmotions[emotion] = Math.max(combinedEmotions[emotion] || 0, score);
        }
      }
    }
    
    return {
      sentimentScore: parseFloat(avgScore.toFixed(3)),
      sentimentLabel: finalLabel,
      emotions: combinedEmotions
    };
  }
}
