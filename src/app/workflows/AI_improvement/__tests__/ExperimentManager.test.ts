import { ExperimentManager } from '../functions/abTesting';
import { Platform } from '@/types/platform';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    update: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({ 
      eq: jest.fn(() => ({ 
        single: jest.fn(() => ({ data: null, error: null })),
        order: jest.fn(() => ({ 
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  }))
} as any;

describe('ExperimentManager', () => {
  let experimentManager: ExperimentManager;

  beforeEach(() => {
    experimentManager = new ExperimentManager(mockSupabase);
    jest.clearAllMocks();
  });

  describe('createExperiment', () => {
    it('should create experiment with valid data', async () => {
      const experimentData = {
        name: 'Test A/B Experiment',
        description: 'Testing caption variations',
        platform: 'tiktok',
        status: 'draft' as const,
        variants: [
          {
            id: 'variant-a',
            name: 'Original',
            description: 'Original caption',
            config: { caption: 'Original text' },
            weight: 50
          },
          {
            id: 'variant-b',
            name: 'Optimized',
            description: 'AI-optimized caption',
            config: { caption: 'Optimized text' },
            weight: 50
          }
        ],
        startDate: new Date(),
        targetMetric: 'engagementRate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      };

      const experiment = await experimentManager.createExperiment(experimentData);
      
      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe('Test A/B Experiment');
      expect(experiment.variants).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('ab_experiments');
    });

    it('should validate experiment configuration', async () => {
      const invalidExperimentData = {
        name: 'Invalid Experiment',
        description: 'Missing variants',
        platform: 'tiktok',
        status: 'draft' as const,
        variants: [], // Invalid: no variants
        startDate: new Date(),
        targetMetric: 'engagementRate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      };

      await expect(
        experimentManager.createExperiment(invalidExperimentData)
      ).rejects.toThrow('Experiment must have at least 2 variants');
    });

    it('should validate variant weights sum to 100', async () => {
      const invalidWeightsData = {
        name: 'Invalid Weights Experiment',
        description: 'Wrong weights',
        platform: 'tiktok',
        status: 'draft' as const,
        variants: [
          {
            id: 'variant-a',
            name: 'A',
            description: 'Variant A',
            config: {},
            weight: 60
          },
          {
            id: 'variant-b',
            name: 'B',
            description: 'Variant B',
            config: {},
            weight: 60 // Total: 120, should be 100
          }
        ],
        startDate: new Date(),
        targetMetric: 'likes' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      };

      await expect(
        experimentManager.createExperiment(invalidWeightsData)
      ).rejects.toThrow('Variant weights must sum to 100');
    });
  });

  describe('updateExperiment', () => {
    it('should update existing experiment', async () => {
      // Mock existing experiment data
      const mockExperimentData = {
        experiment_id: 'exp-123',
        name: 'Original Name',
        description: 'Original Description',
        platform: 'tiktok',
        status: 'draft',
        variants: [],
        target_metric: 'likes',
        minimum_sample_size: 100,
        confidence_level: 0.95,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockExperimentData, error: null }))
          }))
        })),
        update: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) }))
      });

      const updates = {
        name: 'Updated Name',
        description: 'Updated Description'
      };

      const updatedExperiment = await experimentManager.updateExperiment('exp-123', updates);
      
      expect(updatedExperiment).toBeTruthy();
      expect(updatedExperiment?.name).toBe('Updated Name');
      expect(updatedExperiment?.description).toBe('Updated Description');
    });
  });

  describe('getExperiment', () => {
    it('should retrieve experiment from database', async () => {
      const mockExperimentData = {
        experiment_id: 'exp-456',
        name: 'Test Experiment',
        description: 'Test Description',
        platform: 'instagram',
        status: 'running',
        variants: [
          { id: 'a', name: 'A', description: 'Variant A', config: {}, weight: 50 },
          { id: 'b', name: 'B', description: 'Variant B', config: {}, weight: 50 }
        ],
        target_metric: 'comments',
        minimum_sample_size: 200,
        confidence_level: 0.95,
        start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockExperimentData, error: null }))
          }))
        }))
      });

      const experiment = await experimentManager.getExperiment('exp-456');
      
      expect(experiment).toBeTruthy();
      expect(experiment?.id).toBe('exp-456');
      expect(experiment?.name).toBe('Test Experiment');
      expect(experiment?.platform).toBe('instagram');
    });

    it('should return null for non-existent experiment', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      });

      const experiment = await experimentManager.getExperiment('non-existent');
      expect(experiment).toBeNull();
    });
  });

  describe('recordExperimentData', () => {
    it('should record experiment data successfully', async () => {
      // Mock experiment retrieval
      const mockExperiment = {
        experiment_id: 'exp-789',
        name: 'Test Experiment',
        status: 'running',
        target_metric: 'likes',
        user_id: 'test-user'
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ab_experiments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: mockExperiment, error: null }))
              }))
            }))
          };
        } else if (table === 'experiment_results') {
          return {
            insert: jest.fn(() => ({ error: null }))
          };
        }
        return { select: jest.fn(), insert: jest.fn(), update: jest.fn() };
      });

      const postMetrics = {
        id: 'post-123',
        platform: 'tiktok',
        url: 'https://example.com',
        caption: 'Test post',
        hashtags: ['#test'],
        publishedAt: new Date().toISOString(),
        metrics: {
          likes: 100,
          comments: 20,
          shares: 5,
          views: 1000,
          saves: 10,
          engagementRate: 0.135
        },
        metadata: {}
      };

      const result = await experimentManager.recordExperimentData(
        'exp-789',
        'variant-a',
        postMetrics
      );

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('experiment_results');
    });

    it('should fail to record data for non-running experiment', async () => {
      // Mock non-running experiment
      const mockExperiment = {
        experiment_id: 'exp-stopped',
        status: 'completed'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockExperiment, error: null }))
          }))
        }))
      });

      const postMetrics = {
        id: 'post-456',
        platform: 'tiktok',
        metrics: { likes: 50, comments: 10, shares: 2, views: 500, saves: 5, engagementRate: 0.134 }
      } as any;

      const result = await experimentManager.recordExperimentData(
        'exp-stopped',
        'variant-a',
        postMetrics
      );

      expect(result).toBe(false);
    });
  });

  describe('analyzeExperiment', () => {
    it('should perform Bayesian analysis on experiment results', async () => {
      // Mock experiment data
      const mockExperiment = {
        experiment_id: 'exp-analysis',
        name: 'Analysis Test',
        platform: 'tiktok',
        status: 'running',
        variants: [
          { id: 'a', name: 'A', description: 'Variant A', config: {}, weight: 50 },
          { id: 'b', name: 'B', description: 'Variant B', config: {}, weight: 50 }
        ],
        target_metric: 'likes',
        minimum_sample_size: 100,
        confidence_level: 0.95,
        prior_alpha: 1,
        prior_beta: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user'
      };

      const mockResults = [
        {
          experiment_id: 'exp-analysis',
          variant_id: 'a',
          metric_value: 50,
          conversion_event: true
        },
        {
          experiment_id: 'exp-analysis',
          variant_id: 'b',
          metric_value: 75,
          conversion_event: true
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ab_experiments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: mockExperiment, error: null }))
              }))
            })),
            update: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) }))
          };
        } else if (table === 'experiment_results') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({ data: mockResults, error: null }))
            }))
          };
        }
        return { select: jest.fn(), insert: jest.fn(), update: jest.fn() };
      });

      const analysis = await experimentManager.analyzeExperiment('exp-analysis');
      
      expect(analysis).toBeTruthy();
      expect(analysis?.experimentId).toBe('exp-analysis');
      expect(analysis?.results).toHaveLength(2);
      expect(analysis?.status).toBeDefined();
    });
  });
});