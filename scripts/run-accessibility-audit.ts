

import { AccessibilityAuditor } from '../src/lib/accessibility/accessibilityAuditor';

async function runAudit() {
  const auditor = new AccessibilityAuditor();
  const pagesToTest = ['/', '/landing/pricing', '/landing/team', '/sign-in', '/sign-up'];
  let totalScore = 0;

  for (const path of pagesToTest) {
    // This is a placeholder for navigating to the page and running the audit.
    // In a real scenario, you would use a headless browser like Playwright or Puppeteer to load the page.
    console.log(`Auditing page: ${path}`);
    const report = await auditor.auditPage(`http://localhost:3000${path}`);
    totalScore += report.score;
    console.log(`- Score: ${report.score}`);
    console.log(`- Issues: ${report.totalIssues}`);
  }

  const averageScore = totalScore / pagesToTest.length;
  console.log(`\nAverage accessibility score: ${averageScore}`);

  if (averageScore < 90) {
    console.error('Accessibility score is below the threshold of 90. Build failed.');
    process.exit(1);
  }
}

runAudit();

