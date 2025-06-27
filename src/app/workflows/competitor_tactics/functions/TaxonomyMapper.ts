import type { TacticExtractionResult } from './TacticExtractor';

export interface TaxonomyMapResult {
  hookTaxonomy: Record<string, string[]>;
  ctaTaxonomy: Record<string, string[]>;
  formatTaxonomy: Record<string, string[]>;
}

export class TaxonomyMapper {
  mapToTaxonomy(result: TacticExtractionResult): TaxonomyMapResult {
    // Example: group hooks by first word, CTAs by action, formats by type
    const hookTaxonomy: Record<string, string[]> = {};
    for (const hook of result.hooks) {
      const key = hook.split(' ')[0].toLowerCase();
      if (!hookTaxonomy[key]) hookTaxonomy[key] = [];
      hookTaxonomy[key].push(hook);
    }
    const ctaTaxonomy: Record<string, string[]> = {};
    for (const cta of result.ctas) {
      const key = cta.split(' ')[0].toLowerCase();
      if (!ctaTaxonomy[key]) ctaTaxonomy[key] = [];
      ctaTaxonomy[key].push(cta);
    }
    const formatTaxonomy: Record<string, string[]> = {};
    for (const format of result.formats) {
      const key = format.toLowerCase();
      if (!formatTaxonomy[key]) formatTaxonomy[key] = [];
      formatTaxonomy[key].push(format);
    }
    return { hookTaxonomy, ctaTaxonomy, formatTaxonomy };
  }
} 