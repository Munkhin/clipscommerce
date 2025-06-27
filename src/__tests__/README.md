# Testing Documentation

This document outlines the testing patterns, mocking strategies, and best practices used throughout the ClipsCommerce test suite.

## Table of Contents

1. [Testing Framework Setup](#testing-framework-setup)
2. [Mocking Strategies](#mocking-strategies)
3. [Test Patterns](#test-patterns)
4. [Component Testing](#component-testing)
5. [Service Testing](#service-testing)
6. [Integration Testing](#integration-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Performance Testing](#performance-testing)
9. [Best Practices](#best-practices)

## Testing Framework Setup

### Core Dependencies
- **Jest**: Primary testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers

### Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

## Mocking Strategies

### 1. Next.js Router Mocking
```javascript
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));
```

### 2. Supabase Client Mocking
```javascript
// For middleware tests
const mockGetSession = jest.fn();
jest.mock('../../src/lib/supabase/middleware', () => ({
  createClient: () => ({
    supabase: { auth: { getSession: mockGetSession } },
    response: NextResponse.next(),
  }),
}));
```

### 2.1. Middleware-Specific Mocking Patterns
```javascript
// Mock CSRF token validation
jest.mock('@/lib/csrf', () => ({
  verifyCsrfToken: jest.fn((token) => token === 'valid-token'),
}));

// Mock NextRequest for middleware testing
const createMockRequest = (pathname: string, options: {
  search?: string;
  headers?: Record<string, string>;
  method?: string;
} = {}) => {
  const url = `https://example.com${pathname}${options.search || ''}`;
  return {
    nextUrl: { 
      pathname, 
      search: options.search || '', 
      href: url 
    },
    headers: { 
      get: (key: string) => options.headers?.[key] || null 
    },
    url,
    method: options.method || 'GET',
  } as unknown as NextRequest;
};

// Mock session data factory
const createMockSession = (overrides = {}) => ({
  user: { 
    id: '123', 
    email: 'test@example.com',
    ...overrides 
  },
});
```

### 3. External API Mocking
```javascript
// Mock fetch for API calls
global.fetch = jest.fn();

beforeEach(() => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
});
```

### 4. Crypto Module Mocking
```javascript
// For secure transfer tests
import crypto from 'crypto';

// Crypto is available in Node.js test environment
// No mocking needed for basic crypto operations
```

### 5. Context Provider Mocking
```javascript
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));
```

## Test Patterns

### 1. Component Test Structure
```javascript
describe('ComponentName', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with required props', () => {
      // Test basic rendering
    });
  });

  describe('Interactions', () => {
    it('should handle user interactions', async () => {
      // Test user events
    });
  });

  describe('Accessibility', () => {
    it('should meet accessibility standards', () => {
      // Test ARIA labels, keyboard navigation, etc.
    });
  });
});
```

### 2. Service Test Structure
```javascript
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle normal operation', () => {
      // Test happy path
    });

    it('should handle error scenarios', () => {
      // Test error cases
    });

    it('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### 3. Async Testing Pattern
```javascript
it('should handle async operations', async () => {
  // Setup
  const mockData = { id: 1, name: 'test' };
  mockApiCall.mockResolvedValue(mockData);

  // Action
  render(<Component />);
  await user.click(screen.getByRole('button'));

  // Assertion
  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## Component Testing

### 1. Rendering Tests
```javascript
it('should render component with props', () => {
  const props = { title: 'Test Title', active: true };
  render(<Component {...props} />);
  
  expect(screen.getByText('Test Title')).toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveClass('active');
});
```

### 2. Snapshot Testing
```javascript
it('should match snapshot', () => {
  const { container } = render(<Component />);
  expect(container.firstChild).toMatchSnapshot();
});
```

### 3. User Interaction Testing
```javascript
it('should handle click events', async () => {
  const mockHandler = jest.fn();
  render(<Component onClick={mockHandler} />);
  
  await user.click(screen.getByRole('button'));
  expect(mockHandler).toHaveBeenCalledTimes(1);
});
```

### 4. Form Testing
```javascript
it('should validate form inputs', async () => {
  render(<FormComponent />);
  
  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, 'invalid-email');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
```

## Service Testing

### 1. Pure Function Testing
```javascript
describe('utilityFunction', () => {
  it('should process data correctly', () => {
    const input = { data: 'test' };
    const result = utilityFunction(input);
    
    expect(result).toEqual({ processed: 'test' });
  });
});
```

### 2. Async Service Testing
```javascript
describe('apiService', () => {
  it('should fetch data successfully', async () => {
    const mockData = { id: 1 };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiService.getData();
    expect(result).toEqual(mockData);
  });
});
```

### 3. Error Handling Testing
```javascript
it('should handle network errors', async () => {
  global.fetch.mockRejectedValue(new Error('Network error'));
  
  await expect(apiService.getData()).rejects.toThrow('Network error');
});
```

## Integration Testing

### 1. Component Integration
```javascript
describe('Component Integration', () => {
  it('should work with providers', () => {
    render(
      <TestProvider>
        <Component />
      </TestProvider>
    );
    
    expect(screen.getByText(/provider data/i)).toBeInTheDocument();
  });
});
```

### 2. Middleware Testing
```javascript
describe('Middleware Integration', () => {
  it('should handle authentication flow', async () => {
    const request = new NextRequest('http://localhost/protected');
    const response = await middleware(request);
    
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/sign-in');
  });
});
```

### 2.1. Middleware Test Patterns

#### Authentication Flow Testing
```javascript
describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect unauthenticated users', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const request = createMockRequest('/dashboard');
    
    const response = await middleware(request);
    
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/sign-in');
    expect(response.headers.get('location')).toContain('redirected=true');
  });

  it('should allow authenticated users', async () => {
    mockGetSession.mockResolvedValue({ 
      data: { session: createMockSession() } 
    });
    const request = createMockRequest('/dashboard');
    
    const response = await middleware(request);
    
    expect(response.status).toBe(200);
  });
});
```

#### CSRF Protection Testing
```javascript
describe('CSRF Protection', () => {
  it('should validate CSRF tokens for protected API routes', async () => {
    const request = createMockRequest('/api/protected', {
      headers: { 'x-csrf-token': 'invalid-token' }
    });
    
    const response = await middleware(request);
    
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Invalid CSRF token');
  });

  it('should allow public API routes without CSRF', async () => {
    const request = createMockRequest('/api/auth/csrf');
    
    const response = await middleware(request);
    
    expect(response.status).toBe(200);
  });
});
```

#### Path Access Testing
```javascript
describe('Path Access Control', () => {
  it('should handle static file access', async () => {
    const staticFiles = ['/favicon.ico', '/image.png', '/_next/static/file.js'];
    
    for (const file of staticFiles) {
      const request = createMockRequest(file);
      const response = await middleware(request);
      expect(response.status).toBe(200);
    }
  });

  it('should handle public path access', async () => {
    const publicPaths = ['/', '/auth/sign-in', '/auth/sign-up'];
    
    for (const path of publicPaths) {
      const request = createMockRequest(path);
      const response = await middleware(request);
      expect(response.status).toBe(200);
    }
  });
});
```

#### Performance and Security Testing
```javascript
describe('Middleware Performance', () => {
  it('should handle concurrent requests', async () => {
    mockGetSession.mockResolvedValue({ 
      data: { session: createMockSession() } 
    });
    
    const requests = Array.from({ length: 10 }, (_, i) => 
      middleware(createMockRequest(`/dashboard?req=${i}`))
    );
    
    const responses = await Promise.all(requests);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  it('should handle malformed requests gracefully', async () => {
    const malformedRequest = { 
      nextUrl: null, 
      headers: { get: jest.fn() } 
    } as any;
    
    await expect(middleware(malformedRequest)).rejects.toThrow();
  });
});
```

### 2.2. Access Control and Redirect Testing Patterns

#### Subscription Tier Testing
```javascript
// Mock user factory for different subscription tiers
const createMockUser = (tier: 'lite' | 'pro' | 'team', overrides = {}) => ({
  email: `${tier}@example.com`,
  subscription_tier: tier,
  team_id: tier === 'team' ? 'team_123' : null,
  team_role: tier === 'team' ? 'member' : null,
  ...overrides,
});

describe('Subscription Access Control', () => {
  it('should allow team tier access', () => {
    jest.doMock('@/providers/AuthProvider', () => ({
      useAuth: () => ({
        user: createMockUser('team'),
        loading: false,
        signOut: jest.fn(),
      }),
    }));

    render(<TeamDashboard />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should restrict non-team tier access', () => {
    jest.doMock('@/providers/AuthProvider', () => ({
      useAuth: () => ({
        user: createMockUser('pro'),
        loading: false,
        signOut: jest.fn(),
      }),
    }));

    render(<TeamDashboard />);
    expect(screen.getByText(/upgrade to team/i)).toBeInTheDocument();
  });
});
```

#### Redirect Logic Testing
```javascript
describe('Team User Redirects', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        pathname: '/',
      }),
    }));
  });

  it('should redirect team users from root', async () => {
    const RedirectComponent = () => {
      const { user } = useAuth();
      const router = useRouter();
      
      React.useEffect(() => {
        if (user?.subscription_tier === 'team') {
          router.push('/team-dashboard');
        }
      }, [user, router]);

      return <div>Root</div>;
    };

    render(<RedirectComponent />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/team-dashboard');
    });
  });

  it('should preserve query parameters in redirects', async () => {
    // Mock window.location with query params
    Object.defineProperty(window, 'location', {
      value: { 
        href: 'http://localhost:3000/?tab=analytics',
        search: '?tab=analytics' 
      },
      writable: true,
    });

    const QueryRedirectComponent = () => {
      const { user } = useAuth();
      const router = useRouter();
      
      React.useEffect(() => {
        if (user?.subscription_tier === 'team') {
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = `/team-dashboard?${params.toString()}`;
          router.push(redirectUrl);
        }
      }, [user, router]);

      return <div>Root with query</div>;
    };

    render(<QueryRedirectComponent />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/team-dashboard?tab=analytics');
    });
  });
});
```

#### Access Control Test Fixtures
```javascript
// Subscription tier fixtures
export const subscriptionTiers = {
  lite: {
    name: 'Lite',
    features: ['Basic features', 'Limited usage'],
    teamAccess: false,
  },
  pro: {
    name: 'Pro', 
    features: ['Advanced features', 'Unlimited usage'],
    teamAccess: false,
  },
  team: {
    name: 'Team',
    features: ['All Pro features', 'Team collaboration', 'Team dashboard'],
    teamAccess: true,
  },
};

