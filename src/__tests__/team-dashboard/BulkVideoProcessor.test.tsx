import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the UI components that might cause issues
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// TDD: BulkVideoProcessor tests
describe('BulkVideoProcessor', () => {
  let BulkVideoProcessor: React.ComponentType;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import fresh for each test
    import { BulkVideoProcessor } from '@/components/team-dashboard/modules/BulkVideoProcessor';
    BulkVideoProcessor = ComponentModule.BulkVideoProcessor;
  });

  it('should render the component with correct title and description', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByText('Bulk Video Processor')).toBeInTheDocument();
    expect(screen.getByText('Enterprise-scale video processing engine capable of handling thousands of videos simultaneously')).toBeInTheDocument();
  });

  it('should render performance stats', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByText('Total Processed')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Time')).toBeInTheDocument();
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
  });

  it('should render all main tabs', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByRole('tab', { name: 'Processing' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Queue Manager' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument();
  });

  it('should show upload area', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByText('Upload Videos for Processing')).toBeInTheDocument();
    expect(screen.getByText('Drop thousands of videos here or click to upload')).toBeInTheDocument();
    // Fix: Look for the text inside the label instead of button role
    expect(screen.getByText('Select Videos')).toBeInTheDocument();
  });

  it('should show processing controls', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByRole('button', { name: /Start Processing/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop/ })).toBeInTheDocument();
  });

  it('should show Start Processing button disabled when no files uploaded', () => {
    render(<BulkVideoProcessor />);
    
    const startButton = screen.getByRole('button', { name: /Start Processing/ });
    expect(startButton).toBeDisabled();
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    render(<BulkVideoProcessor />);
    
    // Click on Queue Manager tab
    const queueTab = screen.getByRole('tab', { name: 'Queue Manager' });
    await user.click(queueTab);
    
    await waitFor(() => {
      expect(screen.getByText('Active Processing Jobs')).toBeInTheDocument();
    });

    // Click on Performance tab  
    const performanceTab = screen.getByRole('tab', { name: 'Performance' });
    await user.click(performanceTab);
    
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });
  });

  it('should show client selection dropdown', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Select client')).toBeInTheDocument();
  });

  it('should show concurrent workers input', () => {
    render(<BulkVideoProcessor />);
    
    expect(screen.getByText('Concurrent Workers')).toBeInTheDocument();
    const input = screen.getByDisplayValue('50');
    expect(input).toBeInTheDocument();
  });
}); 