import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    return NextResponse.json({
    error: 'AI content generation functionality is not yet implemented' 
  }, { status: 501 });
}