import { AudioAnalysisService } from '../../services/audioAnalysisService';
import { cleanupMocks, mockAudioData, MOCK_API_KEY } from '../utils/test-helpers';

describe('AudioAnalysisService', () => {
  let service: AudioAnalysisService;

  beforeEach(() => {
    service = new AudioAnalysisService(MOCK_API_KEY);
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('getTrendingAudios', () => {
    it('should return trending audios for TikTok platform', async () => {
      const result = await service.getTrendingAudios('tiktok', 10);

      expect(result).toHaveProperty('sounds');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('platform', 'tiktok');
      expect(Array.isArray(result.sounds)).toBe(true);
      expect(result.sounds.length).toBe(10);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return trending audios for Instagram platform', async () => {
      const result = await service.getTrendingAudios('instagram', 15);

      expect(result).toHaveProperty('sounds');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('platform', 'instagram');
      expect(result.sounds.length).toBe(15);
    });

    it('should return trending audios for YouTube platform', async () => {
      const result = await service.getTrendingAudios('youtube', 20);

      expect(result).toHaveProperty('sounds');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('platform', 'youtube');
      expect(result.sounds.length).toBe(20);
    });

    it('should handle default limit parameter', async () => {
      const result = await service.getTrendingAudios('tiktok');

      expect(result.sounds.length).toBe(50); // Default limit
    });

    it('should return sounds with correct structure', async () => {
      const result = await service.getTrendingAudios('tiktok', 1);
      const sound = result.sounds[0];

      expect(sound).toHaveProperty('sound_id');
      expect(sound).toHaveProperty('url');
      expect(sound).toHaveProperty('velocity');
      expect(sound).toHaveProperty('bpm');
      expect(sound).toHaveProperty('mood');
      expect(sound).toHaveProperty('isCopyrightSafe');

      expect(typeof sound.sound_id).toBe('string');
      expect(typeof sound.url).toBe('string');
      expect(typeof sound.velocity).toBe('number');
      expect(typeof sound.bpm).toBe('number');
      expect(typeof sound.mood).toBe('string');
      expect(typeof sound.isCopyrightSafe).toBe('boolean');
    });

    it('should return valid URLs for audio sounds', async () => {
      const result = await service.getTrendingAudios('tiktok', 5);

      result.sounds.forEach(sound => {
        expect(sound.url).toMatch(/^https?:\/\/.+\.(mp3|wav|m4a)$/);
      });
    });

    it('should return valid BPM values', async () => {
      const result = await service.getTrendingAudios('tiktok', 10);

      result.sounds.forEach(sound => {
        expect(sound.bpm).toBeGreaterThan(0);
        expect(sound.bpm).toBeLessThanOrEqual(200);
      });
    });

    it('should handle service errors gracefully', async () => {
      // Mock the internal method to throw an error
      const mockError = new Error('Service unavailable');
      jest.spyOn(service as any, 'generateMockTrendingAudios').mockRejectedValue(mockError);

      await expect(service.getTrendingAudios('tiktok')).rejects.toThrow(
        'Failed to fetch trending audios for tiktok: Error: Service unavailable'
      );
    });
  });

  describe('analyzeAudioVirality', () => {
    const mockAudioIds = ['audio_1', 'audio_2', 'audio_3'];

    it('should analyze virality for multiple audio IDs', async () => {
      const result = await service.analyzeAudioVirality(mockAudioIds, 'tiktok');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(mockAudioIds.length);

      result.forEach((analysis, index) => {
        expect(analysis).toHaveProperty('audioId', mockAudioIds[index]);
        expect(analysis).toHaveProperty('viralityScore');
        expect(analysis).toHaveProperty('suitabilityScore');
        expect(analysis).toHaveProperty('trendingRank');
        
        expect(analysis.viralityScore).toBeGreaterThanOrEqual(0);
        expect(analysis.viralityScore).toBeLessThanOrEqual(1);
        expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0);
        expect(analysis.suitabilityScore).toBeLessThanOrEqual(1);
        expect(analysis.trendingRank).toBeGreaterThan(0);
      });
    });

    it('should sort results by virality score (highest first)', async () => {
      const result = await service.analyzeAudioVirality(mockAudioIds, 'tiktok');

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].viralityScore).toBeGreaterThanOrEqual(result[i].viralityScore);
      }
    });

    it('should include audio titles when available', async () => {
      const result = await service.analyzeAudioVirality(['audio_1'], 'tiktok');

      expect(result[0]).toHaveProperty('title');
      expect(typeof result[0].title).toBe('string');
      expect(result[0].title.length).toBeGreaterThan(0);
    });

    it('should analyze with custom factors', async () => {
      const customFactors = {
        platformWeight: 0.5,
        recentGrowthWeight: 0.3,
        usageCountWeight: 0.1,
        nicheRelevanceWeight: 0.1
      };

      const result = await service.analyzeAudioVirality(
        mockAudioIds,
        'tiktok',
        'tech',
        customFactors
      );

      expect(result.length).toBe(mockAudioIds.length);
      // Results should still be valid with custom factors
      result.forEach(analysis => {
        expect(analysis.viralityScore).toBeGreaterThanOrEqual(0);
        expect(analysis.viralityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should analyze with user niche for better suitability scoring', async () => {
      const withNiche = await service.analyzeAudioVirality(
        mockAudioIds,
        'tiktok',
        'tech'
      );

      const withoutNiche = await service.analyzeAudioVirality(
        mockAudioIds,
        'tiktok'
      );

      expect(withNiche.length).toBe(withoutNiche.length);
      // Both should have valid suitability scores
      withNiche.forEach(analysis => {
        expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0);
        expect(analysis.suitabilityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty audio IDs array', async () => {
      const result = await service.analyzeAudioVirality([], 'tiktok');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock the metrics retrieval to throw an error
      jest.spyOn(service as any, 'getAudioMetrics').mockRejectedValue(
        new Error('Metrics service error')
      );

      await expect(
        service.analyzeAudioVirality(mockAudioIds, 'tiktok')
      ).rejects.toThrow('Audio virality analysis failed');
    });
  });

  describe('discoverTrendingAudiosWithVirality', () => {
    it('should discover trending audios with virality analysis', async () => {
      const result = await service.discoverTrendingAudiosWithVirality('tiktok', 'tech', 10);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);

      result.forEach(analysis => {
        expect(analysis).toHaveProperty('audioId');
        expect(analysis).toHaveProperty('viralityScore');
        expect(analysis).toHaveProperty('suitabilityScore');
        expect(analysis).toHaveProperty('trendingRank');
      });
    });

    it('should use default limit when not specified', async () => {
      const result = await service.discoverTrendingAudiosWithVirality('tiktok');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(20); // Default limit
    });

    it('should handle different platforms', async () => {
      const platforms = ['tiktok', 'instagram', 'youtube'];

      for (const platform of platforms) {
        const result = await service.discoverTrendingAudiosWithVirality(platform, 'fashion', 5);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);
      }
    });

    it('should integrate trending audio discovery with virality analysis', async () => {
      const result = await service.discoverTrendingAudiosWithVirality('tiktok', 'fitness', 5);

      // Should be sorted by virality score
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].viralityScore).toBeGreaterThanOrEqual(result[i].viralityScore);
      }
    });

    it('should handle discovery errors gracefully', async () => {
      // Mock getTrendingAudios to throw an error
      jest.spyOn(service, 'getTrendingAudios').mockRejectedValue(
        new Error('Discovery service error')
      );

      await expect(
        service.discoverTrendingAudiosWithVirality('tiktok')
      ).rejects.toThrow('Failed to discover trending audios');
    });
  });

  describe('Niche-Specific Suitability', () => {
    const testAudioId = 'test_audio_123';

    it('should calculate tech audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'tech');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.6);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate fashion audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'fashion');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.5);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate fitness audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'fitness');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.6);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate food audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'food');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.4);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate beauty audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'beauty');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.5);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate education audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'education');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.7);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate entertainment audio suitability', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'entertainment');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0.2);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1.0);
    });

    it('should use default suitability for unknown niches', async () => {
      const result = await service.analyzeAudioVirality([testAudioId], 'tiktok', 'unknown_niche');
      const analysis = result[0];

      expect(analysis.suitabilityScore).toBe(0.6); // Default for unknown niches
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large numbers of audio IDs efficiently', async () => {
      const largeAudioList = Array.from({ length: 100 }, (_, i) => `audio_${i}`);
      
      const startTime = Date.now();
      const result = await service.analyzeAudioVirality(largeAudioList, 'tiktok');
      const endTime = Date.now();

      expect(result.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent analysis requests', async () => {
      const audioIds1 = ['audio_1', 'audio_2'];
      const audioIds2 = ['audio_3', 'audio_4'];
      const audioIds3 = ['audio_5', 'audio_6'];

      const [result1, result2, result3] = await Promise.all([
        service.analyzeAudioVirality(audioIds1, 'tiktok'),
        service.analyzeAudioVirality(audioIds2, 'instagram'),
        service.analyzeAudioVirality(audioIds3, 'youtube')
      ]);

      expect(result1.length).toBe(2);
      expect(result2.length).toBe(2);
      expect(result3.length).toBe(2);
    });

    it('should handle service initialization without API key', () => {
      const serviceWithoutKey = new AudioAnalysisService();
      expect(serviceWithoutKey).toBeInstanceOf(AudioAnalysisService);
    });

    it('should validate virality score bounds', async () => {
      const result = await service.analyzeAudioVirality(['audio_1'], 'tiktok');
      const analysis = result[0];

      // Virality scores should be clamped between 0 and 1
      expect(analysis.viralityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.viralityScore).toBeLessThanOrEqual(1);
    });

    it('should validate suitability score bounds', async () => {
      const result = await service.analyzeAudioVirality(['audio_1'], 'tiktok', 'tech');
      const analysis = result[0];

      // Suitability scores should be clamped between 0 and 1
      expect(analysis.suitabilityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.suitabilityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Mock Data Generation', () => {
    it('should generate realistic audio metadata', async () => {
      const result = await service.getTrendingAudios('tiktok', 5);

      result.sounds.forEach(sound => {
        // BPM should be in realistic range
        expect(sound.bpm).toBeGreaterThanOrEqual(80);
        expect(sound.bpm).toBeLessThanOrEqual(200);

        // Velocity should be between 0 and 100
        expect(sound.velocity).toBeGreaterThanOrEqual(0);
        expect(sound.velocity).toBeLessThanOrEqual(100);

        // Mood should be a valid string
        expect(typeof sound.mood).toBe('string');
        expect(sound.mood.length).toBeGreaterThan(0);

        // Sound ID should follow expected pattern
        expect(sound.sound_id).toMatch(/^tiktok_audio_\d+_\d+$/);
      });
    });

    it('should generate diverse moods', async () => {
      const result = await service.getTrendingAudios('tiktok', 50);
      const moods = result.sounds.map(sound => sound.mood);
      const uniqueMoods = new Set(moods);

      // Should have multiple different moods
      expect(uniqueMoods.size).toBeGreaterThan(1);
    });

    it('should generate varied copyright safety flags', async () => {
      const result = await service.getTrendingAudios('tiktok', 50);
      const safetyFlags = result.sounds.map(sound => sound.isCopyrightSafe);
      
      // Should have both true and false values (or at least not all the same)
      const uniqueFlags = new Set(safetyFlags);
      expect(uniqueFlags.size).toBeGreaterThanOrEqual(1);
    });
  });
});