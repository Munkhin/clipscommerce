// src/components/social-connection.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState, useEffect } from 'react';

interface SocialAccount {
  platform: string;
  username: string;
  displayName?: string;
  profileImage?: string;
  connectedAt?: string;
}

export function SocialConnection() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Fetch usernames and profile info from the dedicated endpoint
      const response = await fetch('/api/social-credentials/usernames');
      if (response.ok) {
        const data = await response.json();
        const formattedAccounts = data.map((acc: any) => ({
          platform: acc.platform,
          username: acc.username || `Connected ${acc.platform}`,
          displayName: acc.displayName,
          profileImage: acc.profileImage,
          connectedAt: acc.connectedAt
        }));
        setAccounts(formattedAccounts);
      } else {
        // Fallback to basic credentials if usernames endpoint fails
        const fallbackResponse = await fetch('/api/social-credentials');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const formattedAccounts = fallbackData.map((acc: any) => ({
            platform: acc.platform,
            username: `Connected ${acc.platform}`,
          }));
          setAccounts(formattedAccounts);
        }
      }
    } catch (error) {
      console.error('Failed to fetch social accounts:', error);
      // Try fallback approach
      try {
        const fallbackResponse = await fetch('/api/social-credentials');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const formattedAccounts = fallbackData.map((acc: any) => ({
            platform: acc.platform,
            username: `Connected ${acc.platform}`,
          }));
          setAccounts(formattedAccounts);
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Check for OAuth success on component mount and refresh data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const platform = urlParams.get('platform');
    
    if (status === 'success' && platform) {
      // Refresh accounts after successful OAuth
      setTimeout(() => {
        fetchAccounts();
      }, 1000); // Small delay to ensure backend has processed the OAuth callback
    }
  }, []);

  const handleConnect = async (platform: string) => {
    setLoading(true);
    try {
      switch (platform.toLowerCase()) {
        case 'tiktok':
          await initiateTikTokOAuth();
          break;
        case 'instagram':
          await initiateInstagramOAuth();
          break;
        case 'youtube':
          await initiateYouTubeOAuth();
          break;
        default:
          console.error(`OAuth not implemented for platform: ${platform}`);
          alert(`OAuth connection for ${platform} is not yet implemented.`);
      }
    } catch (error) {
      console.error(`Error initiating ${platform} OAuth:`, error);
      alert(`Failed to initiate ${platform} connection. Please try again.`);
    }
    setLoading(false);
  };

  const initiateTikTokOAuth = async () => {
    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/auth/csrf');
      const { token: csrfToken } = await csrfResponse.json();

      // Set up OAuth state
      const stateResponse = await fetch('/api/oauth/tiktok/set-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      if (!stateResponse.ok) {
        throw new Error('Failed to set up TikTok OAuth state');
      }

      const { state } = await stateResponse.json();

      // Build TikTok OAuth URL
      const tiktokClientId = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID;
      if (!tiktokClientId) {
        throw new Error('TikTok client ID not configured');
      }

      const redirectUri = `${window.location.origin}/api/oauth/tiktok/callback`;
      const scope = 'user.info.basic,video.list'; // Basic user info and video access
      
      const authUrl = new URL('https://www.tiktok.com/auth/authorize/');
      authUrl.searchParams.set('client_key', tiktokClientId);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);

      // Redirect to TikTok OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('TikTok OAuth initiation error:', error);
      throw error;
    }
  };

  const initiateInstagramOAuth = async () => {
    try {
      const instagramClientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
      if (!instagramClientId) {
        throw new Error('Instagram client ID not configured');
      }

      const redirectUri = `${window.location.origin}/api/oauth/instagram/callback`;
      const scope = 'user_profile,user_media'; // Basic profile and media access
      
      const authUrl = new URL('https://api.instagram.com/oauth/authorize');
      authUrl.searchParams.set('client_id', instagramClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', 'code');

      // Redirect to Instagram OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Instagram OAuth initiation error:', error);
      throw error;
    }
  };

  const initiateYouTubeOAuth = async () => {
    try {
      const youtubeClientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;
      if (!youtubeClientId) {
        throw new Error('YouTube client ID not configured');
      }

      const redirectUri = `${window.location.origin}/api/oauth/youtube/callback`;
      const scope = 'https://www.googleapis.com/auth/youtube.readonly'; // Read-only YouTube access
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', youtubeClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline'); // For refresh tokens
      authUrl.searchParams.set('prompt', 'consent'); // Force consent screen for refresh token

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('YouTube OAuth initiation error:', error);
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Manage your connected social media accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading accounts...</p>
        ) : accounts.length > 0 ? (
          <ul className="space-y-4">
            {accounts.map((account) => (
              <li key={account.platform} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {account.profileImage && (
                    <img 
                      src={account.profileImage} 
                      alt={`${account.platform} profile`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-bold capitalize">{account.platform}</p>
                    <p className="text-sm text-gray-500">
                      {account.displayName || account.username}
                    </p>
                    {account.connectedAt && (
                      <p className="text-xs text-gray-400">
                        Connected {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="destructive">Disconnect</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No accounts connected yet.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={() => handleConnect('tiktok')}>Connect TikTok</Button>
        <Button onClick={() => handleConnect('instagram')}>Connect Instagram</Button>
        <Button onClick={() => handleConnect('youtube')}>Connect YouTube</Button>
      </CardFooter>
    </Card>
  );
}

