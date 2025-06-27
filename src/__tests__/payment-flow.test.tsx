import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import PricingSection from '@/app/landing/components/PricingSection';
import SubscriptionComponent from '@/components/dashboard/SubscriptionComponent';
import PaymentSuccessPage from '@/app/payment-success/page';
import { useAuth } from '@/providers/AuthProvider';

// Mock process.env directly at the top of the file
jest.mock('process', () => ({
  env: {
    ...process.env, // Keep existing environment variables
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK: 'https://stripe.com/pro-monthly-test',
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK: 'https://stripe.com/pro-yearly-test',
    NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK: 'https://stripe.com/team-monthly-test',
    NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK: 'https://stripe.com/team-yearly-test',
    NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK: 'https://stripe.com/lite-monthly-test',
    NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK: 'https://stripe.com/lite-yearly-test',
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.open and window.location
const mockWindowOpen = jest.fn();
const mockLocationHref = jest.fn();
const mockLocationAssign = jest.fn();
const mockLocationReplace = jest.fn();
const mockLocationReload = jest.fn();

const mockNavigate = (url: string) => mockLocationHref(url);
const mockNavigateWindowOpen = (url: string) => mockWindowOpen(url, '_blank');
Object.defineProperty(window, 'open', { value: mockWindowOpen });

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Auth Provider
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

describe('Payment Flow Tests', () => {
  let originalLocation: Location;
  const user = userEvent.setup();

  beforeAll(() => {
    jest.useFakeTimers();
    originalLocation = window.location;
    try {
      delete (window as any).location;
    } catch (e) {
      console.warn("Could not delete window.location in payment-flow.test.tsx, proceeding with assignment", e);
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
    jest.useRealTimers();
    (window as any).location = originalLocation;
  });

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationHref.mockClear();
    mockLocationAssign.mockClear();
    mockLocationReplace.mockClear();
    mockLocationReload.mockClear();
    mockWindowOpen.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    jest.runOnlyPendingTimers(); // Clear any lingering timers from previous tests

    // Reset the href on our mock location to a default state before each test
    if (window.location && typeof (window.location as any)._currentHref === 'string') {
      (window.location as any)._currentHref = 'http://localhost:3000/initial-mock-path';
    } else if (window.location) { 
        window.location.href = 'http://localhost:3000/initial-mock-path';
    }
    
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      session: { access_token: 'mock-token' },
      loading: false,
    });
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('PricingSection Component', () => {
    it('should render all three pricing plans', () => {
      render(<PricingSection onGetStarted={jest.fn()} navigate={mockNavigate} />);
      
      expect(screen.getByText('Lite')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
    });

    it('should handle free plan (Lite) selection correctly', async () => {
      render(<PricingSection onGetStarted={jest.fn()} navigate={mockNavigate} />);
      
      // Lite plan is the first "Select Plan" button
      const liteButton = screen.getAllByText('Select Plan')[0];
      await user.click(liteButton);
      
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle Pro monthly plan selection', async () => {
      render(<PricingSection onGetStarted={jest.fn()} navigate={mockNavigate} />);
      
      // Switch to monthly billing
      const monthlyButton = screen.getByText('Monthly');
      await user.click(monthlyButton);
      
      // Pro plan is the "Select Plan" button at index 1
      const proButton = screen.getAllByText('Select Plan')[1]; 
      await user.click(proButton);
      
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle Pro yearly plan selection', async () => {
      render(<PricingSection onGetStarted={jest.fn()} navigate={mockNavigate} />);
      
      // Annual is default. Pro plan is the "Select Plan" button at index 1.
      const proButton = screen.getAllByText('Select Plan')[1];
      await user.click(proButton);
      
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle Team monthly plan selection and navigate to dashboard', async () => {
      render(<PricingSection onGetStarted={jest.fn()} navigate={mockNavigate} />);
      
      // Switch to monthly billing
      const monthlyButton = screen.getByText('Monthly');
      await user.click(monthlyButton);
      
      // Team plan is the "Select Plan" button at index 2
      const teamButton = screen.getAllByText('Select Plan')[2]; 
      await user.click(teamButton);
      
      // PricingSection's handlePlanClick always goes to /dashboard due to missing stripePriceId
      // localStorage.setItem for team redirect is not handled by this component's click handler.
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle Team yearly plan selection and navigate to dashboard', async () => {
      render(<PricingSection onGetStarted={jest.fn()} navigate={mockNavigate} />);
      
      // Annual is default. Team plan is the "Select Plan" button at index 2.
      const teamButton = screen.getAllByText('Select Plan')[2];
      await user.click(teamButton);
      
      // PricingSection's handlePlanClick always goes to /dashboard
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('SubscriptionComponent', () => {
    const mockStripeLinks = {
      NEXT_PUBLIC_STRIPE_LITE_MONTHLY_LINK: 'https://stripe.com/lite-monthly-test',
      NEXT_PUBLIC_STRIPE_LITE_YEARLY_LINK: 'https://stripe.com/lite-yearly-test',
      NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK: 'https://stripe.com/pro-monthly-test',
      NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK: 'https://stripe.com/pro-yearly-test',
      NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK: 'https://stripe.com/team-monthly-test',
      NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK: 'https://stripe.com/team-yearly-test',
    };

    it('should render all subscription plans', () => {
      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);
      
      expect(screen.getByText('Lite')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('30% off')).toBeInTheDocument();
    });

    it('should handle Pro monthly plan selection', async () => {
      console.log('Running Pro monthly plan selection test');
      console.log('NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK:', mockStripeLinks.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK);
      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);
      
      // Switch to monthly billing
      const monthlyButton = screen.getByText('Monthly');
      await user.click(monthlyButton);
      jest.runAllTimers(); // Ensure all timers are run
      
      // Pro plan is the "Select Plan" button at index 1
      const proButton = screen.getAllByText('Select Plan')[1];
      await user.click(proButton);

      // Expect window.open to have been called with the correct Stripe link
      await waitFor(() => {
        console.log('mockWindowOpen calls:', mockWindowOpen.mock.calls);
        expect(mockWindowOpen).toHaveBeenCalledWith(mockStripeLinks.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK, '_blank');
      });
    });

    it('should handle Pro yearly plan selection', async () => {
      console.log('Running Pro yearly plan selection test');
      console.log('NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK:', mockStripeLinks.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK);
      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);
      
      // Annual is default. Pro plan is the "Select Plan" button at index 1.
      const proButton = screen.getAllByText('Select Plan')[1];
      await user.click(proButton);
      jest.runAllTimers(); // Ensure all timers are run

      await waitFor(() => {
        console.log('mockWindowOpen calls:', mockWindowOpen.mock.calls);
        expect(mockWindowOpen).toHaveBeenCalledWith(mockStripeLinks.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK, '_blank');
      });
    });

    it('should handle Team monthly plan selection', async () => {
      console.log('Running Team monthly plan selection test');
      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);
      
      // Switch to monthly billing
      const monthlyButton = screen.getByText('Monthly');
      await user.click(monthlyButton);
      jest.runAllTimers(); // Ensure all timers are run
      
      // Team plan is the "Select Plan" button at index 2
      const teamButton = screen.getAllByText('Select Plan')[2];
      await user.click(teamButton);
      jest.runAllTimers(); // Ensure all timers are run

      // Expect localStorage.setItem to have been called for team redirect
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('post_payment_redirect', '/team-dashboard');
      });
      // Expect window.open to have been called with the correct Stripe link
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(mockStripeLinks.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_LINK, '_blank');
      });
    });

    it('should handle Team yearly plan selection', async () => {
      console.log('Running Team yearly plan selection test');
      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);
      
      // Annual is default. Team plan is the "Select Plan" button at index 2.
      const teamButton = screen.getAllByText('Select Plan')[2];
      await user.click(teamButton);
      jest.runAllTimers(); // Ensure all timers are run

      // Expect localStorage.setItem to have been called for team redirect
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('post_payment_redirect', '/team-dashboard');
      });
      // Expect window.open to have been called with the correct Stripe link
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(mockStripeLinks.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_LINK, '_blank');
      });
    });

    it('should handle localStorage errors gracefully', async () => {
      console.log('Running localStorage errors gracefully test');
      // Temporarily break localStorage.setItem for this test
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage setItem error');
      });

      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);
      
      const proMonthlyButton = screen.getAllByText('Select Plan')[1]; // Pro monthly
      await user.click(proMonthlyButton);
      jest.runAllTimers(); // Ensure all timers are run

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('localStorage setItem error'));
        expect(mockWindowOpen).toHaveBeenCalledWith(mockStripeLinks.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_LINK, '_blank');
      });
    });

    it('should handle window.open errors gracefully', async () => {
      console.log('Running window.open errors gracefully test');
      // Make window.open throw an error
      mockWindowOpen.mockImplementation(() => {
        throw new Error('window.open error');
      });

      render(<SubscriptionComponent navigate={mockNavigateWindowOpen} stripeLinks={mockStripeLinks} />);

      const proMonthlyButton = screen.getAllByText('Select Plan')[1]; // Pro monthly
      await user.click(proMonthlyButton);
      jest.runAllTimers(); // Ensure all timers are run

      // Should show fallback success message
      await waitFor(() => {
        expect(screen.getByText('Navigation failed, but plan selection recorded.')).toBeInTheDocument();
      });
    });
  });

  describe('PaymentSuccessPage Component', () => {
    const mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };

    beforeEach(() => {
      jest.useFakeTimers();
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
      localStorageMock.getItem.mockReturnValue(null); // Clear any previous redirect
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should render PaymentSuccessPage and redirect to team dashboard if redirect is set', async () => {
      localStorageMock.getItem.mockReturnValue('/team-dashboard');
      render(<PaymentSuccessPage />);

      // Advance timers by 3 seconds to trigger redirect
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/team-dashboard');
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('post_payment_redirect');
    });

    it('should render PaymentSuccessPage and redirect to /dashboard if no redirect is set', async () => {
      render(<PaymentSuccessPage />);

      // Advance timers by 3 seconds to trigger redirect
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard immediately on button click', async () => {
      localStorageMock.getItem.mockReturnValue('/team-dashboard');
      render(<PaymentSuccessPage />);

      const goToDashboardButton = screen.getByText('Continue to Dashboard');
      await user.click(goToDashboardButton);
      jest.runAllTimers(); // Ensure all timers are run

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/team-dashboard');
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('redirectAfterLogin');
    });

    it('should render PaymentSuccessPage and handle redirection to a custom path', async () => {
      localStorageMock.getItem.mockReturnValue('/custom-redirect-path');
      render(<PaymentSuccessPage />);

      const goToDashboardButton = screen.getByText('Continue to Dashboard');
      await user.click(goToDashboardButton);
      jest.runAllTimers(); // Ensure all timers are run

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-redirect-path');
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('redirectAfterLogin');
    });
  });
}); 