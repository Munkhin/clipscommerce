import { TrainingOrchestrator } from '../training/TrainingOrchestrator';
import { Platform, PlatformEnum } from '@/types/platform';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ error: null }),
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue({ error: null }),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock('../training/DataCollectionService', () => ({
  TrainingDataCollectionService: jest.fn().mockImplementation(() => ({
    validateDataAccess: jest.fn().mockResolvedValue({ hasAccess: true }),
    collectTrainingData: jest.fn().mockResolvedValue({
      data: [],
      qualityReports: [],
      summary: {
        totalPosts: 0,
        platformBreakdown: {},
        qualityScore: 0,
        readyForTraining: true,
      },
    }),
  })),
}));

describe('TrainingOrchestrator', () => {
  let orchestrator: TrainingOrchestrator;

  beforeEach(() => {
    orchestrator = new TrainingOrchestrator(mockSupabase);
    jest.clearAllMocks();
  });

  describe('startTraining', () => {
    it('should start training successfully with valid parameters', async () => {
      const userId = 'test-user-1';
      const platforms: Platform[] = [PlatformEnum.TIKTOK, PlatformEnum.INSTAGRAM];
      const options = {
        lookbackDays: 30,
        minPostsPerPlatform: 10,
        minEngagementThreshold: 5,
        models: {
          engagementPrediction: true,
          contentOptimization: false,
          sentimentAnalysis: true
        }
      };

      const sessionId = await orchestrator.startTraining(userId, platforms, options);
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^training_/);
      
      // Should store session in database
      expect(mockSupabase.from).toHaveBeenCalledWith('model_training_sessions');
    });

    it('should throw error if training is already in progress', async () => {
      const userId = 'test-user-2';
      const platforms: Platform[] = [PlatformEnum.TIKTOK];

      orchestrator.startTraining(userId, platforms);
      await expect(
        orchestrator.startTraining(userId, platforms)
      ).rejects.toThrow('Training session already in progress');
    }, 60000);
  });

  describe('session management', () => {
    it('should track session progress correctly', async () => {
      const userId = 'test-user-3';
      const platforms: Platform[] = [PlatformEnum.TIKTOK];

      await orchestrator.startTraining(userId, platforms);
      
      const progress = orchestrator.getSessionProgress();
      expect(progress).toBeTruthy();
      expect(progress?.status).toBeDefined();
      expect(progress?.progress).toBeGreaterThanOrEqual(0);
      expect(progress?.phase).toBeDefined();
    });

    it('should return current session correctly', async () => {
      const userId = 'test-user-4';
      const platforms: Platform[] = [PlatformEnum.INSTAGRAM];

      await orchestrator.startTraining(userId, platforms);
      
      const session = orchestrator.getCurrentSession();
      expect(session).toBeTruthy();
      expect(session?.userId).toBe(userId);
      expect(session?.platforms).toEqual(platforms);
    });
  });

  describe('training history', () => {
    it('should fetch training history from database', async () => {
      const mockHistoryData = [
        {
          session_id: 'session-1',
          user_id: 'test-user-5',
          platforms: ['TikTok'],
          status: 'completed',
          progress: 100,
          current_phase: 'Completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ data: mockHistoryData, error: null }))
            }))
          }))
        }))
      });

      const history = await orchestrator.getTrainingHistory('test-user-5');
      
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('session-1');
      expect(history[0].userId).toBe('test-user-5');
    });
  });

  describe('session lifecycle', () => {
    it('should handle training completion correctly', async () => {
      const userId = 'test-user-6';
      const platforms: Platform[] = [PlatformEnum.TIKTOK];

      const completedHandler = jest.fn();
      orchestrator.on('session_completed', completedHandler);

      // Mock successful training flow
      jest.spyOn(orchestrator as any, 'setupTrainingEnvironment').mockResolvedValue(undefined);
      jest.spyOn(orchestrator as any, 'collectAndValidateData').mockResolvedValue(undefined);
      jest.spyOn(orchestrator as any, 'executeModelTraining').mockResolvedValue(undefined);

      await orchestrator.startTraining(userId, platforms);
      
      // Should have completed training
      const session = orchestrator.getCurrentSession();
      expect(session?.status).toBe('completed');
    });

    it('should handle training failure correctly', async () => {
      const userId = 'test-user-7';
      const platforms: Platform[] = [PlatformEnum.TIKTOK];

      const failedHandler = jest.fn();
      orchestrator.on('session_failed', failedHandler);

      // Mock failed training flow
      jest.spyOn(orchestrator as any, 'setupTrainingEnvironment').mockRejectedValue(new Error('Setup failed'));

      await expect(
        orchestrator.startTraining(userId, platforms)
      ).rejects.toThrow('Setup failed');

      const session = orchestrator.getCurrentSession();
      expect(session?.status).toBe('failed');
      expect(session?.error).toBe('Setup failed');
    });
  });

  describe('isTraining', () => {
    it('should return correct training status', async () => {
      expect(orchestrator.isTraining()).toBe(false);

      const userId = 'test-user-8';
      const platforms: Platform[] = [PlatformEnum.TIKTOK];

      await orchestrator.startTraining(userId, platforms);
      expect(orchestrator.isTraining()).toBe(true);
    });
  });

  describe('stopTraining', () => {
    it('should stop training gracefully', async () => {
      const userId = 'test-user-9';
      const platforms: Platform[] = [PlatformEnum.TIKTOK];

      await orchestrator.startTraining(userId, platforms);
      expect(orchestrator.isTraining()).toBe(true);

      await orchestrator.stopTraining();
      
      const session = orchestrator.getCurrentSession();
      expect(session?.status).toBe('failed');
      expect(session?.error).toBe('Training stopped by user');
    });
  });
});