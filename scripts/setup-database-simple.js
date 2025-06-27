const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🚀 Setting up AI improvement pipeline database...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }

    console.log('✅ Database connection successful');

    // Since we can't use exec_sql, let's try to create a simple table first
    // We'll need to use the Supabase dashboard or service role key for DDL operations
    
    console.log('⚠️  Note: Table creation requires service role key or manual setup via Supabase dashboard');
    console.log('📋 Please run the following SQL in your Supabase SQL editor:');
    
    const sql = `
-- AI Improvement Pipeline Tables
CREATE TABLE IF NOT EXISTS user_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  post_id TEXT NOT NULL,
  platform_post_id TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  media_type TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  engagement_score DECIMAL(10,2) DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)
);

CREATE TABLE IF NOT EXISTS training_data_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  total_posts INTEGER DEFAULT 0,
  valid_posts INTEGER DEFAULT 0,
  invalid_posts INTEGER DEFAULT 0,
  average_engagement DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0,
  issues TEXT[],
  recommendations TEXT[],
  ready_for_training BOOLEAN DEFAULT FALSE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
`;

    console.log(sql);
    
    // For now, let's just check if the tables exist
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_posts', 'training_data_quality']);

    if (tablesError) {
      console.error('Error checking existing tables:', tablesError);
    } else {
      const tableNames = existingTables.map(t => t.table_name);
      console.log('\n📊 Current tables:', tableNames.length > 0 ? tableNames : 'None found');
      
      if (tableNames.includes('user_posts')) {
        console.log('✅ user_posts table already exists');
      } else {
        console.log('❌ user_posts table not found - please create it using the SQL above');
      }
      
      if (tableNames.includes('training_data_quality')) {
        console.log('✅ training_data_quality table already exists');
      } else {
        console.log('❌ training_data_quality table not found - please create it using the SQL above');
      }
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupDatabase(); 