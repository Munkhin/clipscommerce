// src/app/api/engagement-prediction/engagement-prediction.controller.ts
import { Controller, Post, Body, Get, UsePipes, ValidationPipe, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { EngagementPredictionService } from './engagement-prediction.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionResponseDto } from './dto/prediction-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'; // For Swagger documentation

@ApiTags('Engagement Prediction')
@Controller('engagement-prediction')
export class EngagementPredictionController {
  private readonly logger = new Logger(EngagementPredictionController.name);

  constructor(private readonly predictionService: EngagementPredictionService) {}

  @Post('predict')
  @ApiOperation({ summary: 'Predict content engagement and get optimization strategies' })
  @ApiBody({ type: CreatePredictionDto })
  @ApiResponse({ status: 201, description: 'Prediction successful', type: PredictionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 503, description: 'Service unavailable (agent not initialized)' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async predictEngagement(
    @Body() createPredictionDto: CreatePredictionDto,
  ): Promise<PredictionResponseDto> {
    this.logger.log(`Received POST /predict request for platform: ${createPredictionDto.platform}`);
    try {
      return await this.predictionService.predict(createPredictionDto);
    } catch (error: any) {
      this.logger.error(`Error in /predict endpoint: ${error?.message || error}`, error?.stack);
      if (error?.message?.includes('Agent is not available')) {
        throw new HttpException(
          {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            error: 'Engagement prediction service is currently initializing or unavailable. Please try again later.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      // For other errors, let NestJS default error handling or a global exception filter manage them
      // Potentially map to specific HTTP errors based on error type
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'An unexpected error occurred while processing your request.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get the status and model performance of the Engagement Prediction Agent' })
  @ApiResponse({
    status: 200,
    description: 'Agent status and performance metrics',
    // Define a DTO for this response if it becomes more complex
    schema: {
      type: 'object',
      properties: {
        initialized: { type: 'boolean' },
        modelPerformance: {
          type: 'object',
          properties: {
            engagementModel: { type: 'object' },
            viralModel: { type: 'object' },
            // ... other properties from ModelEvaluation
          },
        },
      },
    },
  })
  async getStatus() {
    this.logger.log('Received GET /status request');
    try {
      const status = await this.predictionService.getAgentStatus();
      return status;
    } catch (error: any) {
        this.logger.error(`Error in /status endpoint: ${error?.message || error}`, error?.stack);
        throw new HttpException(
            {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: 'Failed to retrieve agent status.',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }
} 