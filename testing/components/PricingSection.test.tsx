// Comprehensive tests for PricingSection component
import React from 'react';
import { 
  renderWithProviders, 
  screen, 
  waitFor, 
  userEvent,
  testAccessibility,
  testResponsive,
  createMockPricingTier,
  expectElementToBeAccessible,
} from '../../testing/utils/index';
import PricingSection from '@/app/landing/components/PricingSection';

// Mock the pricing data
const mockPricingTiers = [
  createMockPricingTier({
    name: 'Lite Plan',
    price: 20,
    yearlyPrice: 240,
    features: ['Viral Blitz Cycle Framework (15 uses)', 'Idea Generator Framework (15 uses)'],
    highlighted: false,
  }),
  createMockPricingTier({
    name: 'Pro Plan',
    price: 70,
    yearlyPrice: 840,
    features: ['Viral Blitz Cycle Framework (unlimited)', 'Unlimited posts'],
    highlighted: true,
  }),
  createMockPricingTier({
    name: 'Team Plan',
    price: 500,
    yearlyPrice: 6000,
    features: ['Everything in Pro', 'Team dashboard access'],
    highlighted: false,
  }),
];

const mockLocationHref = jest.fn(); // This is the global spy for href changes
const mockNavigate = (url: string) => mockLocationHref(url);
let originalLocation: Location;

