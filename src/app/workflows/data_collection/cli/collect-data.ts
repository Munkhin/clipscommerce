#!/usr/bin/env node

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { Platform } from '../functions/types';
import { EnhancedScannerService } from '../functions/EnhancedScannerService';
import { CacheSystem } from '../functions/cache/CacheSystem';
import { MonitoringSystem } from '../functions/monitoring/MonitoringSystem';
import fs from 'fs/promises';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface CollectionOptions {
  userId: string;
  platform: Platform;
  lookbackDays: number;
  maxPosts: number;
  includeCompetitors: boolean;
  competitorIds: string[];
  outputFormat: 'json' | 'csv' | 'database';
  outputPath?: string;
}

function parseArguments(): CollectionOptions {
  const args = process.argv.slice(2);
  const options: Partial<CollectionOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--user-id':
        options.userId = value;
        break;
      case '--platform':
        options.platform = value as Platform;
        break;
      case '--lookback-days':
        options.lookbackDays = parseInt(value);
        break;
      case '--max-posts':
        options.maxPosts = parseInt(value);
        break;
      case '--include-competitors':
        options.includeCompetitors = value.toLowerCase() === 'true';
        break;
      case '--competitor-ids':
        options.competitorIds = value.split(',').map(id => id.trim());
        break;
      case '--output-format':
        options.outputFormat = value as 'json' | 'csv' | 'database';
        break;
      case '--output-path':
        options.outputPath = value;
        break;
    }
  }

  return {
    userId: options.userId || 'default-user',
    platform: options.platform || 'tiktok',
    lookbackDays: options.lookbackDays || 30,
    maxPosts: options.maxPosts || 100,
    includeCompetitors: options.includeCompetitors || false,
    competitorIds: options.competitorIds || [],
    outputFormat: options.outputFormat || 'database',
    outputPath: options.outputPath
  };
}

