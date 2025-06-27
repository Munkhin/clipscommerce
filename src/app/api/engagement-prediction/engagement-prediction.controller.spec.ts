import { Test, TestingModule } from '@nestjs/testing';
import { EngagementPredictionController } from './engagement-prediction.controller';
import { EngagementPredictionService } from './engagement-prediction.service';
import { EngagementPredictionAgent, ModelEvaluation } from '../../workflows/reports/index';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionResponseDto } from './dto/prediction-response.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigModule } from '@nestjs/config';
import { HttpStatus, HttpException } from '@nestjs/common';

// Mock the EngagementPredictionAgent and its dependent services/functions
const mockEngagementPredictionAgent = {
  predictEngagement: jest.fn(),
  getModelPerformance: jest.fn(),
  isReady: jest.fn(() => true),
  initialize: jest.fn(),
};

// Mock initializeEngagementPredictionAgent
jest.mock('../../workflows/reports/index', () => ({
  ...jest.requireActual('../../workflows/reports/index'), // Keep actual exports
  initializeEngagementPredictionAgent: jest.fn(() => Promise.resolve({
    agent: mockEngagementPredictionAgent,
    evaluation: {
      engagementModel: { mae: 0.1, rmse: 0.1, r2Score: 0.8, mape: 10 },
      viralModel: { accuracy: 0.9, precision: 0.9, recall: 0.9, f1Score: 0.9, rocAuc: 0.9, prAuc: 0.9 },
      featureImportance: {},
      evaluationDate: new Date(),
    } as ModelEvaluation,
  })),
}));

// Mock Supabase client factory
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({} as SupabaseClient)),
}));

describe('EngagementPredictionController', () => {
  let controller: EngagementPredictionController;
  let service: EngagementPredictionService;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockEngagementPredictionAgent.isReady.mockReturnValue(true); // Default to ready

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ছবিটিenvFilePath: '.env.test', ignoreEnvFile: false })], // Load test env vars
      controllers: [EngagementPredictionController],
      providers: [
        EngagementPredictionService,
        // Provide the mock agent directly if service instantiates it, or mock service methods
      ],
    }).compile();

    controller = module.get<EngagementPredictionController>(EngagementPredictionController);
    service = module.get<EngagementPredictionService>(EngagementPredictionService);

    // Ensure agent is initialized in the service for tests
    // This simulates the OnModuleInit lifecycle hook
    if (service.onModuleInit) {
      await service.onModuleInit();
    }
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /predict', () => {
    const testDate = new Date(); // Use a fixed date for consistent testing

    const createPredictionDto: CreatePredictionDto = {
      platform: 'tiktok' as any,
      contentMetadata: {
        caption: 'Test caption',
        hashtags: ['#test'],
        contentType: 'video' as any,
      },
      userId: 'test-user',
    };

    const mockPredictionResponse: PredictionResponseDto = {
      predictedMetrics: { views: 1000, likes: 100, shares: 10, comments: 20, engagementRate: 0.13, confidence: 0.8 },
      viralProbability: { score: 0.7, threshold: 0.5, isLikelyViral: true, confidence: 0.75 },
      recommendations: [],
      modelMetadata: { modelVersion: '1.0.0', predictionTimestamp: testDate.toISOString() },
    };

    // This mock represents what the EngagementPredictionAgent.predictEngagement method should return
    const mockAgentResult: EngagementPrediction = {
      predictedMetrics: { views: 1000, likes: 100, shares: 10, comments: 20, engagementRate: 0.13, confidence: 0.8 } as any,
      viralProbability: { score: 0.7, threshold: 0.5, isLikelyViral: true, confidence: 0.75 } as any,
      recommendations: [] as any,
      modelMetadata: { modelVersion: '1.0.0', predictionTimestamp: testDate, featureImportance: {} } as any, // Use Date object
    };

    it('should return prediction results successfully', async () => {
      // Mock the agent's predictEngagement method used by the service
      // It should resolve with an EngagementPrediction-like object
      mockEngagementPredictionAgent.predictEngagement.mockResolvedValueOnce(mockAgentResult);
      
      const result = await controller.predictEngagement(createPredictionDto);
      
      expect(result).toEqual(mockPredictionResponse);
      expect(mockEngagementPredictionAgent.predictEngagement).toHaveBeenCalledWith(expect.objectContaining({
        userId: createPredictionDto.userId,
        platform: createPredictionDto.platform,
      }));
    });

    it('should throw HttpException if agent is not initialized', async () => {
      // Simulate agent not being ready/initialized within the service context
      // This requires a bit more direct manipulation or specific mocking of the service's internal state if possible,
      // or ensuring `onModuleInit` fails in a controlled way for this test case.
      
      // For this test, let's mock the service's predict method to throw the specific error
      jest.spyOn(service, 'predict').mockImplementationOnce(() => {
        throw new Error('Engagement Prediction Agent is not available at the moment.');
      });

      await expect(controller.predictEngagement(createPredictionDto)).rejects.toThrow(
        new HttpException(
          {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            error: 'Engagement prediction service is currently initializing or unavailable. Please try again later.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should handle general errors from the service', async () => {
      mockEngagementPredictionAgent.predictEngagement.mockRejectedValueOnce(new Error('Internal model error'));

      await expect(controller.predictEngagement(createPredictionDto)).rejects.toThrow(
        new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'An unexpected error occurred while processing your request.',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('GET /status', () => {
    it('should return agent status and performance when initialized', async () => {
      const mockPerformance: ModelEvaluation = {
        engagementModel: { mae: 0.1, rmse: 0.1, r2Score: 0.8, mape: 10 },
        viralModel: { accuracy: 0.9, precision: 0.9, recall: 0.9, f1Score: 0.9, rocAuc: 0.9, prAuc: 0.9 },
        featureImportance: { testFeature: 0.5 },
        evaluationDate: new Date(),
      };
      mockEngagementPredictionAgent.getModelPerformance.mockResolvedValueOnce(mockPerformance);
      mockEngagementPredictionAgent.isReady.mockReturnValueOnce(true);
      
      // Re-initialize service or mock its getAgentStatus specifically for this setup
      // Or ensure the global mock setup for agent covers this
      jest.spyOn(service, 'getAgentStatus').mockResolvedValueOnce({
        initialized: true,
        modelPerformance: mockPerformance
      });

      const result = await controller.getStatus();
      expect(result.initialized).toBe(true);
      expect(result.modelPerformance).toEqual(mockPerformance);
    });

    it('should return agent status as not initialized if agent is not ready', async () => {
       jest.spyOn(service, 'getAgentStatus').mockResolvedValueOnce({
        initialized: false,
      });
      const result = await controller.getStatus();
      expect(result.initialized).toBe(false);
      expect(result.modelPerformance).toBeUndefined();
    });

     it('should handle errors when fetching status', async () => {
      jest.spyOn(service, 'getAgentStatus').mockRejectedValueOnce(new Error('Failed to get status'));

      await expect(controller.getStatus()).rejects.toThrow(
        new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to retrieve agent status.',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
}); 