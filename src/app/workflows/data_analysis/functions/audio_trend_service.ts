// difficult
// Audio Trend Detection Service: TikTok API, Librosa, CNN, Shazam
import { Sound, AudioClient, LibrosaClient, CNNModel, ShazamClient, PlatformSchema, AudioClientTrendingSoundsResponseSchema } from '../types/audio';
import { CacheService } from '../utils/cacheService'; // Added CacheService import
import { DEFAULT_CONFIG } from '../config'; // Added DEFAULT_CONFIG import

/**
 * Service for analyzing and filtering trending audio for content acceleration.
 * Implements TikTok trending fetch, BPM analysis, mood classification, copyright check.
 * Each analysis step is modular and robustly logged for maintainability.
 */
export class AudioTrendService {
  private _cachedGetTrendingAudio: (
    platform: string,
    tiktokClient: AudioClient,
    librosa: LibrosaClient,
    cnnModel: CNNModel,
    shazamClient: ShazamClient
  ) => Promise<Sound[]>;

  constructor() {
    // Note: If client instances (tiktokClient, etc.) have state that affects outcomes
    // and isn't captured by simple stringification, the cache key might not be unique enough.
    // For now, assuming platform is the primary differentiator for cache.
    const methodToCache = (
      platform: string,
      tiktokClient: AudioClient,
      librosa: LibrosaClient,
      cnnModel: CNNModel,
      shazamClient: ShazamClient
    ): Promise<Sound[]> => {
      return this._getTrendingAudioUncached(platform, tiktokClient, librosa, cnnModel, shazamClient);
    };

    this._cachedGetTrendingAudio = CacheService.withCache(
      methodToCache,
      'audioTrend:getTrendingAudio',
      DEFAULT_CONFIG.CACHE_TTL.TRENDING_AUDIO / 1000 // Convert ms to seconds
    ) as typeof methodToCache;
  }
  /**
   * Get trending audio for a platform, filter by velocity, analyze BPM/mood, and check copyright.
   * @param platform TikTok, Instagram, etc.
   * @param tiktokClient TikTok API client
   * @param librosa Librosa audio analysis client
   * @param cnnModel CNN model for mood classification
   * @param shazamClient Shazam API client
   * @returns Promise with array of filtered and analyzed audio tracks
   */
  async getTrendingAudio(
    platform: string,
    tiktokClient: AudioClient,
    librosa: LibrosaClient,
    cnnModel: CNNModel,
    shazamClient: ShazamClient
  ): Promise<Sound[]> {
    return this._cachedGetTrendingAudio(platform, tiktokClient, librosa, cnnModel, shazamClient);
  }

  private async _getTrendingAudioUncached(
    platform: string,
    tiktokClient: AudioClient,
    librosa: LibrosaClient,
    cnnModel: CNNModel,
    shazamClient: ShazamClient
  ): Promise<Sound[]> {
    const platformValidation = PlatformSchema.safeParse(platform);
    if (!platformValidation.success) {
      console.error(`[AudioTrendService] Invalid platform input: ${platform}`, platformValidation.error.flatten());
      return []; // Or throw error
    }
    const validatedPlatform = platformValidation.data;

    try {
      // Step 1: Get trending sounds from TikTok API
      const rawTrending = await tiktokClient.getTrendingSounds(validatedPlatform); // [{sound_id, url, velocity, ...}]
      console.log(`[AudioTrendService] Fetched ${rawTrending.length} trending sounds for ${validatedPlatform}`);

      const trendingValidation = AudioClientTrendingSoundsResponseSchema.safeParse(rawTrending);
      if (!trendingValidation.success) {
        console.error(`[AudioTrendService] Invalid data structure from tiktokClient.getTrendingSounds for platform ${validatedPlatform}:`, trendingValidation.error.flatten());
        return []; // Or throw error
      }
      const trending = trendingValidation.data;
      // Step 2: Filter for velocity > 15% daily growth
      const fastGrowing = trending.filter((sound: Sound) => sound.velocity > 0.15);
      console.log(`[AudioTrendService] ${fastGrowing.length} sounds are growing >15% daily`);
      // Step 3: Analyze BPM, mood, and copyright for each sound
      const results = await Promise.all(fastGrowing.map(async (sound: Sound) => {
        let bpm = null, mood = null, isCopyrightSafe = false;
        try {
          bpm = await this.analyzeBPM(sound.url, librosa, sound.sound_id);
          mood = await this.analyzeMood(sound.url, cnnModel, sound.sound_id);
          isCopyrightSafe = await this.checkCopyright(sound.url, shazamClient, sound.sound_id);
        } catch (err) {
          console.error(`[AudioTrendService] Analysis error for sound ${sound.sound_id}:`, err);
        }
        return { ...sound, bpm, mood, isCopyrightSafe };
      }));
      // Only return copyright-safe sounds
      const safeResults = results.filter(r => r.isCopyrightSafe);
      console.log(`[AudioTrendService] Returning ${safeResults.length} copyright-safe sounds`);
      return safeResults;
    } catch (err) {
      console.error('[AudioTrendService] Failed to get trending audio:', err);
      return [];
    }
  }

  /**
   * Analyze BPM for a sound URL.
   */
  private async analyzeBPM(url: string, librosa: any, soundId: string): Promise<number|null> {
    try {
      const bpm = await librosa.getBPM(url);
      console.log(`[AudioTrendService] BPM for sound ${soundId}:`, bpm);
      return bpm;
    } catch (err) {
      console.error(`[AudioTrendService] BPM analysis failed for sound ${soundId}:`, err);
      return null;
    }
  }

  /**
   * Analyze mood for a sound URL.
   */
  private async analyzeMood(url: string, cnnModel: any, soundId: string): Promise<string|null> {
    try {
      const mood = await cnnModel.classifyMood(url);
      console.log(`[AudioTrendService] Mood for sound ${soundId}:`, mood);
      return mood;
    } catch (err) {
      console.error(`[AudioTrendService] Mood analysis failed for sound ${soundId}:`, err);
      return null;
    }
  }

  /**
   * Check copyright for a sound URL using Shazam.
   */
  private async checkCopyright(url: string, shazamClient: any, soundId: string): Promise<boolean> {
    try {
      const shazamResult = await shazamClient.checkCopyright(url);
      const isSafe = shazamResult && shazamResult.status === 'clear';
      if (!isSafe) {
        console.warn(`[AudioTrendService] Copyright risk for sound ${soundId}`);
      }
      return isSafe;
    } catch (err) {
      console.error(`[AudioTrendService] Copyright check failed for sound ${soundId}:`, err);
      return false;
    }
  }
}
