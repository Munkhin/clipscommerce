import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for content generation request
const generateContentSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  content_type: z.enum(['caption', 'hashtags', 'script', 'title', 'description']),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational', 'educational']).optional(),
  max_length: z.number().positive().optional(),
  include_hashtags: z.boolean().optional(),
  target_audience: z.string().optional(),
});

interface ContentGenerationResult {
  content: string;
  hashtags?: string[];
  confidence: number;
  metadata: {
    content_type: string;
    platform: string;
    tone?: string;
    generated_at: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = generateContentSchema.parse(body);

    // Check usage limits (implement based on your subscription system)
    // const usageCheck = await checkUsageLimits(user.id, 'ai_content_generation');
    // if (!usageCheck.allowed) {
    //   return NextResponse.json({ error: 'Usage limit exceeded' }, { status: 429 });
    // }

    // Generate content using AI service
    const generatedContent = await generateAIContent(validatedData);

    // Store generation record for analytics and tracking
    const { error: insertError } = await supabase
      .from('ai_suggestions')
      .insert({
        suggestion_id: `content_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        platform: validatedData.platform,
        suggestion_type: 'content',
        suggestion: generatedContent.content,
        confidence: generatedContent.confidence,
        metadata: {
          ...generatedContent.metadata,
          prompt: validatedData.prompt,
          request_params: validatedData,
        },
      });

    if (insertError) {
      console.error('Error storing AI suggestion:', insertError);
      // Continue anyway - don't fail the request for analytics issues
    }

    return NextResponse.json({
      success: true,
      data: generatedContent,
    });

  } catch (error) {
    console.error('Content generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

async function generateAIContent(params: z.infer<typeof generateContentSchema>): Promise<ContentGenerationResult> {
  // Mock implementation - replace with actual AI service integration
  // This would typically call OpenAI, Anthropic, or your custom AI model
  
  const { prompt, platform, content_type, tone = 'casual', max_length } = params;
  
  // Simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate platform-specific content
  let content = '';
  let hashtags: string[] = [];
  
  switch (content_type) {
    case 'caption':
      content = generateCaption(prompt, platform, tone);
      hashtags = generateHashtags(prompt, platform);
      break;
    case 'hashtags':
      hashtags = generateHashtags(prompt, platform);
      content = hashtags.join(' ');
      break;
    case 'script':
      content = generateScript(prompt, platform, tone);
      break;
    case 'title':
      content = generateTitle(prompt, platform, tone);
      break;
    case 'description':
      content = generateDescription(prompt, platform, tone);
      break;
  }

  // Apply length restrictions
  if (max_length && content.length > max_length) {
    content = content.substring(0, max_length - 3) + '...';
  }

  return {
    content,
    hashtags: hashtags.length > 0 ? hashtags : undefined,
    confidence: 0.85 + Math.random() * 0.1, // Mock confidence score
    metadata: {
      content_type,
      platform,
      tone,
      generated_at: new Date().toISOString(),
    },
  };
}

function generateCaption(prompt: string, platform: string, tone: string): string {
  // Mock caption generation based on platform and tone
  const templates = {
    instagram: {
      casual: `🎯 ${prompt}\n\nWhat do you think? Let me know in the comments!`,
      professional: `Sharing insights on ${prompt}. Key takeaways in the carousel above.`,
      humorous: `POV: You're scrolling and see this post about ${prompt} 😂`,
    },
    tiktok: {
      casual: `${prompt} - who else can relate? 👀`,
      professional: `Breaking down ${prompt} for you! Save this post for later 📌`,
      humorous: `Tell me you understand ${prompt} without telling me 💀`,
    },
    youtube: {
      casual: `In this video, I'm diving deep into ${prompt}. What's your take on this?`,
      professional: `Comprehensive analysis of ${prompt}. Timestamps in the description.`,
      humorous: `${prompt} but make it funny - you won't believe what happens next!`,
    },
  };

  return templates[platform as keyof typeof templates]?.[tone as keyof typeof templates['instagram']] || 
         `Great content about ${prompt}!`;
}

function generateHashtags(prompt: string, platform: string): string[] {
  // Mock hashtag generation
  const baseHashtags = ['#content', '#viral', '#trending'];
  const platformHashtags = {
    instagram: ['#instagood', '#photooftheday', '#instadaily'],
    tiktok: ['#fyp', '#foryou', '#viral'],
    youtube: ['#youtube', '#subscribe', '#video'],
  };

  // Extract keywords from prompt for relevant hashtags
  const keywords = prompt.toLowerCase().split(' ').slice(0, 3);
  const keywordHashtags = keywords.map(keyword => `#${keyword.replace(/[^a-z0-9]/g, '')}`);

  return [
    ...baseHashtags,
    ...(platformHashtags[platform as keyof typeof platformHashtags] || []),
    ...keywordHashtags,
  ].slice(0, 10);
}

function generateScript(prompt: string, platform: string, tone: string): string {
  return `[HOOK] Attention-grabbing opening about ${prompt}
[PROBLEM] Here's what most people get wrong...
[SOLUTION] But here's the real strategy...
[CALL TO ACTION] What's your experience with this? Comment below!`;
}

function generateTitle(prompt: string, platform: string, tone: string): string {
  const templates = [
    `The Ultimate Guide to ${prompt}`,
    `Why ${prompt} Changed Everything`,
    `${prompt}: What They Don't Tell You`,
    `I Tried ${prompt} for 30 Days - Here's What Happened`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateDescription(prompt: string, platform: string, tone: string): string {
  return `Dive deep into ${prompt} with this comprehensive guide. Whether you're a beginner or looking to level up your skills, this content has something for everyone. 

What you'll learn:
• Key strategies and tactics
• Common mistakes to avoid  
• Proven methods that work
• Real-world examples

Don't forget to like, share, and subscribe for more content like this!`;
}