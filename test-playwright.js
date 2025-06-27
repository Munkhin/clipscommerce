const { chromium } = require('@playwright/test');

(async () => {
  console.log('Starting Playwright test...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to example.com...');
  await page.goto('https://example.com');
  
  const title = await page.title();
  console.log('Page title:', title);
  
  await page.screenshot({ path: 'example.png' });
  console.log('Screenshot saved as example.png');
  
  await browser.close();
  console.log('Test completed');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
