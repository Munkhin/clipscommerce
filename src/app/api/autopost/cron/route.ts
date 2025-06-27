import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { TikTokClient } from '../../../../workflows/data_collection/lib/platforms/TikTokClient';
import { SupabaseAuthTokenManager } from '../../../../workflows/data_collection/lib/auth';
import { ApiConfig } from '../../../../workflows/data_collection/lib/platforms/types';
import { Platform } from '../../../../workflows/deliverables/types/deliverables_types';

export async function GET() {
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
          platform: Platform.TIKTOK,
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
          .update({ status: 'failed', error_message: postError.message })
          .eq('id', post.id);
      }
    }

    return NextResponse.json({ message: 'Cron job executed successfully', posts: scheduledPosts });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ message: 'Error in cron job', error: error.message }, { status: 500 });
  }
}