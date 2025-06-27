#!/usr/bin/env node

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { Platform } from '../types/niche_types';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface ValidationOptions {
  userId: string;
  platforms: Platform[];
  minPostsPerPlatform: number;
  minEngagementThreshold: number;
  checkDataQuality: boolean;
  outputReport: boolean;
  reportPath?: string;
}

interface ValidationResult {
  platform: Platform;
  totalPosts: number;
  validPosts: number;
  invalidPosts: number;
  averageEngagement: number;
  dataQualityScore: number;
  issues: string[];
  recommendations: string[];
  readyForTraining: boolean;
}

function parseArguments(): ValidationOptions {
  const args = process.argv.slice(2);
  const options: Partial<ValidationOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--user-id':
        options.userId = value;
        break;
      case '--platforms':
        options.platforms = value.split(',').map(p => p.trim() as Platform);
        break;
      case '--min-posts':
        options.minPostsPerPlatform = parseInt(value);
        break;
      case '--min-engagement':
        options.minEngagementThreshold = parseInt(value);
        break;
      case '--check-quality':
        options.checkDataQuality = value.toLowerCase() === 'true';
        break;
      case '--output-report':
        options.outputReport = value.toLowerCase() === 'true';
        break;
      case '--report-path':
        options.reportPath = value;
        break;
    }
  }

  return {
    userId: options.userId || 'default-user',
    platforms: options.platforms || ['TikTok', 'Instagram', 'YouTube'],
    minPostsPerPlatform: options.minPostsPerPlatform || 50,
    minEngagementThreshold: options.minEngagementThreshold || 10,
    checkDataQuality: options.checkDataQuality ?? true,
    outputReport: options.outputReport ?? false,
    reportPath: options.reportPath
  };
}

function printUsage() {
  console.log(`
🔍 Data Validation CLI

Usage: npm run validate-data [options]

Options:
  --user-id <id>              User ID to validate data for (default: default-user)
  --platforms <list>          Comma-separated platforms (default: tiktok,instagram,youtube)
  --min-posts <count>         Minimum posts required per platform (default: 50)
  --min-engagement <count>    Minimum engagement threshold (default: 10)
  --check-quality <bool>      Perform detailed quality checks (default: true)
  --output-report <bool>      Generate detailed report (default: false)
  --report-path <path>        Path for detailed report output

Examples:
  npm run validate-data
  npm run validate-data -- --user-id=user123 --platforms=tiktok,instagram
  npm run validate-data -- --min-posts=100 --output-report=true --report-path=./validation-report.json

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
`);
}

async function validateEnvironment(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables:');
    if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('\nPlease set these in your .env.local file');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from('user_posts').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }

  return true;
}

