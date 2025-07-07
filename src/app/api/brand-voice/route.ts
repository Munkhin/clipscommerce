import { NextRequest, NextResponse } from 'next/server';

const mockBrandVoices = [
  {
    id: '1',
    name: 'Professional Tech',
    tone: 'professional',
    description: 'Clear, informative, and trustworthy tone for technology content',
    keywords: ['innovative', 'efficient', 'reliable', 'cutting-edge']
  },
  {
    id: '2',
    name: 'Casual Lifestyle',
    tone: 'casual',
    description: 'Relaxed and approachable for lifestyle and entertainment content',
    keywords: ['fun', 'easy', 'amazing', 'love', 'perfect']
  },
  {
    id: '3',
    name: 'Energetic Fitness',
    tone: 'energetic',
    description: 'High-energy and motivational for fitness and wellness content',
    keywords: ['powerful', 'strong', 'transform', 'achieve', 'crush']
  }
];

export async function GET(request: NextRequest) {
  return NextResponse.json({ voices: mockBrandVoices });
} 