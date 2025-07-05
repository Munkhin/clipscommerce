'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import GlassCard from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Zap, 
  BarChart3, 
  RefreshCw, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  Rocket,
  Activity, 
  Eye, 
  Heart, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Bot, 
  Gauge, 
  LineChart,
  Play,
  Settings,
  Bell,
  ChevronRight,
  MoreHorizontal,
  ShoppingBag,
  Video,
  MessageSquare,
  Share2,
  Filter,
  PlusCircle,
  ArrowUpRight,
  Star,
  Globe,
  Briefcase
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ChartWrapper } from '@/components/ui/chart-wrapper';
import { LineChartComponent, BarChartComponent } from '@/components/dashboard/charts';
import UsageTracker from '@/components/dashboard/UsageTracker';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useFeatureUsage } from '@/hooks/useFeatureUsage';
import { LoginPromptPopup } from '@/components/dashboard/LoginPromptPopup';
import { SubscriptionPromptPopup } from '@/components/dashboard/SubscriptionPromptPopup';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { AutopostScheduler } from '@/components/dashboard/autopost/AutopostScheduler';

export default function DashboardPage() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('Hello');
  const [analytics, setAnalytics] = useState<any>(undefined);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [animationStage, setAnimationStage] = useState(0);
  const [realtimeData, setRealtimeData] = useState({
    revenue: 0,
    revenueGrowth: 0,
    orders: 0,
    ordersGrowth: 0,
    conversion: 0,
    conversionGrowth: 0,
    visitors: 0,
    visitorsGrowth: 0
  });

  const subscriptionTier = user?.user_metadata?.subscription_tier || 'lite';
  const { hasFeatureAccess, tier } = useUsageLimits(subscriptionTier);
  
  const {
    checkFeatureAccess,
    recordFeatureUsage,
    showLoginPrompt,
    showSubscriptionPrompt,
    currentFeature,
    closeLoginPrompt,
    closeSubscriptionPrompt,
    isAuthenticated
  } = useFeatureUsage();

  // Staggered animation entrance
  useEffect(() => {
    const stages = [0, 1, 2, 3, 4];
    stages.forEach((stage, index) => {
      setTimeout(() => setAnimationStage(stage), index * 150);
    });
  }, []);

  // Get time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Real-time data updates
  useEffect(() => {
    const supabase = createClient();

    async function fetchInitialData() {
      const { data, error } = await supabase.from('realtime_metrics').select('*');
      if (error) {
        console.error('Error fetching initial real-time data:', error);
      } else {
        const initialData = data.reduce((acc: { revenue: number; revenueGrowth: number; orders: number; ordersGrowth: number; conversion: number; conversionGrowth: number; visitors: number; visitorsGrowth: number }, metric: { metric_name: string; value: number }) => {
          acc[metric.metric_name as keyof typeof acc] = metric.value;
          return acc;
        }, {} as { revenue: number; revenueGrowth: number; orders: number; ordersGrowth: number; conversion: number; conversionGrowth: number; visitors: number; visitorsGrowth: number });
        setRealtimeData(initialData);
      }
    }

    fetchInitialData();

    const channel = supabase
      .channel('realtime-metrics')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'realtime_metrics' }, (payload: { new: { metric_name: string; value: number } }) => {
        setRealtimeData((prev) => ({
          ...prev,
          [payload.new.metric_name as keyof typeof prev]: payload.new.value,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;
      setLoading(true);
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        
        const response = await fetch(`/api/analytics/reports?userId=${user.id}&platform=tiktok&startDate=${start}&endDate=${end}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const result = await response.json();
        
        if (result.success && result.data) {
          setAnalytics(result.data);
          
          // Update realtime data with analytics data if available
          if (result.data?.summary) {
            const summary = result.data.summary;
            setRealtimeData(prev => ({
              ...prev,
              orders: summary.totalPosts || prev.orders,
              ordersGrowth: Math.min(summary.avgEngagementRate || prev.ordersGrowth, 100),
              visitors: summary.totalEngagement || prev.visitors,
              visitorsGrowth: Math.min(summary.followersGrowth || prev.visitorsGrowth, 100),
            }));
          }
        } else {
          console.error('Analytics API error:', result.error);
          // Set empty analytics to prevent infinite loading
          setAnalytics({ summary: null, contentPerformance: [], timeSeries: [] });
        }
      } catch (err: unknown) {
        console.error('Analytics error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [user]);

  const handleFeatureClick = (featureName: string, href: string) => {
    if (checkFeatureAccess(featureName)) {
      recordFeatureUsage(featureName);
      window.location.href = href;
    }
  };

  // Main metrics with e-commerce focus
  const mainMetrics = [
    {
      id: 'revenue',
      title: 'Revenue',
      value: `${realtimeData.revenue.toLocaleString()}`,
      change: `+${realtimeData.revenueGrowth.toFixed(1)}%`,
      trend: 'up',
      icon: DollarSign,
      description: 'Total sales this month',
      color: 'green',
    },
    {
      id: 'orders',
      title: 'Orders',
      value: realtimeData.orders.toLocaleString(),
      change: `+${realtimeData.ordersGrowth.toFixed(1)}%`,
      trend: 'up',
      icon: ShoppingBag,
      description: 'New orders today',
      color: 'blue',
    },
    {
      id: 'conversion',
      title: 'Conversion Rate',
      value: `${realtimeData.conversion.toFixed(2)}%`,
      change: `+${realtimeData.conversionGrowth.toFixed(1)}%`,
      trend: 'up',
      icon: Target,
      description: 'Visitor to customer rate',
      color: 'green',
    },
    {
      id: 'visitors',
      title: 'Visitors',
      value: realtimeData.visitors.toLocaleString(),
      change: `+${realtimeData.visitorsGrowth.toFixed(1)}%`,
      trend: 'up',
      icon: Users,
      description: 'Unique visitors today',
      color: 'purple',
    },
  ];

  // Quick actions optimized for e-commerce
  const quickActions = [
    {
      name: 'upload-video',
      title: 'Upload New Product Video',
      description: 'Kickstart your content creation with a new video.',
      icon: Upload,
      href: '/dashboard/accelerate',
    },
    {
      name: 'optimize-listing',
      title: 'Optimize Listing for SEO',
      description: 'Enhance your product visibility with AI-driven SEO.',
      icon: Sparkles,
      href: '/dashboard/blitz',
    },
    {
      name: 'generate-ideas',
      title: 'Generate AI Content Ideas',
      description: 'Get fresh, viral content concepts instantly.',
      icon: Bot,
      href: '/dashboard/ideator',
    },
    {
      name: 'schedule-posts',
      title: 'Schedule Social Posts',
      description: 'Plan and automate your social media presence.',
      icon: Calendar,
      href: '/dashboard/cycle',
    },
  ];

  // Generate recent activity from analytics data
  const recentActivity = analytics?.contentPerformance?.slice(0, 4).map((content: any, index: number) => ({
    id: content.id || `activity-${index}`,
    icon: content.metrics?.engagementRate > 5 ? TrendingUp : content.platform === 'tiktok' ? Video : Upload,
    title: content.metrics?.engagementRate > 5 ? 'High Engagement Content' : 'Content Published',
    timestamp: content.publishedAt ? new Date(content.publishedAt).toLocaleDateString() : `${index + 1} days ago`,
    description: content.content ? `"${content.content.substring(0, 50)}..." on ${content.platform}` : 'Content activity',
  })) || (
    // Only use fallback data if no analytics data is available
    !analytics ? [
    {
      id: '1',
      icon: DollarSign,
      title: 'New Sale Generated',
      timestamp: '2 minutes ago',
      description: 'Product X sold for $59.99',
    },
    {
      id: '2',
      icon: Sparkles,
      title: 'Listing Optimized',
      timestamp: '1 hour ago',
      description: 'AI improved SEO for "Summer Dress."',
    },
    {
      id: '3',
      icon: Bell,
      title: 'New System Alert',
      timestamp: 'Yesterday',
      description: 'High engagement on product Y. Consider boosting.',
    },
    {
      id: '4',
      icon: Upload,
      title: 'Video Processed',
      timestamp: '3 days ago',
      description: '"Fall Collection" video ready for review.',
    },
  ] : []
  );

  // Transform analytics data for charts
  const salesData = analytics?.timeSeries?.map((item: any, index: number) => ({
    name: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short' }) : `Day ${index + 1}`,
    sales: item.metrics?.reach || 0,
    revenue: item.metrics?.impressions || 0,
  })) || (
    // Only use fallback data if no analytics data is available
    !analytics ? [
      { name: 'Jan', sales: 4000, revenue: 2400 },
      { name: 'Feb', sales: 3000, revenue: 1398 },
      { name: 'Mar', sales: 2000, revenue: 9800 },
      { name: 'Apr', sales: 2780, revenue: 3908 },
      { name: 'May', sales: 1890, revenue: 4800 },
      { name: 'Jun', sales: 2390, revenue: 3800 },
      { name: 'Jul', sales: 3490, revenue: 4300 },
    ] : []
  );

  const engagementData = analytics?.timeSeries?.slice(-7).map((item: any, index: number) => ({
    name: item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    views: item.metrics?.impressions || 0,
    likes: item.metrics?.likes || 0,
  })) || (
    // Only use fallback data if no analytics data is available
    !analytics ? [
      { name: 'Mon', views: 2400, likes: 1200 },
      { name: 'Tue', views: 1398, likes: 800 },
      { name: 'Wed', views: 9800, likes: 5000 },
      { name: 'Thu', views: 3908, likes: 2000 },
      { name: 'Fri', views: 4800, likes: 2500 },
      { name: 'Sat', views: 3800, likes: 1800 },
      { name: 'Sun', views: 4300, likes: 2100 },
    ] : []
  );

  return (
    <div className="min-h-screen">
      <WelcomeModal />
      {!isAuthenticated && <LoginPromptPopup isOpen={showLoginPrompt} onClose={closeLoginPrompt} feature={currentFeature} />}
      {!hasFeatureAccess('analyticsAccess') && isAuthenticated && <SubscriptionPromptPopup isOpen={showSubscriptionPrompt} onClose={closeSubscriptionPrompt} featureName={currentFeature || 'analytics'} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#111827] mb-2" style={{ fontFamily: 'cursive' }}>
          {greeting}, {user?.user_metadata.full_name || user?.email || 'User'}!
        </h1>
        <p className="text-[#6B7280] text-sm">{currentTime.toLocaleString()}</p>
      </div>

      {/* Key Metrics Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mainMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className={`
              bg-white border-2 border-[#E5E7EB] rounded-xl p-6 cursor-pointer transition-all duration-200
              ${hoveredCard === metric.id 
                ? 'border-[#8B5CF6] shadow-[0_4px_12px_rgba(139,92,246,0.15)] transform -translate-y-0.5' 
                : 'shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[#8B5CF6]'
              }
            `}
            onMouseEnter={() => setHoveredCard(metric.id)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ 
              opacity: animationStage >= 1 ? 1 : 0, 
              transform: `translateY(${animationStage >= 1 ? 0 : 20}px)`, 
              transitionDelay: `${index * 0.1}s` 
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <metric.icon className="w-5 h-5 text-[#6B7280]" />
                <span className="text-sm font-medium text-[#6B7280]">{metric.title}</span>
              </div>
              <span className={`
                px-2 py-1 rounded text-xs font-semibold
                ${metric.trend === 'up' 
                  ? 'text-[#059669] bg-[rgba(5,150,105,0.1)]' 
                  : 'text-[#DC2626] bg-[rgba(220,38,38,0.1)]'
                }
              `}>
                {metric.change}
                {metric.trend === 'up' ? <TrendingUp className="ml-1 h-3 w-3 inline" /> : <TrendingDown className="ml-1 h-3 w-3 inline" />}
              </span>
            </div>
            <p className="text-3xl font-bold text-[#111827] mb-2">{metric.value}</p>
            <p className="text-sm text-[#6B7280]">{metric.description}</p>
          </div>
        ))}
      </section>

      {/* Quick Actions Section */}
      <section className="mb-8">
        <h2 className="text-[20px] font-semibold text-[#111827] mb-6" style={{ fontFamily: 'cursive' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickActions.map((action, index) => (
            <div
              key={action.name}
              className="
                relative bg-white border-2 border-[#E5E7EB] rounded-xl p-6 cursor-pointer 
                transition-all duration-200 group hover:border-[#8B5CF6] 
                hover:shadow-[0_4px_12px_rgba(139,92,246,0.15)] hover:-translate-y-0.5
              "
              onClick={() => handleFeatureClick(action.name, action.href)}
              style={{ 
                opacity: animationStage >= 2 ? 1 : 0, 
                transform: `translateY(${animationStage >= 2 ? 0 : 20}px)`, 
                transitionDelay: `${index * 0.15}s` 
              }}
            >
              <div className="absolute top-4 right-4 w-6 h-6 bg-[#8B5CF6] rounded flex items-center justify-center">
                <action.icon className="w-3 h-3 text-white" />
              </div>
              <h3 className="text-[20px] font-semibold text-[#111827] mb-2 pr-8">
                {action.title}
              </h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{action.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Trends */}
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-[18px] font-semibold text-[#111827] mb-4">Sales Performance</h3>
          <LineChartComponent data={salesData} />
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-[18px] font-semibold text-[#111827] mb-4">Engagement Over Time</h3>
          <BarChartComponent data={engagementData} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-[18px] font-semibold text-[#111827] mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <activity.icon className="w-5 h-5 text-[#6B7280] mt-1" />
              <div>
                <p className="font-medium text-[#111827]">{activity.title}</p>
                <p className="text-sm text-[#6B7280]">{activity.description}</p>
                <p className="text-xs text-[#6B7280]">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Tracker */}
      <GlassCard
        style={{ opacity: animationStage >= 4 ? 1 : 0, transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, transitionDelay: '0.7s' }}
      >
        <div className="p-6">
          <UsageTracker />
        </div>
      </GlassCard>

      {/* Insert ActionableInsights and WorkflowTaskList GlassCard widgets after Recent Activity and UsageTracker sections */}
      <GlassCard
        className="mt-8"
        style={{ opacity: animationStage >= 4 ? 1 : 0, transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, transitionDelay: '0.8s' }}
      >
        <div className="p-6">
          {/* ActionableInsights content */}
        </div>
      </GlassCard>

      <GlassCard
        className="mt-8"
        style={{ opacity: animationStage >= 4 ? 1 : 0, transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, transitionDelay: '0.9s' }}
      >
        <div className="p-6">
          {/* WorkflowTaskList content */}
        </div>
      </GlassCard>

      <GlassCard
        className="mt-8"
        style={{ opacity: animationStage >= 4 ? 1 : 0, transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, transitionDelay: '1.0s' }}
      >
        <div className="p-6">
          <AutopostScheduler />
        </div>
      </GlassCard>
    </div>
  );
}