function printUsage() {
  console.log(`
📊 Social Media Data Collection CLI

Usage: npm run collect-data [options]

Options:
  --user-id <id>              User ID for data collection (default: default-user)
  --platform <platform>       Platform to collect from: tiktok, instagram, youtube (default: tiktok)
  --lookback-days <days>      Days of historical data to collect (default: 30)
  --max-posts <count>         Maximum posts to collect (default: 100)
  --include-competitors       Include competitor data (default: false)
  --competitor-ids <list>     Comma-separated competitor IDs
  --output-format <format>    Output format: json, csv, database (default: database)
  --output-path <path>        Output file path (for json/csv formats)

Examples:
  npm run collect-data
  npm run collect-data -- --platform=instagram --lookback-days=60
  npm run collect-data -- --user-id=user123 --include-competitors=true --competitor-ids=comp1,comp2
  npm run collect-data -- --output-format=json --output-path=./data/posts.json

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

  return true;
}

async function collectUserData(
  scannerService: EnhancedScannerService,
  options: CollectionOptions
): Promise<any[]> {
  console.log(`🔍 Collecting user data from ${options.platform}...`);
  
  try {
    const posts = await scannerService.getUserPosts(
      options.platform,
      options.userId,
      options.lookbackDays
    );

    const limitedPosts = posts.slice(0, options.maxPosts);
    console.log(`✅ Collected ${limitedPosts.length} user posts from ${options.platform}`);
    
    return limitedPosts;
  } catch (error) {
    console.error(`❌ Failed to collect user data from ${options.platform}:`, error);
    return [];
  }
}

async function collectCompetitorData(
  scannerService: EnhancedScannerService,
  options: CollectionOptions
): Promise<any[]> {
  if (!options.includeCompetitors || options.competitorIds.length === 0) {
    return [];
  }

  console.log(`🎯 Collecting competitor data from ${options.platform}...`);
  const allCompetitorPosts: any[] = [];

  for (const competitorId of options.competitorIds) {
    try {
      console.log(`   Collecting from competitor: ${competitorId}`);
      const posts = await scannerService.getCompetitorPosts(
        options.platform,
        competitorId,
        options.lookbackDays
      );

      const limitedPosts = posts.slice(0, Math.floor(options.maxPosts / options.competitorIds.length));
      allCompetitorPosts.push(...limitedPosts.map(post => ({
        ...post,
        isCompetitor: true,
        competitorId
      })));

      console.log(`   ✅ Collected ${limitedPosts.length} posts from ${competitorId}`);
    } catch (error) {
      console.error(`   ❌ Failed to collect from ${competitorId}:`, error);
    }
  }

  console.log(`✅ Total competitor posts collected: ${allCompetitorPosts.length}`);
  return allCompetitorPosts;
}

async function saveToDatabase(supabase: any, data: any[], userId: string): Promise<void> {
  console.log('💾 Saving data to database...');

  const dataToInsert = data.map(post => ({
    user_id: userId,
    platform: post.platform,
    post_id: post.id,
    url: post.url || '',
    caption: post.caption || '',
    hashtags: post.hashtags || [],
    created_at: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    views: post.metrics?.views || 0,
    likes: post.metrics?.likes || 0,
    comments: post.metrics?.comments || 0,
    shares: post.metrics?.shares || 0,
    saves: post.metrics?.saves || 0,
    engagement_rate: post.metrics?.engagementRate || 0,
    content_type: post.contentType || 'video',
    duration: post.duration,
    thumbnail_url: post.thumbnailUrl,
    is_competitor: post.isCompetitor || false,
    competitor_id: post.competitorId,
    collected_at: new Date().toISOString()
  }));

  try {
    const { error } = await supabase
      .from('user_posts')
      .upsert(dataToInsert, { 
        onConflict: 'user_id,platform,post_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('❌ Database save failed:', error);
      throw error;
    }

    console.log(`✅ Saved ${dataToInsert.length} posts to database`);
  } catch (error) {
    console.error('❌ Failed to save to database:', error);
    throw error;
  }
}

async function saveToFile(data: any[], options: CollectionOptions): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  if (!options.outputPath) {
    throw new Error('Output path is required for file output');
  }

  console.log(`💾 Saving data to file: ${options.outputPath}`);

  // Ensure directory exists
  const dir = path.dirname(options.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    if (options.outputFormat === 'json') {
      fs.writeFileSync(options.outputPath, JSON.stringify(data, null, 2));
    } else if (options.outputFormat === 'csv') {
      // Simple CSV conversion
      if (data.length === 0) {
        fs.writeFileSync(options.outputPath, '');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      fs.writeFileSync(options.outputPath, csvContent);
    }

    console.log(`✅ Saved ${data.length} posts to ${options.outputPath}`);
  } catch (error) {
    console.error('❌ Failed to save to file:', error);
    throw error;
  }
}

async function generateSummary(data: any[], options: CollectionOptions): Promise<void> {
  console.log('\n📊 Collection Summary:');
  console.log(`   Platform: ${options.platform}`);
  console.log(`   Total Posts: ${data.length}`);
  console.log(`   User Posts: ${data.filter(p => !p.isCompetitor).length}`);
  console.log(`   Competitor Posts: ${data.filter(p => p.isCompetitor).length}`);

  if (data.length > 0) {
    const totalEngagement = data.reduce((sum, post) => 
      sum + (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.shares || 0), 0
    );
    const avgEngagement = totalEngagement / data.length;

    const dates = data
      .map(post => new Date(post.createdAt))
      .filter(date => !isNaN(date.getTime()))
      .sort();

    console.log(`   Average Engagement: ${avgEngagement.toFixed(1)}`);
    console.log(`   Date Range: ${dates[0]?.toDateString()} - ${dates[dates.length - 1]?.toDateString()}`);

    // Platform breakdown
    const platformBreakdown: Record<string, number> = {};
    data.forEach(post => {
      platformBreakdown[post.platform] = (platformBreakdown[post.platform] || 0) + 1;
    });

    console.log('   Platform Breakdown:');
    Object.entries(platformBreakdown).forEach(([platform, count]) => {
      console.log(`     ${platform}: ${count} posts`);
    });
  }

  console.log('');
}

async function main() {
  console.log('📊 Social Media Data Collection CLI Starting...\n');

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

  console.log('📋 Collection Configuration:');
  console.log(`   User ID: ${options.userId}`);
  console.log(`   Platform: ${options.platform}`);
  console.log(`   Lookback Days: ${options.lookbackDays}`);
  console.log(`   Max Posts: ${options.maxPosts}`);
  console.log(`   Include Competitors: ${options.includeCompetitors}`);
  if (options.includeCompetitors) {
    console.log(`   Competitor IDs: ${options.competitorIds.join(', ')}`);
  }
  console.log(`   Output Format: ${options.outputFormat}`);
  if (options.outputPath) {
    console.log(`   Output Path: ${options.outputPath}`);
  }
  console.log('');

  // Initialize services
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const cacheSystem = new CacheSystem({
    namespace: 'data_collection',
    environment: 'production'
  });
  
  const monitoringSystem = new MonitoringSystem({
    serviceName: 'data-collection-cli',
    environment: 'production'
  });

  const scannerService = new EnhancedScannerService(cacheSystem, monitoringSystem);

  try {
    // Initialize platform (this would normally require API tokens)
    console.log('🔧 Initializing platform connections...');
    // Note: In a real implementation, you'd need to provide actual API tokens
    // await scannerService.initializePlatforms([{
    //   platform: options.platform,
    //   accessToken: 'your-access-token',
    //   userId: options.userId
    // }]);

    // Collect user data
    const userData = await collectUserData(scannerService, options);

    // Collect competitor data if requested
    const competitorData = await collectCompetitorData(scannerService, options);

    // Combine all data
    const allData = [...userData, ...competitorData];

    if (allData.length === 0) {
      console.log('⚠️  No data collected. Please check your configuration and API access.');
      return;
    }

    // Save data based on output format
    if (options.outputFormat === 'database') {
      await saveToDatabase(supabase, allData, options.userId);
    } else {
      await saveToFile(allData, options);
    }

    // Generate summary
    await generateSummary(allData, options);

    console.log('✨ Data collection completed successfully!');

  } catch (error) {
    console.error('❌ Data collection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await scannerService.destroy();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Data collection interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Data collection terminated');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { main as collectData }; 