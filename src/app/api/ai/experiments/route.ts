// src/app/api/ai/experiments/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    error: 'AI experiments functionality is not yet implemented' 
  }, { status: 501 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'AI experiments functionality is not yet implemented' 
  }, { status: 501 });
}