async function validatePlatformData(
  supabase: any,
  userId: string,
  platform: Platform,
  options: ValidationOptions
): Promise<ValidationResult> {
  console.log(`🔍 Validating ${platform} data...`);

  // Fetch posts for this platform
  const { data: posts, error } = await supabase
    .from('user_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .order('posted_at', { ascending: false });

  if (error) {
    console.error(`❌ Error fetching ${platform} data:`, error);
    return {
      platform,
      totalPosts: 0,
      validPosts: 0,
      invalidPosts: 0,
      averageEngagement: 0,
      dataQualityScore: 0,
      issues: [`Database error: ${error.message}`],
      recommendations: ['Check database connection and permissions'],
      readyForTraining: false
    };
  }

  const totalPosts = posts?.length || 0;
  const validPosts = posts?.filter((post: any) => isValidPost(post)) || [];
  const invalidPosts = totalPosts - validPosts.length;

  // Calculate average engagement
  const engagements = validPosts.map((post: any) => 
    (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
  );
  const averageEngagement = engagements.length > 0 
    ? engagements.reduce((sum: number, eng: number) => sum + eng, 0) / engagements.length 
    : 0;

  // Assess data quality
  const issues: string[] = [];
  const recommendations: string[] = [];
  let qualityScore = 100;

  // Check minimum post count
  if (totalPosts < options.minPostsPerPlatform) {
    issues.push(`Insufficient posts: ${totalPosts}/${options.minPostsPerPlatform} required`);
    recommendations.push('Collect more historical posts or reduce minimum requirement');
    qualityScore -= 30;
  }

  // Check invalid post ratio
  const invalidRatio = totalPosts > 0 ? invalidPosts / totalPosts : 0;
  if (invalidRatio > 0.1) {
    issues.push(`High invalid post ratio: ${(invalidRatio * 100).toFixed(1)}%`);
    recommendations.push('Review data collection process for completeness');
    qualityScore -= 20;
  }

  // Check engagement levels
  if (averageEngagement < options.minEngagementThreshold) {
    issues.push(`Low average engagement: ${averageEngagement.toFixed(1)}`);
    recommendations.push('Consider including more engaging content or adjusting thresholds');
    qualityScore -= 25;
  }

  // Check data recency
  if (validPosts.length > 0) {
    const latestPost = new Date(validPosts[0].posted_at);
    const daysSinceLatest = (Date.now() - latestPost.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest > 7) {
      issues.push(`Data not recent: latest post is ${daysSinceLatest.toFixed(0)} days old`);
      recommendations.push('Collect more recent posts for better model relevance');
      qualityScore -= 15;
    }
  }

  // Check content diversity
  if (options.checkDataQuality && validPosts.length > 0) {
    const uniqueCaptions = new Set(validPosts.map((post: any) => post.caption?.toLowerCase().trim())).size;
    const captionDiversity = uniqueCaptions / validPosts.length;
    
    if (captionDiversity < 0.8) {
      issues.push(`Low content diversity: ${(captionDiversity * 100).toFixed(1)}% unique captions`);
      recommendations.push('Ensure varied content types and topics for better training');
      qualityScore -= 10;
    }

    // Check hashtag usage
    const postsWithHashtags = validPosts.filter((post: any) => 
      post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0
    ).length;
    const hashtagUsage = postsWithHashtags / validPosts.length;
    
    if (hashtagUsage < 0.5) {
      issues.push(`Low hashtag usage: ${(hashtagUsage * 100).toFixed(1)}% of posts`);
      recommendations.push('Include more posts with hashtags for better feature extraction');
      qualityScore -= 10;
    }
  }

  const dataQualityScore = Math.max(0, qualityScore);
  const readyForTraining = dataQualityScore >= 70 && totalPosts >= options.minPostsPerPlatform;

  return {
    platform,
    totalPosts,
    validPosts: validPosts.length,
    invalidPosts,
    averageEngagement,
    dataQualityScore,
    issues,
    recommendations,
    readyForTraining
  };
}

function isValidPost(post: any): boolean {
  return (
    post.platform_post_id && post.platform_post_id.length > 0 &&
    post.platform &&
    post.posted_at &&
    (post.views >= 0 && post.likes >= 0) &&
    post.caption !== undefined &&
    (post.hashtags === null || Array.isArray(post.hashtags))
  );
}

function printValidationResults(results: ValidationResult[]): void {
  console.log('\n📊 Validation Results:\n');

  let overallReady = true;
  let totalPosts = 0;
  let totalValidPosts = 0;

  for (const result of results) {
    const status = result.readyForTraining ? '✅' : '❌';
    console.log(`${status} ${result.platform.toUpperCase()}`);
    console.log(`   Posts: ${result.totalPosts} (${result.validPosts} valid, ${result.invalidPosts} invalid)`);
    console.log(`   Average Engagement: ${result.averageEngagement.toFixed(1)}`);
    console.log(`   Quality Score: ${result.dataQualityScore}%`);
    console.log(`   Ready for Training: ${result.readyForTraining ? 'Yes' : 'No'}`);

    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      result.issues.forEach(issue => console.log(`     - ${issue}`));
    }

    if (result.recommendations.length > 0) {
      console.log(`   Recommendations:`);
      result.recommendations.forEach(rec => console.log(`     - ${rec}`));
    }

    console.log('');

    if (!result.readyForTraining) {
      overallReady = false;
    }
    totalPosts += result.totalPosts;
    totalValidPosts += result.validPosts;
  }

  // Overall summary
  const overallQuality = results.length > 0 
    ? results.reduce((sum, r) => sum + r.dataQualityScore, 0) / results.length 
    : 0;

  console.log('🎯 Overall Summary:');
  console.log(`   Total Posts: ${totalPosts}`);
  console.log(`   Valid Posts: ${totalValidPosts}`);
  console.log(`   Overall Quality: ${overallQuality.toFixed(1)}%`);
  console.log(`   Ready for Training: ${overallReady ? '✅ Yes' : '❌ No'}`);

  if (!overallReady) {
    console.log('\n⚠️  Some platforms are not ready for training. Please address the issues above.');
  } else {
    console.log('\n🎉 All platforms are ready for training!');
  }
}

async function generateDetailedReport(
  results: ValidationResult[],
  options: ValidationOptions
): Promise<void> {
  if (!options.outputReport) return;

  const report = {
    timestamp: new Date().toISOString(),
    userId: options.userId,
    validationOptions: options,
    results,
    summary: {
      totalPlatforms: results.length,
      readyPlatforms: results.filter(r => r.readyForTraining).length,
      totalPosts: results.reduce((sum, r) => sum + r.totalPosts, 0),
      totalValidPosts: results.reduce((sum, r) => sum + r.validPosts, 0),
      overallQuality: results.length > 0 
        ? results.reduce((sum, r) => sum + r.dataQualityScore, 0) / results.length 
        : 0,
      readyForTraining: results.every(r => r.readyForTraining)
    }
  };

  const reportPath = options.reportPath || `./validation-report-${Date.now()}.json`;

  try {
    const fs = await import('fs');
    const path = await import('path');

    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    console.error('❌ Failed to save report:', error);
  }
}

async function main() {
  console.log('🔍 Data Validation CLI Starting...\n');

  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  // Validate environment
  if (!(await validateEnvironment())) {
    process.exit(1);
  }

  // Parse arguments
  const options = parseArguments();

  console.log('📋 Validation Configuration:');
  console.log(`   User ID: ${options.userId}`);
  console.log(`   Platforms: ${options.platforms.join(', ')}`);
  console.log(`   Min Posts per Platform: ${options.minPostsPerPlatform}`);
  console.log(`   Min Engagement Threshold: ${options.minEngagementThreshold}`);
  console.log(`   Check Data Quality: ${options.checkDataQuality}`);
  console.log(`   Output Report: ${options.outputReport}`);
  if (options.reportPath) {
    console.log(`   Report Path: ${options.reportPath}`);
  }
  console.log('');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Validate each platform
    const results: ValidationResult[] = [];
    
    for (const platform of options.platforms) {
      const result = await validatePlatformData(supabase, options.userId, platform, options);
      results.push(result);
    }

    // Print results
    printValidationResults(results);

    // Generate detailed report if requested
    await generateDetailedReport(results, options);

    // Exit with appropriate code
    const allReady = results.every(r => r.readyForTraining);
    process.exit(allReady ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Validation interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Validation terminated');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { main as validateData }; 