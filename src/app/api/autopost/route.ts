// src/app/api/autopost/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform, content, media_urls, post_time } = await req.json();

  if (!platform || !content || !post_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('autopost_schedule')
    .insert([
      {
        user_id: user.id,
        platform,
        content,
        media_urls,
        post_time,
      },
    ])
    .select();

  if (error) {
    console.error('Error creating autopost schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('autopost_schedule')
    .select('*')
    .eq('user_id', user.id)
    .order('post_time', { ascending: true });

  if (error) {
    console.error('Error fetching autopost schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }

  return NextResponse.json(data);
}
