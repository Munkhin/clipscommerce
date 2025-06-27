import { test, expect } from '@playwright/test';

console.log('This is a test log message - if you see this, console.log works');

test('simple test that should always pass', () => {
  console.log('Test is running...');
  expect(1 + 1).toBe(2);
  console.log('Test completed');
});
