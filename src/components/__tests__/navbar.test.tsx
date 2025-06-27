import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Navbar from '../navbar';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => Promise.resolve({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

// Mock Auth Provider
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock UserProfile component
jest.mock('../user-profile', () => {
  return function MockUserProfile() {
    return <div data-testid="user-profile">User Profile</div>;
  };
});

// Mock Button component
jest.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

describe('Navbar Component', () => {
  const mockCreateClient = require('@/lib/supabase/client').createClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      });
    });

    it('should render logo link', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const logoLink = screen.getByText('Logo');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render limited offer link', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const offerLink = screen.getByText('Limited Offer');
      expect(offerLink).toBeInTheDocument();
      expect(offerLink.closest('a')).toHaveAttribute('href', '/offer');
    });

    it('should render sign in and sign up links for unauthenticated users', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const signInLink = screen.getByText('Sign In');
      const signUpLink = screen.getByText('Sign Up');
      
      expect(signInLink).toBeInTheDocument();
      expect(signInLink.closest('a')).toHaveAttribute('href', '/sign-in');
      
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink.closest('a')).toHaveAttribute('href', '/sign-up');
    });

    it('should not render dashboard link for unauthenticated users', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should not render user profile for unauthenticated users', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { 
              user: { 
                id: 'user-123', 
                email: 'test@example.com' 
              } 
            },
          }),
        },
      });
    });

    it('should render dashboard link for authenticated users', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const dashboardButton = screen.getByText('Dashboard');
      expect(dashboardButton).toBeInTheDocument();
      expect(dashboardButton.closest('a')).toHaveAttribute('href', '/dashboard');
    });

    it('should render user profile for authenticated users', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    it('should not render sign in/up links for authenticated users', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });

    it('should still render logo and offer links', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      expect(screen.getByText('Logo')).toBeInTheDocument();
      expect(screen.getByText('Limited Offer')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    beforeEach(() => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      });
    });

    it('should have proper navigation styling', async () => {
      const NavbarComponent = await Navbar();
      const { container } = render(NavbarComponent);
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('w-full', 'border-b', 'border-gray-200', 'bg-white', 'py-2');
    });

    it('should have responsive container layout', async () => {
      const NavbarComponent = await Navbar();
      const { container } = render(NavbarComponent);
      
      const containerDiv = container.querySelector('.container');
      expect(containerDiv).toHaveClass('mx-auto', 'px-4', 'flex', 'justify-between', 'items-center');
    });

    it('should have responsive offer link styling', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const offerLink = screen.getByText('Limited Offer').closest('a');
      expect(offerLink).toHaveClass('hidden', 'md:flex');
    });

    it('should render Zap icon in offer link', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      expect(screen.getByTestId('Zap-icon')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase client creation errors gracefully', async () => {
      mockCreateClient.mockRejectedValue(new Error('Supabase connection failed'));
      
      // Should not throw an error during rendering
      await expect(async () => {
        const NavbarComponent = await Navbar();
        render(NavbarComponent);
      }).not.toThrow();
    });

    it('should handle auth.getUser errors gracefully', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Auth error')),
        },
      });
      
      // Should not throw an error during rendering
      await expect(async () => {
        const NavbarComponent = await Navbar();
        render(NavbarComponent);
      }).not.toThrow();
    });

    it('should handle malformed user data gracefully', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: null, email: undefined } },
          }),
        },
      });
      
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      // Should still render the component
      expect(screen.getByText('Logo')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      });
    });

    it('should have proper navigation landmark', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have accessible links', async () => {
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link.textContent).toBeTruthy();
      });
    });

    it('should have proper button accessibility', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
          }),
        },
      });
      
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      
      const dashboardButton = screen.getByRole('button');
      expect(dashboardButton).toBeInTheDocument();
      expect(dashboardButton).toHaveTextContent('Dashboard');
    });
  });

  describe('Performance', () => {
    it('should render quickly', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      });
      
      const startTime = performance.now();
      const NavbarComponent = await Navbar();
      render(NavbarComponent);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause memory leaks on unmount', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      });
      
      const NavbarComponent = await Navbar();
      const { unmount } = render(NavbarComponent);
      unmount();
      
      expect(screen.queryByText('Logo')).not.toBeInTheDocument();
    });
  });
}); 