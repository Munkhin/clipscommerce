// Comprehensive test utilities for ClipsCommerce
import { render, screen, fireEvent, waitFor, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin' | 'team_member';
  subscription?: 'free' | 'lite' | 'pro' | 'team';
}

export interface MockSupabaseOptions {
  user?: TestUser | null;
  session?: any;
  error?: any;
}

export interface ComponentTestOptions extends RenderOptions {
  user?: TestUser;
  theme?: 'light' | 'dark' | 'system';
  router?: Partial<any>;
  supabase?: MockSupabaseOptions;
}

// =============================================================================
// COMPONENT TESTING UTILITIES
// =============================================================================

/**
 * Enhanced render function with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: ComponentTestOptions = {}
) {
  const {
    user,
    theme = 'light',
    router = {},
    supabase = {},
    ...renderOptions
  } = options;

  // Mock router if provided
  if (Object.keys(router).length > 0) {
    const mockRouter = require('@testing/setup/jest.setup.js').mockRouter;
    Object.assign(mockRouter, router);
  }

  // Mock Supabase if provided
  if (Object.keys(supabase).length > 0) {
    const mockSupabaseClient = require('@testing/setup/jest.setup.js').mockSupabaseClient;
    if (supabase.user !== undefined) {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: supabase.user },
        error: supabase.error || null,
      });
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: supabase.session || (supabase.user ? { user: supabase.user } : null) },
        error: supabase.error || null,
      });
    }
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider attribute="class" defaultTheme={theme}>
        {children}
      </ThemeProvider>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Test a component's accessibility
 */
export async function testAccessibility(component: ReactElement) {
  const { container } = renderWithProviders(component);
  
  // Check for basic accessibility attributes
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.getAttribute('aria-label') && !button.textContent?.trim()) {
      console.warn('Button without accessible name found:', button);
    }
  });

  const images = container.querySelectorAll('img');
  images.forEach(img => {
    if (!img.getAttribute('alt')) {
      console.warn('Image without alt text found:', img);
    }
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    container.querySelector(`label[for="${input.id}"]`);
    if (!hasLabel) {
      console.warn('Input without label found:', input);
    }
  });

  return container;
}

/**
 * Test component with different viewport sizes
 */
export async function testResponsive(
  component: ReactElement,
  viewports: Array<{ width: number; height: number; name: string }> = [
    { width: 320, height: 568, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' },
  ]
) {
  const results: Record<string, any> = {};

  for (const viewport of viewports) {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: viewport.width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: viewport.height,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    const { container } = renderWithProviders(component);
    results[viewport.name] = {
      viewport,
      container,
      screenshot: container.innerHTML, // For debugging
    };
  }

  return results;
}

// =============================================================================
// FORM TESTING UTILITIES
// =============================================================================

/**
 * Fill out a form with test data
 */
export async function fillForm(formData: Record<string, string>) {
  const user = userEvent.setup();

  for (const [fieldName, value] of Object.entries(formData)) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) ||
                  screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                  screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
    
    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
}

/**
 * Submit a form and wait for response
 */
export async function submitForm(submitButtonText = /submit|save|create/i) {
  const user = userEvent.setup();
  const submitButton = screen.getByRole('button', { name: submitButtonText });
  
  await user.click(submitButton);
  
  // Wait for form submission to complete
  await waitFor(() => {
    expect(submitButton).not.toBeDisabled();
  }, { timeout: 5000 });
}

/**
 * Test form validation
 */
export async function testFormValidation(
  component: ReactElement,
  invalidData: Record<string, string>,
  expectedErrors: string[]
) {
  renderWithProviders(component);
  
  await fillForm(invalidData);
  await submitForm();
  
  // Check for validation errors
  for (const error of expectedErrors) {
    expect(screen.getByText(new RegExp(error, 'i'))).toBeInTheDocument();
  }
}

// =============================================================================
// API TESTING UTILITIES
// =============================================================================

/**
 * Mock API response
 */
export function mockApiResponse(url: string, response: any, status = 200) {
  global.fetch = jest.fn().mockImplementation((requestUrl: string) => {
    if (requestUrl.includes(url)) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      });
    }
    return Promise.reject(new Error(`Unexpected API call to ${requestUrl}`));
  });
}

/**
 * Test API error handling
 */
export async function testApiError(
  component: ReactElement,
  apiUrl: string,
  errorStatus = 500,
  errorMessage = 'Internal Server Error'
) {
  mockApiResponse(apiUrl, { error: errorMessage }, errorStatus);
  
  const { container } = renderWithProviders(component);
  
  // Wait for error to be displayed
  await waitFor(() => {
    expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
  });
  
  return container;
}

// =============================================================================
// ANIMATION TESTING UTILITIES
// =============================================================================

/**
 * Test component animations
 */
export async function testAnimations(component: ReactElement) {
  const { container } = renderWithProviders(component);
  
  // Mock animation frame
  const mockRAF = jest.spyOn(global, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback): number => {
      // In a real test, you might want to immediately invoke the callback
      // or store it to invoke manually later after some assertions.
      // For this general utility, we'll just acknowledge it was called.
      // If specific animation logic needs testing, the test itself should be more detailed.
      if (typeof callback === 'function') {
        // callback(performance.now()); // Optionally call it if needed for specific tests
      }
      return Date.now(); // Return a mock ID
    });
  
  // At this point, if the component calls requestAnimationFrame,
  // our mockImplementation above would be executed.
  // This utility doesn't trigger the component's rAF call, it just sets up the mock for it.

  // Example of how a real test might use this:
  // renderWithProviders(component); // Component renders and calls rAF
  // expect(mockRAF).toHaveBeenCalled();
  // if (capturedCallback) capturedCallback(performance.now()); // if you captured it
  // ... assertions ...
  
  mockRAF.mockRestore(); // Restore the original implementation

  return container;
}

// =============================================================================
// PERFORMANCE TESTING UTILITIES
// =============================================================================

/**
 * Measure component render performance
 */
export async function measureRenderPerformance(
  component: ReactElement,
  iterations = 10
) {
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

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate mock user data
 */
export function createMockUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    role: 'user',
    subscription: 'free',
    ...overrides,
  };
}

/**
 * Generate mock pricing data
 */
export function createMockPricingTier(overrides: any = {}) {
  return {
    id: `tier-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Plan',
    price: 29,
    yearlyPrice: 290,
    description: 'Test plan description',
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
    isPopular: false,
    ctaText: 'Get Started',
    ...overrides,
  };
}

/**
 * Generate mock content data
 */
export function createMockContent(overrides: any = {}) {
  return {
    id: `content-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Content',
    description: 'Test content description',
    url: 'https://example.com/content',
    platform: 'tiktok',
    metrics: {
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      shares: Math.floor(Math.random() * 100),
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that an element is visible and accessible
 */
export function expectElementToBeAccessible(element: HTMLElement) {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
  
  // Check for basic accessibility
  if (element.tagName === 'BUTTON') {
    expect(element).not.toHaveAttribute('disabled');
  }
  
  if (element.tagName === 'IMG') {
    expect(element).toHaveAttribute('alt');
  }
}

/**
 * Assert loading state
 */
export async function expectLoadingState(loadingText = /loading|spinner/i) {
  expect(screen.getByText(loadingText)).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
  });
}

/**
 * Assert error state
 */
export function expectErrorState(errorText: string | RegExp) {
  expect(screen.getByText(errorText)).toBeInTheDocument();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  render,
  screen,
  fireEvent,
  waitFor,
};

// Re-export commonly used testing library functions
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event'; 