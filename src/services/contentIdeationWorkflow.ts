import { generateContent, GenerateContentResponse } from './contentGeneration';
import { getCompetitorTactics } from './competitorTactics';
import { Platform } from '../app/workflows/deliverables/types/deliverables_types';
import { v4 as uuidv4 } from 'uuid';

interface IdeationContentDetails {
  content: string;
  qualityScore: number;
  engagementScore: number;
  originalityScore: number;
  platformOptimization: ContentOptimization; // Or a more specific type if needed
}

interface IdeationRequest {
  workflowId?: string;
  platform: Platform;
  baseCaption: string;
  hashtags?: string[];
  targetAudience?: string;
  competitorHandle?: string;
  lookbackDays?: number;
}

interface IdeationResult {
  requestId: string;
  ideation: GenerateContentResponse;
  tactics?: Awaited<ReturnType<typeof getCompetitorTactics>>;
  noveltyScore: number; // 0-1
  contentDetails: IdeationContentDetails;
}

export class ContentIdeationWorkflow {
  constructor(private concurrency = 10) {}

  async executeBulk(requests: IdeationRequest[]): Promise<IdeationResult[]> {
    const results: IdeationResult[] = [];
    const queue = [...requests];

    const workers = Array.from({ length: this.concurrency }, () =>
      this.worker(queue, results),
    );
    await Promise.all(workers);
    // Rank by noveltyScore descending and keep top 1000
    return results
      .sort((a, b) => b.noveltyScore - a.noveltyScore)
      .slice(0, 1000);
  }

  private async worker(queue: IdeationRequest[], sink: IdeationResult[]): Promise<void> {
    while (true) {
      const req = queue.shift();
      if (!req) break;
      const requestId = req.workflowId ?? uuidv4();

      const ideation = await generateContent({
        caption: req.baseCaption,
        hashtags: req.hashtags,
        platform: req.platform,
        targetAudience: req.targetAudience,
      });

      const tactics = req.competitorHandle
        ? await getCompetitorTactics({
            platform: req.platform,
            usernameOrId: req.competitorHandle,
            lookbackDays: req.lookbackDays ?? 30,
          })
        : undefined;

      const noveltyScore = this.calculateNovelty(ideation.optimization.improvements, tactics);

      // Extract content details from ideation
      const contentDetails: IdeationContentDetails = {
        content: ideation.optimization.optimizedText || ideation.captions[0]?.variation || req.baseCaption,
        qualityScore: this.calculateQualityScore(ideation),
        engagementScore: ideation.optimization.expectedEngagementIncrease || 0,
        originalityScore: this.calculateOriginalityScore(ideation, tactics),
        platformOptimization: ideation.optimization,
      };

      sink.push({ requestId, ideation, tactics, noveltyScore, contentDetails });
    }
  }

  private calculateNovelty(improvements: string[], tactics?: any): number {
    // Simple heuristic: proportion of improvements not seen in competitor tactics
    if (!tactics) return 1;
    const tacticTexts = JSON.stringify(tactics);
    const novel = improvements.filter((i) => !tacticTexts.includes(i)).length;
    return novel / improvements.length;
  }

  private calculateQualityScore(ideation: GenerateContentResponse): number {
    // Placeholder for quality score calculation
    // This would ideally involve more sophisticated NLP or a trained model
    const engagement = ideation.optimization.expectedEngagementIncrease || 0;
    const clarity = ideation.optimization.improvements.includes('clarity') ? 0.2 : 0;
    return Math.min(1, Math.max(0, 0.5 + engagement * 0.3 + clarity * 0.2));
  }

  private calculateOriginalityScore(ideation: GenerateContentResponse, tactics?: any): number {
    // Placeholder for originality score calculation
    // This could involve comparing generated content against a database of common content or competitor tactics
    const noveltyFromTactics = this.calculateNovelty(ideation.optimization.improvements, tactics);
    const captionLengthScore = ideation.captions[0] ? Math.min(1, ideation.captions[0].variation.length / 150) : 0;
    return Math.min(1, Math.max(0, noveltyFromTactics * 0.7 + captionLengthScore * 0.3));
  }
} 