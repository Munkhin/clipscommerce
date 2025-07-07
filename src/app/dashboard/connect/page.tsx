"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Users, ShoppingCart, Music2, Instagram, Youtube, Store, Globe, AlertCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { SubscriptionPromptPopup } from "@/components/dashboard/SubscriptionPromptPopup";
import { isFeatureEnabled } from "@/lib/utils/featureFlags";

interface PlatformConnection {
  platform: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
  isConnected: boolean;
  connectedAt?: string;
}

const socialPlatforms = [
  { name: "TikTok", id: "tiktok", icon: Music2, color: "text-pink-500" },
  { name: "Instagram", id: "instagram", icon: Instagram, color: "text-purple-500" },
  { name: "YouTube", id: "youtube", icon: Youtube, color: "text-red-500" },
];

const commercePlatforms = [
  { name: "Shopify", id: "shopify", icon: Store, color: "text-green-500" },
  { name: "WooCommerce", id: "woocommerce", icon: Globe, color: "text-blue-500" },
];

export default function ConnectPage() {
  const [connections, setConnections] = useState<Record<string, PlatformConnection>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const { user } = useAuth();

  const fetchConnections = async () => {
    // Don't fetch if user is not authenticated
    if (!user) return;
    
    try {
      const response = await fetch('/api/social-credentials/usernames');
      if (response.ok) {
        const data = await response.json();
        const connectionMap: Record<string, PlatformConnection> = {};
        
        // Initialize all platforms as disconnected
        [...socialPlatforms, ...commercePlatforms].forEach(platform => {
          connectionMap[platform.id] = {
            platform: platform.id,
            isConnected: false,
          };
        });
        
        // Update with actual connection data
        data.forEach((conn: any) => {
          if (connectionMap[conn.platform]) {
            connectionMap[conn.platform] = {
              platform: conn.platform,
              username: conn.username,
              displayName: conn.displayName,
              profileImage: conn.profileImage,
              isConnected: conn.isConnected,
              connectedAt: conn.connectedAt,
            };
          }
        });
        
        setConnections(connectionMap);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]); // Only fetch when user is available

  // Check for OAuth success and refresh connections
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const platform = urlParams.get('platform');
    
    if (status === 'success' && platform) {
      setTimeout(() => {
        fetchConnections();
      }, 1000);
    }
  }, []);

  const handleConnect = async (platform: string) => {
    // Check if user is authenticated
    if (!user) {
      setError('Please sign in to connect accounts');
      return;
    }

    if (user?.user_metadata?.tier === 'lite' && commercePlatforms.some(p => p.id === platform)) {
      setShowSubscriptionPrompt(true);
      return;
    }
    
    setLoading(platform);
    setError(null);
    
    try {
      switch (platform.toLowerCase()) {
        case 'tiktok':
          await initiateTikTokOAuth();
          break;
        case 'instagram':
          if (!isFeatureEnabled('INSTAGRAM_AUTH')) {
            setError('Instagram connection is not available yet');
            return;
          }
          await initiateInstagramOAuth();
          break;
        case 'youtube':
          if (!isFeatureEnabled('YOUTUBE_AUTH')) {
            setError('YouTube connection is not available yet');
            return;
          }
          await initiateYouTubeOAuth();
          break;
        default:
          setError(`${platform} connection is not yet implemented`);
      }
    } catch (err) {
      setError(`Failed to connect to ${platform}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const initiateTikTokOAuth = async () => {
    console.log('Initiating TikTok OAuth, user:', user?.id);
    
    // Check if TikTok client ID is configured
    if (!process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID === 'your-tiktok-client-id') {
      throw new Error('TikTok client ID is not configured. Please add NEXT_PUBLIC_TIKTOK_CLIENT_ID to your environment variables.');
    }
    
    console.log('Fetching CSRF token...');
    const csrfResponse = await fetch('/api/auth/csrf');
    console.log('CSRF response status:', csrfResponse.status);
    
    if (!csrfResponse.ok) {
      const errorText = await csrfResponse.text();
      console.error('CSRF token fetch failed:', errorText);
      throw new Error(`Failed to get CSRF token: ${csrfResponse.status} ${errorText}`);
    }
    
    const csrfData = await csrfResponse.json();
    console.log('CSRF token received:', !!csrfData.token);
    const { token: csrfToken } = csrfData;
    
    console.log('Setting OAuth state with CSRF token...');
    const stateResponse = await fetch('/api/oauth/tiktok/set-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
    });
    
    console.log('State response status:', stateResponse.status);
    
    if (!stateResponse.ok) {
      const errorText = await stateResponse.text();
      console.error('OAuth state setup failed:', errorText);
      throw new Error(`Failed to set up TikTok OAuth state: ${stateResponse.status} ${errorText}`);
    }
    
    const stateData = await stateResponse.json();
    console.log('OAuth state received:', !!stateData.state);
    const { state } = stateData;
    const redirectUri = `${window.location.origin}/api/oauth/tiktok/callback`;
    const scope = 'user.info.basic,video.list';
    
    const authUrl = new URL('https://www.tiktok.com/auth/authorize/');
    authUrl.searchParams.set('client_key', process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID!);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  const initiateInstagramOAuth = async () => {
    const redirectUri = `${window.location.origin}/api/oauth/instagram/callback`;
    const scope = 'user_profile,user_media';
    
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    
    window.location.href = authUrl.toString();
  };

  const initiateYouTubeOAuth = async () => {
    const redirectUri = `${window.location.origin}/api/oauth/youtube/callback`;
    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    
    window.location.href = authUrl.toString();
  };

  const handleDisconnect = async (platform: string) => {
    setLoading(platform);
    setError(null);
    
    try {
      const response = await fetch('/api/social-credentials', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      });
      
      if (response.ok) {
        setConnections(prev => ({
          ...prev,
          [platform]: { ...prev[platform], isConnected: false, username: undefined, displayName: undefined, profileImage: undefined }
        }));
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (err) {
      setError(`Failed to disconnect from ${platform}`);
    } finally {
      setLoading(null);
    }
  };

  const renderPlatformCard = (platform: typeof socialPlatforms[0]) => {
    const PlatformIcon = platform.icon;
    const connection = connections[platform.id];
    const isCommercePlatform = commercePlatforms.some(p => p.id === platform.id);
    const isLiteTier = user?.user_metadata?.tier === 'lite';
    const isDisabledForLite = isCommercePlatform && isLiteTier;
    const isConnected = connection?.isConnected;
    const isLoadingThisPlatform = loading === platform.id;

    return (
      <div key={platform.id} className="relative group">
        <div className={`
          bg-gray-900 border border-gray-800 rounded-xl p-6 transition-all duration-300 hover:border-gray-700
          ${isConnected ? 'border-green-500/20 bg-green-500/5' : ''}
          ${isDisabledForLite ? 'opacity-60' : ''}
        `}>
          {/* Platform Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-800/50 ${platform.color}`}>
                <PlatformIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                {isDisabledForLite && (
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                    Pro Feature
                  </span>
                )}
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>Not Connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Connection Details */}
          {isConnected && connection && (
            <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                {connection.profileImage && (
                  <img 
                    src={connection.profileImage} 
                    alt={`${platform.name} profile`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-white font-medium">
                    {connection.displayName || connection.username}
                  </p>
                  {connection.connectedAt && (
                    <p className="text-xs text-gray-400">
                      Connected {new Date(connection.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            {isConnected ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDisconnect(platform.id)} 
                disabled={isLoadingThisPlatform || isDisabledForLite}
                className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40"
              >
                {isLoadingThisPlatform ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : null}
                {isLoadingThisPlatform ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleConnect(platform.id)} 
                disabled={isLoadingThisPlatform || isDisabledForLite}
                className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40"
              >
                {isLoadingThisPlatform ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : null}
                {isLoadingThisPlatform ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Connect Accounts</h1>
          <p className="text-gray-400">
            Link your social and e-commerce accounts for seamless workflow integration.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Social Media Platforms */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Social Media Platforms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {socialPlatforms.map(platform => renderPlatformCard(platform))}
          </div>
        </div>

        {/* E-Commerce Platforms */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="h-6 w-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">E-Commerce Platforms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {commercePlatforms.map(platform => renderPlatformCard(platform))}
          </div>
        </div>

        {/* Subscription Prompt */}
        <SubscriptionPromptPopup 
          isOpen={showSubscriptionPrompt}
          onClose={() => setShowSubscriptionPrompt(false)}
          featureName="E-commerce Integrations"
        />
      </div>
    </div>
  );
}
 