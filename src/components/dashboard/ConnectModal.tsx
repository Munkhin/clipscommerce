"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Music2, Instagram, Youtube, Store, Globe } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { isFeatureEnabled } from "@/lib/utils/featureFlags";

interface PlatformConnection {
  platform: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
  isConnected: boolean;
  connectedAt?: string;
}

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: (platform: string) => void;
}

const socialPlatforms = [
  { name: "TikTok", id: "tiktok", icon: Music2, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { name: "Instagram", id: "instagram", icon: Instagram, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { name: "YouTube", id: "youtube", icon: Youtube, color: "text-red-500", bgColor: "bg-red-500/10" },
];

const commercePlatforms = [
  { name: "Shopify", id: "shopify", icon: Store, color: "text-green-500", bgColor: "bg-green-500/10" },
  { name: "WooCommerce", id: "woocommerce", icon: Globe, color: "text-blue-500", bgColor: "bg-blue-500/10" },
];

export function ConnectModal({ isOpen, onClose, onConnectionSuccess }: ConnectModalProps) {
  const [connections, setConnections] = useState<Record<string, PlatformConnection>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchConnections = async () => {
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
    if (isOpen) {
      fetchConnections();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  const handleConnect = async (platform: string) => {
    if (!user) {
      setError('Please sign in to connect accounts');
      return;
    }

    const isCommercePlatform = commercePlatforms.some(p => p.id === platform);
    if (user?.user_metadata?.tier === 'lite' && isCommercePlatform) {
      setError('Commerce platform connections require a Pro subscription');
      return;
    }
    
    setLoading(platform);
    setError(null);
    setSuccess(null);
    
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
    if (!process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID) {
      throw new Error('TikTok client ID is not configured');
    }
    
    const csrfResponse = await fetch('/api/auth/csrf');
    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }
    
    const csrfData = await csrfResponse.json();
    const { token: csrfToken } = csrfData;
    
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
    
    const stateData = await stateResponse.json();
    const { state } = stateData;
    const redirectUri = `${window.location.origin}/api/oauth/tiktok/callback`;
    const scope = 'user.info.basic,video.list';
    
    const authUrl = new URL('https://www.tiktok.com/auth/authorize/');
    authUrl.searchParams.set('client_key', process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  const initiateInstagramOAuth = async () => {
    if (!process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID) {
      throw new Error('Instagram client ID is not configured');
    }
    
    const csrfResponse = await fetch('/api/auth/csrf');
    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }
    
    const csrfData = await csrfResponse.json();
    const { token: csrfToken } = csrfData;
    
    const stateResponse = await fetch('/api/oauth/instagram/set-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
    });
    
    if (!stateResponse.ok) {
      throw new Error('Failed to set up Instagram OAuth state');
    }
    
    const stateData = await stateResponse.json();
    const { state } = stateData;
    const redirectUri = `${window.location.origin}/api/oauth/instagram/callback`;
    const scope = 'user_profile,user_media';
    
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  const initiateYouTubeOAuth = async () => {
    if (!process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID) {
      throw new Error('YouTube client ID is not configured');
    }
    
    const csrfResponse = await fetch('/api/auth/csrf');
    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }
    
    const csrfData = await csrfResponse.json();
    const { token: csrfToken } = csrfData;
    
    const stateResponse = await fetch('/api/oauth/youtube/set-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
    });
    
    if (!stateResponse.ok) {
      throw new Error('Failed to set up YouTube OAuth state');
    }
    
    const stateData = await stateResponse.json();
    const { state } = stateData;
    const redirectUri = `${window.location.origin}/api/oauth/youtube/callback`;
    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  const handleDisconnect = async (platform: string) => {
    setLoading(platform);
    setError(null);
    setSuccess(null);
    
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
          [platform]: { 
            ...prev[platform], 
            isConnected: false, 
            username: undefined, 
            displayName: undefined, 
            profileImage: undefined 
          }
        }));
        setSuccess(`Successfully disconnected from ${platform}`);
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
      <Card key={platform.id} className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${platform.bgColor} ${platform.color}`}>
                <PlatformIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{platform.name}</h3>
                {isConnected && connection && (
                  <p className="text-sm text-gray-500">
                    {connection.displayName || connection.username}
                  </p>
                )}
                {isDisabledForLite && (
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                    Pro Feature
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDisconnect(platform.id)} 
                    disabled={isLoadingThisPlatform || isDisabledForLite}
                  >
                    {isLoadingThisPlatform ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : null}
                    {isLoadingThisPlatform ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleConnect(platform.id)} 
                    disabled={isLoadingThisPlatform || isDisabledForLite}
                  >
                    {isLoadingThisPlatform ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : null}
                    {isLoadingThisPlatform ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Your Accounts</DialogTitle>
          <DialogDescription>
            Link your social media and e-commerce accounts to get started with content automation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>{success}</span>
            </div>
          )}

          {/* Social Media Platforms */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Social Media Platforms</h3>
            <div className="space-y-3">
              {socialPlatforms.map(platform => renderPlatformCard(platform))}
            </div>
          </div>

          {/* E-Commerce Platforms */}
          <div>
            <h3 className="text-lg font-semibold mb-3">E-Commerce Platforms</h3>
            <div className="space-y-3">
              {commercePlatforms.map(platform => renderPlatformCard(platform))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}