// Enhanced Jest setup for ClipsCommerce testing infrastructure
require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');
const nodeFetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// =============================================================================
// GLOBAL POLYFILLS AND UTILITIES
// =============================================================================

// Add missing globals for Node.js test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch and its related classes
if (!global.fetch) {
  global.fetch = nodeFetch;
  global.Request = nodeFetch.Request;
  global.Response = nodeFetch.Response;
  global.Headers = nodeFetch.Headers;
}

// Add performance API for testing
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  };
}

// =============================================================================
// NEXT.JS MOCKS
// =============================================================================

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const React = require('react');
    return React.createElement('img', { 
      ...props, 
      alt: props.alt || '',
      // Convert Next.js specific props to standard img props
      src: props.src,
      width: props.width,
      height: props.height,
    });
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    const React = require('react');
    return React.createElement('a', { 
      href, 
      ...props,
      onClick: (e) => {
        e.preventDefault();
        if (props.onClick) props.onClick(e);
      }
    }, children);
  },
}));

// Enhanced Next.js router mock
const mockRouter = {
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
  prefetch: jest.fn(() => Promise.resolve()),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  locale: 'en',
  locales: ['en'],
  defaultLocale: 'en',
  isReady: true,
  isPreview: false,
  isFallback: false,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
  withRouter: (Component) => Component,
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouter.push,
    replace: mockRouter.replace,
    prefetch: mockRouter.prefetch,
    back: mockRouter.back,
    forward: mockRouter.forward,
    refresh: mockRouter.refresh,
  }),
  usePathname: () => mockRouter.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

// =============================================================================
// SUPABASE MOCKS
// =============================================================================

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
    signUp: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    then: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
      download: jest.fn(() => Promise.resolve({ data: null, error: null })),
      remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      list: jest.fn(() => Promise.resolve({ data: [], error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'http://example.com/file.jpg' } })),
    })),
  },
  rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
  createBrowserClient: jest.fn(() => mockSupabaseClient),
}));

// =============================================================================
// ANIMATION AND UI MOCKS
// =============================================================================

// Enhanced framer-motion mock
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        const React = require('react');
        return React.forwardRef((props, ref) => {
          const { children, ...otherProps } = props;
          return React.createElement(prop, { ...otherProps, ref }, children);
        });
      }
      return target[prop];
    },
  }),
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({ 
    start: jest.fn(() => Promise.resolve()), 
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useInView: () => [jest.fn(), false],
  useMotionValue: (initial) => ({
    get: () => initial,
    set: jest.fn(),
    on: jest.fn(),
  }),
  useTransform: () => jest.fn(),
  useSpring: () => jest.fn(),
  useCycle: () => [0, jest.fn()],
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => new Proxy({}, {
  get: (target, prop) => {
    if (typeof prop === 'string') {
      const React = require('react');
      return (props) => React.createElement('svg', { 
        'data-testid': `${prop}-icon`,
        ...props 
      });
    }
    return target[prop];
  },
}));

// =============================================================================
// BROWSER API MOCKS
// =============================================================================

// Mock DOM APIs
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(Element.prototype, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    fontSize: '16px',
    fontFamily: 'Arial',
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    margin: '0px',
    padding: '0px',
    border: '0px',
    width: 'auto',
    height: 'auto',
    top: 'auto',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    position: 'static',
    zIndex: 'auto',
    scrollBehavior: 'smooth',
  }),
  writable: true,
  configurable: true,
});

// Mock location object
// delete window.location;
// Object.defineProperty(window, 'location', {
//   value: {
//     href: 'http://localhost:3000/',
//     origin: 'http://localhost:3000',
//     protocol: 'http:',
//     host: 'localhost:3000',
//     hostname: 'localhost',
//     port: '3000',
//     pathname: '/',
//     search: '',
//     hash: '',
//     reload: jest.fn(),
//     assign: jest.fn(),
//     replace: jest.fn(),
//   },
//   writable: true,
//   configurable: true,
// });

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    key: jest.fn((index) => Object.keys(store)[index] || null),
    get length() { return Object.keys(store).length; },
  };
};

Object.defineProperty(window, 'localStorage', { value: createStorageMock() });
Object.defineProperty(window, 'sessionStorage', { value: createStorageMock() });

// Mock Intersection Observer
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock Resize Observer
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// =============================================================================
// CONSOLE MOCKING AND FILTERING
// =============================================================================

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Filter out known warnings/errors during tests
const shouldSuppressMessage = (message) => {
  if (typeof message !== 'string') return false;
  
  const suppressPatterns = [
    'Error: connect ECONNREFUSED',
    'Error: getaddrinfo ENOTFOUND',
    'OpenAI API error',
    '401 Incorrect API key',
    'WebGL is not supported',
    'Initialization of backend webgl failed',
    'Warning: ReactDOM.render is no longer supported',
    'Warning: componentWillReceiveProps has been renamed',
    'Warning: componentWillMount has been renamed',
    'act(...) is not supported in production builds',
  ];
  
  return suppressPatterns.some(pattern => message.includes(pattern));
};

// Mock console methods with filtering
['log', 'warn', 'error', 'info', 'debug'].forEach((method) => {
  console[method] = jest.fn((...args) => {
    const message = args[0];
    if (!shouldSuppressMessage(message)) {
      originalConsole[method](...args);
    }
  });
});

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

// Global test utilities available in all tests
global.testUtils = {
  // Wait for next tick
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Wait for specific time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock timer helpers
  mockTimers: () => jest.useFakeTimers(),
  restoreTimers: () => jest.useRealTimers(),
  
  // Reset all mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  },
  
  // Mock router helpers
  mockRouter: (overrides = {}) => ({
    ...mockRouter,
    ...overrides,
  }),
  
  // Mock Supabase helpers
  mockSupabase: (overrides = {}) => ({
    ...mockSupabaseClient,
    ...overrides,
  }),
};

// =============================================================================
// SETUP AND TEARDOWN
// =============================================================================

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  window.localStorage.clear();
  window.sessionStorage.clear();
  
  // Reset router state
  mockRouter.pathname = '/';
  mockRouter.query = {};
  mockRouter.asPath = '/';
});

afterEach(() => {
  // Clean up any remaining timers
  jest.clearAllTimers();
});

// Global test timeout
jest.setTimeout(30000);

// Export utilities for use in tests
module.exports = {
  mockRouter,
  mockSupabaseClient,
  originalConsole,
}; 