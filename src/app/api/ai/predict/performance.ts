import { NextRequest, NextResponse } from 'next/server';
import { predictEngagement } from '@/app/workflows/AI_improvement/functions/updateModel';
import { authGuard, createValidator, validators } from '@/lib/security/auth-guard';

interface PredictPerformanceRequestBody {
  likeRatio: number;
}

const inputValidator = createValidator({
  likeRatio: [validators.required, validators.number, (value: number) => value >= 0 && value <= 1]
});

export async function POST(req: NextRequest) {
  // Apply security guard with authentication and input validation
  const guardResult = await authGuard(req, {
    requireAuth: true,
    requireCsrf: true,
    rateLimit: {
      identifier: 'ai-predict-performance',
      requests: 20,
      window: '1m'
    },
    validateInput: inputValidator
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  const { body } = guardResult.context!;
  const { likeRatio } = body as PredictPerformanceRequestBody;
  const predictedEngagement = predictEngagement(likeRatio);
  return NextResponse.json({
    likeRatio,
    predictedEngagement,
  });
}

 