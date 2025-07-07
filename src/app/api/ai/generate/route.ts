import { NextRequest, NextResponse } from 'next/server';
import { costOptimizedAI } from '@/lib/ai/cost-optimized-ai';

export async function POST(request: NextRequest) {
  try {
    const { prompt, maxTokens = 300, temperature = 0.8, systemPrompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Use the cost-optimized AI service (Gemini first, OpenAI fallback)
    const result = await costOptimizedAI.generateContent({
      prompt,
      maxTokens,
      temperature,
      systemPrompt
    });

    return NextResponse.json({
      content: result.content,
      provider: result.provider,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      timestamp: new Date().toISOString(),
      success: result.success
    });

  } catch (error) {
    console.error('AI generation error:', error);
    
    // The cost-optimized service already has fallback built-in
    return NextResponse.json({
      error: 'Failed to generate content',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

