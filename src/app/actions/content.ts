'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getUserContent() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching content:', error);
    return [];
  }
  
  return data || [];
}

export async function deleteContent(contentId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('user_posts')
    .delete()
    .eq('id', contentId)
    .eq('user_id', user.id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}