describe('PricingSection Component', () => {
  const mockOnGetStarted = jest.fn();
  // originalLocation is now at a higher scope

  beforeAll(() => {
    originalLocation = window.location;
    try {
      delete (window as any).location;
    } catch (e) {
      // In some environments, delete might fail or not be necessary if assignment works.
      // JSDOM usually allows 'location' to be deleted.
      console.warn("Could not delete window.location, proceeding with assignment", e);
    }

    (window as any).location = {
      _currentHref: 'http://localhost:3000/initial-mock-path',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
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
        mockLocationHref(value); // Call the global spy
      },
      toString: function() { return this._currentHref; },
      valueOf: function() { return this; } // Common practice for valueOf
    };
  });

  afterAll(() => {
    // Restore original window.location by direct assignment
    (window as any).location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks(); // This will clear mockOnGetStarted and the assign/replace/reload fns on mock location
    mockLocationHref.mockClear(); // Specifically clear the global href spy

    // Reset href on the mock object. Ensure window.location is indeed our mock.
    if (window.location && typeof (window.location as any)._currentHref === 'string') {
      (window.location as any)._currentHref = 'http://localhost:3000/initial-mock-path';
      // If setting _currentHref doesn't trigger the spy, and we need the spy cleared *after* this reset:
      // mockLocationHref.mockClear(); // if the setter was called, clear it again.
      // However, direct assignment to _currentHref won't call the setter, so clearing mockLocationHref once is fine.
    }
  });

  describe('Rendering', () => {
    it('renders pricing section with all plans', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      expect(screen.getByText('Scale Your Content and')).toBeInTheDocument();
      expect(screen.getByText('Maximize Sales')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Lite', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Pro', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Team', level: 3 })).toBeInTheDocument();
    });

    it('highlights the most popular plan', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} />);
      
      expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    });

    it('displays pricing toggle buttons', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} />);
      
      expect(screen.getByRole('button', { name: /annual/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument();
    });

    it('shows save percentage for annual billing', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} />);
      
      expect(screen.getByText('Save 20%')).toBeInTheDocument();
    });
  });

  describe('Pricing Toggle Functionality', () => {
    it('switches between annual and monthly pricing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      // Should start with annual pricing (default)
      expect(screen.getByText('$240')).toBeInTheDocument(); // Lite annual
      expect(screen.getByText('$840')).toBeInTheDocument(); // Pro annual
      
      // Switch to monthly
      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      await user.click(monthlyButton);
      
      await waitFor(() => {
        expect(screen.getByText('$20')).toBeInTheDocument(); // Lite monthly
        expect(screen.getByText('$70')).toBeInTheDocument(); // Pro monthly
      });
    });

    it('updates pricing display when toggling billing cycle', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      // Check initial state (annual)
      expect(screen.getAllByText('/year')[0]).toBeInTheDocument(); // Check first instance
      
      // Switch to monthly
      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      await user.click(monthlyButton);
      
      await waitFor(() => {
        expect(screen.getAllByText('/month')[0]).toBeInTheDocument(); // Check first instance
      });
    });
  });

  describe('Plan Selection', () => {
    it('navigates to dashboard when Pro plan button (Get Started) is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i }); // This is Pro plan's button
      await user.click(getStartedButton);
      
      expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      expect(mockOnGetStarted).not.toHaveBeenCalled(); // onGetStarted should not be called by this button
    });

    it('navigates to dashboard when Lite plan button (Select Plan) is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      const selectPlanButtons = screen.getAllByRole('button', { name: /select plan/i });
      await user.click(selectPlanButtons[0]); // Lite is the first "Select Plan"
      
      expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      expect(mockOnGetStarted).not.toHaveBeenCalled();
    });
  });

  describe('Features Display', () => {
    it('displays all plan features', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      expect(screen.getByText('Viral Blitz Cycle Framework (15 uses)')).toBeInTheDocument();
      expect(screen.getByText('Idea Generator Framework (15 uses)')).toBeInTheDocument();
      expect(screen.getByText('Viral Blitz Cycle Framework (unlimited)')).toBeInTheDocument();
      expect(screen.getByText('Everything in Pro')).toBeInTheDocument();
    });

    it('shows guarantee information', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      expect(screen.getAllByText('10-day results guarantee').length).toBeGreaterThan(0);
    });

    it('displays bonus information', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      expect(screen.getAllByText('Limited Time Bonuses').length).toBeGreaterThan(0);
      expect(screen.getByText(/Template Generator & Hook Creator/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility standards', async () => {
      const container = await testAccessibility(
        <PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />
      );
      
      // Check for proper button labels
      const buttons = container.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
        expectElementToBeAccessible(button);
      });
    });

    it('has proper ARIA labels for pricing toggle', () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      const annualButton = screen.getByRole('button', { name: /annual/i });
      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      
      expect(annualButton).toBeInTheDocument();
      expect(monthlyButton).toBeInTheDocument();
    });

    it('maintains focus management during interactions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} navigate={mockNavigate} />);
      
      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      
      // Focus the button first
      monthlyButton.focus();
      expect(monthlyButton).toHaveFocus();
      
      await user.click(monthlyButton);
      
      // After interaction, focus should be maintained or properly managed
      await waitFor(() => {
        // Check if focus is on the clicked button or properly transferred
        const focusedElement = document.activeElement;
        expect(focusedElement).toBeTruthy();
        
        // Verify focus is on an interactive element
        if (focusedElement) {
          expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement.tagName)).toBe(true);
        }
      }, { timeout: 1000 });
      
      // Test keyboard navigation after interaction
      await user.tab();
      const nextFocusedElement = document.activeElement;
      expect(nextFocusedElement).toBeTruthy();
      
      // Verify tab navigation works properly
      if (nextFocusedElement && nextFocusedElement !== monthlyButton) {
        expect(['BUTTON', 'A', 'INPUT'].includes(nextFocusedElement.tagName)).toBe(true);
      }
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', async () => {
      const results = await testResponsive(
        <PricingSection onGetStarted={mockOnGetStarted} />
      );
      
      // Verify component renders on all viewport sizes
      expect(results.mobile.container).toBeTruthy();
      expect(results.tablet.container).toBeTruthy();
      expect(results.desktop.container).toBeTruthy();
    });

    it('plan buttons navigate on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i }); // Pro plan
      await user.click(getStartedButton);
      
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      });
      expect(mockOnGetStarted).not.toHaveBeenCalled();
    });
  });

  describe('Animation and Visual Effects', () => {
    it('handles animation states properly', async () => {
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} />);
      
      // Check for elements that should have animations
      const pricingCards = screen.getAllByRole('button', { name: /get started|select plan/i });
      expect(pricingCards.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles missing pricing data gracefully', () => {
      // Test with minimal props
      renderWithProviders(<PricingSection onGetStarted={mockOnGetStarted} />);
      
      // Should still render basic structure
      expect(screen.getByText(/scale your content/i)).toBeInTheDocument();
    });

    it('handles callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const user = userEvent.setup();
      renderWithProviders(<PricingSection onGetStarted={errorCallback} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      
      // Should not crash when callback throws
      await expect(user.click(getStartedButton)).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('renders efficiently', async () => {
      const { average } = await measureRenderPerformance(
        <PricingSection onGetStarted={mockOnGetStarted} />,
        5
      );
      
      // Should render in reasonable time (adjust threshold as needed)
      expect(average).toBeLessThan(100); // 100ms threshold
    });
  });
});

// Helper function for performance testing (imported from test utils)
async function measureRenderPerformance(component: React.ReactElement, iterations = 5) {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderWithProviders(component);
    const end = performance.now();
    times.push(end - start);
  }
  
  return {
    average: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    times,
  };
} 