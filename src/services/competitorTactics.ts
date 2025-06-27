import { Platform } from '../app/workflows/deliverables/types/deliverables_types';
import { CompetitorApiIntegrator } from '../app/workflows/competitor_tactics/functions/CompetitorApiIntegrator';
import { TacticExtractor } from '../app/workflows/competitor_tactics/functions/TacticExtractor';
import { TaxonomyMapper } from '../app/workflows/competitor_tactics/functions/TaxonomyMapper';
import { TacticMap } from '../app/workflows/competitor_tactics/functions/TacticMap';

interface CompetitorTacticsRequest {
  platform: Platform;
  usernameOrId: string; // Competitor username or user ID on the platform
  lookbackDays?: number;
}

export const getCompetitorTactics = async (
  request: CompetitorTacticsRequest,
): Promise<{
  extractionResult: ReturnType<TacticExtractor['extractTactics']>;
  taxonomy: ReturnType<TaxonomyMapper['mapToTaxonomy']>;
  tacticMap: ReturnType<TacticMap['generateMap']>;
}> => {
  const { platform, usernameOrId, lookbackDays = 30 } = request;

  // NOTE: In a production environment tokens should come from a secure vault / env vars.
  const integrator = new CompetitorApiIntegrator({
    tiktokToken: process.env.TIKTOK_TOKEN || '',
    instagramToken: process.env.INSTAGRAM_TOKEN || '',
    youtubeToken: process.env.YOUTUBE_TOKEN || '',
  });

  const rawPosts = await integrator.fetchCompetitorPosts(platform, usernameOrId, lookbackDays);
  const postsArray = Array.isArray(rawPosts) ? rawPosts : rawPosts.data;

  const extractor = new TacticExtractor();
  const extractionResult = extractor.extractTactics(postsArray as any);

  const mapper = new TaxonomyMapper();
  const taxonomy = mapper.mapToTaxonomy(extractionResult);

  const tacticMapGenerator = new TacticMap();
  const tacticMap = tacticMapGenerator.generateMap(taxonomy);

  return { extractionResult, taxonomy, tacticMap };
}; 