import React from 'react';
import { 
  FileVideo, 
  Upload, 
  Users, 
  BarChart3, 
  Search, 
  Plus, 
  Play, 
  Zap,
  Calendar,
  MessageSquare,
  Settings,
  Star,
  TrendingUp,
  Clock,
  Target,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Empty States Components
 * Provides engaging empty states to guide users toward taking action
 */

interface BaseEmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

interface EmptyStateProps extends BaseEmptyStateProps {
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction, 
  className, 
  children 
}: EmptyStateProps) {
  return (
    <div className={cn('text-center p-8 space-y-6', className)} role="region" aria-label="Empty state">
      {icon && (
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
      )}
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</p>
        )}
      </div>

      {children}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <Button 
              onClick={action.onClick} 
              variant={action.variant || 'default'}
              aria-label={action.label}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick} 
              variant="outline"
              aria-label={secondaryAction.label}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface NoVideosEmptyProps extends BaseEmptyStateProps {
  onUpload?: () => void;
  onLearnMore?: () => void;
  showUploadTips?: boolean;
}

export function NoVideosEmpty({ 
  title = "No videos yet", 
  description = "Upload your first video to get started with AI-powered optimization",
  onUpload, 
  onLearnMore,
  showUploadTips = true,
  className, 
  children 
}: NoVideosEmptyProps) {
  return (
    <EmptyState
      icon={<FileVideo className="h-8 w-8 text-muted-foreground" />}
      title={title}
      description={description}
      action={onUpload ? {
        label: "Upload Videos",
        onClick: onUpload
      } : undefined}
      secondaryAction={onLearnMore ? {
        label: "Learn More",
        onClick: onLearnMore
      } : undefined}
      className={className}
    >
      {children}
      {showUploadTips && (
        <div className="text-left max-w-sm mx-auto mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Upload Tips:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Support for MP4, MOV, AVI formats</li>
            <li>• Maximum file size: 100MB</li>
            <li>• Best results with clear audio</li>
            <li>• Vertical videos work great for social media</li>
          </ul>
        </div>
      )}
    </EmptyState>
  );
}

interface NoDataEmptyProps extends BaseEmptyStateProps {
  onRefresh?: () => void;
  onConfigure?: () => void;
  type?: 'analytics' | 'reports' | 'clients' | 'performance';
}

export function NoDataEmpty({ 
  title,
  description,
  onRefresh,
  onConfigure,
  type = 'analytics',
  className,
  children 
}: NoDataEmptyProps) {
  const getTypeDefaults = (dataType: string) => {
    switch (dataType) {
      case 'reports':
        return {
          icon: <BarChart3 className="h-8 w-8 text-muted-foreground" />,
          title: 'No reports available',
          description: 'Generate your first report to see performance insights and analytics data here.'
        };
      case 'clients':
        return {
          icon: <Users className="h-8 w-8 text-muted-foreground" />,
          title: 'No clients added',
          description: 'Add your first client to start managing their content and tracking performance.'
        };
      case 'performance':
        return {
          icon: <TrendingUp className="h-8 w-8 text-muted-foreground" />,
          title: 'No performance data',
          description: 'Performance metrics will appear here once your content starts receiving engagement.'
        };
      default:
        return {
          icon: <BarChart3 className="h-8 w-8 text-muted-foreground" />,
          title: 'No analytics data',
          description: 'Analytics data will appear here once you have active content and engagement.'
        };
    }
  };

  const defaults = getTypeDefaults(type);

  return (
    <EmptyState
      icon={defaults.icon}
      title={title || defaults.title}
      description={description || defaults.description}
      action={onRefresh ? {
        label: "Refresh Data",
        onClick: onRefresh,
        variant: 'outline'
      } : undefined}
      secondaryAction={onConfigure ? {
        label: "Configure Settings",
        onClick: onConfigure
      } : undefined}
      className={className}
    >
      {children}
    </EmptyState>
  );
}

interface NoResultsEmptyProps extends BaseEmptyStateProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  onTryDifferentSearch?: () => void;
  suggestions?: string[];
}

export function NoResultsEmpty({ 
  title,
  description,
  searchTerm,
  onClearSearch,
  onTryDifferentSearch,
  suggestions = [],
  className,
  children 
}: NoResultsEmptyProps) {
  const defaultTitle = searchTerm ? `No results for "${searchTerm}"` : "No results found";
  const defaultDescription = "Try adjusting your search terms or filters to find what you're looking for.";

  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-muted-foreground" />}
      title={title || defaultTitle}
      description={description || defaultDescription}
      action={onClearSearch ? {
        label: "Clear Search",
        onClick: onClearSearch,
        variant: 'outline'
      } : undefined}
      secondaryAction={onTryDifferentSearch ? {
        label: "Browse All",
        onClick: onTryDifferentSearch
      } : undefined}
      className={className}
    >
      {children}
      {suggestions.length > 0 && (
        <div className="text-left max-w-sm mx-auto mt-4">
          <p className="text-xs text-muted-foreground mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((suggestion, index) => (
              <span 
                key={index}
                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded cursor-pointer hover:bg-muted/80"
                onClick={() => onTryDifferentSearch?.()}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}
    </EmptyState>
  );
}

