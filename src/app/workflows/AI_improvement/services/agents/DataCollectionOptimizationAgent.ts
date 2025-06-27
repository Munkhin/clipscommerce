import { Platform } from '../../../deliverables/types/deliverables_types'; // Updated import path

export interface Niche {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  // Potentially add target platforms for this niche if a niche isn't for all platforms
}

// Added EngagementStats interface
export interface EngagementStats {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

// Added DataSample interface
export interface DataSample {
  id: string; // From rawData
  platform: Platform;
  nicheId: string;
  contentUrl: string; // From rawData
  uploader?: string; // From rawData
  caption?: string; // From rawData
  timestamp: Date; // From rawData, e.g., createdAt
  engagementStats?: EngagementStats; // From rawData
  metadataCompletenessScore: number; // 0-1
  isRelevantToNiche: boolean; // Placeholder
  isRecent: boolean; // Based on timestamp
  overallQualityScore: number; // 0-100
}

const MIN_QUALITY_SCORE = 95; // Target quality score > 95%
const RECENCY_THRESHOLD_DAYS = 7;

export class DataCollectionOptimizationAgent {
  private niches: Niche[] = [];
  private sampleCounts: Map<Platform, Map<string, number>>; // Platform -> NicheId -> Count
  private collectedSamples: DataSample[] = []; // Store for accepted samples
  private nicheQualityStats: Map<Platform, Map<string, { totalScoreSum: number; acceptedSamplesCount: number }>>;

  constructor() {
    this.sampleCounts = new Map();
    this.nicheQualityStats = new Map();

    for (const platform of Object.values(Platform)) {
      const platformKey = platform as Platform;
      this.sampleCounts.set(platformKey, new Map<string, number>());
      this.nicheQualityStats.set(platformKey, new Map<string, { totalScoreSum: number; acceptedSamplesCount: number }>());
    }
  }

  public addNiche(niche: Niche): void {
    if (this.niches.find(n => n.id === niche.id)) {
      console.warn('Niche with id ' + niche.id + ' already exists.');
      return;
    }
    this.niches.push(niche);
    for (const platform of Object.values(Platform)) {
      const platformKey = platform as Platform;
      // Initialize sample count
      if (!this.sampleCounts.has(platformKey)) {
        this.sampleCounts.set(platformKey, new Map<string, number>());
      }
      this.sampleCounts.get(platformKey)?.set(niche.id, 0);

      // Initialize quality stats
      if (!this.nicheQualityStats.has(platformKey)) {
        this.nicheQualityStats.set(platformKey, new Map<string, { totalScoreSum: number; acceptedSamplesCount: number }>());
      }
      this.nicheQualityStats.get(platformKey)?.set(niche.id, { totalScoreSum: 0, acceptedSamplesCount: 0 });
    }
    console.log('Niche ' + niche.name + ' added and initialized for all platforms.');
  }

  public getNicheById(nicheId: string): Niche | undefined {
    return this.niches.find(n => n.id === nicheId);
  }

  public getAllNiches(): Niche[] {
    return this.niches;
  }

  public incrementSampleCount(platform: Platform, nicheId: string, incrementBy: number = 1): void {
    if (!this.niches.find(n => n.id === nicheId)) {
      console.error('Cannot increment count: Niche with id ' + nicheId + ' does not exist.');
      return;
    }
    const platformCounts = this.sampleCounts.get(platform);
    if (platformCounts) {
      const currentCount = platformCounts.get(nicheId) || 0;
      platformCounts.set(nicheId, currentCount + incrementBy);
    } else {
      console.error('Platform ' + platform + ' not initialized in sampleCounts.');
    }
  }

  public getSampleCount(platform: Platform, nicheId: string): number {
    const platformCounts = this.sampleCounts.get(platform);
    if (platformCounts) {
      return platformCounts.get(nicheId) || 0;
    }
    return 0;
  }

  public getOverallSampleCounts(): Array<{ platform: Platform; nicheId: string; nicheName: string, count: number }> {
    const counts: Array<{ platform: Platform; nicheId: string; nicheName: string, count: number }> = [];
    this.sampleCounts.forEach((nicheMap, platform) => {
      nicheMap.forEach((count, nicheId) => {
        const niche = this.getNicheById(nicheId);
        counts.push({ platform, nicheId, nicheName: niche?.name || 'Unknown Niche', count });
      });
    });
    return counts;
  }

