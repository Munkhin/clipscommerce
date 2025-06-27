import { Module } from '@nestjs/common';
import { EngagementPredictionController } from './engagement-prediction.controller';
import { EngagementPredictionService } from './engagement-prediction.service';
// Assuming Supabase is provided elsewhere, e.g., in a core/shared module
// For now, the agent will be instantiated directly in the service,
// but ideally, Supabase client would be injected.

@Module({
  controllers: [EngagementPredictionController],
  providers: [
    EngagementPredictionService,
    // Provider for EngagementPredictionAgent (or handled within EngagementPredictionService)
    // Provider for SupabaseClient (if not globally available)
  ],
})
export class EngagementPredictionModule {} 