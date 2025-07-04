import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { TikTokClient } from '@/app/workflows/data_collection/lib/platforms/TikTokClient';
import { SupabaseAuthTokenManager } from '@/app/workflows/data_collection/lib/auth';
import { ApiConfig } from '@/app/workflows/data_collection/lib/platforms/types';
import { PlatformEnum } from '@/types/platform';
import { authGuard, createSecureErrorResponse } from '@/lib/security/auth-guard';
import logger from '@/utils/logger';

export async function GET(request: NextRequest) {
  // This is a cron endpoint - verify it's being called by authorized cron service
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret || cronSecret !== expectedSecret) {
    logger.warn('Unauthorized cron access attempt', {
      path: request.nextUrl.pathname,
      hasSecret: !!cronSecret,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    return createSecureErrorResponse('Unauthorized', 401);
  }
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: scheduledPosts, error } = await supabase
      .from('autopost_schedule')
      .select('*')
      .eq('status', 'scheduled')
      .lte('post_time', new Date().toISOString());

    if (error) {
      throw error;
    }

    console.log('Scheduled posts to be published:', scheduledPosts);

    for (const post of scheduledPosts) {
      try {
        const { data: credentials, error: credentialsError } = await supabase
          .from('user_social_credentials')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('platform', 'tiktok')
          .single();

        if (credentialsError || !credentials) {
          throw new Error(`No TikTok credentials found for user ${post.user_id}`);
        }

        const authTokenManager = new SupabaseAuthTokenManager();
        const config: ApiConfig = {
          baseUrl: 'https://open.tiktokapis.com',
          platform: PlatformEnum.TIKTOK,
          version: 'v2',
          rateLimit: { requests: 10, perSeconds: 1 },
          credentials: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token,
            expiresAt: new Date(credentials.expires_at).getTime() / 1000,
            tokenType: 'bearer',
            strategy: 'oauth2' as any,
          }
        };
        const tiktokClient = new TikTokClient(config, authTokenManager, post.user_id);

        await tiktokClient.postVideo({
          video_url: post.media_urls[0],
          title: post.content,
          description: post.content,
          privacy_level: 'PUBLIC_TO_EVERYONE',
        });

        await supabase
          .from('autopost_schedule')
          .update({ status: 'posted' })
          .eq('id', post.id);

        console.log(`Successfully posted video for user ${post.user_id}`);
      } catch (postError) {
        console.error(`Failed to post video for user ${post.user_id}:`, postError);
        await supabase
          .from('autopost_schedule')
          .update({ status: 'failed', error_message: (postError as Error).message })
          .eq('id', post.id);
      }
    }

    return NextResponse.json({ message: 'Cron job executed successfully', posts: scheduledPosts });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ message: 'Error in cron job', error: (error as Error).message }, { status: 500 });
  }
}