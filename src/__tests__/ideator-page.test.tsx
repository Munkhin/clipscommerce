import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IdeatorPage from '@/app/dashboard/ideator/page';

describe('IdeatorPage', () => {
  it('renders the ideator page with expanded input box', () => {
    render(<IdeatorPage />);
    
    // Check if the title is displayed
    expect(screen.getByText('Ideator')).toBeInTheDocument();
    
    // Check if the textarea is present with proper size attributes
    const textarea = screen.getByPlaceholderText(/Describe your product or service in detail/);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('rows', '12');
    expect(textarea).toHaveClass('min-h-[300px]');
  });

  it('allows typing in the expanded textarea', () => {
    render(<IdeatorPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe your product or service in detail/);
    
    fireEvent.change(textarea, { target: { value: 'Test product description' } });
    expect(textarea).toHaveValue('Test product description');
  });

  it('shows file upload option', () => {
    render(<IdeatorPage />);
    
    expect(screen.getByText('Attach image')).toBeInTheDocument();
  });

  it('has generate button that is disabled when no description is provided', () => {
    render(<IdeatorPage />);
    
    const generateButton = screen.getByRole('button', { name: /Generate Ideas/i });
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('enables generate button when description is provided', () => {
    render(<IdeatorPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe your product or service in detail/);
    const generateButton = screen.getByRole('button', { name: /Generate Ideas/i });
    
    fireEvent.change(textarea, { target: { value: 'Test product description' } });
    expect(generateButton).toBeEnabled();
  });
}); 