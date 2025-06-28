import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard/page';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useFeatureUsage } from '@/hooks/useFeatureUsage';

// Mock the dependencies
jest.mock('@/providers/AuthProvider');
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('@/hooks/useUsageLimits');
jest.mock('@/hooks/useFeatureUsage');
jest.mock('@/app/workflows/reports/ReportsAnalysisService');

const mockAuthProvider = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSupabaseClient = createClientComponentClient as jest.MockedFunction<typeof createClientComponentClient>;
const mockUsageLimits = useUsageLimits as jest.MockedFunction<typeof useUsageLimits>;
const mockFeatureUsage = useFeatureUsage as jest.MockedFunction<typeof useFeatureUsage>;

describe('Dashboard Real-time Data', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
      subscription_tier: 'pro'
    }
  };

  const mockSupabase = {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn()
  };

  const mockRealtimeData = [
    { metric_name: 'revenue', value: 12500 },
    { metric_name: 'revenueGrowth', value: 15.2 },
    { metric_name: 'orders', value: 42 },
    { metric_name: 'ordersGrowth', value: 8.7 },
    { metric_name: 'conversion', value: 3.45 },
    { metric_name: 'conversionGrowth', value: 12.1 },
    { metric_name: 'visitors', value: 1250 },
    { metric_name: 'visitorsGrowth', value: 22.3 }
  ];

  beforeEach(() => {
    mockAuthProvider.mockReturnValue({
      user: mockUser,
      signIn: jest.fn(),
      signOut: jest.fn(),
      loading: false,
      signUp: jest.fn()
    });

    mockUsageLimits.mockReturnValue({
      hasFeatureAccess: jest.fn().mockReturnValue(true),
      tier: 'pro'
    });

    mockFeatureUsage.mockReturnValue({
      checkFeatureAccess: jest.fn().mockReturnValue(true),
      recordFeatureUsage: jest.fn(),
      showLoginPrompt: false,
      showSubscriptionPrompt: false,
      currentFeature: null,
      closeLoginPrompt: jest.fn(),
      closeSubscriptionPrompt: jest.fn(),
      isAuthenticated: true
    });

    // Mock Supabase client
    const mockSelect = jest.fn().mockResolvedValue({
      data: mockRealtimeData,
      error: null
    });

    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn();

    mockSupabase.from.mockReturnValue({ select: mockSelect });
    mockSupabase.channel.mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe
    });

    mockSupabaseClient.mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Real-time Data Fetching', () => {
    it('should fetch initial real-time metrics from database', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('realtime_metrics');
      });

      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
    });

    it('should display fetched real-time data in metrics cards', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('$12,500')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('3.45%')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      // Check growth percentages
      expect(screen.getByText('+15.2%')).toBeInTheDocument();
      expect(screen.getByText('+8.7%')).toBeInTheDocument();
      expect(screen.getByText('+12.1%')).toBeInTheDocument();
      expect(screen.getByText('+22.3%')).toBeInTheDocument();
    });

    it('should handle real-time updates via Supabase subscription', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('realtime-metrics');
      });

      // Verify subscription setup
      const channelInstance = mockSupabase.channel.mock.results[0].value;
      expect(channelInstance.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'realtime_metrics' },
        expect.any(Function)
      );
      expect(channelInstance.subscribe).toHaveBeenCalled();
    });

    it('should handle errors gracefully when fetching real-time data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockSelectError = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      mockSupabase.from.mockReturnValue({ select: mockSelectError });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching initial real-time data:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should process metric updates correctly', async () => {
      const { rerender } = render(<DashboardPage />);

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });

      // Simulate real-time update
      const channelInstance = mockSupabase.channel.mock.results[0].value;
      const onCallback = channelInstance.on.mock.calls[0][2];

      // Simulate a revenue update
      onCallback({
        new: { metric_name: 'revenue', value: 15000 }
      });

      rerender(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('$15,000')).toBeInTheDocument();
      });
    });

    it('should cleanup subscription on component unmount', () => {
      const { unmount } = render(<DashboardPage />);

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('Metric Display', () => {
    it('should display all four main metrics with correct formatting', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // Revenue
        expect(screen.getByText('Revenue')).toBeInTheDocument();
        expect(screen.getByText('Total sales this month')).toBeInTheDocument();

        // Orders
        expect(screen.getByText('Orders')).toBeInTheDocument();
        expect(screen.getByText('New orders today')).toBeInTheDocument();

        // Conversion Rate
        expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
        expect(screen.getByText('Visitor to customer rate')).toBeInTheDocument();

        // Visitors
        expect(screen.getByText('Visitors')).toBeInTheDocument();
        expect(screen.getByText('Unique visitors today')).toBeInTheDocument();
      });
    });

    it('should show trending indicators for growth metrics', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // All growth percentages should be positive with up trend
        const trendingUpIcons = screen.getAllByTestId('trending-up-icon');
        expect(trendingUpIcons).toHaveLength(4);
      });
    });
  });
});