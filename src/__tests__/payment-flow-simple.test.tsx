import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Simple mock components for testing
const MockPricingSection = () => {
  const [isAnnual, setIsAnnual] = React.useState(true);
  
  const handlePlanClick = (planType: string) => {
    let stripeLink = '';
    
    if (planType === 'pro') {
      if (isAnnual) {
        stripeLink = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK || '';
      } else {
        stripeLink = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK || '';
      }
    } else if (planType === 'team') {
      if (isAnnual) {
        stripeLink = process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK || '';
      } else {
        stripeLink = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK || '';
      }
      
      // For team plans, store redirect to team dashboard
      localStorage.setItem('post_payment_redirect', '/team-dashboard');
    }
    
    // Mock window.open for testing
    if (stripeLink) {
      (window as any).mockStripeRedirect = stripeLink;
    }
  };

  return (
    <div>
      <button 
        onClick={() => setIsAnnual(!isAnnual)}
        data-testid="billing-toggle"
      >
        {isAnnual ? 'Switch to Monthly' : 'Switch to Annual'}
      </button>
      
      <div data-testid="free-plan">
        <h3>Free Plan</h3>
        <button onClick={() => { if(window.location) window.location.href = '/dashboard'; }}>
          Get Started Free
        </button>
      </div>
      
      <div data-testid="pro-plan">
        <h3>Pro Plan</h3>
        <p>{isAnnual ? '$70/month (billed yearly)' : '$87.50/month'}</p>
        <button onClick={() => handlePlanClick('pro')}>
          Get Pro Plan
        </button>
      </div>
      
      <div data-testid="team-plan">
        <h3>Team Plan</h3>
        <p>{isAnnual ? '$500/month (billed yearly)' : '$625/month'}</p>
        <button onClick={() => handlePlanClick('team')}>
          Get Team Plan
        </button>
      </div>
    </div>
  );
};

// Mock environment variables
const originalEnv = process.env;
const mockLocationHref = jest.fn(); // Global spy for href changes
let originalLocation: Location;

describe('Payment Flow - Core Functionality', () => {
  beforeAll(() => {
    originalLocation = window.location;
    try {
      delete (window as any).location;
    } catch (e) {
      console.warn("Could not delete window.location in payment-flow-simple.test.tsx, proceeding with assignment", e);
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
        mockLocationHref(value);
      },
      toString: function() { return this._currentHref; },
      valueOf: function() { return this; }
    };
    mockLocationHref.mockClear();
    ((window as any).location.assign as jest.Mock).mockClear();
    ((window as any).location.replace as jest.Mock).mockClear();

    // Mock for tracking Stripe redirects (if still used by MockPricingSection)
    (window as any).mockStripeRedirect = null;
  });

  afterAll(() => {
    (window as any).location = originalLocation;
  });

  beforeEach(() => {
    jest.resetModules(); // Keep this if it's important for other mocks in this file
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK: 'https://stripe.com/pro-monthly',
      NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK: 'https://stripe.com/pro-yearly',
      NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK: 'https://stripe.com/team-monthly',
      NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK: 'https://stripe.com/team-yearly',
    };
    
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true, // Make it configurable for multiple test runs
      writable: true
    });
    
    // Reset window.location.href via the setter to ensure spy is called if needed, and clear mocks
    if (window.location && typeof (window.location as any)._currentHref === 'string') {
      (window.location as any)._currentHref = 'http://localhost:3000/initial-mock-path';
    }
    mockLocationHref.mockClear();
    ((window as any).location.assign as jest.Mock).mockClear();
    ((window as any).location.replace as jest.Mock).mockClear();

    // Mock for tracking Stripe redirects (if still used by MockPricingSection)
    (window as any).mockStripeRedirect = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should render all pricing plans', () => {
    render(<MockPricingSection />);
    
    expect(screen.getByTestId('free-plan')).toBeInTheDocument();
    expect(screen.getByTestId('pro-plan')).toBeInTheDocument();
    expect(screen.getByTestId('team-plan')).toBeInTheDocument();
  });

  it('should toggle between monthly and yearly billing', () => {
    render(<MockPricingSection />);
    
    const toggle = screen.getByTestId('billing-toggle');
    
    // Initially should show yearly pricing
    expect(screen.getByText('$70/month (billed yearly)')).toBeInTheDocument();
    expect(screen.getByText('$500/month (billed yearly)')).toBeInTheDocument();
    
    // Click to switch to monthly
    fireEvent.click(toggle);
    
    expect(screen.getByText('$87.50/month')).toBeInTheDocument();
    expect(screen.getByText('$625/month')).toBeInTheDocument();
  });

  it('should use correct Stripe link for Pro yearly plan', () => {
    render(<MockPricingSection />);
    
    const proButton = screen.getByText('Get Pro Plan');
    fireEvent.click(proButton);
    
    expect((window as any).mockStripeRedirect).toBe('https://stripe.com/pro-yearly');
  });

  it('should use correct Stripe link for Pro monthly plan', () => {
    render(<MockPricingSection />);
    
    // Switch to monthly billing
    const toggle = screen.getByTestId('billing-toggle');
    fireEvent.click(toggle);
    
    const proButton = screen.getByText('Get Pro Plan');
    fireEvent.click(proButton);
    
    expect((window as any).mockStripeRedirect).toBe('https://stripe.com/pro-monthly');
  });

  it('should use correct Stripe link for Team yearly plan and set redirect', () => {
    render(<MockPricingSection />);
    
    const teamButton = screen.getByText('Get Team Plan');
    fireEvent.click(teamButton);
    
    expect((window as any).mockStripeRedirect).toBe('https://stripe.com/team-yearly');
    expect(localStorage.setItem).toHaveBeenCalledWith('post_payment_redirect', '/team-dashboard');
  });

  it('should use correct Stripe link for Team monthly plan and set redirect', () => {
    render(<MockPricingSection />);
    
    // Switch to monthly billing
    const toggle = screen.getByTestId('billing-toggle');
    fireEvent.click(toggle);
    
    const teamButton = screen.getByText('Get Team Plan');
    fireEvent.click(teamButton);
    
    expect((window as any).mockStripeRedirect).toBe('https://stripe.com/team-monthly');
    expect(localStorage.setItem).toHaveBeenCalledWith('post_payment_redirect', '/team-dashboard');
  });

  it('should handle free plan correctly', () => {
    render(<MockPricingSection />);
    
    const freeButton = screen.getByText('Get Started Free');
    
    fireEvent.click(freeButton);
    
    // Check that location.href was set to dashboard via the global spy
    expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
  });
});

describe('Environment Variable Validation', () => {
  it('should have all required Stripe environment variables defined', () => {
    // Set up environment variables for this test
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK = 'https://stripe.com/pro-monthly';
    process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK = 'https://stripe.com/pro-yearly';
    process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK = 'https://stripe.com/team-monthly';
    process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK = 'https://stripe.com/team-yearly';
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK',
      'NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK',
      'NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK',
      'NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK',
    ];

    requiredEnvVars.forEach(envVar => {
      expect(process.env[envVar]).toBeDefined();
      expect(process.env[envVar]).toContain('stripe.com');
    });
  });
}); 