// src/app/api/ai/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    error: 'AI suggestions functionality is not yet implemented' 
  }, { status: 501 });
}
