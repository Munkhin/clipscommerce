// difficult
// AI Hook Generation Service: GPT-4 Turbo, spaCy, validation, Redis caching
import { RedisClientType } from 'redis';

// Utility for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

export class HookGenerationService {
  private redis: RedisClientType;
  private vectorDB: any; // e.g. Pinecone or similar
  constructor(redisClient: RedisClientType, vectorDB: any) {
    this.redis = redisClient;
    this.vectorDB = vectorDB;
  }

  /**
   * Generate viral hooks for a given topic using GPT-4 and validate them.
   * @param topic The content topic
   * @param gptClient An API client for GPT-4 Turbo
   * @param spacyClient An API client for spaCy
   */
  async generateHooks(topic: string, gptClient: any, spacyClient: any): Promise<string[]> {
    try {
      // Check cache first
      const cached = await this.redis.get(`hooks:${topic}`);
      if (cached) return JSON.parse(cached);

      // Prompt engineering
      const prompt = `Generate 5 hooks for a post about ${topic}. Use:\n- Curiosity gap structure (\"Discover the secret to...\")\n- Numbers (\"3 Ways to...\")\n- Urgency (\"Don’t miss this...\")`;
      const hooks: string[] = await gptClient.generate(prompt);

      // Syntactic validation with spaCy (ensure hooks are grammatically correct, not empty, etc)
      const syntacticValid = await Promise.all(
        hooks.map(async (hook) => {
          const analysis = await spacyClient.analyze(hook);
          return analysis.is_valid ? hook : null;
        })
      );
      const filteredHooks = syntacticValid.filter(h => !!h) as string[];

      // Semantic validation: reject hooks too similar to historical top hooks
      const validHooks = await this.validateHooks(filteredHooks);

      // Cache in Redis for 24h
      await this.redis.set(`hooks:${topic}`, JSON.stringify(validHooks), { EX: 86400 });
      return validHooks;
    } catch (err) {
      console.error('HookGenerationService error:', err);
      throw new Error('Failed to generate hooks');
    }
  }

  /**
   * Validate hooks by comparing with historical top hooks using cosine similarity.
   * Reject hooks with >70% similarity.
   */
  async validateHooks(hooks: string[]): Promise<string[]> {
    try {
      // Fetch top-performing historical hooks' embeddings from vector DB
      const historical = await this.vectorDB.getTopHookEmbeddings(); // [{embedding: number[]}, ...]
      const threshold = 0.7;
      const valid: string[] = [];
      for (const hook of hooks) {
        // Get embedding for this hook (using vectorDB or embedding API)
        const hookEmbedding: number[] = await this.vectorDB.embed(hook);
        // Compare with all historical embeddings
        let isSimilar = false;
        for (const hist of historical) {
          const sim = cosineSimilarity(hookEmbedding, hist.embedding);
          if (sim > threshold) {
            isSimilar = true;
            break;
          }
        }
        if (!isSimilar) valid.push(hook);
      }
      return valid;
    } catch (err) {
      console.error('validateHooks error:', err);
      return hooks; // fallback: return all
    }
  }
}
