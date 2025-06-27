import { NextRequest, NextResponse } from 'next/server';
import { suggestCaptionsAndHashtags } from '@/app/workflows/AI_improvement/functions/nlp';
import { Platform } from '@/app/workflows/deliverables/types/deliverables_types';

export async function POST(req: NextRequest) {
  const { caption, hashtags, platform = 'tiktok', targetAudience = 'general' } = await req.json();
  if (!caption) {
    return NextResponse.json({ error: 'Caption is required' }, { status: 400 });
  }
  
  const platformEnum = platform.toUpperCase() as Platform;
  const variations = suggestCaptionsAndHashtags({ 
    caption, 
    hashtags, 
    platform: platformEnum,
    targetAudience 
  });
  
  return NextResponse.json({
    caption,
    hashtags,
    platform: platformEnum,
    targetAudience,
    variations,
  });
} 