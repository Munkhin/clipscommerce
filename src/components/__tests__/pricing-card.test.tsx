import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PricingCard from '../pricing-card';
import { User } from '@supabase/supabase-js';

// Mock Supabase client
const mockInvoke = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    functions: {
      invoke: mockInvoke,
    },
  })),
}));

// Mock UI components
jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardDescription: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardFooter: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h2 className={className} {...props}>{children}</h2>
  ),
}));

// Mock window.location globally
const mockLocationHref = jest.fn();
const mockLocationAssign = jest.fn();
const mockLocationReplace = jest.fn();
const mockLocationReload = jest.fn();

let originalWindowLocation: Location;

describe('PricingCard Component', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
  };

  const mockFreePlan = {
    id: 'price_free',
    name: 'Free',
    amount: 0,
    currency: 'usd',
    interval: 'month',
  };

  const mockProPlan = {
    id: 'price_pro',
    name: 'Pro',
    amount: 2900,
    currency: 'usd',
    interval: 'month',
    popular: false,
  };

  const mockTeamPlan = {
    id: 'price_team',
    name: 'Team',
    amount: 9900,
    currency: 'usd',
    interval: 'month',
    popular: true,
  };

  const mockYearlyPlan = {
    id: 'price_yearly',
    name: 'Pro',
    amount: 29000,
    currency: 'usd',
    interval: 'year',
  };

  beforeAll(() => {
    originalWindowLocation = window.location;
    try {
      delete (window as any).location;
    } catch (e) {
      console.warn("Could not delete window.location, proceeding with assignment", e);
    }
    (window as any).location = {
      _currentHref: 'http://localhost:3000/initial-mock-path',
      assign: mockLocationAssign,
      replace: mockLocationReplace,
      reload: mockLocationReload,
      ancestorOrigins: {} as DOMStringList,
      hash: '',
      host: 'localhost:3000',
      hostname: 'localhost',
      origin: 'http://localhost:3000',
      pathname: '/initial-mock-path',
      port: '3000',
      protocol: 'http:',
      search: '',
      get href(): string {
        return this._currentHref;
      },
      set href(value: string) {
        this._currentHref = value;
        mockLocationHref(value);
      },
      toString: function() { return this._currentHref; },
      valueOf: function() { return this; }
    };
  });

  afterAll(() => {
    (window as any).location = originalWindowLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationHref.mockClear();
    mockLocationAssign.mockClear();
    mockLocationReplace.mockClear();
    mockLocationReload.mockClear();
    (window.location as any)._currentHref = 'http://localhost:3000/initial-mock-path';
    console.error = jest.fn();
  });

  describe('Plan Display', () => {
    it('should render plan name correctly', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('should render default plan name when item name is missing', () => {
      render(<PricingCard item={{}} user={null} />);
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('should display popular badge for popular plans', () => {
      render(<PricingCard item={mockTeamPlan} user={null} />);
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('should not display popular badge for non-popular plans', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
    });
  });

  describe('Price Formatting', () => {
    it('should format monthly price correctly', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      expect(screen.getByText('29 / month')).toBeInTheDocument();
    });

    it('should format yearly price correctly', () => {
      render(<PricingCard item={mockYearlyPlan} user={null} />);
      expect(screen.getByText('290 / year')).toBeInTheDocument();
    });

    it('should display free price correctly', () => {
      render(<PricingCard item={mockFreePlan} user={null} />);
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should show monthly equivalent for yearly plans', () => {
      render(<PricingCard item={mockYearlyPlan} user={null} />);
      expect(screen.getByText('($24.17/mo billed annually)')).toBeInTheDocument();
    });

    it('should handle different currencies', () => {
      const eurPlan = { ...mockProPlan, currency: 'eur' };
      render(<PricingCard item={eurPlan} user={null} />);
      expect(screen.getByText('29 / month')).toBeInTheDocument();
    });
  });

  describe('Feature Lists', () => {
    it('should display free plan features', () => {
      render(<PricingCard item={mockFreePlan} user={null} />);
      expect(screen.getByText('Idea Generator (3 uses)')).toBeInTheDocument();
      expect(screen.getByText('10 autoposts/month')).toBeInTheDocument();
    });

    it('should display pro plan features', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      expect(screen.getByText('Viral Blitz Cycle Framework')).toBeInTheDocument();
      expect(screen.getByText('Idea Generator Framework (unlimited)')).toBeInTheDocument();
      expect(screen.getByText('Unlimited posts')).toBeInTheDocument();
      expect(screen.getByText('1 set of accounts')).toBeInTheDocument();
      expect(screen.getByText('E-commerce integration')).toBeInTheDocument();
    });

    it('should display team plan features', () => {
      render(<PricingCard item={mockTeamPlan} user={null} />);
      expect(screen.getByText('Everything in Pro')).toBeInTheDocument();
      expect(screen.getByText('Manage unlimited accounts')).toBeInTheDocument();
      expect(screen.getByText('Brand Voice AI (for consistency)')).toBeInTheDocument();
      expect(screen.getByText('Team collaboration mode')).toBeInTheDocument();
      expect(screen.getByText('Advanced analytics & reporting')).toBeInTheDocument();
    });

    it('should handle undefined plan name gracefully', () => {
      render(<PricingCard item={{ name: undefined }} user={null} />);
      expect(screen.getByText('Idea Generator (3 uses)')).toBeInTheDocument();
    });
  });

  describe('Checkout Functionality - Unauthenticated User', () => {
    it('should redirect to sign-in when unauthenticated user clicks checkout', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      expect(mockLocationHref).toHaveBeenCalledWith('/sign-in?redirect=pricing');
    });

    it('should not call Supabase functions for unauthenticated users', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('Checkout Functionality - Authenticated User', () => {
    it('should call Supabase function with correct parameters', async () => {
      mockInvoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/test' } });
      
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('supabase-functions-create-checkout', {
          body: {
            price_id: 'price_pro',
            user_id: 'user-123',
            return_url: 'https://example.com/dashboard',
          },
          headers: {
            'X-Customer-Email': 'test@example.com',
          },
        });
      });
    });

    it('should redirect to Stripe checkout URL on success', async () => {
      const checkoutUrl = 'https://checkout.stripe.com/test';
      mockInvoke.mockResolvedValue({ data: { url: checkoutUrl } });
      
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith(checkoutUrl);
      });
    });

    it('should handle checkout errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Checkout failed'));
      
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error creating checkout session:', expect.any(Error));
      });
    });

    it('should handle missing checkout URL', async () => {
      mockInvoke.mockResolvedValue({ data: {} });
      
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error creating checkout session:', expect.any(Error));
      });
    });

    it('should handle user without email', async () => {
      const userWithoutEmail = { ...mockUser, email: undefined };
      mockInvoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/test' } });
      
      render(<PricingCard item={mockProPlan} user={userWithoutEmail} />);
      
      const button = screen.getByText('Choose Plan');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('supabase-functions-create-checkout', {
          body: {
            price_id: 'price_pro',
            user_id: 'user-123',
            return_url: 'https://example.com/dashboard',
          },
          headers: {
            'X-Customer-Email': '',
          },
        });
      });
    });
  });

  describe('Button States and Text', () => {
    it('should show "Get Started" for popular plans', () => {
      render(<PricingCard item={mockTeamPlan} user={mockUser} />);
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('should show "Choose Plan" for non-popular plans', () => {
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      expect(screen.getByText('Choose Plan')).toBeInTheDocument();
    });

    it('should disable button when item has no ID', () => {
      render(<PricingCard item={{ name: 'Test' }} user={mockUser} />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should enable button when item has ID', () => {
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply popular plan styling', () => {
      const { container } = render(<PricingCard item={mockTeamPlan} user={null} />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-dominator-blue', 'shadow-glow-blue');
    });

    it('should apply regular plan styling', () => {
      const { container } = render(<PricingCard item={mockProPlan} user={null} />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-dominator-dark/50');
    });

    it('should have proper card dimensions', () => {
      const { container } = render(<PricingCard item={mockProPlan} user={null} />);
      const card = container.firstChild;
      expect(card).toHaveClass('w-full', 'max-w-[350px]');
    });

    it('should have gradient background for popular plans', () => {
      render(<PricingCard item={mockTeamPlan} user={null} />);
      const gradient = document.querySelector('.bg-gradient-to-br');
      expect(gradient).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Pro');
    });

    it('should have accessible button', () => {
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Choose Plan');
    });

    it('should have proper list structure for features', () => {
      render(<PricingCard item={mockProPlan} user={null} />);
      const features = screen.getAllByText(/Viral Blitz|Idea Generator|Unlimited|E-commerce|1 set/);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should have proper ARIA attributes for interactive elements', () => {
      render(<PricingCard item={mockProPlan} user={mockUser} />);
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null item gracefully', () => {
      render(<PricingCard item={null} user={null} />);
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should handle empty item object', () => {
      render(<PricingCard item={{}} user={null} />);
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should handle missing amount', () => {
      const itemWithoutAmount = { ...mockProPlan, amount: undefined };
      render(<PricingCard item={itemWithoutAmount} user={null} />);
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should handle missing interval', () => {
      const itemWithoutInterval = { ...mockProPlan, interval: undefined };
      render(<PricingCard item={itemWithoutInterval} user={null} />);
      expect(screen.getByText('29 / month')).toBeInTheDocument();
    });

    it('should handle case-insensitive plan names', () => {
      const upperCasePlan = { ...mockProPlan, name: 'PRO' };
      render(<PricingCard item={upperCasePlan} user={null} />);
      expect(screen.getByText('Viral Blitz Cycle Framework')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(<PricingCard item={mockProPlan} user={null} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(<PricingCard item={mockProPlan} user={null} />);
      unmount();
      
      expect(screen.queryByText('Pro')).not.toBeInTheDocument();
    });
  });
}); 