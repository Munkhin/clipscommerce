import { test, expect } from '@playwright/test';

test('basic test', () => {
  console.log('This is a basic test');
  expect(1 + 1).toBe(2);
});
