// Storage & Caching Service: Pinecone, Redis
import { RedisClientType } from 'redis';

export class StorageService {
  constructor(private redis: RedisClientType, private pinecone: any) {}

  /**
   * Cache trending audio info in Redis
   */
  async cacheTrendingAudio(platform: string, soundId: string, velocity: number, mood: string, bpm: number): Promise<void> {
    try {
      await this.redis.hSet(`trending_audio:${platform}`, soundId, `${velocity}:${mood}:${bpm}`);
    } catch (err) {
      console.error('StorageService cacheTrendingAudio error:', err);
    }
  }

  /**
   * Cache user hooks in Redis sorted set by virality score
   */
  async cacheHook(userId: string, hookText: string, viralityScore: number): Promise<void> {
    try {
      await this.redis.zAdd(`user:${userId}:hooks`, { score: viralityScore, value: hookText });
    } catch (err) {
      console.error('StorageService cacheHook error:', err);
    }
  }

  /**
   * Store embeddings in Pinecone vector DB
   */
  async storeEmbedding(hookEmbedding: any, audioEmbedding: any, viralityScore: number): Promise<void> {
    try {
      await this.pinecone.upsert({ hookEmbedding, audioEmbedding, viralityScore });
    } catch (err) {
      console.error('StorageService storeEmbedding error:', err);
    }
  }
}
