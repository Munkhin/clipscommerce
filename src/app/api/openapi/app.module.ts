import { Module } from '@nestjs/common';
import { EngagementPredictionModule } from '../engagement-prediction/engagement-prediction.module';

@Module({
  imports: [
    EngagementPredictionModule,
    // Add other NestJS modules here as they are created
  ],
})
export class AppModule {}