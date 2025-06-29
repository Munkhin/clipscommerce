import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentIdeationModule } from '@/components/team-dashboard/modules/ContentIdeationModule';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';

// Mock the UI toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  BarChart3: () => <div data-testid="bar-chart3-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-cw-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader2-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Hash: () => <div data-testid="hash-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Music: () => <div data-testid="music-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
}));

describe('ContentIdeationModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the module with correct title and description', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('Content Ideation')).toBeInTheDocument();
    expect(screen.getByText(/AI-powered content suggestions with trend analysis/)).toBeInTheDocument();
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
  });

  it('displays ideation statistics', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('New Ideas')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('In Production')).toBeInTheDocument();
    expect(screen.getByText('Active Trends')).toBeInTheDocument();
    expect(screen.getByText('Avg Score')).toBeInTheDocument();
  });

  it('renders all four main tabs', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('Content Ideas')).toBeInTheDocument();
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
    expect(screen.getByText('Competitor Insights')).toBeInTheDocument();
    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
  });

  it('shows AI content suggestions with filtering', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('AI Content Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Platform:')).toBeInTheDocument();
    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('High Score Only:')).toBeInTheDocument();
  });

  it('displays sample content ideas', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('Day in the Life: Remote Work Setup')).toBeInTheDocument();
    expect(screen.getByText('Quick Recipe: 15-Minute Gourmet Pasta')).toBeInTheDocument();
    expect(screen.getByText('Fitness Challenge: 30-Day Transformation')).toBeInTheDocument();
  });

  it('shows platform and category badges for ideas', () => {
    render(<ContentIdeationModule />);
    
    // Should show platform badges
    const platformBadges = screen.getAllByText(/tiktok|instagram|youtube/i);
    expect(platformBadges.length).toBeGreaterThan(0);
    
    // Should show category badges
    expect(screen.getByText('trending')).toBeInTheDocument();
    expect(screen.getByText('evergreen')).toBeInTheDocument();
  });

  it('displays difficulty levels for ideas', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('easy')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('hard')).toBeInTheDocument();
  });

  it('handles AI idea generation', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<ContentIdeationModule />);
    
    const generateButton = screen.getByRole('button', { name: /Generate AI Ideas/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Generating AI ideas",
        })
      );
    });
  });

  it('handles trend analysis', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<ContentIdeationModule />);
    
    const analyzeButton = screen.getByRole('button', { name: /Analyze Trends/ });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Analyzing trends",
        })
      );
    });
  });

  it('allows idea approval and rejection', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<ContentIdeationModule />);
    
    const approveButtons = screen.getAllByRole('button', { name: /Approve/ });
    if (approveButtons.length > 0) {
      await user.click(approveButtons[0]);
      
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Idea approved",
        })
      );
    }
  });

  it('shows hashtags for content ideas', () => {
    render(<ContentIdeationModule />);
    
    // Should show hashtag badges
    const hashtags = screen.getAllByText(/#\w+/);
    expect(hashtags.length).toBeGreaterThan(0);
  });

  it('displays engagement and trend scores', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('Prediction')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    
    // Should show percentage scores
    const percentageTexts = screen.getAllByText(/%/);
    expect(percentageTexts.length).toBeGreaterThan(0);
  });

  it('shows suggested music for ideas', () => {
    render(<ContentIdeationModule />);
    
    expect(screen.getByText('Suggested music:')).toBeInTheDocument();
    expect(screen.getByText('Lofi Study Beats')).toBeInTheDocument();
  });

  it('displays trend analysis in trends tab', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Trend Analysis'));
    
    await waitFor(() => {
      expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
      expect(screen.getByText('sustainable living')).toBeInTheDocument();
      expect(screen.getByText('AI productivity')).toBeInTheDocument();
      expect(screen.getByText('micro workouts')).toBeInTheDocument();
    });
  });

  it('shows trend metrics and analysis', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Trend Analysis'));
    
    await waitFor(() => {
      expect(screen.getByText('Peak Times')).toBeInTheDocument();
      expect(screen.getByText('Related Trends')).toBeInTheDocument();
      expect(screen.getByText('Competition')).toBeInTheDocument();
      expect(screen.getByText('Relevance')).toBeInTheDocument();
    });
  });

  it('displays competitor insights in competitors tab', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Competitor Insights'));
    
    await waitFor(() => {
      expect(screen.getByText('Competitor Insights')).toBeInTheDocument();
      expect(screen.getByText('@FitnessInfluencer')).toBeInTheDocument();
      expect(screen.getByText('Workout Tutorial')).toBeInTheDocument();
    });
  });

  it('shows competitor performance metrics', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Competitor Insights'));
    
    await waitFor(() => {
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Content Elements')).toBeInTheDocument();
      expect(screen.getByText('Adaptation Strategy')).toBeInTheDocument();
    });
  });

  it('displays adaptation strategy for competitors', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Competitor Insights'));
    
    await waitFor(() => {
      expect(screen.getByText('Imitate:')).toBeInTheDocument();
      expect(screen.getByText('Improve:')).toBeInTheDocument();
      expect(screen.getByText('Unique Angle:')).toBeInTheDocument();
    });
  });

  it('shows content calendar placeholder in calendar tab', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Content Calendar'));
    
    await waitFor(() => {
      expect(screen.getByText('Content Calendar')).toBeInTheDocument();
      expect(screen.getByText('Content Calendar Coming Soon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Request Early Access/ })).toBeInTheDocument();
    });
  });

  it('allows filtering by platform', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    // Test platform filter
    const platformSelect = screen.getByDisplayValue('All Platforms');
    expect(platformSelect).toBeInTheDocument();
  });

  it('allows filtering by category', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    // Test category filter
    const categorySelect = screen.getByDisplayValue('All Categories');
    expect(categorySelect).toBeInTheDocument();
  });

  it('shows high score filter toggle', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    const highScoreToggle = screen.getByRole('switch');
    expect(highScoreToggle).toBeInTheDocument();
    
    await user.click(highScoreToggle);
  });

  it('displays export functionality', () => {
    render(<ContentIdeationModule />);
    
    const exportButton = screen.getByRole('button', { name: /Export Ideas/ });
    expect(exportButton).toBeInTheDocument();
  });

  it('shows trend sources and confidence', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Trend Analysis'));
    
    await waitFor(() => {
      const sourceBadges = screen.getAllByText(/ai-detected|api|competitor-analysis/);
      expect(sourceBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays competition scores with progress bars', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    await user.click(screen.getByText('Trend Analysis'));
    
    await waitFor(() => {
      // Progress bars for competition should be present
      const progressElements = screen.getAllByRole('progressbar');
      expect(progressElements.length).toBeGreaterThan(0);
    });
  });

  it('shows content idea status badges', () => {
    render(<ContentIdeationModule />);
    
    const statusBadges = screen.getAllByText(/new|approved|in-production|completed/);
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it('handles no ideas state gracefully', async () => {
    const user = userEvent.setup();
    render(<ContentIdeationModule />);
    
    // Enable high score filter to potentially show no results
    const highScoreToggle = screen.getByRole('switch');
    await user.click(highScoreToggle);
    
    // Component should handle empty states gracefully
    expect(screen.getByText('Content Ideation')).toBeInTheDocument();
  });
}); 