import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/lib/security/auth-guard';
import logger from '@/utils/logger';

interface PlatformUsername {
  platform: string;
  username: string;
  displayName?: string;
  profileImage?: string;
  isConnected: boolean;
  connectedAt?: string;
}

/**
 * Fetches usernames and profile information for connected social platforms
 */
export async function GET(request: NextRequest) {
  // Apply security guard
  const guardResult = await authGuard(request, {
    requireAuth: true,
    requireCsrf: false, // GET request, CSRF not required
    rateLimit: {
      identifier: 'social-usernames',
      requests: 30,
      window: '1m'
    }
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  const { user } = guardResult.context!;
  const supabase = await createClient();

  try {
    // Fetch all social credentials for the user
    const { data: credentials, error: credentialsError } = await supabase
      .from('user_social_credentials')
      .select('platform, platform_user_id, access_token, refresh_token, expires_at, updated_at')
      .eq('user_id', user!.id);

    if (credentialsError) {
      logger.error('Error fetching social credentials for usernames', credentialsError as Error, {
        userId: user!.id
      });
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
    }

    const platformUsernames: PlatformUsername[] = [];

    interface Credential {
  platform: string;
  access_token: string;
  platform_user_id?: string;
  updated_at: string;
}

// Process each connected platform
    for (const credential of credentials as unknown as Credential[] || []) {
      if (credential && credential.platform) {
        try {
          const username = await fetchUsernameForPlatform(
            credential.platform,
            credential.access_token,
            credential.platform_user_id
          );

          platformUsernames.push({
            platform: credential.platform,
            username: username.username,
            displayName: username.displayName,
            profileImage: username.profileImage,
            isConnected: true,
            connectedAt: credential.updated_at
          });
        } catch (error) {
          logger.warn(`Failed to fetch username for ${credential.platform}`, {
            platform: credential.platform,
            userId: user!.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          // Still include the platform as connected but with limited info
          platformUsernames.push({
            platform: credential.platform,
            username: `Connected ${credential.platform}`,
            isConnected: true,
            connectedAt: credential.updated_at
          });
        }
      }
    }

    return NextResponse.json(platformUsernames);
  } catch (error) {
    logger.error('Error in social usernames endpoint', error as Error, {
      userId: user!.id
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetches username and profile info for a specific platform
 */
async function fetchUsernameForPlatform(
  platform: string,
  accessToken: string,
  platformUserId?: string
): Promise<{ username: string; displayName?: string; profileImage?: string }> {
  switch (platform.toLowerCase()) {
    case 'tiktok':
      return await fetchTikTokUsername(accessToken);
    case 'instagram':
      return await fetchInstagramUsername(accessToken);
    case 'youtube':
      return await fetchYouTubeUsername(accessToken);
    default:
      throw new Error(`Platform ${platform} not supported`);
  }
}

/**
 * Fetch TikTok user information
 */
async function fetchTikTokUsername(accessToken: string): Promise<{ username: string; displayName?: string; profileImage?: string }> {
  try {
    const url = new URL('https://open-api.tiktok.com/user/info/');
    url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error && data.error.code !== 'ok') {
      throw new Error(`TikTok API error: ${data.error.message}`);
    }

    return {
      username: data.data?.display_name || 'TikTok User',
      displayName: data.data?.display_name,
      profileImage: data.data?.avatar_url
    };
  } catch (error) {
    logger.warn('Failed to fetch TikTok username', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to fetch TikTok user info');
  }
}

/**
 * Fetch Instagram user information
 */
async function fetchInstagramUsername(accessToken: string): Promise<{ username: string; displayName?: string; profileImage?: string }> {
  try {
    const response = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Instagram API error: ${data.error.message}`);
    }

    return {
      username: data.username || 'Instagram User',
      displayName: data.username
    };
  } catch (error) {
    logger.warn('Failed to fetch Instagram username', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to fetch Instagram user info');
  }
}

/**
 * Fetch YouTube channel information
 */
async function fetchYouTubeUsername(accessToken: string): Promise<{ username: string; displayName?: string; profileImage?: string }> {
  try {
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    const channel = data.items?.[0];
    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    return {
      username: channel.snippet?.title || 'YouTube Channel',
      displayName: channel.snippet?.title,
      profileImage: channel.snippet?.thumbnails?.default?.url
    };
  } catch (error) {
    logger.warn('Failed to fetch YouTube username', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to fetch YouTube channel info');
  }
}