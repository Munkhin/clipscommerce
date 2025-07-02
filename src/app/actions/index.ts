// Server actions for Next.js app
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Auth-related actions
export async function signOut() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
  
  redirect('/sign-in');
}

export async function getCurrentUser() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

// Profile-related actions
export async function updateProfile(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const name = formData.get('name') as string;
  const avatar_url = formData.get('avatar_url') as string;
  
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      name,
      avatar_url,
      updated_at: new Date().toISOString(),
    });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}

// Subscription-related actions
export async function getSubscriptionStatus() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  // This would typically check with your payment provider (Stripe, etc.)
  // For now, return a default status
  return {
    isActive: true,
    plan: 'free',
    expiresAt: null
  };
}

// Content-related actions
export async function saveContent(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const platform = formData.get('platform') as string;
  
  const { error } = await supabase
    .from('user_posts')
    .insert({
      user_id: user.id,
      title,
      content,
      platform,
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}

// Settings-related actions
export async function updateSettings(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Extract settings from form data
  const settings = {
    notifications: formData.get('notifications') === 'true',
    autopost: formData.get('autopost') === 'true',
    analytics: formData.get('analytics') === 'true',
  };
  
  const { error } = await supabase
    .from('profiles')
    .update({
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}

// Social credentials actions
export async function saveSocialCredentials(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const platform = formData.get('platform') as string;
  const username = formData.get('username') as string;
  const accessToken = formData.get('accessToken') as string;
  
  const { error } = await supabase
    .from('user_social_credentials')
    .upsert({
      user_id: user.id,
      platform,
      username,
      access_token: accessToken,
      updated_at: new Date().toISOString(),
    });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}

// Export all actions
export * from './auth';
export * from './profile';
export * from './content';
export * from './subscription';
export * from './settings';
export * from './social';