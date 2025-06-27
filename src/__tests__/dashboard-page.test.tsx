import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import { useAuth } from '@/providers/AuthProvider';

// Mock the Auth Provider
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock the Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

// Mock the charts
jest.mock('@/components/dashboard/charts', () => ({
  BarChart: () => <div data-testid="bar-chart">Bar Chart</div>,
  LineChart: () => <div data-testid="line-chart">Line Chart</div>,
}));

// Mock the services
jest.mock('@/app/workflows/reports/ReportsAnalysisService', () => ({
  ReportsAnalysisService: jest.fn().mockImplementation(() => ({
    getReport: jest.fn().mockResolvedValue({
      success: true,
      data: {
        historicalViewGrowth: [],
        pastPostsPerformance: [],
      },
    }),
  })),
}));

// Mock the UI components
jest.mock('@/components/ui/chart-wrapper', () => ({
  ChartWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress">Progress: {value}%</div>,
}));

const mockUser = {
  id: '123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn(),
      session: null,
    });
  });

  it('renders the dashboard page with greeting', () => {
    render(<DashboardPage />);
    
    // Check if greeting is displayed (should be "Good evening, test")
    expect(screen.getByText(/Good evening/)).toBeInTheDocument();
    expect(screen.getByText(/test/)).toBeInTheDocument();
  });

  it('renders workflow cards', () => {
    render(<DashboardPage />);
    
    // Check if workflow cards are present
    expect(screen.getByText('Sell Better')).toBeInTheDocument();
    expect(screen.getByText('How to Sell')).toBeInTheDocument();
  });

  it('renders performance charts', () => {
    render(<DashboardPage />);
    
    // Check if chart titles are present
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Conversion')).toBeInTheDocument();
  });

  it('renders onboarding progress', () => {
    render(<DashboardPage />);
    
    // Check if progress is displayed
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });
}); 