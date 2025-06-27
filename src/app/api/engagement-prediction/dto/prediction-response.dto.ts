// src/app/api/engagement-prediction/dto/prediction-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

// Using classes for response DTOs to work with Swagger decorators

export class PredictedMetricsDto {
  @ApiProperty()
  views: number = 0;

  @ApiProperty()
  likes: number = 0;

  @ApiProperty()
  shares: number = 0;

  @ApiProperty()
  comments: number = 0;

  @ApiProperty()
  engagementRate: number = 0;

  @ApiProperty()
  confidence: number = 0;
}

export class ViralProbabilityDto {
  @ApiProperty()
  score: number = 0;

  @ApiProperty()
  threshold: number = 0;

  @ApiProperty()
  isLikelyViral: boolean = false;

  @ApiProperty()
  confidence: number = 0;
}

export class ExpectedImpactDto {
  @ApiProperty()
  metric: string = '';

  @ApiProperty()
  percentageIncrease: number = 0;

  @ApiProperty()
  confidence: number = 0;
}

export class StrategyRecommendationDto {
  @ApiProperty({ enum: ['timing', 'hashtags', 'content', 'audience'] })
  type: 'timing' | 'hashtags' | 'content' | 'audience' = 'content';

  @ApiProperty()
  title: string = '';

  @ApiProperty()
  description: string = '';

  @ApiProperty({ type: ExpectedImpactDto })
  expectedImpact: ExpectedImpactDto = new ExpectedImpactDto();

  @ApiProperty()
  actionable: boolean = true;

  @ApiProperty({ enum: ['high', 'medium', 'low'] })
  priority: 'high' | 'medium' | 'low' = 'medium';
}

export class ModelMetadataDto {
  @ApiProperty()
  modelVersion: string = '1.0.0';

  @ApiProperty()
  predictionTimestamp: string = new Date().toISOString();
}

export class PredictionResponseDto {
  @ApiProperty({ type: PredictedMetricsDto })
  predictedMetrics: PredictedMetricsDto = new PredictedMetricsDto();

  @ApiProperty({ type: ViralProbabilityDto })
  viralProbability: ViralProbabilityDto = new ViralProbabilityDto();

  @ApiProperty({ type: [StrategyRecommendationDto] })
  recommendations: StrategyRecommendationDto[] = [];

  @ApiProperty({ type: ModelMetadataDto })
  modelMetadata: ModelMetadataDto = new ModelMetadataDto();
} 