import { NextRequest, NextResponse } from 'next/server';

// POST - Create new experiment
export async function POST(request: NextRequest) {
      return NextResponse.json({ 
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}

// GET - List experiments for user
export async function GET(request: NextRequest) {
    return NextResponse.json({
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}