'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getSocialCredentials() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('user_social_credentials')
    .select('platform, username, is_active')
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error fetching social credentials:', error);
    return [];
  }
  
  return data || [];
}

export async function disconnectSocialAccount(platform: string) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('user_social_credentials')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}