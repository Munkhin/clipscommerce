import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment, analyzeTone, suggestCaptionsAndHashtags } from '@/app/workflows/AI_improvement/functions/nlp';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';
import { authGuard, createValidator, validators } from '@/lib/security/auth-guard';

interface OptimizeContentRequestBody {
  caption: string;
  hashtags?: string[];
  platform?: 'tiktok' | 'instagram' | 'youtube';
  targetAudience?: string;
}

const inputValidator = createValidator({
  caption: [validators.required, validators.string, validators.maxLength(1000)],
  platform: [validators.string, validators.enum(['tiktok', 'instagram', 'youtube'])],
  targetAudience: [validators.string, validators.maxLength(100)]
});

export async function POST(req: NextRequest) {
  // Apply security guard with authentication and input validation
  const guardResult = await authGuard(req, {
    requireAuth: true,
    requireCsrf: true,
    rateLimit: {
      identifier: 'ai-optimize-content',
      requests: 15,
      window: '1m'
    },
    validateInput: inputValidator
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  const { body } = guardResult.context!;
  const { caption, hashtags, platform = 'tiktok', targetAudience = 'general' } = body as OptimizeContentRequestBody;
  
  const platformEnum = platform.toUpperCase() as Platform;
  const sentiment = analyzeSentiment(caption);
  const tone = analyzeTone(caption);
  const suggestions = suggestCaptionsAndHashtags({ 
    caption, 
    hashtags, 
    platform: platformEnum,
    targetAudience 
  });
  
  return NextResponse.json({
    sentiment,
    tone,
    suggestions,
    platform: platformEnum,
    targetAudience,
  });
}

 