// src/app/api/social-credentials/route.ts
import { createClient } from '@/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform, access_token, refresh_token, expires_at } = await request.json();

  if (!platform || !access_token) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_social_credentials')
    .upsert(
      {
        user_id: user.id,
        platform,
        access_token,
        refresh_token,
        expires_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )
    .select();

  if (error) {
    console.error('Error saving social credentials:', error);
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');

  let query = supabase
    .from('user_social_credentials')
    .select('*')
    .eq('user_id', user.id);

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching social credentials:', error);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }

  return NextResponse.json(data);
}
