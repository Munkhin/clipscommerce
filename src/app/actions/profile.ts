'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getProfile() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
}

export async function updateProfileAvatar(avatarUrl: string) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}