  // Raw data is expected to have fields like: id, url, authorName, text, createdAt, views, likes, comments etc.
  public addSample(rawData: any, platform: Platform, nicheId: string): DataSample | null {
    const niche = this.getNicheById(nicheId);
    if (!niche) {
      console.error('Cannot add sample: Niche with id ' + nicheId + ' does not exist.');
      return null;
    }

    const criticalMetadataFields = ['id', 'contentUrl', 'timestamp']; // Define critical fields
    let presentCriticalFields = 0;

    const sampleId = rawData.id || 'gen_' + Date.now(); // Ensure an ID
    const contentUrl = rawData.contentUrl || rawData.url;
    const timestamp = rawData.timestamp || rawData.createdAt ? new Date(rawData.timestamp || rawData.createdAt) : new Date();

    if (sampleId) presentCriticalFields++;
    if (contentUrl) presentCriticalFields++;
    if (rawData.timestamp || rawData.createdAt) presentCriticalFields++; // Count timestamp as present if source field exists

    // Optional fields for completeness, can be weighted differently if needed.
    // if (rawData.uploader || rawData.authorName) presentCriticalFields++;
    // if (rawData.caption || rawData.text) presentCriticalFields++;
    // if (rawData.engagementStats && Object.keys(rawData.engagementStats).length > 0) presentCriticalFields++;

    const metadataCompletenessScore = criticalMetadataFields.length > 0 ? presentCriticalFields / criticalMetadataFields.length : 1;

    const now = new Date();
    const recencyLimit = new Date(now.setDate(now.getDate() - RECENCY_THRESHOLD_DAYS));
    const isRecent = timestamp >= recencyLimit;

    const isRelevantToNiche = true; // Placeholder for now

    // Calculate overall quality score (weights: metadata 60%, relevance 20%, recency 20%)
    const overallQualityScore =
      (metadataCompletenessScore * 0.6 +
      (isRelevantToNiche ? 0.2 : 0) +
      (isRecent ? 0.2 : 0)) * 100;

    const newSample: DataSample = {
      id: sampleId,
      platform,
      nicheId,
      contentUrl,
      uploader: rawData.uploader || rawData.authorName,
      caption: rawData.caption || rawData.text,
      timestamp,
      engagementStats: rawData.engagementStats || {
        views: rawData.views,
        likes: rawData.likes,
        comments: rawData.comments,
        shares: rawData.shares,
        saves: rawData.saves,
      },
      metadataCompletenessScore,
      isRelevantToNiche,
      isRecent,
      overallQualityScore,
    };

    if (overallQualityScore >= MIN_QUALITY_SCORE) {
      this.collectedSamples.push(newSample);
      this.incrementSampleCount(platform, nicheId);

      const qualityStatsMap = this.nicheQualityStats.get(platform);
      if (qualityStatsMap) {
        const currentStats = qualityStatsMap.get(nicheId) || { totalScoreSum: 0, acceptedSamplesCount: 0 };
        currentStats.totalScoreSum += overallQualityScore;
        currentStats.acceptedSamplesCount++;
        qualityStatsMap.set(nicheId, currentStats);
      }
      // console.log('Sample ' + newSample.id + ' added for niche ' + nicheId + ' with quality ' + overallQualityScore.toFixed(2) + '.');
      return newSample;
    } else {
      // console.log('Sample ' + newSample.id + ' for niche ' + nicheId + ' rejected. Quality: ' + overallQualityScore.toFixed(2) + ' (Min: ' + MIN_QUALITY_SCORE + ')');
      return null;
    }
  }

  public getAverageQualityScore(platform: Platform, nicheId: string): number {
    const qualityStatsMap = this.nicheQualityStats.get(platform);
    if (qualityStatsMap) {
      const stats = qualityStatsMap.get(nicheId);
      if (stats && stats.acceptedSamplesCount > 0) {
        return stats.totalScoreSum / stats.acceptedSamplesCount;
      }
    }
    return 0;
  }
  
  public getCollectedSamples(): DataSample[] {
    return this.collectedSamples;
  }

  // Further methods for data collection strategies, API optimization, and content discovery will be added here
  // based on the data_collection_optimization_plan.md
}

// Example Usage (for testing purposes, would be removed or refactored)
/*
const agent = new DataCollectionOptimizationAgent();

const comedyNiche: Niche = {
  id: "comedy-skits-001",
  name: "Comedy Skits",
  description: "Short funny videos and skits.",
  keywords: ["comedy", "funny", "skit", "lol"]
};
agent.addNiche(comedyNiche);

const diyNiche: Niche = {
  id: "diy-crafts-002",
  name: "DIY Crafts",
  description: "Do-it-yourself crafting projects and tutorials.",
  keywords: ["diy", "crafts", "handmade", "tutorial"]
};
agent.addNiche(diyNiche);

// Good sample
agent.addSample(
  {
    id: 'tiktok123',
    contentUrl: 'http://tiktok.com/vid1',
    authorName: 'FunnyGuy',
    text: 'Hilarious new skit!',
    createdAt: new Date(), // Recent
    views: 10000,
    likes: 1000
  },
  Platform.TikTok,
  comedyNiche.id
);

// Sample that might be too old or incomplete
agent.addSample(
  {
    id: 'insta456',
    contentUrl: 'http://instagram.com/post2',
    // Missing authorName or text
    createdAt: new Date('2023-01-01'), // Old
    likes: 50
  },
  Platform.Instagram,
  comedyNiche.id
);

// Sample with just enough to pass (assuming default relevance)
agent.addSample(
  {
    id: 'tiktok789',
    contentUrl: 'http://tiktok.com/vid3',
    createdAt: new Date(), // Recent
    // No uploader, caption, or specific engagement stats, but contentUrl and timestamp are critical
  },
  Platform.TikTok,
  diyNiche.id
);


console.log('Overall Sample Counts:', agent.getOverallSampleCounts());
console.log('Collected Samples Count:', agent.getCollectedSamples().length);
agent.getCollectedSamples().forEach(s => {
  console.log('  Sample: ' + s.id + ', Platform: ' + s.platform + ', Niche: ' + s.nicheId + ', Quality: ' + s.overallQualityScore.toFixed(2));
});

console.log('Avg Quality for Comedy on TikTok: ' + agent.getAverageQualityScore(Platform.TikTok, comedyNiche.id).toFixed(2));
console.log('Avg Quality for DIY on TikTok: ' + agent.getAverageQualityScore(Platform.TikTok, diyNiche.id).toFixed(2));
*/ 