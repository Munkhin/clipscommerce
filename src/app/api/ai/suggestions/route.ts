// src/app/api/ai/suggestions/route.ts
import { createClient } from '@/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');

  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', user.id);

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching AI suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }

  return NextResponse.json(data);
}
