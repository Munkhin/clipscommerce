'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Lightbulb, 
  Send, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Crown,
  Infinity
} from 'lucide-react';
import { usageLimitsService, type SubscriptionTier } from '@/lib/usage-limits';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

interface UsageStats {
  tier: SubscriptionTier;
  usage: {
    viralBlitzCycleUsed: number;
    ideaGeneratorUsed: number;
    autopostsUsed: number;
    lastReset: Date;
    currentPeriodStart: Date;
  };
  remainingUsage: {
    viralBlitzCycle: number | 'unlimited';
    ideaGenerator: number | 'unlimited';
    autoposts: number | 'unlimited';
  };
  nextReset: Date;
}

interface FeatureCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  gradient: string;
  isUnlimited?: boolean;
}

const FeatureCard = ({ title, icon: Icon, used, limit, remaining, gradient, isUnlimited }: FeatureCardProps) => {
  const percentage = isUnlimited || limit === 'unlimited' ? 100 : (used / (limit as number)) * 100;
  const isAtLimit = !isUnlimited && remaining === 0;
  const isNearLimit = !isUnlimited && typeof remaining === 'number' && remaining <= 2;

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${gradient} bg-opacity-20`}>
              <Icon className="h-4 w-4 text-[#5afcc0]" />
            </div>
            <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
          </div>
          {isUnlimited && (
            <Badge variant="secondary" className="bg-[#8D5AFF]/20 text-[#8D5AFF] text-xs">
              <Infinity className="h-3 w-3 mr-1" />
              Unlimited
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">
              {used}
              {!isUnlimited && <span className="text-sm text-neutral-400 ml-1">/ {limit}</span>}
            </span>
            {isAtLimit ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : isNearLimit ? (
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            ) : (
              <CheckCircle className="h-5 w-5 text-[#5afcc0]" />
            )}
          </div>
          
          {!isUnlimited && (
            <Progress 
              value={Math.min(percentage, 100)} 
              className="h-2"
            />
          )}
          
          <div className="text-xs text-neutral-400">
            {isUnlimited ? (
              'No usage limits'
            ) : isAtLimit ? (
              'Limit reached - upgrade to continue'
            ) : (
              `${remaining} remaining this month`
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function UsageTracker() {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState('lite');

  useEffect(() => {
    if (user) {
      const tier = (user as any)?.user_metadata?.subscription_tier || 'lite';
      setSubscriptionTier(tier);
      loadUsageStats();
    }
  }, [user]);

  const loadUsageStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const stats = await usageLimitsService.getUsageSummary(user.id, subscriptionTier);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNextReset = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700">
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#5afcc0]"></div>
        </CardContent>
      </Card>
    );
  }

  if (!usageStats) {
    return null;
  }

  const features = [
    {
      title: 'Viral Blitz Cycle',
      icon: Zap,
      used: usageStats.usage.viralBlitzCycleUsed,
      limit: usageStats.tier.limits.viralBlitzCycle,
      remaining: usageStats.remainingUsage.viralBlitzCycle,
      gradient: 'from-purple-500 to-indigo-500',
      isUnlimited: usageStats.tier.limits.viralBlitzCycle === -1,
    },
    {
      title: 'Idea Generator',
      icon: Lightbulb,
      used: usageStats.usage.ideaGeneratorUsed,
      limit: usageStats.tier.limits.ideaGenerator,
      remaining: usageStats.remainingUsage.ideaGenerator,
      gradient: 'from-[#8D5AFF] to-[#5afcc0]',
      isUnlimited: usageStats.tier.limits.ideaGenerator === -1,
    },
    {
      title: 'Auto Posts',
      icon: Send,
      used: usageStats.usage.autopostsUsed,
      limit: usageStats.tier.limits.autoposts,
      remaining: usageStats.remainingUsage.autoposts,
      gradient: 'from-[#5afcc0] to-blue-500',
      isUnlimited: usageStats.tier.limits.autoposts === -1,
    },
  ];

  const hasLimits = features.some(f => !f.isUnlimited);
  const hasReachedLimits = features.some(f => !f.isUnlimited && f.remaining === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] bg-opacity-20">
                <TrendingUp className="h-5 w-5 text-[#5afcc0]" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Usage Overview</CardTitle>
                <p className="text-sm text-neutral-400">
                  Current plan: <span className="text-[#8D5AFF] font-medium">{usageStats.tier.name}</span>
                </p>
              </div>
            </div>
            
            {hasLimits && (
              <div className="text-right">
                <div className="flex items-center text-sm text-neutral-400 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Resets in {formatNextReset(usageStats.nextReset)}
                </div>
                <p className="text-xs text-neutral-500">
                  Next billing cycle: {usageStats.nextReset.toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Feature Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>

      {/* Upgrade Prompt */}
      {hasReachedLimits && (
        <Card className="bg-gradient-to-r from-[#8D5AFF]/10 to-[#5afcc0]/10 border-[#8D5AFF]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-[#8D5AFF]" />
                <div>
                  <h3 className="font-bold text-white">Usage Limit Reached</h3>
                  <p className="text-neutral-400 text-sm">
                    Upgrade your plan to unlock unlimited usage and advanced features.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription">
                <Button className="bg-gradient-to-r from-[#8D5AFF] to-[#5afcc0] text-white hover:opacity-90">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Access Status */}
      <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-white">Feature Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${usageStats.tier.limits.ecommerceAccess ? 'bg-[#5afcc0]/20' : 'bg-neutral-700'}`}>
                <TrendingUp className={`h-4 w-4 ${usageStats.tier.limits.ecommerceAccess ? 'text-[#5afcc0]' : 'text-neutral-400'}`} />
              </div>
              <div>
                <p className="font-medium text-white">E-commerce Integration</p>
                <p className="text-xs text-neutral-400">
                  {usageStats.tier.limits.ecommerceAccess ? 'Available' : 'Not available'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-[#5afcc0]/20">
                <TrendingUp className="h-4 w-4 text-[#5afcc0]" />
              </div>
              <div>
                <p className="font-medium text-white">Analytics</p>
                <p className="text-xs text-neutral-400">
                  {usageStats.tier.limits.analyticsAccess === 'basic' ? 'Basic access' : 'Advanced access'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${usageStats.tier.limits.teamDashboard ? 'bg-[#5afcc0]/20' : 'bg-neutral-700'}`}>
                <Crown className={`h-4 w-4 ${usageStats.tier.limits.teamDashboard ? 'text-[#5afcc0]' : 'text-neutral-400'}`} />
              </div>
              <div>
                <p className="font-medium text-white">Team Dashboard</p>
                <p className="text-xs text-neutral-400">
                  {usageStats.tier.limits.teamDashboard ? 'Available' : 'Not available'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
