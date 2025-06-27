// Global teardown for ClipsCommerce test suite
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up ClipsCommerce test environment...');

  // Calculate total test execution time
  const totalTime = Date.now() - (global.__TEST_START_TIME__ || Date.now());
  const minutes = Math.floor(totalTime / 60000);
  const seconds = ((totalTime % 60000) / 1000).toFixed(2);

  // Generate performance report
  if (global.__TEST_PERFORMANCE__) {
    const perf = global.__TEST_PERFORMANCE__;
    console.log('\n📊 Test Performance Summary:');
    console.log(`⏱️  Total execution time: ${minutes}m ${seconds}s`);
    console.log(`✅ Passed tests: ${perf.passedTests}`);
    console.log(`❌ Failed tests: ${perf.failedTests}`);
    console.log(`📈 Total tests: ${perf.totalTests}`);
    
    if (perf.totalTests > 0) {
      const successRate = ((perf.passedTests / perf.totalTests) * 100).toFixed(1);
      console.log(`🎯 Success rate: ${successRate}%`);
    }

    // Write performance report to file
    const reportPath = path.join(process.cwd(), 'test-results', 'performance-report.json');
    try {
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalExecutionTime: totalTime,
        totalTests: perf.totalTests,
        passedTests: perf.passedTests,
        failedTests: perf.failedTests,
        successRate: perf.totalTests > 0 ? (perf.passedTests / perf.totalTests) * 100 : 0,
        suites: perf.suites,
      }, null, 2));
    } catch (error) {
      console.warn('⚠️  Could not write performance report:', error.message);
    }
  }

  // Clean up temporary test files
  const tempDir = path.join(process.cwd(), 'testing', 'temp');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('⚠️  Could not clean up temp directory:', error.message);
    }
  }

  // Clean up any test processes or connections
  if (global.__TEST_CLEANUP_FUNCTIONS__) {
    for (const cleanup of global.__TEST_CLEANUP_FUNCTIONS__) {
      try {
        await cleanup();
      } catch (error) {
        console.warn('⚠️  Cleanup function failed:', error.message);
      }
    }
  }

  console.log('✅ Test environment cleanup complete');
}; 