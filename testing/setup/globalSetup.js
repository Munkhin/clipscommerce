// Global setup for ClipsCommerce test suite
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up ClipsCommerce test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_test';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_test';

  // Create test directories if they don't exist
  const testDirs = [
    'coverage',
    'test-results',
    '.jest-cache',
    'testing/temp',
  ];

  testDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Clean up any previous test artifacts
  const cleanupPaths = [
    'coverage',
    'test-results/junit.xml',
    '.jest-cache',
    'testing/temp',
  ];

  cleanupPaths.forEach(cleanupPath => {
    const fullPath = path.join(process.cwd(), cleanupPath);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        fs.mkdirSync(fullPath, { recursive: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  });

  // Set up test database if needed (for integration tests)
  if (process.env.TEST_DATABASE_URL) {
    console.log('📊 Setting up test database...');
    try {
      // Run database migrations or setup commands here
      // execSync('npm run db:test:setup', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Database setup failed (this may be expected in unit tests):', error.message);
    }
  }

  // Initialize test performance tracking
  global.__TEST_START_TIME__ = Date.now();
  global.__TEST_PERFORMANCE__ = {
    suites: {},
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
  };

  console.log('✅ Test environment setup complete');
}; 