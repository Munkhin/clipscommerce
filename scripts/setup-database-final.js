const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🚀 Setting up AI improvement pipeline database...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('✅ Database connection established with service role key');

    // Create user_posts table
    console.log('📝 Creating user_posts table...');
    const userPostsSQL = `
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
    `;

    // Execute SQL using direct HTTP request to Supabase
    const executeSQL = async (sql, description) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        // If exec_sql doesn't exist, try alternative approach
        if (response.status === 404) {
          console.log(`⚠️  exec_sql function not available. Please run the following SQL manually in Supabase dashboard:`);
          console.log(`\n${sql}\n`);
          return { success: false, manual: true };
        }
        
        const errorText = await response.text();
        throw new Error(`Failed to execute ${description}: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ ${description} completed successfully`);
      return { success: true, manual: false };
    };

    // Try to execute the SQL
    const userPostsResult = await executeSQL(userPostsSQL, 'user_posts table creation');
    
    if (!userPostsResult.manual) {
      // Create training_data_quality table
      console.log('📝 Creating training_data_quality table...');
      const qualitySQL = `
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
      `;

      await executeSQL(qualitySQL, 'training_data_quality table creation');

      // Create indexes
      console.log('📝 Creating database indexes...');
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
        CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
        CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
      `;

      await executeSQL(indexSQL, 'database indexes creation');
    }

    // Verify tables exist
    console.log('🔍 Verifying table creation...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_posts', 'training_data_quality']);

    if (tablesError) {
      console.error('Error verifying tables:', tablesError);
    } else {
      const tableNames = tables.map(t => t.table_name);
      console.log('📊 Tables found:', tableNames);
      
      if (tableNames.includes('user_posts') && tableNames.includes('training_data_quality')) {
        console.log('🎉 Database setup completed successfully!');
        return true;
      } else {
        console.log('⚠️  Some tables may not have been created. Please check the manual SQL above.');
        return false;
      }
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  setupDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { setupDatabase }; 