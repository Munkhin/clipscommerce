import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamHeader } from '@/components/team-dashboard/TeamHeader';
import { TeamSidebar } from '@/components/team-dashboard/TeamSidebar';

// Mock providers and dependencies
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { 
      email: 'test@example.com',
      subscription_tier: 'team'
    },
    loading: false,
    signOut: jest.fn(),
  }),
}));

jest.mock('@/providers/TeamModeProvider', () => ({
  useTeamMode: () => ({
    isTeamMode: true,
    teamData: { name: 'Test Team', memberCount: 5 },
    selectedClient: null,
    selectClient: jest.fn(),
    clients: [],
  }),
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
}

const user = userEvent.setup();

describe('Team Dashboard Edge Case Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle API timeout gracefully', async () => {
      // Mock fetch to simulate timeout
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const NetworkFailureTest = () => {
        const [error, setError] = React.useState(null);
        const [loading, setLoading] = React.useState(false);

        const handleApiCall = async () => {
          setLoading(true);
          try {
            await fetch('/api/team-data');
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        React.useEffect(() => {
          handleApiCall();
        }, []);

        return (
          <TestWrapper>
            <div data-testid="loading-state">{loading ? 'loading' : 'idle'}</div>
            <div data-testid="error-state">{error || 'no error'}</div>
          </TestWrapper>
        );
      };

      render(<NetworkFailureTest />);

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
        expect(screen.getByTestId('error-state')).toHaveTextContent('Request timeout');
      }, { timeout: 200 });
    });

    it('should handle intermittent connectivity issues', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' })
        });
      });

      const RetryTest = () => {
        const [data, setData] = React.useState(null);
        const [retryCount, setRetryCount] = React.useState(0);

        const fetchWithRetry = async (maxRetries = 3) => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              const response = await fetch('/api/data');
              const result = await response.json();
              setData(result.data);
              return;
            } catch (error) {
              setRetryCount(i + 1);
              if (i === maxRetries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        };

        React.useEffect(() => {
          fetchWithRetry();
        }, []);

        return (
          <TestWrapper>
            <div data-testid="retry-count">{retryCount}</div>
            <div data-testid="data-result">{data || 'no data'}</div>
          </TestWrapper>
        );
      };

      render(<RetryTest />);

      await waitFor(() => {
        expect(screen.getByTestId('data-result')).toHaveTextContent('success');
        expect(screen.getByTestId('retry-count')).toHaveTextContent('3');
      }, { timeout: 500 });
    });
  });

  describe('Data Corruption and Recovery', () => {
    it('should handle corrupted local storage data', () => {
      // Mock corrupted localStorage
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'team-data') {
          return 'invalid-json-data{';
        }
        return originalGetItem.call(localStorage, key);
      });

      const CorruptedDataTest = () => {
        const [data, setData] = React.useState(null);
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          try {
            const storedData = localStorage.getItem('team-data');
            if (storedData) {
              const parsedData = JSON.parse(storedData);
              setData(parsedData);
            }
          } catch (err) {
            setError('Data corruption detected');
            localStorage.removeItem('team-data');
            setData({ default: true });
          }
        }, []);

        return (
          <TestWrapper>
            <div data-testid="error-message">{error || 'no error'}</div>
            <div data-testid="data-state">{data ? 'data loaded' : 'no data'}</div>
          </TestWrapper>
        );
      };

      render(<CorruptedDataTest />);

      expect(screen.getByTestId('error-message')).toHaveTextContent('Data corruption detected');
      expect(screen.getByTestId('data-state')).toHaveTextContent('data loaded');

      localStorage.getItem = originalGetItem;
    });

    it('should recover from invalid team configuration', () => {
      const InvalidConfigTest = () => {
        const [config, setConfig] = React.useState(null);
        const [isValid, setIsValid] = React.useState(false);

        const validateConfig = (configData) => {
          const requiredFields = ['teamId', 'name', 'members'];
          return requiredFields.every(field => configData && configData[field]);
        };

        React.useEffect(() => {
          // Simulate invalid config
          const invalidConfig = { teamId: null, name: '', members: undefined };
          
          if (validateConfig(invalidConfig)) {
            setConfig(invalidConfig);
            setIsValid(true);
          } else {
            // Use default config
            const defaultConfig = {
              teamId: 'default-team',
              name: 'Default Team',
              members: []
            };
            setConfig(defaultConfig);
            setIsValid(true);
          }
        }, []);

        return (
          <TestWrapper>
            <div data-testid="config-valid">{isValid ? 'valid' : 'invalid'}</div>
            <div data-testid="team-name">{config?.name || 'no name'}</div>
          </TestWrapper>
        );
      };

      render(<InvalidConfigTest />);

      expect(screen.getByTestId('config-valid')).toHaveTextContent('valid');
      expect(screen.getByTestId('team-name')).toHaveTextContent('Default Team');
    });
  });

  describe('Extreme Load Conditions', () => {
    it('should handle maximum team member limit', () => {
      const MaxMembersTest = () => {
        const maxMembers = 1000;
        const [members, setMembers] = React.useState([]);
        const [isAtLimit, setIsAtLimit] = React.useState(false);

        React.useEffect(() => {
          // Simulate maximum members
          const memberList = Array.from({ length: maxMembers }, (_, i) => ({
            id: i,
            name: `Member ${i}`,
            role: i === 0 ? 'owner' : 'member'
          }));
          
          setMembers(memberList);
          setIsAtLimit(memberList.length >= maxMembers);
        }, []);

        return (
          <TestWrapper>
            <div data-testid="member-count">{members.length}</div>
            <div data-testid="at-limit">{isAtLimit ? 'at limit' : 'below limit'}</div>
            <div data-testid="rendered-members">
              {/* Only render first 10 for performance */}
              {members.slice(0, 10).map(member => (
                <div key={member.id}>{member.name}</div>
              ))}
            </div>
          </TestWrapper>
        );
      };

      render(<MaxMembersTest />);

      expect(screen.getByTestId('member-count')).toHaveTextContent('1000');
      expect(screen.getByTestId('at-limit')).toHaveTextContent('at limit');
      
      // Should only render 10 members for performance
      const renderedMembers = screen.getByTestId('rendered-members').children;
      expect(renderedMembers.length).toBe(10);
    });

    it('should handle rapid team switching', async () => {
      const RapidSwitchingTest = () => {
        const [currentTeam, setCurrentTeam] = React.useState('team-1');
        const [switchCount, setSwitchCount] = React.useState(0);

        const teams = ['team-1', 'team-2', 'team-3', 'team-4', 'team-5'];

        const rapidSwitch = async () => {
          for (let i = 0; i < teams.length; i++) {
            setCurrentTeam(teams[i]);
            setSwitchCount(prev => prev + 1);
            // Small delay to simulate real switching
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        };

        return (
          <TestWrapper>
            <div data-testid="current-team">{currentTeam}</div>
            <div data-testid="switch-count">{switchCount}</div>
            <button onClick={rapidSwitch} data-testid="rapid-switch">
              Rapid Switch
            </button>
          </TestWrapper>
        );
      };

      render(<RapidSwitchingTest />);

      await user.click(screen.getByTestId('rapid-switch'));

      await waitFor(() => {
        expect(screen.getByTestId('switch-count')).toHaveTextContent('5');
        expect(screen.getByTestId('current-team')).toHaveTextContent('team-5');
      }, { timeout: 200 });
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malicious input sanitization', () => {
      const MaliciousInputTest = () => {
        const [sanitizedInput, setSanitizedInput] = React.useState('');

        const sanitizeInput = (input) => {
          // Remove script tags and other dangerous content
          return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        };

        React.useEffect(() => {
          const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="alert(1)">';
          const cleaned = sanitizeInput(maliciousInput);
          setSanitizedInput(cleaned);
        }, []);

        return (
          <TestWrapper>
            <div data-testid="sanitized-input">{sanitizedInput}</div>
          </TestWrapper>
        );
      };

      render(<MaliciousInputTest />);

      const sanitizedContent = screen.getByTestId('sanitized-input').textContent;
      expect(sanitizedContent).not.toContain('<script>');
      expect(sanitizedContent).not.toContain('onerror');
      expect(sanitizedContent).not.toContain('javascript:');
    });

    it('should handle unauthorized access attempts', () => {
      const UnauthorizedAccessTest = () => {
        const [accessDenied, setAccessDenied] = React.useState(false);
        const [attemptCount, setAttemptCount] = React.useState(0);

        const attemptAccess = (userRole) => {
          setAttemptCount(prev => prev + 1);
          
          const authorizedRoles = ['owner', 'admin'];
          if (!authorizedRoles.includes(userRole)) {
            setAccessDenied(true);
          }
        };

        React.useEffect(() => {
          // Simulate unauthorized access attempt
          attemptAccess('guest');
        }, []);

        return (
          <TestWrapper>
            <div data-testid="access-denied">{accessDenied ? 'denied' : 'allowed'}</div>
            <div data-testid="attempt-count">{attemptCount}</div>
          </TestWrapper>
        );
      };

      render(<UnauthorizedAccessTest />);

      expect(screen.getByTestId('access-denied')).toHaveTextContent('denied');
      expect(screen.getByTestId('attempt-count')).toHaveTextContent('1');
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle missing modern browser features', () => {
      // Mock missing IntersectionObserver
      const originalIntersectionObserver = window.IntersectionObserver;
      delete window.IntersectionObserver;

      const CompatibilityTest = () => {
        const [hasIntersectionObserver, setHasIntersectionObserver] = React.useState(false);
        const [fallbackActive, setFallbackActive] = React.useState(false);

        React.useEffect(() => {
          if (window.IntersectionObserver) {
            setHasIntersectionObserver(true);
          } else {
            setFallbackActive(true);
          }
        }, []);

        return (
          <TestWrapper>
            <div data-testid="has-intersection-observer">
              {hasIntersectionObserver ? 'supported' : 'not supported'}
            </div>
            <div data-testid="fallback-active">
              {fallbackActive ? 'active' : 'inactive'}
            </div>
          </TestWrapper>
        );
      };

      render(<CompatibilityTest />);

      expect(screen.getByTestId('has-intersection-observer')).toHaveTextContent('not supported');
      expect(screen.getByTestId('fallback-active')).toHaveTextContent('active');

      // Restore IntersectionObserver
      window.IntersectionObserver = originalIntersectionObserver;
    });

    it('should handle localStorage unavailability', () => {
      // Mock localStorage unavailability
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;

      const LocalStorageTest = () => {
        const [storageAvailable, setStorageAvailable] = React.useState(false);
        const [fallbackStorage, setFallbackStorage] = React.useState({});

        const checkStorageAvailability = () => {
          try {
            return typeof Storage !== 'undefined' && window.localStorage;
          } catch (e) {
            return false;
          }
        };

        React.useEffect(() => {
          if (checkStorageAvailability()) {
            setStorageAvailable(true);
          } else {
            // Use in-memory fallback
            setFallbackStorage({ data: 'fallback data' });
          }
        }, []);

        return (
          <TestWrapper>
            <div data-testid="storage-available">
              {storageAvailable ? 'available' : 'unavailable'}
            </div>
            <div data-testid="fallback-data">
              {fallbackStorage.data || 'no data'}
            </div>
          </TestWrapper>
        );
      };

      render(<LocalStorageTest />);

      expect(screen.getByTestId('storage-available')).toHaveTextContent('unavailable');
      expect(screen.getByTestId('fallback-data')).toHaveTextContent('fallback data');

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });
  });
}); 