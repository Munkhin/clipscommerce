// TextSummaryEngine.ts
import { HfInference } from '@huggingface/inference';

/**
 * Summarizes text using an open-source model (BART or T5) via Hugging Face Inference API.
 */
export class TextSummaryEngine {
  private hf: HfInference;
  private model: string;

  constructor(apiKey: string, model: 'facebook/bart-large-cnn' | 't5-base' = 'facebook/bart-large-cnn') {
    this.hf = new HfInference(apiKey);
    this.model = model;
  }

  /**
   * Summarizes the input text using the selected model.
   * @param text - The text to summarize.
   * @param minLength - Minimum summary length.
   * @param maxLength - Maximum summary length.
   */
  async summarizeText(text: string, minLength = 30, maxLength = 120): Promise<string> {
    const result = await this.hf.summarization({
      model: this.model,
      inputs: text,
      parameters: { min_length: minLength, max_length: maxLength },
    });
    // @huggingface/inference returns { summary_text: string }
    if (Array.isArray(result)) {
      return result[0]?.summary_text || '';
    }
    return (result as any)?.summary_text || '';
  }
} 