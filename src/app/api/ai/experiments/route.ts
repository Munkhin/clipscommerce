// src/app/api/ai/experiments/route.ts
import { createClient } from '@/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching A/B experiments:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from('ab_experiments')
    .insert([
      {
        user_id: user.id,
        ...body,
      },
    ])
    .select();

  if (error) {
    console.error('Error creating A/B experiment:', error);
    return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
  }

  return NextResponse.json(data);
}
