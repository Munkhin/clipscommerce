import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
// POST - Record experiment result
export async function POST(
  request: NextRequest,
  context: { params: { experimentId: string } }
) {
      return NextResponse.json({ 
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}

// @ts-ignore
// GET - Get experiment results with analysis
export async function GET(
  request: NextRequest,
  context: { params: { experimentId: string } }
) {
    return NextResponse.json({
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}