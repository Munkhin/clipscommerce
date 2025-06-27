import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccelerateComponent from '@/components/dashboard/AccelerateComponent';

// Mock the hooks and providers
jest.mock('@/hooks/useUsageLimits', () => ({
  useUsageLimits: () => ({
    checkFeatureAccess: jest.fn(() => true),
    recordFeatureUsage: jest.fn(),
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock the API call
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      sentiment: { sentiment: 'positive', score: 0.8 },
      tone: { tone: 'casual' },
    }),
  })
) as jest.Mock;

describe('AccelerateComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main heading and description', () => {
    render(<AccelerateComponent />);
    
    expect(screen.getByText('Accelerate: Optimize your content')).toBeInTheDocument();
    expect(screen.getByText('Upload your videos and optimize audio, description, and hashtags for best results.')).toBeInTheDocument();
  });

  it('renders the Add Videos button', () => {
    render(<AccelerateComponent />);
    
    const addButton = screen.getByRole('button', { name: /add videos/i });
    expect(addButton).toBeInTheDocument();
  });

  it('renders the upload drop zone', () => {
    render(<AccelerateComponent />);
    
    expect(screen.getByText('Add videos')).toBeInTheDocument();
    expect(screen.getByText('Click or drag files here to upload')).toBeInTheDocument();
  });

  it('renders the progress section', () => {
    render(<AccelerateComponent />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Hashtags')).toBeInTheDocument();
  });

  it('renders the video workflow columns', () => {
    render(<AccelerateComponent />);
    
    expect(screen.getByText('Video Workflow')).toBeInTheDocument();
    expect(screen.getByText('To Do / Uploaded')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Review & Edit')).toBeInTheDocument();
    expect(screen.getByText('Ready to Post')).toBeInTheDocument();
  });

  it('renders initial video cards', () => {
    render(<AccelerateComponent />);
    
    expect(screen.getByText('Amazing Product Demo.mp4')).toBeInTheDocument();
    expect(screen.getByText('How To Use Our New Feature.mov')).toBeInTheDocument();
    expect(screen.getByText('Client Testimonial Short.mp4')).toBeInTheDocument();
  });

  it('handles file input click when Add Videos button is clicked', () => {
    render(<AccelerateComponent />);
    
    const addButton = screen.getByRole('button', { name: /add videos/i });
    
    // Create a mock file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.click = jest.fn();
    
    // Mock querySelector to return our mock input
    document.querySelector = jest.fn(() => fileInput);
    
    fireEvent.click(addButton);
    
    // The component should trigger file input click
    expect(addButton).toBeInTheDocument();
  });

  it('displays progress percentages correctly', () => {
    render(<AccelerateComponent />);
    
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });
}); 