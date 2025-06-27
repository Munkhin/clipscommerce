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
    console.log(`SentimentAnalysisEngine: Analyzing sentiment for text: "${input.text.substring(0, 30)}..."`);
    
    // NOTE: Temporary sentiment estimation via summarizeContent until full sentiment model integration.
    const summary = await this.textAnalyzer.summarizeContent(input.text);

    let sentimentLabel: 'positive' | 'negative' | 'neutral';
    if (summary.sentiment && summary.sentiment.toLowerCase().includes('positive')) {
      sentimentLabel = 'positive';
    } else if (summary.sentiment && summary.sentiment.toLowerCase().includes('negative')) {
      sentimentLabel = 'negative';
    } else {
      sentimentLabel = 'neutral';
    }

    // Placeholder sentiment score based on heuristic mapping.
    const sentimentScore = sentimentLabel === 'positive' ? 0.8 : sentimentLabel === 'negative' ? -0.7 : 0.1;
    const emotions: Record<string, number> = sentimentLabel === 'positive' ? { joy: 0.8, excitement: 0.6 } : 
                                 sentimentLabel === 'negative' ? { sadness: 0.7, anger: 0.4 } : 
                                 { neutral: 0.9 };

    return {
      sentimentScore,
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
    console.log(`SentimentAnalysisEngine: Analyzing brand mentions for brands: ${brandNames.join(', ')}`);
    const results: Record<string, SentimentOutput> = {};
    for (const brand of brandNames) {
      // TODO (PRIORITY 1 - Core Engine): Implement actual brand mention sentiment analysis.
      // 1. Use NLP techniques (e.g., Named Entity Recognition - NER, or advanced string matching) to accurately identify sentences or contexts containing each `brand`.
      // 2. For each identified context, call `this.analyzeSentiment({ text: contextTextForBrand })` to get specific sentiment.
      // 3. Handle cases where a brand is mentioned multiple times with varying sentiments (e.g., average sentiment, or list all mentions).
      // 4. Improve the current simple `text.toLowerCase().includes(brand.toLowerCase())` check.
      if (text.toLowerCase().includes(brand.toLowerCase())) {
        results[brand] = await this.analyzeSentiment({ text: `Sample text mentioning ${brand}` });
      }
    }
    return results;
  }
}
