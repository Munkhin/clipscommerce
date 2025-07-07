import { NextRequest, NextResponse } from 'next/server';
import { costOptimizedAI } from '@/lib/ai/cost-optimized-ai';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: 'Product description is required' },
        { status: 400 }
      );
    }

    // Use the optimized batch generation for ideator content
    const result = await costOptimizedAI.generateIdeatorContent(description);
    
    // Get current cost statistics
    const stats = costOptimizedAI.getStats();

    return NextResponse.json({
      videoIdeas: result.videoIdeas,
      stats: {
        provider: result.provider,
        totalCost: result.totalCost,
        costSaved: stats.costSaved,
        geminiUsagePercent: stats.geminiUsagePercent,
        estimatedMonthlySavings: stats.estimatedMonthlySavings
      },
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    console.error('Ideator content generation error:', error);
    
    return NextResponse.json({
      error: 'Failed to generate ideator content',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve cost optimization statistics
export async function GET(request: NextRequest) {
  try {
    const stats = costOptimizedAI.getStats();
    
    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
      message: 'Cost optimization statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving stats:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}