'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Header from '@/components/dashboard/Header';
import Sidebar from '@/components/dashboard/Sidebar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign,
  ArrowRight,
  Calendar,
  Target,
  Zap
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      let greeting = 'Good morning';
      
      if (hours >= 12 && hours < 18) {
        greeting = 'Good afternoon';
      } else if (hours >= 18) {
        greeting = 'Good evening';
      }
      
      setCurrentTime(greeting);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8D5AFF]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userName = user.user_metadata?.full_name?.split(' ')[0] || 
                   user.email?.split('@')[0] || 
                   'there';

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Greeting Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {currentTime}, {userName}
              </h1>
              <p className="text-gray-400">
                Welcome back to your dashboard. Here's what's happening with your account.
              </p>
            </div>

            {/* Onboarding Progress */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Getting Started</CardTitle>
                <CardDescription className="text-gray-400">
                  Complete your setup to unlock all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Setup Progress</span>
                    <span className="text-sm text-gray-400">2 of 5 completed</span>
                  </div>
                  <Progress value={40} className="h-2" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        Complete
                      </Badge>
                      <span className="text-sm text-gray-300">Account Created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        Complete
                      </Badge>
                      <span className="text-sm text-gray-300">Email Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-gray-600 text-gray-400">
                        Pending
                      </Badge>
                      <span className="text-sm text-gray-300">Connect Social Media</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">Sell Better</CardTitle>
                    <Zap className="h-5 w-5 text-purple-400" />
                  </div>
                  <CardDescription className="text-gray-400">
                    AI-powered content optimization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-700 hover:bg-gray-800"
                    onClick={() => router.push('/dashboard/accelerate')}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">How to Sell</CardTitle>
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                  <CardDescription className="text-gray-400">
                    Strategic insights and tactics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-700 hover:bg-gray-800"
                    onClick={() => router.push('/dashboard/ideator')}
                  >
                    Explore
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">Schedule</CardTitle>
                    <Calendar className="h-5 w-5 text-green-400" />
                  </div>
                  <CardDescription className="text-gray-400">
                    Automated posting calendar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-700 hover:bg-gray-800"
                    onClick={() => router.push('/dashboard/blitz')}
                  >
                    View Calendar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">$0</div>
                  <p className="text-sm text-gray-400">+0% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Conversion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">0%</div>
                  <p className="text-sm text-gray-400">+0% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-purple-400" />
                    Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">0</div>
                  <p className="text-sm text-gray-400">+0% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">$0</div>
                  <p className="text-sm text-gray-400">+0% from last month</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}