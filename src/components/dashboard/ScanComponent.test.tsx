import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ScanComponent from './ScanComponent';
import { AuthProvider } from '@/providers/AuthProvider';
import { mockUsers } from 'testing/fixtures';

// Custom MockAuthProvider for test
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthProviderMock>{children}</AuthProviderMock>
);

// Mock AuthProvider context
const AuthContext = React.createContext({
  user: mockUsers.proUser,
  session: null,
  loading: false,
  signOut: jest.fn(),
});

const AuthProviderMock = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={{
    user: mockUsers.proUser,
    session: null,
    loading: false,
    signOut: jest.fn(),
  }}>
    {children}
  </AuthContext.Provider>
);

jest.mock('@/providers/AuthProvider', () => ({
  ...jest.requireActual('@/providers/AuthProvider'),
  useAuth: () => React.useContext(AuthContext),
}));

// Mock fetch for the scan API
const mockScanId = 'scan_test_123';
const mockScanResult = {
  id: mockScanId,
  userId: 'user-1',
  status: 'completed',
  metrics: {
    totalPosts: 10,
    averageEngagement: 5.2,
    peakTimes: [
      { hour: 12, engagementScore: 8.1 },
      { hour: 18, engagementScore: 7.5 }
    ],
    topPerformingPosts: [
      { hook: 'How I increased my following by 10k in 30 days using this simple trick' },
      { hook: 'The content strategy that 99% of creators in the fitness space are missing' },
      { hook: 'I tested 5 different fitness approaches - here\'s what actually worked' }
    ]
  },
  error: null,
};

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('ScanComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (fetch as jest.MockedFunction<typeof fetch>).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should display scan results after successful API call', async () => {
    // Mock POST to start scan
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, scanId: mockScanId })
      } as Response)
      // Mock GET to fetch scan result
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockScanResult })
      } as Response);

    render(
      <MockAuthProvider>
        <ScanComponent />
      </MockAuthProvider>
    );

    // Enter niche and competitors
    fireEvent.change(screen.getByLabelText(/Niche or Topic/i), { target: { value: 'fitness' } });
    fireEvent.change(screen.getByLabelText(/Competitors/i), { target: { value: 'competitor1\ncompetitor2' } });

    // Click Start Scan
    fireEvent.click(screen.getByText(/Start Scan/i));

    // Should show loading state
    expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument();

    // Advance timers to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(3000);
      // Wait for the next tick
      await Promise.resolve();
    });

    // Wait for scan results
    await waitFor(() => {
      expect(screen.getByText(/Scan Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/High-Performing Hooks/i)).toBeInTheDocument();
      expect(screen.getByText(/Content Templates/i)).toBeInTheDocument();
      expect(screen.getByText(/Recommended Keywords/i)).toBeInTheDocument();
    });
  });
}); 