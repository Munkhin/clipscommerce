#!/usr/bin/env node

// Simple script to test if our TypeScript fixes work
const { execSync } = require('child_process');

const filesToCheck = [
  'src/components/ui/animated-card.tsx',
  'src/hooks/useUsageLimits.tsx',
  'src/lib/accessibility/accessibilityAuditor.ts',
  'src/lib/ai/engagementPredictor.ts'
];

console.log('Testing TypeScript fixes...\n');

let hasErrors = false;

for (const file of filesToCheck) {
  console.log(`Checking ${file}...`);
  try {
    execSync(`npx tsc --noEmit --skipLibCheck --jsx react-jsx --target es2020 --lib es2020 ${file}`, {
      stdio: 'pipe',
      timeout: 30000
    });
    console.log(`✅ ${file} - No type errors\n`);
  } catch (error) {
    console.log(`❌ ${file} - Type errors found:`);
    console.log(error.stdout.toString());
    console.log(error.stderr.toString());
    console.log('');
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('❌ Some files still have type errors');
  process.exit(1);
} else {
  console.log('✅ All targeted TypeScript fixes are working!');
  process.exit(0);
}