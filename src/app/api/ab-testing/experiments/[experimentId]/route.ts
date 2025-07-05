import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}

// GET - Get specific experiment details
export async function GET(request: NextRequest, { params }: { params: Promise<{ experimentId: string }> }) {
  return NextResponse.json({
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}

// PATCH - Update experiment
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ experimentId: string }> }) {
  return NextResponse.json({ 
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}

// DELETE - Delete experiment
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ experimentId: string }> }) {
  return NextResponse.json({ 
    error: 'AB testing functionality is not yet implemented' 
  }, { status: 501 });
}