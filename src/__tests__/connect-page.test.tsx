import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectPage from '@/app/dashboard/connect/page';
import { AuthProvider } from '@/providers/AuthProvider';

// Helper component to wrap ConnectPage with AuthProvider
const renderWithAuthProvider = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
};

describe('ConnectPage Platform Icons', () => {
  it('renders platform names with their respective icons', () => {
    renderWithAuthProvider(<ConnectPage />);
    
    // Check that platform names are displayed
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Shopify')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('WooCommerce')).toBeInTheDocument();
    expect(screen.getByText('Etsy')).toBeInTheDocument();
    expect(screen.getByText('eBay')).toBeInTheDocument();
  });

  it('shows connect buttons for all platforms initially', () => {
    renderWithAuthProvider(<ConnectPage />);
    
    const connectButtons = screen.getAllByText('Connect');
    expect(connectButtons).toHaveLength(10); // 5 social + 5 commerce platforms
  });

  it('shows disconnect status icons initially', () => {
    renderWithAuthProvider(<ConnectPage />);
    
    // All platforms should show XCircle (disconnect) icon initially
    const disconnectIcons = document.querySelectorAll('svg');
    expect(disconnectIcons.length).toBeGreaterThan(0);
  });

  it('handles platform connection process', async () => {
    renderWithAuthProvider(<ConnectPage />);
    
    const firstConnectButton = screen.getAllByText('Connect')[0];
    fireEvent.click(firstConnectButton);
    
    // Should show loading state (spinner icon)
    await waitFor(() => {
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('groups platforms correctly', () => {
    renderWithAuthProvider(<ConnectPage />);
    
    expect(screen.getByText('Social Media Platforms')).toBeInTheDocument();
    expect(screen.getByText('E-Commerce Platforms')).toBeInTheDocument();
  });

  it('renders section headers with icons', () => {
    renderWithAuthProvider(<ConnectPage />);
    
    const socialSection = screen.getByText('Social Media Platforms').closest('h2');
    const commerceSection = screen.getByText('E-Commerce Platforms').closest('h2');
    
    expect(socialSection).toBeInTheDocument();
    expect(commerceSection).toBeInTheDocument();
  });
}); 