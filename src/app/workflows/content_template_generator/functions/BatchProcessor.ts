import { ProductToTemplateTransformer } from './ProductToTemplateTransformer';
import type { ContentTemplateBatch } from './schema';

export class BatchProcessor {
  constructor(private transformer: ProductToTemplateTransformer) {}

  async processBatch(descriptions: string[], platform: string): Promise<ContentTemplateBatch[]> {
    const results: ContentTemplateBatch[] = [];
    for (const desc of descriptions) {
      results.push(await this.transformer.transform(desc, platform));
    }
    return results;
  }
} 