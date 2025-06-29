import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackModule } from '@/components/team-dashboard/modules/FeedbackModule';
import { useUser } from '@/hooks/useUser';

// Mock the UI toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  BarChart3: () => <div data-testid="bar-chart3-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Send: () => <div data-testid="send-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Download: () => <div data-testid="download-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader2-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Target: () => <div data-testid="target-icon" />,
}));

describe('FeedbackModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the module with correct title and description', () => {
    render(<FeedbackModule />);
    
    expect(screen.getByText('Feedback & Reports')).toBeInTheDocument();
    expect(screen.getByText(/Automated client reporting with intelligent tone adaptation/)).toBeInTheDocument();
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
  });

  it('displays feedback statistics', () => {
    render(<FeedbackModule />);
    
    expect(screen.getByText('Ready to Send')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Generating')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Active Rules')).toBeInTheDocument();
  });

  it('renders all four main tabs', () => {
    render(<FeedbackModule />);
    
    expect(screen.getByText('Client Reports')).toBeInTheDocument();
    expect(screen.getByText('Bulk Email')).toBeInTheDocument();
    expect(screen.getByText('Email Templates')).toBeInTheDocument();
    expect(screen.getByText('Automation Rules')).toBeInTheDocument();
  });

  it('shows filter options for client reports', () => {
    render(<FeedbackModule />);
    
    expect(screen.getByText('Client:')).toBeInTheDocument();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('All Clients')).toBeInTheDocument();
  });

  it('displays generate reports button', () => {
    render(<FeedbackModule />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Reports/ });
    expect(generateButton).toBeInTheDocument();
  });

  it('handles bulk report generation', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<FeedbackModule />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Reports/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Generating reports",
        })
      );
    });
  });

  it('shows client reports with metrics', () => {
    render(<FeedbackModule />);
    
    // Should show client names and metrics
    expect(screen.getByText(/TechCorp Inc\.|Lifestyle Brand Co\.|Fitness Pro/)).toBeInTheDocument();
    expect(screen.getByText('Views:')).toBeInTheDocument();
    expect(screen.getByText('Engagement:')).toBeInTheDocument();
    expect(screen.getByText('Growth:')).toBeInTheDocument();
  });

  it('displays tone badges for reports', () => {
    render(<FeedbackModule />);
    
    // Should show different tone badges
    const toneBadges = screen.getAllByText(/professional|casual|enthusiastic|analytical/);
    expect(toneBadges.length).toBeGreaterThan(0);
  });

  it('shows download and send buttons for ready reports', () => {
    render(<FeedbackModule />);
    
    const downloadButtons = screen.getAllByRole('button', { name: /Download/ });
    const sendButtons = screen.getAllByRole('button', { name: /Send/ });
    
    expect(downloadButtons.length + sendButtons.length).toBeGreaterThan(0);
  });

  it('handles bulk email functionality', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Bulk Email'));
    
    await waitFor(() => {
      expect(screen.getByText('Bulk Email Delivery')).toBeInTheDocument();
      expect(screen.getByText('Bulk Email Mode')).toBeInTheDocument();
    });
  });

  it('shows bulk email configuration when enabled', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Bulk Email'));
    
    const bulkEmailToggle = screen.getByRole('switch');
    await user.click(bulkEmailToggle);
    
    await waitFor(() => {
      expect(screen.getByText('Bulk Email Configuration')).toBeInTheDocument();
      expect(screen.getByText('Email Template')).toBeInTheDocument();
      expect(screen.getByText('Send Schedule')).toBeInTheDocument();
    });
  });

  it('allows selection of reports for bulk sending', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Bulk Email'));
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(1);
    });
    
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) { // Skip bulk mode toggle
      await user.click(checkboxes[1]);
      
      await waitFor(() => {
        expect(screen.getByText(/reports selected for bulk sending/)).toBeInTheDocument();
      });
    }
  });

  it('displays email templates in templates tab', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Email Templates'));
    
    await waitFor(() => {
      expect(screen.getByText('Email Templates')).toBeInTheDocument();
      expect(screen.getByText('Weekly Performance Summary')).toBeInTheDocument();
      expect(screen.getByText('Casual Monthly Update')).toBeInTheDocument();
    });
  });

  it('shows template variables and content preview', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Email Templates'));
    
    await waitFor(() => {
      expect(screen.getByText('Variables:')).toBeInTheDocument();
      // Should show template variables like {CLIENT_NAME}
      const variableBadges = screen.getAllByText(/{[A-Z_]+}/);
      expect(variableBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays automation rules in automation tab', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Automation Rules'));
    
    await waitFor(() => {
      expect(screen.getByText('Automation Rules')).toBeInTheDocument();
      expect(screen.getByText('Weekly Report Generation')).toBeInTheDocument();
      expect(screen.getByText('High Performance Alert')).toBeInTheDocument();
    });
  });

  it('shows automation rule toggles', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Automation Rules'));
    
    await waitFor(() => {
      const toggles = screen.getAllByRole('switch');
      expect(toggles.length).toBeGreaterThan(0);
    });
    
    // Toggle a rule
    const toggles = screen.getAllByRole('switch');
    if (toggles.length > 0) {
      await user.click(toggles[0]);
    }
  });

  it('displays automation rule actions and conditions', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Automation Rules'));
    
    await waitFor(() => {
      expect(screen.getByText('Actions:')).toBeInTheDocument();
      expect(screen.getByText('Generate Report')).toBeInTheDocument();
      expect(screen.getByText('Send Email')).toBeInTheDocument();
    });
  });

  it('handles email sending with toast notification', async () => {
    const user = userEvent.setup();
    const { toast } = require('@/components/ui/use-toast');
    
    render(<FeedbackModule />);
    
    const sendButtons = screen.getAllByRole('button', { name: /Send/ });
    if (sendButtons.length > 0) {
      await user.click(sendButtons[0]);
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalled();
      });
    }
  });

  it('shows report generation timestamps', () => {
    render(<FeedbackModule />);
    
    expect(screen.getByText('Generated:')).toBeInTheDocument();
  });

  it('displays report status indicators', () => {
    render(<FeedbackModule />);
    
    // Should show various status badges
    const statusTexts = screen.getAllByText(/generating|ready|sent|failed/i);
    expect(statusTexts.length).toBeGreaterThan(0);
  });

  it('shows engagement metrics and growth rates', () => {
    render(<FeedbackModule />);
    
    // Should display percentage values and metrics
    const percentageValues = screen.getAllByText(/%/);
    expect(percentageValues.length).toBeGreaterThan(0);
  });

  it('handles filter changes correctly', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    // Test filter dropdowns
    const clientSelect = screen.getByDisplayValue('All Clients');
    expect(clientSelect).toBeInTheDocument();
  });

  it('shows proper report type indicators', () => {
    render(<FeedbackModule />);
    
    // Should show report types like weekly, monthly, etc.
    expect(screen.getByText(/weekly|monthly|quarterly/i)).toBeInTheDocument();
  });

  it('displays sent timestamps for completed reports', () => {
    render(<FeedbackModule />);
    
    // Should show "Sent" timestamps for sent reports
    const sentTexts = screen.getAllByText(/Sent/);
    expect(sentTexts.length).toBeGreaterThan(0);
  });

  it('handles template editing functionality', async () => {
    const user = userEvent.setup();
    render(<FeedbackModule />);
    
    await user.click(screen.getByText('Email Templates'));
    
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /Edit/ });
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });
}); 