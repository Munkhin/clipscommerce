// SEMrush API Client
type SEMRushKeyword = {
  keyword: string;
  search_volume: number;
  trend_velocity: number;
};

export class SEMRushClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.semrush.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get trending keywords related to the input text
   * @param text Input text to find related keywords for
   * @returns Array of trending keywords with search volume and trend data
   */
  async getTrendingKeywords(text: string): Promise<SEMRushKeyword[]> {
    try {
      // In a real implementation, this would make an API call to SEMrush
      // For now, we'll return mock data
      console.log(`[SEMRushClient] Getting trending keywords for text: ${text.substring(0, 50)}...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock response - in a real app, this would come from the SEMrush API
      const mockKeywords: SEMRushKeyword[] = [
        { keyword: 'social media scheduling', search_volume: 5400, trend_velocity: 0.8 },
        { keyword: 'best time to post', search_volume: 2400, trend_velocity: 0.6 },
        { keyword: 'content calendar', search_volume: 3600, trend_velocity: 0.7 },
        { keyword: 'social media analytics', search_volume: 2900, trend_velocity: 0.5 },
        { keyword: 'instagram scheduling', search_volume: 4400, trend_velocity: 0.9 },
      ];

      return mockKeywords;
    } catch (error) {
      console.error('[SEMRushClient] Error fetching trending keywords:', error);
      throw error;
    }
  }
}

// Export default instance with environment variable for API key
const apiKey = process.env.SEMRUSH_API_KEY || '';
export const semrushClient = new SEMRushClient(apiKey);
