#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(process.cwd(), '.env.local') });

interface TrendTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  platform: string;
  hashtags: string[];
  template_content: string;
  engagement_score: number;
  trending_score: number;
  created_at: string;
}

// Mock trending templates data (in real implementation, this would come from external APIs)
const generateTrendingTemplates = (): TrendTemplate[] => {
  const categories = ['comedy', 'lifestyle', 'education', 'dance', 'music', 'food', 'travel', 'fashion'];
  const platforms = ['tiktok', 'instagram', 'youtube'];
  
  const templates: TrendTemplate[] = [];
  
  for (let i = 0; i < 50; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    templates.push({
      id: `trend_${Date.now()}_${i}`,
      title: `Trending ${category} template #${i + 1}`,
      description: `A viral ${category} template that's trending on ${platform}`,
      category,
      platform,
      hashtags: [
        `#${category}`,
        '#viral',
        '#trending',
        `#${platform}content`,
        '#fyp'
      ],
      template_content: `This is a ${category} template for ${platform}. {{USER_CONTENT}} Use these hashtags: {{HASHTAGS}}`,
      engagement_score: Math.random() * 100,
      trending_score: Math.random() * 100,
      created_at: new Date().toISOString()
    });
  }
  
  return templates;
};

const fetchTrendingDataFromAPIs = async (): Promise<TrendTemplate[]> => {
  console.log('🔍 Fetching trending data from APIs...');
  
  // In a real implementation, you would:
  // 1. Fetch trending hashtags from TikTok API
  // 2. Fetch trending content from Instagram API
  // 3. Fetch trending videos from YouTube API
  // 4. Analyze trending patterns using AI/ML
  
  // For now, generate mock data
  const templates = generateTrendingTemplates();
  
  console.log(`📊 Generated ${templates.length} trending templates`);
  return templates;
};

const generateCSV = (templates: TrendTemplate[]): string => {
  const headers = [
    'id',
    'title',
    'description',
    'category',
    'platform',
    'hashtags',
    'template_content',
    'engagement_score',
    'trending_score',
    'created_at'
  ];
  
  const csvRows = [
    headers.join(','),
    ...templates.map(template => [
      template.id,
      `"${template.title.replace(/"/g, '""')}"`,
      `"${template.description.replace(/"/g, '""')}"`,
      template.category,
      template.platform,
      `"${template.hashtags.join(';')}"`,
      `"${template.template_content.replace(/"/g, '""')}"`,
      template.engagement_score.toFixed(2),
      template.trending_score.toFixed(2),
      template.created_at
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

const insertTemplatesIntoDatabase = async (templates: TrendTemplate[]) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📝 Inserting templates into database...');
  
  // Clear old trending templates (keep only last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('trend_templates')
    .delete()
    .lt('created_at', oneDayAgo);
  
  // Insert new templates in batches
  const batchSize = 10;
  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('trend_templates')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} templates)`);
    }
  }
  
  console.log('✨ Database insertion completed');
};

const runTrendSeeder = async () => {
  try {
    console.log('🌟 Starting nightly trend template seeder...');
    console.log(`⏰ Running at ${new Date().toISOString()}`);
    
    // Fetch trending data
    const templates = await fetchTrendingDataFromAPIs();
    
    // Generate CSV file
    console.log('📄 Generating CSV file...');
    const csvContent = generateCSV(templates);
    const csvPath = join(process.cwd(), 'public', 'templates.csv');
    writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`💾 CSV saved to: ${csvPath}`);
    
    // Insert into database
    await insertTemplatesIntoDatabase(templates);
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalTemplates: templates.length,
      categoriesCount: [...new Set(templates.map(t => t.category))].length,
      platformsCount: [...new Set(templates.map(t => t.platform))].length,
      avgEngagementScore: templates.reduce((sum, t) => sum + t.engagement_score, 0) / templates.length,
      avgTrendingScore: templates.reduce((sum, t) => sum + t.trending_score, 0) / templates.length
    };
    
    console.log('📊 Trend Seeder Summary:');
    console.log(`   📝 Total Templates: ${summary.totalTemplates}`);
    console.log(`   🏷️  Categories: ${summary.categoriesCount}`);
    console.log(`   🌐 Platforms: ${summary.platformsCount}`);
    console.log(`   💯 Avg Engagement Score: ${summary.avgEngagementScore.toFixed(2)}`);
    console.log(`   🔥 Avg Trending Score: ${summary.avgTrendingScore.toFixed(2)}`);
    
    console.log('🎉 Nightly trend template seeder completed successfully!');
    
  } catch (error) {
    console.error('❌ Trend seeder failed:', error);
    process.exit(1);
  }
};

// Run the seeder if this script is executed directly
if (require.main === module) {
  runTrendSeeder()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runTrendSeeder };