// Team membership fixtures
export const teamRoles = {
  owner: {
    permissions: ['manage_team', 'manage_billing', 'manage_members'],
    canAccessAll: true,
  },
  admin: {
    permissions: ['manage_members', 'view_analytics'],
    canAccessAll: true,
  },
  member: {
    permissions: ['view_content', 'create_content'],
    canAccessAll: false,
  },
};

// Mock auth provider with tier testing
export const mockAuthProvider = (tier: string, teamRole?: string) => ({
  useAuth: () => ({
    user: {
      ...createMockUser(tier),
      team_role: teamRole,
    },
    loading: false,
    signOut: jest.fn(),
  }),
});
```

#### Browser Navigation Testing
```javascript
describe('Browser Navigation Handling', () => {
  it('should handle back/forward navigation', async () => {
    const NavigationComponent = () => {
      const { user } = useAuth();
      const router = useRouter();
      
      React.useEffect(() => {
        const handlePopState = () => {
          if (user?.subscription_tier === 'team' && window.location.pathname === '/') {
            router.replace('/team-dashboard');
          }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
      }, [user, router]);

      return <div>Navigation aware</div>;
    };

    render(<NavigationComponent />);
    
    // Simulate browser back
    window.dispatchEvent(new PopStateEvent('popstate'));
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/team-dashboard');
    });
  });
});
```

## Accessibility Testing

### 1. ARIA Testing
```javascript
it('should have proper ARIA attributes', () => {
  render(<Component />);
  
  expect(screen.getByRole('button')).toHaveAttribute('aria-label');
  expect(screen.getByRole('form')).toHaveAttribute('aria-describedby');
});
```

### 2. Keyboard Navigation Testing
```javascript
it('should support keyboard navigation', async () => {
  render(<Component />);
  
  const firstButton = screen.getAllByRole('button')[0];
  firstButton.focus();
  expect(firstButton).toHaveFocus();
  
  await user.tab();
  expect(screen.getAllByRole('button')[1]).toHaveFocus();
});
```

### 3. Screen Reader Testing
```javascript
it('should announce changes to screen readers', async () => {
  render(<Component />);
  
  const liveRegion = document.querySelector('[aria-live]');
  expect(liveRegion).toBeInTheDocument();
});
```

## Performance Testing

### 1. Render Performance
```javascript
it('should render efficiently', () => {
  const startTime = performance.now();
  render(<Component />);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(100);
});
```

### 2. Memory Leak Testing
```javascript
it('should not cause memory leaks', () => {
  const { unmount } = render(<Component />);
  expect(() => unmount()).not.toThrow();
});
```

### 3. Concurrent Operations Testing
```javascript
it('should handle concurrent requests', async () => {
  const requests = Array.from({ length: 5 }, () => 
    serviceFunction('test-data')
  );
  
  const results = await Promise.all(requests);
  expect(results).toHaveLength(5);
});
```

## Best Practices

### 1. Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern
- Keep tests focused and atomic

### 2. Mock Management
- Clear mocks between tests using `jest.clearAllMocks()`
- Mock at the appropriate level (module, function, or implementation)
- Use realistic mock data that matches production scenarios
- Avoid over-mocking - test real integrations when possible

### 3. Async Testing
- Always use `await` with async operations
- Use `waitFor` for elements that appear asynchronously
- Set appropriate timeouts for slow operations
- Test both success and error scenarios

### 4. Accessibility
- Test keyboard navigation paths
- Verify ARIA attributes and roles
- Check for proper heading hierarchy
- Test with screen reader announcements

### 5. Error Scenarios
- Test network failures and timeouts
- Verify graceful degradation
- Test input validation and sanitization
- Check error message clarity and helpfulness

### 6. Performance Considerations
- Test with realistic data sizes
- Verify efficient rendering and updates
- Check for memory leaks in long-running tests
- Test concurrent operation handling

### 7. Maintenance
- Update tests when functionality changes
- Remove obsolete tests and mocks
- Keep test dependencies up to date
- Document complex test scenarios

## Common Patterns

### Test Wrapper Component
```javascript
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
```

### Custom Render Function
```javascript
function renderWithProviders(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: TestWrapper, ...options });
}
```

### Mock Data Factories
```javascript
const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
});
```

## Running Tests

### Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- middleware.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"
```

### Coverage Thresholds
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

## Troubleshooting

### Common Issues
1. **Async tests timing out**: Increase timeout or use proper `waitFor`
2. **Mock not working**: Check mock placement and module resolution
3. **DOM cleanup warnings**: Ensure proper test cleanup
4. **Flaky tests**: Add proper waits and deterministic test data

### Debug Tips
- Use `screen.debug()` to see current DOM state
- Add `console.log` in tests for debugging
- Use `--verbose` flag for detailed test output
- Check Jest configuration for module resolution issues

This documentation should be updated as new patterns emerge and testing practices evolve. 