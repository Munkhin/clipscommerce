"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Users, ShoppingCart, Music2, Instagram, Youtube, Twitter, Linkedin, Store, Package, Globe } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { SubscriptionPromptPopup } from "@/components/dashboard/SubscriptionPromptPopup";

const socialPlatforms = [
  { name: "TikTok", id: "tiktok", icon: Music2 },
  { name: "Instagram", id: "instagram", icon: Instagram },
  { name: "YouTube", id: "youtube", icon: Youtube },
  { name: "Twitter", id: "twitter", icon: Twitter },
  { name: "LinkedIn", id: "linkedin", icon: Linkedin },
];

const commercePlatforms = [
  { name: "Shopify", id: "shopify", icon: Store },
  { name: "Amazon", id: "amazon", icon: Package },
  { name: "WooCommerce", id: "woocommerce", icon: Globe },
  { name: "Etsy", id: "etsy", icon: Store },
  { name: "eBay", id: "ebay", icon: Package },
];

export default function ConnectPage() {
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const { user } = useAuth();

  const handleConnect = async (platform: string) => {
    if (user?.user_metadata?.tier === 'lite' && commercePlatforms.some(p => p.id === platform)) {
      setShowSubscriptionPrompt(true);
      return;
    }
    setLoading(platform);
    setError(null);
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1200));
      setConnections((prev) => ({ ...prev, [platform]: true }));
    } catch {
      setError(`Failed to connect to ${platform}`);
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setLoading(platform);
    setError(null);
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 800));
      setConnections((prev) => ({ ...prev, [platform]: false }));
    } catch {
      setError(`Failed to disconnect from ${platform}`);
    } finally {
      setLoading(null);
    }
  };

  const renderPlatformSection = (platforms: typeof socialPlatforms, title: string, icon: React.ReactNode) => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {platforms.map((platform) => {
          const PlatformIcon = platform.icon;
          const isCommercePlatform = commercePlatforms.some(p => p.id === platform.id);
          const isLiteTier = user?.user_metadata?.tier === 'lite';
          const isDisabledForLite = isCommercePlatform && isLiteTier;

          return (
            <div key={platform.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <PlatformIcon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{platform.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {isDisabledForLite && (
                  <span className="text-sm text-yellow-500">Pro Feature</span>
                )}
                {connections[platform.id] ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDisconnect(platform.id)} 
                      disabled={loading === platform.id || isDisabledForLite}
                    >
                      {loading === platform.id ? <Loader2 className="animate-spin h-4 w-4" /> : "Disconnect"}
                    </Button>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleConnect(platform.id)} 
                      disabled={loading === platform.id || isDisabledForLite}
                    >
                      {loading === platform.id ? <Loader2 className="animate-spin h-4 w-4" /> : "Connect"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-6 bg-background text-text flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-creative">Connect Accounts</h1>
        <p className="text-secondaryText">Link your social and e-commerce accounts for seamless workflow integration.</p>
      </div>

      {/* Social Media Platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-creative flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social Media Platforms
        </h2>
        {renderPlatformSection(socialPlatforms, "Social Media Accounts", <Users className="h-5 w-5" />)}
      </div>

      {/* Commerce Platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-creative flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          E-Commerce Platforms
        </h2>
        {renderPlatformSection(commercePlatforms, "E-Commerce Accounts", <ShoppingCart className="h-5 w-5" />)}
      </div>

      {error && <div className="text-red-500 text-center max-w-2xl mx-auto">{error}</div>}
      <SubscriptionPromptPopup 
        isOpen={showSubscriptionPrompt}
        onClose={() => setShowSubscriptionPrompt(false)}
        featureName="E-commerce Integrations"
      />
    </div>
  );
} 