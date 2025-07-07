import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback } from '@/app/actions/feedback';

export async function POST(req: NextRequest) {
  try {
    const { feedback } = await req.json();
    if (!feedback || typeof feedback !== 'string' || feedback.length < 3) {
      return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
    }
    await submitFeedback(feedback);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
} 