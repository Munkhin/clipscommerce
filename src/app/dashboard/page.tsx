'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, ElementType } from 'react';
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

interface Activity {
  id: string;
  icon: ElementType;
  title: string;
  timestamp: string;
  description: string;
}

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
    <div className="min-h-screen bg-gray-900">
      <WelcomeModal />
      {!isAuthenticated && <LoginPromptPopup isOpen={showLoginPrompt} onClose={closeLoginPrompt} feature={currentFeature} />}
      {!hasFeatureAccess('analyticsAccess') && isAuthenticated && <SubscriptionPromptPopup isOpen={showSubscriptionPrompt} onClose={closeSubscriptionPrompt} featureName={currentFeature || 'analytics'} />}

      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {greeting}, {user?.user_metadata.full_name || user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-gray-400 text-sm flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              {currentTime.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="px-3 sm:px-4 py-2 bg-gray-800 rounded-xl border border-gray-700">
              <span className="text-xs text-gray-400">Current Plan</span>
              <p className="text-sm font-semibold text-white capitalize">{subscriptionTier}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {mainMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className={`
              relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 cursor-pointer transition-all duration-500 group overflow-hidden hover:scale-105
              ${hoveredCard === metric.id 
                ? 'border-purple-500/60 shadow-2xl shadow-purple-500/30 transform -translate-y-2' 
                : 'hover:border-gray-600/60 hover:shadow-xl hover:shadow-gray-900/40'
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
            {/* Enhanced background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4 lg:mb-6">
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className="p-2.5 lg:p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl border border-purple-500/20 group-hover:from-purple-500/30 group-hover:to-blue-500/30 group-hover:border-purple-400/40 transition-all duration-300">
                    <metric.icon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400 group-hover:text-purple-300 group-hover:scale-110 transition-all duration-300" />
                  </div>
                  <div>
                    <span className="text-sm lg:text-base font-medium text-gray-300 group-hover:text-white transition-colors duration-300">{metric.title}</span>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`
                        px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-sm transition-all duration-300
                        ${metric.trend === 'up' 
                          ? 'text-green-300 bg-green-500/20 border border-green-500/30 group-hover:bg-green-500/30' 
                          : 'text-red-300 bg-red-500/20 border border-red-500/30 group-hover:bg-red-500/30'
                        }
                      `}>
                        <span>{metric.change}</span>
                        {metric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 lg:space-y-3">
                <p className="text-2xl lg:text-3xl font-bold text-white group-hover:text-gray-100 transition-colors duration-300">{metric.value}</p>
                <p className="text-sm lg:text-base text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">{metric.description}</p>
              </div>

              {/* Animated accent line */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 group-hover:w-full transition-all duration-500 rounded-b-2xl" />
            </div>
          </div>
        ))}
      </section>

      {/* Quick Actions Section */}
      <section className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg lg:text-xl font-semibold text-white">Quick Actions</h2>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          </div>
          <button className="text-sm text-gray-400 hover:text-white transition-all duration-300 hover:scale-105 px-3 py-1 rounded-lg hover:bg-gray-800/50">View All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {quickActions.map((action, index) => (
            <div
              key={action.name}
              className="
                relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 cursor-pointer 
                transition-all duration-500 group hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 hover:scale-105 overflow-hidden
              "
              onClick={() => handleFeatureClick(action.name, action.href)}
              style={{ 
                opacity: animationStage >= 2 ? 1 : 0, 
                transform: `translateY(${animationStage >= 2 ? 0 : 20}px)`, 
                transitionDelay: `${index * 0.1}s` 
              }}
            >
              {/* Enhanced background gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4 lg:mb-6">
                  <div className="p-3 lg:p-4 bg-gradient-to-br from-purple-500/90 to-blue-500/90 rounded-xl shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 group-hover:scale-110 transition-all duration-300">
                    <action.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 group-hover:text-purple-300 group-hover:translate-x-2 group-hover:scale-110 transition-all duration-300" />
                </div>
                
                <div className="space-y-2 lg:space-y-3">
                  <h3 className="text-base lg:text-lg font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 leading-relaxed transition-colors duration-300">{action.description}</p>
                </div>

                {/* Animated accent line */}
                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 group-hover:w-full transition-all duration-500 rounded-b-2xl" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {/* Performance Trends */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 group">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 lg:mb-6">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              <h3 className="text-base lg:text-lg font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">Sales Performance</h3>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4 text-xs lg:text-sm">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Sales</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300">Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-48 lg:h-64 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <LineChartComponent data={salesData} />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 shadow-xl hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 group">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 lg:mb-6">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              <h3 className="text-base lg:text-lg font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">Engagement Over Time</h3>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4 text-xs lg:text-sm">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Views</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">Likes</span>
              </div>
            </div>
          </div>
          <div className="h-48 lg:h-64 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-yellow-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <BarChartComponent data={engagementData} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 mb-6 lg:mb-8 group">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-base lg:text-lg font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">Recent Activity</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          <button className="text-sm text-gray-400 hover:text-white transition-all duration-300 hover:scale-105 px-3 py-1 rounded-lg hover:bg-gray-800/50">View All</button>
        </div>
        <div className="space-y-3 lg:space-y-4">
          {recentActivity.map((activity: Activity, index: number) => (
            <div key={activity.id} className="flex items-start space-x-3 lg:space-x-4 p-3 lg:p-4 bg-gray-700/30 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 border border-gray-600/20 hover:border-gray-600/40 transition-all duration-300 group/item hover:scale-[1.02] hover:-translate-y-0.5">
              <div className="p-2 lg:p-2.5 bg-gradient-to-br from-gray-600/80 to-gray-700/80 backdrop-blur-sm rounded-lg flex-shrink-0 border border-gray-500/20 group-hover/item:from-purple-500/20 group-hover/item:to-blue-500/20 group-hover/item:border-purple-500/30 transition-all duration-300">
                <activity.icon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-300 group-hover/item:text-purple-300 transition-colors duration-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-white group-hover/item:text-gray-100 truncate transition-colors duration-300">{activity.title}</p>
                  <span className="text-xs text-gray-400 group-hover/item:text-gray-300 mt-1 sm:mt-0 flex-shrink-0 transition-colors duration-300">{activity.timestamp}</span>
                </div>
                <p className="text-sm text-gray-400 group-hover/item:text-gray-300 mt-1 transition-colors duration-300">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Tracker */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg mb-8"
        style={{ 
          opacity: animationStage >= 4 ? 1 : 0, 
          transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, 
          transitionDelay: '0.7s' 
        }}
      >
        <UsageTracker />
      </div>

      {/* Additional Components */}
      <div className="space-y-8">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg"
          style={{ 
            opacity: animationStage >= 4 ? 1 : 0, 
            transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, 
            transitionDelay: '0.8s' 
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Actionable Insights</h3>
          <div className="text-gray-400">
            <p>AI-powered insights and recommendations will appear here.</p>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg"
          style={{ 
            opacity: animationStage >= 4 ? 1 : 0, 
            transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, 
            transitionDelay: '0.9s' 
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Workflow Tasks</h3>
          <div className="text-gray-400">
            <p>Your workflow tasks and progress will be displayed here.</p>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg"
          style={{ 
            opacity: animationStage >= 4 ? 1 : 0, 
            transform: `translateY(${animationStage >= 4 ? 0 : 20}px)`, 
            transitionDelay: '1.0s' 
          }}
        >
          <AutopostScheduler />
        </div>
      </div>
    </div>
  );
}
