import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment, analyzeTone, suggestCaptionsAndHashtags } from '@/app/workflows/AI_improvement/functions/nlp';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';

async function POST(req: NextRequest) {
  const { caption, hashtags, platform = 'tiktok', targetAudience = 'general' } = await req.json();
  if (!caption) {
    return NextResponse.json({ error: 'Caption is required' }, { status: 400 });
  }
  
  const platformEnum = platform.toUpperCase() as Platform;
  const sentiment = analyzeSentiment(caption);
  const tone = analyzeTone(caption);
  const suggestions = suggestCaptionsAndHashtags({ 
    caption, 
    hashtags, 
    platform: platformEnum,
    targetAudience 
  });
  
  return NextResponse.json({
    sentiment,
    tone,
    suggestions,
    platform: platformEnum,
    targetAudience,
  });
}

export { POST }; 