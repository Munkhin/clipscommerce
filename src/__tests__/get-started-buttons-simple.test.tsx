import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// Import all components with Get Started buttons
import NavigationBar from '@/app/landing/components/NavigationBar';
import ValueStatementSection from '@/app/landing/components/ValueStatementSection';
import PricingCard from '@/components/pricing/PricingCard';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: jest.fn(),
    set: jest.fn(),
  }),
  useInView: () => true,
}));

describe('Get Started Button Redirects - Simple Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('NavigationBar Get Started Button', () => {
    it('should have href pointing to /dashboard', () => {
      render(<NavigationBar />);
      
      const getStartedButtons = screen.getAllByText('Get Started');
      expect(getStartedButtons.length).toBeGreaterThan(0);
      
      // Check that the button has the correct href
      const getStartedLink = getStartedButtons[0].closest('a');
      expect(getStartedLink).toHaveAttribute('href', '/dashboard');
    });

    it('should not have href pointing to sign-in or auth pages', () => {
      render(<NavigationBar />);
      
      const getStartedButtons = screen.getAllByText('Get Started');
      
      for (const button of getStartedButtons) {
        const link = button.closest('a');
        if (link) {
          const href = link.getAttribute('href');
          expect(href).not.toContain('sign-in');
          expect(href).not.toContain('auth');
          expect(href).not.toContain('stripe');
        }
      }
    });
  });

  describe('ValueStatementSection Get Started Button', () => {
    it('should have href pointing to /dashboard', () => {
      render(<ValueStatementSection />);
      
      const getStartedButton = screen.getByText('Get Started');
      const getStartedLink = getStartedButton.closest('a');
      
      expect(getStartedLink).toHaveAttribute('href', '/dashboard');
    });

    it('should not redirect to sign-in or stripe', () => {
      render(<ValueStatementSection />);
      
      const getStartedButton = screen.getByText('Get Started');
      const getStartedLink = getStartedButton.closest('a');
      
      if (getStartedLink) {
        const href = getStartedLink.getAttribute('href');
        expect(href).not.toContain('sign-in');
        expect(href).not.toContain('auth');
        expect(href).not.toContain('stripe');
      }
    });
  });

  describe('PricingCard Get Started Buttons', () => {
    const mockTier = {
      id: 'pro',
      name: 'Pro',
      currency: '$',
      price: 70,
      benefits: [
        { description: 'Unlimited posts' },
        { description: 'Advanced analytics' },
        { description: 'Priority support' }
      ],
      stripePriceId: 'price_test_123'
    };

    it('should redirect to Stripe checkout for paid tiers', () => {
      render(<PricingCard tier={mockTier} previousTierName="Lite" />);
      
      const getStartedButton = screen.getByText('Get Started');
      const getStartedLink = getStartedButton.closest('a');
      
      expect(getStartedLink).toHaveAttribute('href', '/api/checkout?price_id=price_test_123');
    });

    it('should redirect to Stripe checkout, not dashboard for paid tiers', () => {
      render(<PricingCard tier={mockTier} previousTierName="Lite" />);
      
      const getStartedButton = screen.getByText('Get Started');
      const getStartedLink = getStartedButton.closest('a');
      
      if (getStartedLink) {
        const href = getStartedLink.getAttribute('href');
        expect(href).toContain('checkout');
        expect(href).toContain('price_id');
      }
    });

    it('should redirect to dashboard for tiers without stripePriceId (free tiers)', () => {
      const tierWithoutPrice = { ...mockTier, stripePriceId: undefined };
      render(<PricingCard tier={tierWithoutPrice} previousTierName="Pro" />);
      
      const contactSalesButton = screen.getByText('Contact Sales');
      const contactSalesLink = contactSalesButton.closest('a');
      
      expect(contactSalesLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Integration Tests', () => {
    it('should ensure navigation Get Started buttons redirect to dashboard', () => {
      const components = [
        { component: <NavigationBar />, name: 'NavigationBar' },
        { component: <ValueStatementSection />, name: 'ValueStatementSection' },
      ];

      for (const { component, name } of components) {
        const { unmount } = render(component);
        
        const getStartedButtons = screen.queryAllByText('Get Started');
        
        for (const button of getStartedButtons) {
          const link = button.closest('a');
          if (link) {
            expect(link.getAttribute('href')).toBe('/dashboard');
          }
        }
        
        unmount();
      }
    });

    it('should ensure navigation buttons do not redirect to unwanted pages', () => {
      const components = [
        <NavigationBar key="nav" />,
        <ValueStatementSection key="value" />,
      ];

      for (const component of components) {
        const { unmount } = render(component);
        
        const getStartedButtons = screen.queryAllByText(/Get Started/);
        
        for (const button of getStartedButtons) {
          const link = button.closest('a');
          if (link) {
            const href = link.getAttribute('href');
            expect(href).not.toContain('sign-in');
            expect(href).not.toContain('auth');
            // Note: Pricing buttons should go to stripe, but navigation buttons should not
            if (link.closest('[data-testid*="nav"]') || link.closest('nav')) {
              expect(href).not.toContain('stripe');
              expect(href).not.toContain('checkout');
            }
          }
        }
        
        unmount();
      }
    });
  });

  describe('Summary Test', () => {
    it('should confirm navigation Get Started buttons redirect to dashboard and pricing buttons work correctly', () => {
      // Test NavigationBar - should go to dashboard
      const { unmount: unmountNav } = render(<NavigationBar />);
      const navButtons = screen.getAllByText('Get Started');
      expect(navButtons.length).toBeGreaterThan(0);
      
      for (const button of navButtons) {
        const link = button.closest('a');
        expect(link).toHaveAttribute('href', '/dashboard');
      }
      unmountNav();

      // Test ValueStatementSection - should go to dashboard
      const { unmount: unmountValue } = render(<ValueStatementSection />);
      const valueButton = screen.getByText('Get Started');
      const valueLink = valueButton.closest('a');
      expect(valueLink).toHaveAttribute('href', '/dashboard');
      unmountValue();

      // Test PricingCard with paid tier - should go to Stripe
      const mockPaidTier = {
        id: 'pro',
        name: 'Pro',
        currency: '$',
        price: 70,
        benefits: [{ description: 'Test feature' }],
        stripePriceId: 'price_test_123'
      };
      
      const { unmount: unmountPaidPricing } = render(<PricingCard tier={mockPaidTier} previousTierName="Lite" />);
      const paidPricingButton = screen.getByText('Get Started');
      const paidPricingLink = paidPricingButton.closest('a');
      expect(paidPricingLink).toHaveAttribute('href', '/api/checkout?price_id=price_test_123');
      unmountPaidPricing();

      // Test PricingCard with free tier - should go to dashboard
      const mockFreeTier = {
        id: 'free',
        name: 'Free',
        currency: '$',
        price: 0,
        benefits: [{ description: 'Basic feature' }],
        stripePriceId: undefined
      };
      
      const { unmount: unmountFreePricing } = render(<PricingCard tier={mockFreeTier} previousTierName="" />);
      const freePricingButton = screen.getByText('Contact Sales');
      const freePricingLink = freePricingButton.closest('a');
      expect(freePricingLink).toHaveAttribute('href', '/dashboard');
      unmountFreePricing();
    });
  });
}); 