# ClipsCommerce Testing Infrastructure

This document describes the redesigned testing infrastructure for the ClipsCommerce application, providing comprehensive testing utilities and patterns for building reliable, maintainable tests.

## 📁 Directory Structure

```
testing/
├── setup/                 # Global test setup and configuration
│   ├── jest.setup.js     # Main Jest setup with mocks and utilities
│   ├── globalSetup.js    # Global setup before all tests
│   └── globalTeardown.js # Global cleanup after all tests
├── utils/                # Test utilities and helpers
│   └── index.ts          # Comprehensive testing utilities
├── fixtures/             # Mock data and test fixtures
│   └── index.ts          # Predefined test data
├── mocks/                # Mock implementations
│   └── fileMock.js       # Static file mocks
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── components/           # Component tests
├── api/                  # API route tests
└── e2e/                  # End-to-end tests
```

## 🚀 Getting Started

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:components    # Component tests only
npm run test:api          # API tests only
npm run test:e2e          # End-to-end tests

# Run tests with specific patterns
npm run test:accessibility # Accessibility tests
npm run test:performance  # Performance tests

# Development workflows
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
npm run test:ci          # CI/CD optimized run
```

### Test Organization

Tests are organized by type and purpose:

- **Unit Tests** (`testing/unit/`): Test individual functions and utilities
- **Component Tests** (`testing/components/`): Test React components in isolation
- **Integration Tests** (`testing/integration/`): Test feature workflows and component interactions
- **API Tests** (`testing/api/`): Test API routes and server-side logic
- **E2E Tests** (`testing/e2e/`): Test complete user workflows

## 🛠 Testing Utilities

### Core Utilities

Import testing utilities from the centralized location:

```typescript
import {
  renderWithProviders,
  screen,
  waitFor,
  userEvent,
  testAccessibility,
  testResponsive,
  createMockUser,
  expectElementToBeAccessible,
} from '@testUtils/index';
```

### Component Testing

#### Basic Component Test

```typescript
import { renderWithProviders, screen } from '@testUtils/index';
import MyComponent from '@components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

#### Component with Providers

```typescript
import { renderWithProviders } from '@testUtils/index';
import MyComponent from '@components/MyComponent';
import { mockUsers } from '@fixtures/index';

describe('MyComponent with Auth', () => {
  it('renders for authenticated user', () => {
    renderWithProviders(<MyComponent />, {
      supabase: { user: mockUsers.proUser },
      router: { pathname: '/dashboard' },
      theme: 'dark',
    });
    
    expect(screen.getByText('Welcome, Pro User')).toBeInTheDocument();
  });
});
```

### Form Testing

```typescript
import { fillForm, submitForm, testFormValidation } from '@testUtils/index';

describe('Contact Form', () => {
  it('submits form with valid data', async () => {
    renderWithProviders(<ContactForm />);
    
    await fillForm({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello world',
    });
    
    await submitForm();
    
    expect(screen.getByText('Message sent successfully')).toBeInTheDocument();
  });
  
  it('validates required fields', async () => {
    await testFormValidation(
      <ContactForm />,
      { name: '', email: 'invalid-email' },
      ['Name is required', 'Invalid email format']
    );
  });
});
```

### Accessibility Testing

```typescript
import { testAccessibility, expectElementToBeAccessible } from '@testUtils/index';

describe('Accessibility', () => {
  it('meets accessibility standards', async () => {
    const container = await testAccessibility(<MyComponent />);
    
    // Additional custom accessibility checks
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expectElementToBeAccessible(button);
    });
  });
});
```

### Responsive Testing

```typescript
import { testResponsive } from '@testUtils/index';

describe('Responsive Design', () => {
  it('adapts to different screen sizes', async () => {
    const results = await testResponsive(<MyComponent />);
    
    expect(results.mobile.container).toBeTruthy();
    expect(results.tablet.container).toBeTruthy();
    expect(results.desktop.container).toBeTruthy();
  });
});
```

### API Testing

```typescript
import { mockApiResponse, testApiError } from '@testUtils/index';

describe('API Integration', () => {
  it('handles successful API response', async () => {
    mockApiResponse('/api/users', { users: [mockUsers.proUser] });
    
    renderWithProviders(<UserList />);
    
    await waitFor(() => {
      expect(screen.getByText('Pro User')).toBeInTheDocument();
    });
  });
  
  it('handles API errors gracefully', async () => {
    await testApiError(
      <UserList />,
      '/api/users',
      500,
      'Failed to load users'
    );
  });
});
```

### Performance Testing

