import { NextRequest, NextResponse } from 'next/server';
import { suggestCaptionsAndHashtags } from '@/app/workflows/AI_improvement/functions/nlp';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';
import { authGuard, createValidator, validators } from '@/lib/security/auth-guard';

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
      identifier: 'ai-generate-variations',
      requests: 10,
      window: '1m'
    },
    validateInput: inputValidator
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  const { body } = guardResult.context!;
  const { caption, hashtags, platform = 'tiktok', targetAudience = 'general' } = body;
  
  const platformEnum = platform.toUpperCase() as Platform;
  const variations = suggestCaptionsAndHashtags({ 
    caption, 
    hashtags, 
    platform: platformEnum,
    targetAudience 
  });
  
  return NextResponse.json({
    caption,
    hashtags,
    platform: platformEnum,
    targetAudience,
    variations,
  });
} 