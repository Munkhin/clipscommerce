import type { Request, Response } from 'express';
import { LlmWrapper } from './functions/LlmWrapper';
import { ProductToTemplateTransformer } from './functions/ProductToTemplateTransformer';
import { BatchProcessor } from './functions/BatchProcessor';
import { validateTemplates } from './functions/validateTemplates';
import { CrossModuleSync } from './functions/CrossModuleSync';

/**
 * POST /generate-templates
 * Body: { description: string, platform: string }
 * Returns: ContentTemplateBatch
 */
export const generateTemplatesHandler = async (req: Request, res: Response) => {
  const { description, platform } = req.body;
  const llm = new LlmWrapper('api-key');
  const transformer = new ProductToTemplateTransformer(llm);
  const result = await transformer.transform(description, platform);
  res.json(result);
};

/**
 * POST /process-batch
 * Body: { descriptions: string[], platform: string }
 * Returns: ContentTemplateBatch[]
 */
export const processBatchHandler = async (req: Request, res: Response) => {
  const { descriptions, platform } = req.body;
  const llm = new LlmWrapper('api-key');
  const transformer = new ProductToTemplateTransformer(llm);
  const processor = new BatchProcessor(transformer);
  const result = await processor.processBatch(descriptions, platform);
  res.json(result);
};

/**
 * POST /validate-templates
 * Body: { batches: ContentTemplateBatch[] }
 * Returns: ValidationError[]
 */
export const validateTemplatesHandler = (req: Request, res: Response) => {
  const { batches } = req.body;
  const errors = validateTemplates(batches);
  res.json(errors);
};

/**
 * POST /cross-module-sync
 * Body: { hooks: string[], templates: { hook: string }[] }
 * Returns: { promptContext: string, comparison: any[] }
 */
export const crossModuleSyncHandler = (req: Request, res: Response) => {
  const { hooks, templates } = req.body;
  const promptContext = CrossModuleSync.feedCompetitorTacticsToPrompt(hooks);
  const comparison = CrossModuleSync.compareTemplatesWithTactics(templates, hooks);
  res.json({ promptContext, comparison });
}; 