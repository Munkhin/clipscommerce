import { Platform } from '../app/workflows/deliverables/types/deliverables_types';
import {
  suggestCaptionsAndHashtags,
  CaptionVariation,
  HashtagRecommendation,
  ContentOptimization,
} from '../app/workflows/AI_improvement/functions/nlp';

export interface GenerateContentRequest {
  caption: string;
  hashtags?: string[];
  platform: Platform;
  targetAudience?: string;
}

export interface GenerateContentResponse {
  captions: CaptionVariation[];
  hashtags: HashtagRecommendation[];
  optimization: ContentOptimization;
}

/**
 * Generates optimized captions and hashtag recommendations for a given piece of content.
 * This is a lightweight wrapper around the advanced NLP utilities already present
 * in the AI_improvement workflow.
 */
export const generateContent = async (
  request: GenerateContentRequest,
): Promise<GenerateContentResponse> => {
  const { platform, caption, hashtags = [], targetAudience } = request;

  const { captions, hashtags: recommendedTags, optimization } =
    suggestCaptionsAndHashtags({
      caption,
      hashtags,
      platform,
      targetAudience,
    });

  return {
    captions,
    hashtags: recommendedTags,
    optimization,
  };
}; 