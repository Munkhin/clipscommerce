// Global test setup for React testing
require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');
const nodeFetch = require('node-fetch');

// Add missing globals for Node.js test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = nodeFetch;
}

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const React = require('react');
    return React.createElement('img', { ...props, alt: props.alt || '' });
  },
}));

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock Next.js navigation  
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Add scrollIntoView mock
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

// Mock window.getComputedStyle with proper style object
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

// Mock location object properly - only if it doesn't already exist
if (!window.location) {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost/',
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
      reload: jest.fn(),
      assign: jest.fn(),
      replace: jest.fn(),
    },
    writable: true,
    configurable: true,
  });
} else {
  // If location exists, just mock the methods we need
  window.location.reload = jest.fn();
  window.location.assign = jest.fn();
  window.location.replace = jest.fn();
}

// Original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Mock console methods to filter out known warnings/errors
['log', 'warn', 'error'].forEach((method) => {
  console[method] = jest.fn((...args) => {
    const errorMessage = args[0];
    
    // Skip if errorMessage is not a string
    if (typeof errorMessage !== 'string') {
      originalConsole[method](...args);
      return;
    }
    
    // Filter out known warnings/errors
    if (errorMessage && 
        (errorMessage.includes('Error: connect ECONNREFUSED') || 
         errorMessage.includes('Error: getaddrinfo ENOTFOUND') ||
         errorMessage.includes('OpenAI API error') ||
         errorMessage.includes('401 Incorrect API key') ||
         errorMessage.includes('WebGL is not supported') ||
         errorMessage.includes('Initialization of backend webgl failed'))) {
      return;
    }
    originalConsole[method](...args);
  });
});

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    nav: 'nav',
    section: 'section',
    ul: 'ul',
    li: 'li',
    a: 'a',
    span: 'span',
    p: 'p',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    img: 'img',
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
  useInView: () => false,
}));

// Mock intersection observer
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock resize observer  
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window object for browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000);
