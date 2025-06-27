import type { Request, Response } from 'express';
import { TacticExtractor } from './functions/TacticExtractor';
import { TaxonomyMapper } from './functions/TaxonomyMapper';
import { TacticMap } from './functions/TacticMap';

/**
 * POST /extract-tactics
 * Body: { posts: PostMetrics[] }
 * Returns: TacticExtractionResult
 */
export const extractTacticsHandler = (req: Request, res: Response) => {
  const { posts } = req.body;
  const extractor = new TacticExtractor();
  const result = extractor.extractTactics(posts);
  res.json(result);
};

/**
 * POST /map-taxonomy
 * Body: { tactics: TacticExtractionResult }
 * Returns: TaxonomyMapResult
 */
export const mapTaxonomyHandler = (req: Request, res: Response) => {
  const { tactics } = req.body;
  const mapper = new TaxonomyMapper();
  const result = mapper.mapToTaxonomy(tactics);
  res.json(result);
};

/**
 * POST /generate-tactic-map
 * Body: { taxonomy: TaxonomyMapResult }
 * Returns: TacticMapData
 */
export const generateTacticMapHandler = (req: Request, res: Response) => {
  const { taxonomy } = req.body;
  const map = new TacticMap();
  const result = map.generateMap(taxonomy);
  res.json(result);
}; 