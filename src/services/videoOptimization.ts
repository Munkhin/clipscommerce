import { Platform, TimeRange } from '../app/workflows/data_analysis/types/analysis_types';
import { VideoOptimizationAnalysisService } from '../app/workflows/video_optimization/VideoOptimizationAnalysisService';

const videoOptimizationService = new VideoOptimizationAnalysisService(
  process.env.OPENAI_API_KEY || 'DUMMY_OPENAI_KEY',
);

interface OptimizeVideoRequest {
  userId: string;
  platform: Platform;
  timeRange: TimeRange;
  audioIds?: string[];
  correlationId?: string;
  mode?: 'fast' | 'thorough';
}

export const optimizeVideo = async (
  request: OptimizeVideoRequest,
) => {
  const { userId, platform, timeRange, audioIds, correlationId, mode } = request;
  const result = await videoOptimizationService.getVideoOptimizationInsights({
    userId,
    platform,
    timeRange,
    audioIds,
    correlationId,
    mode,
  });
  return result;
}; 