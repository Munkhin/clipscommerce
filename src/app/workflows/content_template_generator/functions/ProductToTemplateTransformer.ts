import { LlmWrapper } from './LlmWrapper';
import type { ContentTemplateBatch } from './schema';

export class ProductToTemplateTransformer {
  constructor(private llm: LlmWrapper) {}

  async transform(description: string, platform: string): Promise<ContentTemplateBatch> {
    const templates = [];
    for await (const template of this.llm.generateTemplates(description, platform)) {
      templates.push(template);
    }
    return {
      templates,
      productDescription: description,
      platform,
    };
  }
} 