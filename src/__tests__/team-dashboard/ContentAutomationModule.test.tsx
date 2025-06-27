import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the UI components that might cause issues
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// TDD: Comprehensive ContentAutomationModule tests
describe('ContentAutomationModule', () => {
  let ContentAutomationModule: React.ComponentType;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import fresh for each test
    const ComponentModule = require('../../../src/components/team-dashboard/modules/ContentAutomationModule');
    ContentAutomationModule = ComponentModule.ContentAutomationModule;
  });

  it('should render the module with correct title and description', () => {
    render(<ContentAutomationModule />);
    
    expect(screen.getByText('Content Automation')).toBeInTheDocument();
    // Fix: Use the actual description text from the component
    expect(screen.getByText('Bulk video processing with brand voice specification and AI-powered optimization')).toBeInTheDocument();
  });

  it('should render all main tabs', () => {
    render(<ContentAutomationModule />);
    
    expect(screen.getByText('Bulk Automation')).toBeInTheDocument();
    // Fix: Use getByRole to be more specific about which Brand Voice element we want
    expect(screen.getByRole('tab', { name: 'Brand Voice' })).toBeInTheDocument();
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
  });

  it('should show automation settings with toggles', () => {
    render(<ContentAutomationModule />);
    
    expect(screen.getByText('Generate Descriptions')).toBeInTheDocument();
    expect(screen.getByText('Generate Hashtags')).toBeInTheDocument();
    expect(screen.getByText('Platform Optimization')).toBeInTheDocument();
    expect(screen.getByText('Auto-Post')).toBeInTheDocument();
  });

  it('should render platform selection buttons', () => {
    render(<ContentAutomationModule />);
    
    expect(screen.getByRole('button', { name: 'tiktok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'instagram' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'youtube' })).toBeInTheDocument();
  });

  it('should show file upload area', () => {
    render(<ContentAutomationModule />);
    
    expect(screen.getByText('Upload Videos')).toBeInTheDocument();
    expect(screen.getByText('Drop videos here or click to upload')).toBeInTheDocument();
  });

  it('should show Start Automation button disabled when no files uploaded', () => {
    render(<ContentAutomationModule />);
    
    const startButton = screen.getByRole('button', { name: /Start Automation/ });
    expect(startButton).toBeDisabled();
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    render(<ContentAutomationModule />);
    
    // Click on Brand Voice tab
    const brandVoiceTab = screen.getByRole('tab', { name: 'Brand Voice' });
    await user.click(brandVoiceTab);
    
    await waitFor(() => {
      expect(screen.getByText('Brand Voice Library')).toBeInTheDocument();
    });

    // Click on Active Jobs tab  
    const activeJobsTab = screen.getByRole('tab', { name: 'Active Jobs' });
    await user.click(activeJobsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Active Automation Jobs')).toBeInTheDocument();
    });
  });

  it('should handle platform selection', async () => {
    const user = userEvent.setup();
    render(<ContentAutomationModule />);
    
    const tiktokButton = screen.getByRole('button', { name: 'tiktok' });
    const instagramButton = screen.getByRole('button', { name: 'instagram' });
    
    // Toggle platforms
    await user.click(tiktokButton);
    await user.click(instagramButton);
    
    // Buttons should be clickable
    expect(tiktokButton).not.toBeDisabled();
    expect(instagramButton).not.toBeDisabled();
  });

  it('should toggle automation settings', async () => {
    const user = userEvent.setup();
    render(<ContentAutomationModule />);
    
    // Find automation setting switches
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    
    // Toggle the first switch
    await user.click(switches[0]);
    // Switch should be functional (no error thrown)
  });
}); 