```typescript
import { measureRenderPerformance } from '@testUtils/index';

describe('Performance', () => {
  it('renders efficiently', async () => {
    const { average, max } = await measureRenderPerformance(
      <ComplexComponent />,
      10
    );
    
    expect(average).toBeLessThan(50); // 50ms average
    expect(max).toBeLessThan(100);    // 100ms max
  });
});
```

## 🎭 Mock Data and Fixtures

### Using Predefined Fixtures

```typescript
import { 
  mockUsers, 
  mockPricingTiers, 
  mockContent,
  mockSupabaseResponses 
} from '@fixtures/index';

// Use predefined mock data
const user = mockUsers.proUser;
const pricing = mockPricingTiers.pro;
const content = mockContent.tiktokVideo;
```

### Creating Dynamic Mock Data

```typescript
import { createMockUser, createMockContent } from '@fixtures/index';

// Generate unique mock data for each test
const user = createMockUser({ subscription: 'team' });
const content = createMockContent({ platform: 'instagram' });
```

## 🔧 Configuration

### Jest Configuration

The Jest configuration (`jest.config.js`) includes:

- TypeScript support with `ts-jest`
- Module path mapping for clean imports
- Comprehensive mocking setup
- Coverage reporting
- Performance optimization

### Environment Variables

Test environment variables are automatically set in `globalSetup.js`:

```javascript
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.OPENAI_API_KEY = 'test-openai-key';
// ... other test-specific variables
```

## 🎯 Testing Patterns

### Component Testing Pattern

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    // Basic rendering tests
  });
  
  describe('User Interactions', () => {
    // Click, form submission, etc.
  });
  
  describe('State Management', () => {
    // State changes, props updates
  });
  
  describe('Accessibility', () => {
    // A11y compliance tests
  });
  
  describe('Error Handling', () => {
    // Error states and edge cases
  });
  
  describe('Performance', () => {
    // Render performance tests
  });
});
```

### Integration Testing Pattern

```typescript
describe('Feature: User Authentication', () => {
  describe('Login Flow', () => {
    // Complete login workflow
  });
  
  describe('Registration Flow', () => {
    // Complete registration workflow
  });
  
  describe('Password Reset', () => {
    // Password reset workflow
  });
});
```

## 🚨 Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

### 2. Mock Management

- Use the provided mock utilities for consistency
- Reset mocks between tests using `beforeEach`
- Mock external dependencies at the module level

### 3. Async Testing

- Always use `await` with async operations
- Use `waitFor` for elements that appear asynchronously
- Set appropriate timeouts for slow operations

### 4. Accessibility

- Include accessibility tests for all interactive components
- Test keyboard navigation and screen reader compatibility
- Verify ARIA attributes and semantic HTML

### 5. Performance

- Include performance tests for complex components
- Monitor render times and memory usage
- Test with realistic data volumes

## 🔍 Debugging Tests

### Common Issues

1. **Element not found**: Use `screen.debug()` to see the rendered output
2. **Async timing**: Increase timeout or use `waitFor` properly
3. **Mock not working**: Check mock setup in `beforeEach`
4. **Import errors**: Verify path mappings in Jest config

### Debug Utilities

```typescript
// Debug rendered component
screen.debug();

// Debug specific element
screen.debug(screen.getByRole('button'));

// Log test performance
console.log('Test performance:', global.__TEST_PERFORMANCE__);
```

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI/CD
- `coverage/coverage-final.json` - JSON format

### Coverage Thresholds

Current thresholds (configurable in `jest.config.js`):

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Test Results

Test results are output in JUnit format to `test-results/junit.xml` for CI/CD integration.

## 🆘 Getting Help

- Check the test utilities documentation in `testing/utils/index.ts`
- Review example tests in `testing/components/`
- Consult the Jest documentation for advanced features
- Use the debugging utilities for troubleshooting

## 🔄 Migration Guide

### From Old Testing Setup

1. Update imports to use new test utilities:
   ```typescript
   // Old
   import { render, screen } from '@testing-library/react';
   
   // New
   import { renderWithProviders, screen } from '@testUtils/index';
   ```

2. Move tests to appropriate directories:
   - Component tests → `testing/components/`
   - Unit tests → `testing/unit/`
   - Integration tests → `testing/integration/`

3. Use new mock data fixtures:
   ```typescript
   // Old
   const mockUser = { id: '1', name: 'Test' };
   
   // New
   import { mockUsers } from '@fixtures/index';
   const mockUser = mockUsers.proUser;
   ```

4. Update test scripts in package.json (already done)

This testing infrastructure provides a solid foundation for building reliable, maintainable tests that scale with your application. 