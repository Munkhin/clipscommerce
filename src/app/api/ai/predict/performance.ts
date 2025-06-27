import { NextRequest, NextResponse } from 'next/server';
import { predictEngagement } from '@/app/workflows/AI_improvement/functions/updateModel';

async function POST(req: NextRequest) {
  const { likeRatio } = await req.json();
  if (typeof likeRatio !== 'number') {
    return NextResponse.json({ error: 'likeRatio (number) is required' }, { status: 400 });
  }
  const predictedEngagement = predictEngagement(likeRatio);
  return NextResponse.json({
    likeRatio,
    predictedEngagement,
  });
}

export { POST }; 