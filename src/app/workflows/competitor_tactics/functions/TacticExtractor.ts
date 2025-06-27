import type { PostMetrics } from '../../data_collection/functions/types';

/**
 * Result of tactic extraction from post metrics.
 */
export interface TacticExtractionResult {
  hooks: string[];
  ctas: string[];
  formats: string[];
}

/**
 * TacticExtractor extracts hooks, CTAs, and formats from an array of PostMetrics.
 *
 * Note: The 'type' property is not guaranteed on all PostMetrics. This code uses 'as any' for extensibility.
 */
export class TacticExtractor {
  /**
   * Extracts hooks, CTAs, and formats from posts.
   * @param posts Array of PostMetrics
   * @returns TacticExtractionResult
   */
  extractTactics(posts: PostMetrics[]): TacticExtractionResult {
    const hooks: string[] = [];
    const ctas: string[] = [];
    const formats: string[] = [];
    for (const post of posts) {
      // Extract hooks (first sentence or phrase)
      if (post.caption) {
        const hook = post.caption.split(/[.!?\n]/)[0].trim();
        if (hook && !hooks.includes(hook)) hooks.push(hook);
      }
      // Extract CTAs (common CTA phrases)
      if (post.caption) {
        const ctaMatches = post.caption.match(/(follow|like|subscribe|comment|share|click|visit|buy|learn more|check out|link in bio)/gi);
        if (ctaMatches) {
          for (const cta of ctaMatches) {
            const norm = cta.toLowerCase();
            if (!ctas.includes(norm)) ctas.push(norm);
          }
        }
      }
      // Extract format (video, image, carousel, etc.)
      const type = (post as any).type;
      if (type && typeof type === 'string' && !formats.includes(type)) {
        formats.push(type);
      }
    }
    return { hooks, ctas, formats };
  }
} 