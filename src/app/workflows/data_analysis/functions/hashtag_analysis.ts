// Hashtag analysis utility for extracting and ranking hashtags from content
// Simple, modular, and easily extensible

/**
 * Extracts hashtags from a given string.
 * Returns unique, lowercased hashtags (without the # symbol).
 */
export function extractHashtags(content: string): string[] {
  if (!content) return [];
  // Match hashtags (words starting with #, allow unicode)
  const matches = content.match(/#([\w\p{L}\p{N}_]+)/gu);
  if (!matches) return [];
  // Remove #, lowercase, and deduplicate
  const tags = Array.from(new Set(matches.map(tag => tag.slice(1).toLowerCase())));
  return tags;
}

/**
 * Analyzes a list of captions or content strings and returns the top N hashtags by frequency.
 * @param contents Array of strings (e.g., captions)
 * @param topN Number of top hashtags to return
 */
export function analyzeHashtags(contents: string[], topN: number = 5): string[] {
  const hashtagCounts: Record<string, number> = {};
  contents.forEach(content => {
    extractHashtags(content).forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });
  });
  // Sort by frequency, descending
  return Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => `#${tag}`);
}

// Simple in-memory cache for trending hashtags per platform
const trendingHashtagCache: Record<string, { hashtags: string[]; timestamp: number }> = {};
const TRENDING_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Mock function to fetch trending hashtags for a platform.
 * In production, replace with real API call.
 */
async function fetchTrendingHashtags(platform: string): Promise<string[]> {
  // Simulate API call latency
  await new Promise(res => setTimeout(res, 100));
  // Mocked trending hashtags
  if (platform === 'tiktok') return ['#fyp', '#viral', '#trending', '#tiktok', '#explore'];
  if (platform === 'instagram') return ['#instagood', '#photooftheday', '#fashion', '#beautiful', '#happy'];
  if (platform === 'youtube') return ['#youtube', '#subscribe', '#like', '#youtuber', '#video'];
  return ['#social', '#media', '#content'];
}

/**
 * Get cached or fresh trending hashtags for a platform.
 */
export async function getTrendingHashtags(platform: string): Promise<string[]> {
  const now = Date.now();
  const cached = trendingHashtagCache[platform];
  if (cached && now - cached.timestamp < TRENDING_CACHE_TTL) {
    return cached.hashtags;
  }
  const hashtags = await fetchTrendingHashtags(platform);
  trendingHashtagCache[platform] = { hashtags, timestamp: now };
  return hashtags;
}

/**
 * Analyzes a list of captions or content strings and returns the top N hashtags by frequency,
 * merged with trending hashtags for the platform, deduplicated and prioritized.
 * @param contents Array of strings (e.g., captions)
 * @param platform Social platform (e.g., 'tiktok', 'instagram', 'youtube')
 * @param topN Number of top hashtags to return
 */
export async function analyzeHashtagsWithTrends(contents: string[], platform: string, topN: number = 5): Promise<string[]> {
  const freqTags = analyzeHashtags(contents, topN * 2); // Get more for merging
  const trending = await getTrendingHashtags(platform);
  // Merge, prioritize by frequency, then trending, then dedupe
  const all = [...freqTags, ...trending];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of all) {
    const norm = tag.toLowerCase();
    if (!seen.has(norm) && tag.length > 1) {
      seen.add(norm);
      result.push(tag);
    }
    if (result.length >= topN) break;
  }
  return result;
}
