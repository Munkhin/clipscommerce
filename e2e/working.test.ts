import { test, expect } from '@playwright/test';

test('basic test', () => {
  console.log('Running basic test...');
  expect(1 + 1).toBe(2);
  console.log('Test completed');
});
