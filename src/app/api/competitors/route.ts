import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface CompetitorContent {
  id: string;
  title: string;
  views: string;
  engagement: string;
  url: string;
  platform: string;
  thumbnail?: string;
  embedPreview?: string;
}

interface CompetitorData {
  id: string;
  name: string;
  handle: string;
  followers: string;
  engagement: string;
  avgViews: string;
  topContent: CompetitorContent[];
  tactics: string[];
  hooks: string[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche') || 'general';
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch competitor data from database or external APIs
    const competitors = await fetchCompetitorData(niche, limit, user.id);

    return NextResponse.json({
      success: true,
      data: competitors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching competitor data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor data' },
      { status: 500 }
    );
  }
}

async function fetchCompetitorData(niche: string, limit: number, userId: string): Promise<CompetitorData[]> {
  // This would typically integrate with platform APIs like TikTok Research API,
  // Instagram Basic Display API, YouTube Data API v3, etc.
  // For now, returning enhanced mock data based on niche
  
  const nicheCategories = {
    'tech': generateTechCompetitors,
    'fashion': generateFashionCompetitors,
    'fitness': generateFitnessCompetitors,
    'food': generateFoodCompetitors,
    'beauty': generateBeautyCompetitors,
    'general': generateGeneralCompetitors
  };

  const generator = nicheCategories[niche as keyof typeof nicheCategories] || nicheCategories.general;
  return generator(limit);
}

function generateTechCompetitors(limit: number): CompetitorData[] {
  const techCompetitors: CompetitorData[] = [
    {
      id: "tech-1",
      name: "TechReview Pro",
      handle: "@techreviewpro",
      followers: "2.1M",
      engagement: "8.5%",
      avgViews: "180K",
      topContent: [
        {
          id: "tech-content-1",
          title: "iPhone 15 Pro Max Real World Test",
          views: "2.8M",
          engagement: "12.4%",
          url: "https://www.tiktok.com/@techreviewpro/video/12345",
          platform: "tiktok"
        },
        {
          id: "tech-content-2",
          title: "AI Tools That Will Replace Your Job",
          views: "1.9M",
          engagement: "9.8%",
          url: "https://www.youtube.com/watch?v=example",
          platform: "youtube"
        }
      ],
      tactics: [
        "Posts 3x daily during peak hours (12pm, 6pm, 10pm)",
        "Uses trending tech hashtags within 2 hours",
        "Creates controversy with bold predictions",
        "Leverages product launch cycles for timely content"
      ],
      hooks: [
        "This [device] will change everything in 2024",
        "I tested 15 AI tools so you don't have to",
        "Tech companies don't want you to know this",
        "The [tech trend] that will make you rich"
      ]
    },
    {
      id: "tech-2",
      name: "CodeMaster Daily",
      handle: "@codemasterdaily",
      followers: "1.8M",
      engagement: "11.2%",
      avgViews: "220K",
      topContent: [
        {
          id: "tech-content-3",
          title: "Build a Full App in 60 Seconds",
          views: "3.1M",
          engagement: "15.6%",
          url: "https://www.tiktok.com/@codemasterdaily/video/67890",
          platform: "tiktok"
        }
      ],
      tactics: [
        "Short-form coding tutorials",
        "Before/after code comparisons",
        "Trending framework discussions",
        "Career advice integration"
      ],
      hooks: [
        "How I built [app] in [timeframe]",
        "Junior vs Senior developer code",
        "This coding mistake costs developers $50k",
        "The framework that will dominate 2024"
      ]
    }
  ];

  return techCompetitors.slice(0, limit);
}

function generateFashionCompetitors(limit: number): CompetitorData[] {
  return [
    {
      id: "fashion-1",
      name: "StyleInfluencer",
      handle: "@styleinfluencer",
      followers: "3.2M",
      engagement: "13.7%",
      avgViews: "280K",
      topContent: [
        {
          id: "fashion-content-1",
          title: "5 Outfit Formulas for Fall 2024",
          views: "4.2M",
          engagement: "18.3%",
          url: "https://www.instagram.com/p/example",
          platform: "instagram"
        }
      ],
      tactics: [
        "Seasonal outfit planning",
        "Budget vs luxury comparisons",
        "Get ready with me content",
        "Styling challenges"
      ],
      hooks: [
        "The outfit formula that never fails",
        "How to look expensive on a budget",
        "Styling tricks fashion brands don't tell you",
        "The [season] trend everyone will copy"
      ]
    }
  ].slice(0, limit);
}

function generateFitnessCompetitors(limit: number): CompetitorData[] {
  return [
    {
      id: "fitness-1",
      name: "FitnessMentor",
      handle: "@fitnessmentor",
      followers: "2.8M",
      engagement: "10.9%",
      avgViews: "195K",
      topContent: [
        {
          id: "fitness-content-1",
          title: "30-Day Transformation Results",
          views: "3.8M",
          engagement: "16.2%",
          url: "https://www.tiktok.com/@fitnessmentor/video/transformation",
          platform: "tiktok"
        }
      ],
      tactics: [
        "Transformation before/after content",
        "Quick workout demonstrations",
        "Nutrition myth-busting",
        "Form correction videos"
      ],
      hooks: [
        "How I lost [amount] in [timeframe]",
        "The exercise that changed my life",
        "Fitness myths that keep you stuck",
        "The [body part] workout that actually works"
      ]
    }
  ].slice(0, limit);
}

function generateFoodCompetitors(limit: number): CompetitorData[] {
  return [
    {
      id: "food-1",
      name: "QuickRecipes",
      handle: "@quickrecipes",
      followers: "4.1M",
      engagement: "14.8%",
      avgViews: "320K",
      topContent: [
        {
          id: "food-content-1",
          title: "5-Minute Gourmet Pasta",
          views: "5.2M",
          engagement: "19.7%",
          url: "https://www.tiktok.com/@quickrecipes/video/pasta",
          platform: "tiktok"
        }
      ],
      tactics: [
        "Quick recipe tutorials",
        "Ingredient substitution tips",
        "Cooking hack demonstrations",
        "Trending food challenges"
      ],
      hooks: [
        "The [dish] recipe that went viral",
        "How to make [expensive dish] for $[low price]",
        "Cooking mistakes that ruin [dish]",
        "The secret ingredient chefs use"
      ]
    }
  ].slice(0, limit);
}

function generateBeautyCompetitors(limit: number): CompetitorData[] {
  return [
    {
      id: "beauty-1",
      name: "BeautySecrets",
      handle: "@beautysecrets",
      followers: "3.7M",
      engagement: "12.3%",
      avgViews: "240K",
      topContent: [
        {
          id: "beauty-content-1",
          title: "Drugstore vs High-End Makeup",
          views: "3.9M",
          engagement: "17.1%",
          url: "https://www.youtube.com/watch?v=makeup-comparison",
          platform: "youtube"
        }
      ],
      tactics: [
        "Product comparison tests",
        "Makeup transformation videos",
        "Skincare routine tutorials",
        "Trend forecasting content"
      ],
      hooks: [
        "The [product] that changed my skin",
        "Drugstore dupes for expensive makeup",
        "Beauty mistakes aging you by 10 years",
        "The [trend] everyone will try next"
      ]
    }
  ].slice(0, limit);
}

function generateGeneralCompetitors(limit: number): CompetitorData[] {
  return [
    {
      id: "general-1",
      name: "ViralContentCreator",
      handle: "@viralcontentcreator",
      followers: "2.5M",
      engagement: "9.8%",
      avgViews: "165K",
      topContent: [
        {
          id: "general-content-1",
          title: "Life Hacks That Actually Work",
          views: "2.7M",
          engagement: "13.4%",
          url: "https://www.tiktok.com/@viralcontentcreator/video/lifehacks",
          platform: "tiktok"
        }
      ],
      tactics: [
        "Trending topic commentary",
        "Life hack demonstrations",
        "Educational content with entertainment",
        "Story-driven content"
      ],
      hooks: [
        "The life hack that saved me [benefit]",
        "Things I wish I knew at [age]",
        "Why [common belief] is completely wrong",
        "The [thing] that will change your [area]"
      ]
    }
  ].slice(0, limit);
}