// Enhanced Jest configuration for ClipsCommerce testing infrastructure
/** @type {import('jest').Config} */
module.exports = {
  // Test environment setup
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/testing/setup/jest.setup.js'],
  
  // Module resolution and path mapping
  moduleNameMapper: {
    // Application paths
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    
    // Testing utilities
    '^@testing/(.*)$': '<rootDir>/testing/$1',
    '^@testUtils/(.*)$': '<rootDir>/testing/utils/$1',
    '^@fixtures/(.*)$': '<rootDir>/testing/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/testing/mocks/$1',
    
    // Static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/testing/mocks/fileMock.js',
  },

  // Module paths for better resolution
  modulePaths: [
    '<rootDir>/src',
    '<rootDir>/testing',
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: 'tsconfig.jest.json',
    }],
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },

  // Transform ignore patterns for better compatibility
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|framer-motion|lucide-react|@radix-ui|jose|@supabase/auth-helpers-nextjs|@supabase/auth-helpers-shared|@supabase/ssr|@supabase/supabase-js|@upstash/redis|uncrypto)/)',
  ],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test file patterns - organized by test type
  testMatch: [
    // Unit tests
    '<rootDir>/testing/unit/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    
    // Integration tests
    '<rootDir>/testing/integration/**/*.(test|spec).(ts|tsx|js)',
    
    // Component tests
    '<rootDir>/testing/components/**/*.(test|spec).(ts|tsx|js)',
    
    // API tests
    '<rootDir>/testing/api/**/*.(test|spec).(ts|tsx|js)',
    
    // Legacy test patterns (for backward compatibility)
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
  ],

  // Test exclusions
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/testing/e2e/',
    '<rootDir>/testing/fixtures/',
    '<rootDir>/testing/mocks/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.*',
    '!src/**/*.config.*',
    '!src/**/node_modules/**',
    '!src/types/**',
    '!src/**/*.mock.*',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Performance and reliability settings
  testTimeout: 30000,
  maxWorkers: '50%',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },

  // Global setup and teardown
  globalSetup: '<rootDir>/testing/setup/globalSetup.js',
  globalTeardown: '<rootDir>/testing/setup/globalTeardown.js',

  // Reporters for better test output
  reporters: [
    'default',
    ['jest-simple-dot-reporter', { color: true }],
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
    }],
  ],

  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Error handling
  errorOnDeprecated: true,
  verbose: false,
  silent: false,

  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
};
