export interface ContentTemplate {
  hook: string;
  script: string;
  visuals: string;
  audio: string;
}

export class LlmWrapper {
  // Placeholder for OpenAI API key/config
  constructor(private apiKey: string) {}

  async *generateTemplates(
    description: string,
    platform: string,
    count: number = 5
  ): AsyncGenerator<ContentTemplate, void, unknown> {
    // Simulate streaming generation
    for (let i = 0; i < count; i++) {
      yield {
        hook: `Hook for ${description} [${i + 1}]`,
        script: `Script for ${description} on ${platform} [${i + 1}]`,
        visuals: `Visuals for ${description} [${i + 1}]`,
        audio: `Audio for ${description} [${i + 1}]`,
      };
      await new Promise((r) => setTimeout(r, 200)); // Simulate delay
    }
  }
} 