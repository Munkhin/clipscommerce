#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { Platform } from '../../data_analysis/types/analysis_types';
import { TrainingDataCollectionService, DataCollectionConfig } from '../training/DataCollectionService';

interface CollectionOptions {
  userId: string;
  platforms: Platform[];
  lookbackDays: number;
  minPostsPerPlatform: number;
  minEngagementThreshold: number;
  includeCompetitors: boolean;
  competitorIds: string[];
  outputReport: boolean;
  reportPath?: string;
}

function parseArguments(): CollectionOptions {
  const args = process.argv.slice(2);
  
  const options: CollectionOptions = {
    userId: '',
    platforms: [],
    lookbackDays: 30,
    minPostsPerPlatform: 50,
    minEngagementThreshold: 1.0,
    includeCompetitors: false,
    competitorIds: [],
    outputReport: false,
    reportPath: undefined
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--user-id':
        options.userId = args[++i];
        break;
      case '--platforms':
        options.platforms = args[++i].split(',').map(p => p.trim() as Platform);
        break;
      case '--lookback-days':
        options.lookbackDays = parseInt(args[++i]);
        break;
      case '--min-posts':
        options.minPostsPerPlatform = parseInt(args[++i]);
        break;
      case '--min-engagement':
        options.minEngagementThreshold = parseFloat(args[++i]);
        break;
      case '--include-competitors':
        options.includeCompetitors = true;
        break;
      case '--competitor-ids':
        options.competitorIds = args[++i].split(',').map(id => id.trim());
        break;
      case '--output-report':
        options.outputReport = true;
        break;
      case '--report-path':
        options.reportPath = args[++i];
        break;
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  // Validate required arguments
  if (!options.userId) {
    console.error('❌ --user-id is required');
    printUsage();
    process.exit(1);
  }

  if (options.platforms.length === 0) {
    console.error('❌ --platforms is required');
    printUsage();
    process.exit(1);
  }

  // Validate platforms
  const validPlatforms: Platform[] = ['instagram', 'tiktok', 'youtube'];
  for (const platform of options.platforms) {
    if (!validPlatforms.includes(platform)) {
      console.error(`❌ Invalid platform: ${platform}. Valid platforms: ${validPlatforms.join(', ')}`);
      process.exit(1);
    }
  }

  return options;
}

function printUsage() {
  console.log(`
🤖 AI Improvement Pipeline - Data Collection Tool

Usage: npm run ai:collect-data -- [options]

Required Options:
  --user-id <id>              User ID for data collection
  --platforms <list>          Comma-separated list of platforms (instagram,tiktok,youtube)

Optional Options:
  --lookback-days <days>      Days to look back for data collection (default: 30)
  --min-posts <number>        Minimum posts required per platform (default: 50)
  --min-engagement <rate>     Minimum engagement rate threshold (default: 1.0)
  --include-competitors       Include competitor data collection
  --competitor-ids <list>     Comma-separated list of competitor IDs
  --output-report             Generate detailed collection report
  --report-path <path>        Path for the collection report (default: ./collection-report.json)
  --help                      Show this help message

Examples:
  npm run ai:collect-data -- --user-id user123 --platforms instagram,tiktok
  npm run ai:collect-data -- --user-id user123 --platforms instagram --lookback-days 60 --min-posts 100
  npm run ai:collect-data -- --user-id user123 --platforms instagram,tiktok,youtube --output-report
  `);
}

async function validateEnvironment(): Promise<boolean> {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_SERVICE_ROLE_KEY'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\nPlease check your .env.local file');
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 AI Improvement Pipeline - Data Collection\n');

  try {
    // Parse command line arguments
    const options = parseArguments();
    
    console.log('📋 Collection Configuration:');
    console.log(`   User ID: ${options.userId}`);
    console.log(`   Platforms: ${options.platforms.join(', ')}`);
    console.log(`   Lookback Days: ${options.lookbackDays}`);
    console.log(`   Min Posts per Platform: ${options.minPostsPerPlatform}`);
    console.log(`   Min Engagement Threshold: ${options.minEngagementThreshold}%`);
    console.log(`   Include Competitors: ${options.includeCompetitors ? 'Yes' : 'No'}`);
    console.log('');

    // Validate environment
    if (!(await validateEnvironment())) {
      process.exit(1);
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_SERVICE_ROLE_KEY!
    );

    // Test database connection
    console.log('🔗 Testing database connection...');
    const { error: connectionError } = await supabase
      .from('user_posts')
      .select('id')
      .limit(1);

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      console.error('💡 Make sure you have run the database setup SQL in your Supabase dashboard');
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Create collection configuration
    const config: DataCollectionConfig = {
      platforms: options.platforms,
      lookbackDays: options.lookbackDays,
      minPostsPerPlatform: options.minPostsPerPlatform,
      minEngagementThreshold: options.minEngagementThreshold,
      includeCompetitorData: options.includeCompetitors,
      competitorIds: options.competitorIds
    };

    // Initialize collection service
    const collectionService = new TrainingDataCollectionService(supabase, config);

    // Validate data access
    console.log('🔍 Validating data access...');
    const accessValidation = await collectionService.validateDataAccess(options.userId);
    
    if (!accessValidation.hasAccess) {
      console.error('❌ Data access validation failed:');
      accessValidation.issues.forEach(issue => console.error(`   - ${issue}`));
      console.error('\n💡 Recommendations:');
      accessValidation.recommendations.forEach(rec => console.error(`   - ${rec}`));
      process.exit(1);
    }

    console.log('✅ Data access validation passed');

    // Start data collection
    console.log('\n🔄 Starting data collection...');
    const startTime = Date.now();

    const result = await collectionService.collectTrainingData(options.userId);

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const duration = (durationMs / 1000).toFixed(1);

    // Display results
    console.log('\n📊 Collection Results:');
    console.log(`   Total Posts Collected: ${result.summary.totalPosts}`);
    console.log(`   Overall Quality Score: ${(result.summary.qualityScore * 100).toFixed(1)}%`);
    console.log(`   Ready for Training: ${result.summary.readyForTraining ? '✅ Yes' : '❌ No'}`);
    console.log(`   Collection Time: ${duration}s`);
    console.log('');

    // Platform breakdown
    console.log('📈 Platform Breakdown:');
    for (const platform of options.platforms) {
      const count = result.summary.platformBreakdown[platform] || 0;
      const report = result.qualityReports.find(r => r.platform === platform);
      const status = report && report.validPosts >= options.minPostsPerPlatform ? '✅' : '❌';
      
      console.log(`   ${status} ${platform}: ${count} posts`);
      
      if (report) {
        console.log(`      Valid: ${report.validPosts}, Invalid: ${report.invalidPosts}`);
        console.log(`      Avg Engagement: ${report.averageEngagement.toFixed(2)}%`);
        
        if (report.issues.length > 0) {
          console.log(`      Issues: ${report.issues.join(', ')}`);
        }
      }
    }

    // Generate detailed report if requested
    if (options.outputReport) {
      const reportPath = options.reportPath || './collection-report.json';
      await generateDetailedReport(result, options, reportPath, durationMs);
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    // Show next steps
    console.log('\n🎯 Next Steps:');
    if (result.summary.readyForTraining) {
      console.log('   ✅ Data collection complete! You can now proceed with model training:');
      console.log('   npm run ai:train-models -- --user-id ' + options.userId + ' --platforms ' + options.platforms.join(','));
    } else {
      console.log('   ⚠️  Data collection needs attention. Review the issues above and:');
      console.log('   1. Address data quality issues');
      console.log('   2. Consider adjusting collection parameters');
      console.log('   3. Re-run data collection');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Data collection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function generateDetailedReport(
  result: any,
  options: CollectionOptions,
  reportPath: string,
  duration: number
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    userId: options.userId,
    collectionOptions: options,
    duration: `${duration}s`,
    summary: result.summary,
    qualityReports: result.qualityReports,
    platformBreakdown: result.summary.platformBreakdown,
    recommendations: result.qualityReports.flatMap((r: any) => r.recommendations),
    issues: result.qualityReports.flatMap((r: any) => r.issues)
  };

  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} 