import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Zap, Clock, Users, Eye, Heart, Share2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Performance Optimization UI Components
 * Provides visual feedback for performance metrics and optimization
 */

interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

interface PerformanceScoreProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function PerformanceScore({ 
  score, 
  maxScore = 100, 
  size = 'md', 
  showLabel = true,
  className 
}: PerformanceScoreProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSize = (size: string) => {
    switch (size) {
      case 'sm': return 'w-16 h-16';
      case 'lg': return 'w-32 h-32';
      default: return 'w-24 h-24';
    }
  };

  const getTextSize = (size: string) => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'lg': return 'text-2xl';
      default: return 'text-lg';
    }
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={`relative ${getSize(size)}`}>
        <svg
          className="transform -rotate-90 w-full h-full"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(getColor(score), 'transition-all duration-1000')}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', getColor(score), getTextSize(size))}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground mt-2">Performance Score</span>
      )}
    </div>
  );
}

interface MetricCardProps {
  metric: PerformanceMetric;
  className?: string;
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const progress = Math.min((metric.value / metric.target) * 100, 100);
  const isAboveTarget = metric.value >= metric.target;

  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
        {getTrendIcon()}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold">
            {metric.value.toLocaleString()}
          </span>
          {metric.unit && (
            <span className="text-sm text-muted-foreground mb-1">{metric.unit}</span>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Target: {metric.target.toLocaleString()}{metric.unit}
            </span>
            <span className={isAboveTarget ? 'text-green-600' : 'text-yellow-600'}>
              {progress.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              'h-2',
              isAboveTarget ? 'text-green-500' : 'text-yellow-500'
            )} 
          />
        </div>

        {metric.change && (
          <div className="flex items-center gap-1 text-xs">
            {metric.trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(metric.change)}% from last period
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

interface OptimizationSuggestionProps {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  onApply?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function OptimizationSuggestion({
  title,
  description,
  impact,
  effort,
  onApply,
  onDismiss,
  className
}: OptimizationSuggestionProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card className={cn('p-4 border-l-4 border-l-blue-500', className)}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h4 className="font-medium text-foreground">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Dismiss suggestion"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getImpactColor(impact)}>
            {impact} impact
          </Badge>
          <Badge variant="secondary" className={getEffortColor(effort)}>
            {effort} effort
          </Badge>
        </div>

        {onApply && (
          <button
            onClick={onApply}
            className="w-full text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded border border-blue-200"
          >
            Apply Suggestion
          </button>
        )}
      </div>
    </Card>
  );
}

interface EngagementMetricsProps {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  className?: string;
}

export function EngagementMetrics({ 
  views, 
  likes, 
  shares, 
  comments, 
  className 
}: EngagementMetricsProps) {
  const metrics = [
    { icon: Eye, value: views, label: 'Views', color: 'text-blue-500' },
    { icon: Heart, value: likes, label: 'Likes', color: 'text-red-500' },
    { icon: Share2, value: shares, label: 'Shares', color: 'text-green-500' },
    { icon: MessageCircle, value: comments, label: 'Comments', color: 'text-purple-500' },
  ];

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="text-center space-y-2 p-3 rounded-lg bg-muted/50">
            <Icon className={cn('h-6 w-6 mx-auto', metric.color)} />
            <div>
              <p className="text-lg font-bold">{formatValue(metric.value)}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PerformanceDashboardProps {
  overallScore: number;
  metrics: PerformanceMetric[];
  suggestions: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }>;
  engagement?: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  className?: string;
}

export function PerformanceDashboard({
  overallScore,
  metrics,
  suggestions,
  engagement,
  className
}: PerformanceDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with overall score */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Performance Dashboard</h2>
            <p className="text-muted-foreground">
              Track your content performance and optimization opportunities
            </p>
          </div>
          <PerformanceScore score={overallScore} size="lg" />
        </div>
      </Card>

      {/* Engagement metrics */}
      {engagement && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Engagement Overview</h3>
          <EngagementMetrics {...engagement} />
        </Card>
      )}

      {/* Individual metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Optimization suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Optimization Suggestions</h3>
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <OptimizationSuggestion
                key={index}
                {...suggestion}
                onApply={() => console.log(`Applied: ${suggestion.title}`)}
                onDismiss={() => console.log(`Dismissed: ${suggestion.title}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Real-time performance indicator
interface RealTimeIndicatorProps {
  isProcessing: boolean;
  currentTask?: string;
  className?: string;
}

export function RealTimeIndicator({ 
  isProcessing, 
  currentTask = "Processing content...", 
  className 
}: RealTimeIndicatorProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
      <span>{currentTask}{dots}</span>
    </div>
  );
}