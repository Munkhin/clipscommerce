// @ts-check
import { test, expect } from '@playwright/test';

test('minimal passing test', () => {
  console.log('This is a minimal passing test');
  expect(1 + 1).toBe(2);
});
