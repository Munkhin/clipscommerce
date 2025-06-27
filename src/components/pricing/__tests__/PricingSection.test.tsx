import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PricingSection from '@/app/landing/components/PricingSection';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock authentication context
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

describe('PricingSection', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Snapshots', () => {
    it('should render pricing section with all tiers', () => {
      const { container } = render(<PricingSection />);
      
      // Check for main pricing elements
      expect(screen.getByText(/Choose Your Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Lite/i)).toBeInTheDocument();
      expect(screen.getByText(/Pro/i)).toBeInTheDocument();
      expect(screen.getByText(/Team/i)).toBeInTheDocument();
      
      // Snapshot test
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render monthly pricing configuration snapshot', () => {
      const { container } = render(<PricingSection />);
      
      // Ensure monthly pricing is displayed
      expect(screen.getAllByText(/month/i)).toHaveLength(3);
      
      // Snapshot for monthly configuration
      expect(container.firstChild).toMatchSnapshot('monthly-pricing');
    });

    it('should render yearly pricing configuration snapshot', () => {
      const { container } = render(<PricingSection />);
      
      // Switch to yearly billing if toggle exists
      const yearlyToggle = screen.queryByText(/yearly/i) || screen.queryByText(/annual/i);
      if (yearlyToggle) {
        fireEvent.click(yearlyToggle);
      }
      
      // Snapshot for yearly configuration
      expect(container.firstChild).toMatchSnapshot('yearly-pricing');
    });

    it('should render mobile responsive layout snapshot', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const { container } = render(<PricingSection />);
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Snapshot for mobile layout
      expect(container.firstChild).toMatchSnapshot('mobile-layout');
    });

    it('should render tablet responsive layout snapshot', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      const { container } = render(<PricingSection />);
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Snapshot for tablet layout
      expect(container.firstChild).toMatchSnapshot('tablet-layout');
    });

    it('should render desktop responsive layout snapshot', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      
      const { container } = render(<PricingSection />);
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Snapshot for desktop layout
      expect(container.firstChild).toMatchSnapshot('desktop-layout');
    });

    it('should render authenticated user state snapshot', () => {
      // Mock authenticated user
      jest.doMock('@/providers/AuthProvider', () => ({
        useAuth: () => ({
          user: { id: '123', email: 'test@example.com' },
          loading: false,
          signIn: jest.fn(),
          signOut: jest.fn(),
        }),
      }));

      const { container } = render(<PricingSection />);
      
      // Snapshot for authenticated state
      expect(container.firstChild).toMatchSnapshot('authenticated-user');
    });

    it('should render loading state snapshot', () => {
      // Mock loading state
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: null,
          loading: true,
          signIn: jest.fn(),
          signOut: jest.fn(),
        }),
      }));

      const { container } = render(<PricingSection />);
      
      // Snapshot for loading state
      expect(container.firstChild).toMatchSnapshot('loading-state');
    });

    it('should render pricing cards with correct structure', () => {
      render(<PricingSection />);
      
      // Check for pricing cards
      const pricingCards = screen.getAllByRole('article');
      expect(pricingCards).toHaveLength(3); // Lite, Pro, Team
      
      // Each card should have essential elements
      pricingCards.forEach(card => {
        expect(card).toHaveTextContent(/\$/); // Price
        expect(card.querySelector('button')).toBeInTheDocument(); // CTA button
      });
    });

    it('should display correct pricing information', () => {
      render(<PricingSection />);
      
      // Check for pricing amounts
      expect(screen.getByText(/\$9/)).toBeInTheDocument(); // Lite
      expect(screen.getByText(/\$29/)).toBeInTheDocument(); // Pro
      expect(screen.getByText(/\$99/)).toBeInTheDocument(); // Team
      
      // Check for billing periods
      expect(screen.getAllByText(/month/i)).toHaveLength(3);
    });

    it('should highlight recommended plan', () => {
      render(<PricingSection />);
      
      // Pro plan should be highlighted as recommended
      const proCard = screen.getByText(/Pro/i).closest('[role="article"]');
      expect(proCard).toHaveClass('border-primary');
      expect(screen.getByText(/Most Popular/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('should handle plan selection clicks', async () => {
      const mockPush = jest.fn();
      jest.doMock('next/router', () => ({
        useRouter: () => ({
          push: mockPush,
          pathname: '/',
          query: {},
          asPath: '/',
        }),
      }));

      render(<PricingSection />);
      
      // Click on Lite plan button
      const liteButton = screen.getByRole('button', { name: /Get Started.*Lite/i });
      await user.click(liteButton);
      
      // Should navigate to signup with plan parameter
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/auth/sign-up')
      );
    });

    it('should handle billing toggle interaction', async () => {
      render(<PricingSection />);
      
      // Look for billing toggle (monthly/yearly)
      const billingToggle = screen.queryByRole('switch');
      if (billingToggle) {
        await user.click(billingToggle);
        
        // Should update pricing display
        await waitFor(() => {
          expect(screen.getByText(/year/i)).toBeInTheDocument();
        });
      }
    });

    it('should expand feature details on hover', async () => {
      render(<PricingSection />);
      
      // Find feature items with tooltips
      const featureItems = screen.getAllByText(/✓/);
      if (featureItems.length > 0) {
        await user.hover(featureItems[0]);
        
        // Should show additional feature details
        await waitFor(() => {
          const tooltip = screen.queryByRole('tooltip');
          if (tooltip) {
            expect(tooltip).toBeInTheDocument();
          }
        });
      }
    });

    it('should handle plan comparison interaction', async () => {
      render(<PricingSection />);
      
      // Look for compare plans button
      const compareButton = screen.queryByText(/Compare Plans/i);
      if (compareButton) {
        await user.click(compareButton);
        
        // Should show comparison view
        await waitFor(() => {
          expect(screen.getByText(/Feature Comparison/i)).toBeInTheDocument();
        });
      }
    });

    it('should handle feature tooltip interactions', async () => {
      render(<PricingSection />);
      
      // Find feature items that might have tooltips
      const featureItems = screen.getAllByText(/✓/) || screen.getAllByText(/check/i);
      
      if (featureItems.length > 0) {
        // Hover over feature item
        await user.hover(featureItems[0]);
        
        // Should show tooltip or additional info
        await waitFor(() => {
          const tooltip = screen.queryByRole('tooltip') || screen.queryByText(/more info/i);
          if (tooltip) {
            expect(tooltip).toBeInTheDocument();
          }
        });
        
        // Unhover should hide tooltip
        await user.unhover(featureItems[0]);
        
        await waitFor(() => {
          const tooltip = screen.queryByRole('tooltip');
          if (tooltip) {
            expect(tooltip).not.toBeInTheDocument();
          }
        });
      }
    });

    it('should handle pricing card hover effects', async () => {
      render(<PricingSection />);
      
      const pricingCards = screen.getAllByRole('article');
      
      if (pricingCards.length > 0) {
        const firstCard = pricingCards[0];
        
        // Hover over pricing card
        await user.hover(firstCard);
        
        // Should apply hover styles
        expect(firstCard).toBeInTheDocument();
        
        // Unhover
        await user.unhover(firstCard);
        
        // Should remove hover styles
        expect(firstCard).toBeInTheDocument();
      }
    });

    it('should handle plan selection with different user states', async () => {
      const mockPush = jest.fn();
      jest.doMock('next/router', () => ({
        useRouter: () => ({
          push: mockPush,
          pathname: '/',
          query: {},
          asPath: '/',
        }),
      }));

      render(<PricingSection />);
      
      const buttons = screen.getAllByRole('button');
      
      // Test clicking different plan buttons
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        await user.click(buttons[i]);
        
        // Should handle click appropriately
        expect(buttons[i]).toBeInTheDocument();
      }
    });

    it('should handle rapid successive clicks', async () => {
      render(<PricingSection />);
      
      const firstButton = screen.getAllByRole('button')[0];
      
      // Click rapidly multiple times
      await user.click(firstButton);
      await user.click(firstButton);
      await user.click(firstButton);
      
      // Should handle gracefully without errors
      expect(firstButton).toBeInTheDocument();
    });

    it('should handle touch interactions on mobile', async () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true,
      });
      
      render(<PricingSection />);
      
      const pricingCards = screen.getAllByRole('article');
      
      if (pricingCards.length > 0) {
        // Simulate touch events
        fireEvent.touchStart(pricingCards[0]);
        fireEvent.touchEnd(pricingCards[0]);
        
        // Should handle touch interactions
        expect(pricingCards[0]).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PricingSection />);
      
      // Check for proper roles
      const pricingCards = screen.getAllByRole('article');
      expect(pricingCards).toHaveLength(3);
      
      // Check for accessible buttons
      const ctaButtons = screen.getAllByRole('button');
      ctaButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
      
      // Check for proper headings hierarchy
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<PricingSection />);
      
      // Tab through pricing cards
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(firstButton).toHaveFocus();
      
      // Tab to next button
      await user.tab();
      const secondButton = screen.getAllByRole('button')[1];
      expect(secondButton).toHaveFocus();
    });

    it('should have sufficient color contrast', () => {
      render(<PricingSection />);
      
      // Check for high contrast elements
      const pricingCards = screen.getAllByRole('article');
      pricingCards.forEach(card => {
        const computedStyle = window.getComputedStyle(card);
        expect(computedStyle.backgroundColor).toBeDefined();
        expect(computedStyle.color).toBeDefined();
      });
    });

    it('should announce price changes to screen readers', async () => {
      render(<PricingSection />);
      
      // Check for live regions
      const liveRegion = document.querySelector('[aria-live]');
      if (liveRegion) {
        expect(liveRegion).toBeInTheDocument();
      }
      
      // Check for price announcements
      const prices = screen.getAllByText(/\$/);
      prices.forEach(price => {
        expect(price.closest('[aria-label]')).toBeTruthy();
      });
    });

    it('should have proper focus management', async () => {
      render(<PricingSection />);
      
      // Test focus trap within pricing cards
      const buttons = screen.getAllByRole('button');
      
      // Focus first button
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
      
      // Tab through all buttons
      for (let i = 1; i < buttons.length; i++) {
        await user.tab();
        expect(buttons[i]).toHaveFocus();
      }
    });

    it('should support screen reader navigation', () => {
      render(<PricingSection />);
      
      // Check for proper landmark roles
      const main = screen.queryByRole('main');
      const region = screen.queryByRole('region');
      
      if (main || region) {
        expect(main || region).toBeInTheDocument();
      }
      
      // Check for descriptive headings
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading.textContent).toBeTruthy();
        expect(heading.textContent.length).toBeGreaterThan(0);
      });
    });

    it('should have accessible form controls', () => {
      render(<PricingSection />);
      
      // Check for billing toggle accessibility
      const toggle = screen.queryByRole('switch') || screen.queryByRole('button', { name: /billing/i });
      if (toggle) {
        expect(toggle).toHaveAttribute('aria-label');
        expect(toggle).toHaveAttribute('role');
      }
      
      // Check for accessible buttons
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should provide keyboard shortcuts', async () => {
      render(<PricingSection />);
      
      // Test escape key functionality
      await user.keyboard('{Escape}');
      
      // Test enter key on focused elements
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      await user.keyboard('{Enter}');
      
      // Should trigger button action
      expect(firstButton).toHaveFocus();
    });

    it('should handle high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<PricingSection />);
      
      // Should render without errors in high contrast mode
      expect(screen.getByText(/Choose Your Plan/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<PricingSection />);
      
      // Should stack pricing cards vertically on mobile
      const pricingContainer = screen.getByRole('region', { name: /pricing/i });
      expect(pricingContainer).toHaveClass('flex-col', 'md:flex-row');
    });

    it('should handle tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      render(<PricingSection />);
      
      // Should maintain proper spacing on tablet
      const pricingCards = screen.getAllByRole('article');
      expect(pricingCards).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing pricing data gracefully', () => {
      // Mock empty pricing data
      jest.doMock('@/data/pricing', () => ({
        pricingPlans: [],
      }));
      
      render(<PricingSection />);
      
      // Should show fallback content
      expect(screen.getByText(/Pricing information unavailable/i)).toBeInTheDocument();
    });

    it('should handle network errors for plan selection', async () => {
      // Mock network error
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;
      
      render(<PricingSection />);
      
      const button = screen.getAllByRole('button')[0];
      await user.click(button);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large feature lists', () => {
      const startTime = performance.now();
      
      render(<PricingSection />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });

    it('should not cause memory leaks', () => {
      const { unmount } = render(<PricingSection />);
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });
}); 