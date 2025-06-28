import { NextRequest, NextResponse } from 'next/server';
import { predictEngagement } from '@/app/workflows/AI_improvement/functions/updateModel';
import { authGuard, createValidator, validators } from '@/lib/security/auth-guard';

const inputValidator = createValidator({
  likeRatio: [validators.required, validators.number, (value: number) => value >= 0 && value <= 1]
});

async function POST(req: NextRequest) {
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
  const { likeRatio } = body;
  const predictedEngagement = predictEngagement(likeRatio);
  return NextResponse.json({
    likeRatio,
    predictedEngagement,
  });
}

export { POST }; 