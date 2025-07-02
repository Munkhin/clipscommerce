'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getUserSettings() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
  
  return data?.settings || {};
}

export async function updateNotificationSettings(settings: Record<string, any>) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      settings: { notifications: settings },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}