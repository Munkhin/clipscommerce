// SEO & Keyword Integration Service
import { semrushClient } from '../utils/semrush-client';
import { keybertClient } from '../utils/keybert-client';
import { CacheService } from '../utils';
import { DEFAULT_CONFIG } from '../config';

type KeywordData = {
  keyword: string;
  search_volume?: number;
  trend_velocity?: number;
  relevance?: number;
  source: string;
  score?: number;
  positionScore?: number;
};

export class SEOKeywordService {
  private _cachedGetOptimizedKeywords: (text: string) => Promise<string[]>;

  constructor(
    private semrush = semrushClient,
    private keybert = keybertClient
  ) {
    // Define the function to be cached with an explicit type signature
    const methodToCache = (text: string): Promise<string[]> => {
      return this._getOptimizedKeywordsUncached(text);
    };

    // Rely on TypeScript's inference for withCache generic arguments
    this._cachedGetOptimizedKeywords = CacheService.withCache(
      methodToCache,
      'seo:optimizedKeywords',
      DEFAULT_CONFIG.CACHE_TTL.KEYWORDS / 1000 // Convert ms to seconds for TTL
    ) as (text: string) => Promise<string[]>;
  }

  /**
   * Get optimized keywords for a piece of text using SEMrush (trending) and KeyBERT (context-aware).
   * Dynamic weighting and positional encoding are applied.
   */
  async getOptimizedKeywords(text: string): Promise<string[]> {
    return this._cachedGetOptimizedKeywords(text);
  }

  private async _getOptimizedKeywordsUncached(text: string): Promise<string[]> {
    try {
      // Get trending keywords from SEMrush
      const trending = await this.semrush.getTrendingKeywords(text);
      // Get context-aware keywords from KeyBERT
      const extracted = await this.keybert.extract(text);

      // Merge and deduplicate
      const allKeywords = new Map<string, KeywordData>();
      
      // Add SEMrush keywords
      for (const k of trending) {
        allKeywords.set(k.keyword, { 
          ...k, 
          source: 'semrush',
          relevance: 0 // Will be updated if also found by KeyBERT
        });
      }
      
      // Add or update with KeyBERT keywords
      for (const k of extracted) {
        const existing = allKeywords.get(k.keyword);
        if (existing) {
          // Update existing keyword with relevance from KeyBERT
          existing.relevance = k.relevance;
        } else {
          // Add new keyword from KeyBERT
          allKeywords.set(k.keyword, { 
            keyword: k.keyword, 
            search_volume: 0, 
            trend_velocity: 0, 
            relevance: k.relevance,
            source: 'keybert' 
          });
        }
      }

      // Calculate scores with dynamic weighting
      const scored: KeywordData[] = [];
      for (const keywordData of allKeywords.values()) {
        const { search_volume = 0, trend_velocity = 0, relevance = 0 } = keywordData;
        const pos = text.toLowerCase().indexOf(keywordData.keyword.toLowerCase());
        const positionScore = pos >= 0 && pos < 50 ? 1 : 0;
        
        // Calculate score with weighted factors
        const score = (search_volume * 0.6) + 
                     (trend_velocity * 0.4) + 
                     (relevance * 100) + // Scale relevance to be comparable
                     (positionScore * 10); // Boost for early appearance
        
        scored.push({
          ...keywordData,
          score,
          positionScore
        });
      }

      // Sort by score descending and return top 10 keywords
      return scored
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)
        .map(k => k.keyword);
    } catch (err) {
      console.error('SEOKeywordService error:', err);
      return [];
    }
  }
}