interface FirstTimeEmptyProps extends BaseEmptyStateProps {
  onGetStarted?: () => void;
  onWatchDemo?: () => void;
  steps?: { icon: React.ReactNode; title: string; description: string }[];
}

export function FirstTimeEmpty({ 
  title = "Welcome to ClipsCommerce!",
  description = "Let's get you started with AI-powered video optimization",
  onGetStarted,
  onWatchDemo,
  steps = [],
  className,
  children 
}: FirstTimeEmptyProps) {
  const defaultSteps = [
    {
      icon: <Upload className="h-5 w-5 text-primary" />,
      title: "Upload Videos",
      description: "Add your video content to get started"
    },
    {
      icon: <Zap className="h-5 w-5 text-primary" />,
      title: "AI Optimization",
      description: "Our AI analyzes and optimizes your content"
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      title: "Track Performance",
      description: "Monitor engagement and growth metrics"
    }
  ];

  const finalSteps = steps.length > 0 ? steps : defaultSteps;

  return (
    <div className={cn('text-center p-8 space-y-8', className)} role="region" aria-label="Getting started">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Star className="h-10 w-10 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {description && (
          <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
        )}
      </div>

      {finalSteps.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          {finalSteps.map((step, index) => (
            <div key={index} className="space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {step.icon}
              </div>
              <h3 className="font-medium text-sm">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      )}

      {children}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onGetStarted && (
          <Button onClick={onGetStarted} size="lg" aria-label="Get started">
            <Plus className="h-4 w-4 mr-2" />
            Get Started
          </Button>
        )}
        {onWatchDemo && (
          <Button onClick={onWatchDemo} variant="outline" size="lg" aria-label="Watch demo">
            <Play className="h-4 w-4 mr-2" />
            Watch Demo
          </Button>
        )}
      </div>
    </div>
  );
}

interface MaintenanceEmptyProps extends BaseEmptyStateProps {
  estimatedTime?: string;
  onCheckStatus?: () => void;
  onNotifyWhenReady?: () => void;
}

export function MaintenanceEmpty({ 
  title = "Under Maintenance",
  description = "We're making improvements to serve you better. Please check back soon.",
  estimatedTime,
  onCheckStatus,
  onNotifyWhenReady,
  className,
  children 
}: MaintenanceEmptyProps) {
  return (
    <EmptyState
      icon={<Settings className="h-8 w-8 text-muted-foreground animate-spin" />}
      title={title}
      description={description}
      action={onCheckStatus ? {
        label: "Check Status",
        onClick: onCheckStatus,
        variant: 'outline'
      } : undefined}
      secondaryAction={onNotifyWhenReady ? {
        label: "Notify Me",
        onClick: onNotifyWhenReady
      } : undefined}
      className={className}
    >
      {children}
      {estimatedTime && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Estimated completion: {estimatedTime}</span>
        </div>
      )}
    </EmptyState>
  );
}

interface ComingSoonEmptyProps extends BaseEmptyStateProps {
  onNotifyMe?: () => void;
  onLearnMore?: () => void;
  releaseDate?: string;
}

export function ComingSoonEmpty({ 
  title = "Coming Soon",
  description = "This feature is currently in development. Stay tuned for updates!",
  onNotifyMe,
  onLearnMore,
  releaseDate,
  className,
  children 
}: ComingSoonEmptyProps) {
  return (
    <EmptyState
      icon={<Target className="h-8 w-8 text-muted-foreground" />}
      title={title}
      description={description}
      action={onNotifyMe ? {
        label: "Notify Me",
        onClick: onNotifyMe
      } : undefined}
      secondaryAction={onLearnMore ? {
        label: "Learn More",
        onClick: onLearnMore
      } : undefined}
      className={className}
    >
      {children}
      {releaseDate && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Expected release: {releaseDate}</span>
        </div>
      )}
    </EmptyState>
  );
}

// Specialized empty states for specific features
export function NoScheduledPostsEmpty({ onScheduleFirst }: { onScheduleFirst?: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
      title="No scheduled posts"
      description="Schedule your first post to automate your content distribution across platforms."
      action={onScheduleFirst ? {
        label: "Schedule Post",
        onClick: onScheduleFirst
      } : undefined}
    />
  );
}

export function NoCommentsEmpty() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
      title="No comments yet"
      description="Comments and engagement will appear here once your content starts receiving interaction."
    />
  );
}

export function NoConnectionsEmpty({ onConnect }: { onConnect?: () => void }) {
  return (
    <EmptyState
      icon={<Database className="h-8 w-8 text-muted-foreground" />}
      title="No platform connections"
      description="Connect your social media accounts to start posting and tracking performance."
      action={onConnect ? {
        label: "Connect Platform",
        onClick: onConnect
      } : undefined}
    />
  );
}