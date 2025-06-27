const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('Environment variables:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('NEXT_SERVICE_ROLE_KEY:', process.env.NEXT_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY
  );

  console.log('🚀 Setting up AI improvement pipeline database...');

  try {
    // Create user_posts table using direct SQL query
    const { error: userPostsError } = await supabase
      .from('user_posts')
      .select('id')
      .limit(1)
      .then(() => ({ error: null })) // Table exists
      .catch(async () => {
        // Table doesn't exist, create it using raw SQL
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_SERVICE_ROLE_KEY}`,
            'apikey': process.env.NEXT_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            sql: `CREATE TABLE IF NOT EXISTS user_posts (
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
            );`
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          return { error: new Error(`HTTP ${response.status}: ${errorText}`) };
        }
        
        return { error: null };
      });

    if (userPostsError) {
      console.error('Error creating user_posts table:', userPostsError);
      throw userPostsError;
    }

    console.log('✅ Created user_posts table');

    // Create training_data_quality table
    const { error: qualityError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (qualityError) {
      console.error('Error creating training_data_quality table:', qualityError);
      throw qualityError;
    }

    console.log('✅ Created training_data_quality table');

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
        CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
        CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
      throw indexError;
    }

    console.log('✅ Created database indexes');

    // Verify tables exist
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_posts', 'training_data_quality']);

    if (verifyError) {
      console.error('Error verifying tables:', verifyError);
    } else {
      console.log('✅ Database setup complete! Tables created:', tables.map(t => t.table_name));
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 