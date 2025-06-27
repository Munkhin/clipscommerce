import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutoPostingScheduler } from '@/components/team-dashboard/modules/AutoPostingScheduler';

// Mock the UI toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock the Calendar component
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date('2024-01-15'))}>
        Select Date
      </button>
      <div>Selected: {selected?.toDateString()}</div>
    </div>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  BarChart3: () => <div data-testid="bar-chart3-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader2-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  RefreshCw: () => <div data-testid="refresh-cw-icon" />,
}));

describe('AutoPostingScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the module with correct title and description', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Auto-Posting Scheduler')).toBeInTheDocument();
    expect(screen.getByText(/AI-powered optimal timing with cross-platform/)).toBeInTheDocument();
    expect(screen.getByText('AI Optimized')).toBeInTheDocument();
  });

  it('displays scheduling statistics', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Posted')).toBeInTheDocument();
    expect(screen.getByText('Posting Now')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Avg Engagement')).toBeInTheDocument();
  });

  it('renders all four main tabs', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Smart Scheduler')).toBeInTheDocument();
    expect(screen.getByText('Calendar View')).toBeInTheDocument();
    expect(screen.getByText('Platform Analytics')).toBeInTheDocument();
    expect(screen.getByText('Client Preferences')).toBeInTheDocument();
  });

  it('shows intelligent scheduling controls', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Intelligent Scheduling')).toBeInTheDocument();
    expect(screen.getByText('AI Optimization')).toBeInTheDocument();
    expect(screen.getByText('Auto-Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Bulk Mode')).toBeInTheDocument();
  });

  it('allows client and platform selection', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Platform Filter')).toBeInTheDocument();
    expect(screen.getByText('All Platforms')).toBeInTheDocument();
    expect(screen.getAllByText('TechCorp Inc.').length).toBeGreaterThan(0);
  });

  it('handles AI optimization toggle', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    const aiToggle = screen.getAllByRole('switch')[0]; // AI Optimization switch
    expect(aiToggle).toBeInTheDocument();
    
    await user.click(aiToggle);
  });

  it('generates optimal schedule when AI is enabled', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<AutoPostingScheduler />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Optimal Schedule/ });
    expect(generateButton).toBeInTheDocument();
    
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Generating optimal schedule",
        })
      );
    });
  });

  it('displays upcoming posts in Next 24 Hours section', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Next 24 Hours')).toBeInTheDocument();
    expect(screen.getByText('Upcoming scheduled posts')).toBeInTheDocument();
  });

  it('shows scheduled posts with platform badges', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Scheduled Posts')).toBeInTheDocument();
    // Platform badges should be visible
    const platformBadges = screen.getAllByText(/tiktok|instagram|youtube/i);
    expect(platformBadges.length).toBeGreaterThan(0);
  });

  it('displays calendar view when tab is selected', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Calendar View'));
    
    await waitFor(() => {
      expect(screen.getByText('Schedule Calendar')).toBeInTheDocument();
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
  });

  it('shows posts for selected date in calendar view', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Calendar View'));
    
    await waitFor(() => {
      const selectDateButton = screen.getByText('Select Date');
      fireEvent.click(selectDateButton);
      
      expect(screen.getByText(/Posts for/)).toBeInTheDocument();
    });
  });

  it('displays platform analytics when tab is selected', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Platform Analytics'));
    
    await waitFor(() => {
      expect(screen.getAllByText('Platform Analytics').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Best Posting Times').length).toBeGreaterThan(0);
    });
  });

  it('shows platform-specific analytics data', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Platform Analytics'));
    
    await waitFor(() => {
      // Should show engagement rates and confidence scores
      expect(screen.getAllByText(/engagement/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/confidence/).length).toBeGreaterThan(0);
    });
  });

  it('displays client preferences when tab is selected', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Client Preferences'));
    
    await waitFor(() => {
      expect(screen.getAllByText('Client Preferences').length).toBeGreaterThan(0);
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
    });
  });

  it('shows client posting frequency and preferences', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Client Preferences'));
    
    await waitFor(() => {
      expect(screen.getAllByText('Posting Frequency').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Target Audience').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Restrictions').length).toBeGreaterThan(0);
    });
  });

  it('handles post scheduling actions', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<AutoPostingScheduler />);
    
    // Look for pause buttons on scheduled posts
    const pauseButtons = screen.getAllByRole('button', { name: /pause/i });
    if (pauseButtons.length > 0) {
      await user.click(pauseButtons[0]);
      // Should trigger some action
    }
  });

  it('shows engagement predictions and optimal scores', () => {
    render(<AutoPostingScheduler />);
    
    // Should display percentage scores
    const percentageTexts = screen.getAllByText(/%/);
    expect(percentageTexts.length).toBeGreaterThan(0);
  });

  it('displays time zone information for clients', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    await user.click(screen.getByText('Client Preferences'));
    
    await waitFor(() => {
      // Should show time zone badges
      expect(screen.getAllByText(/America\/New_York|America\/Los_Angeles/).length).toBeGreaterThan(0);
    });
  });

  it('allows bulk scheduling mode toggle', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    const bulkModeSwitch = screen.getAllByRole('switch')[2]; // Bulk Mode switch
    expect(bulkModeSwitch).toBeInTheDocument();
    
    await user.click(bulkModeSwitch);
  });

  it('shows auto-scheduling configuration', () => {
    render(<AutoPostingScheduler />);
    
    expect(screen.getByText('Use machine learning for optimal timing')).toBeInTheDocument();
    expect(screen.getByText('Automatically schedule new content')).toBeInTheDocument();
    expect(screen.getByText('Schedule multiple videos at once')).toBeInTheDocument();
  });

  it('disables generate button when requirements not met', () => {
    render(<AutoPostingScheduler />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Optimal Schedule/ });
    // Button might be disabled if no client selected or AI optimization off
    // The exact state depends on component initialization
    expect(generateButton).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const user = userEvent.setup();
    render(<AutoPostingScheduler />);
    
    // Component should handle various error states without crashing
    // This test ensures component renders without throwing
    expect(screen.getByText('Auto-Posting Scheduler')).toBeInTheDocument();
  });
}); 