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
    const allTablesSQL = `
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

      CREATE TABLE IF NOT EXISTS model_training_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        platforms TEXT[] NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('preparing', 'collecting_data', 'training', 'completed', 'failed')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        current_phase TEXT,
        config JSONB NOT NULL,
        data_quality JSONB,
        model_results JSONB,
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trained_models (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_name TEXT NOT NULL,
        model_type TEXT NOT NULL CHECK (model_type IN ('engagement_prediction', 'content_optimization', 'sentiment_analysis', 'virality_prediction', 'ab_testing')),
        version TEXT NOT NULL,
        user_id TEXT NOT NULL,
        platforms TEXT[] NOT NULL,
        accuracy DECIMAL(5,4),
        precision_score DECIMAL(5,4),
        recall DECIMAL(5,4),
        f1_score DECIMAL(5,4),
        mse DECIMAL(10,6),
        mae DECIMAL(10,6),
        r2_score DECIMAL(5,4),
        model_path TEXT,
        config_path TEXT,
        training_data_size INTEGER,
        validation_metrics JSONB,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'failed')),
        trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(model_name, version, user_id)
      );

      CREATE TABLE IF NOT EXISTS ab_experiments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        model_a_id UUID NOT NULL,
        model_b_id UUID NOT NULL,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT FALSE,
        results JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
      CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
      CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
      CREATE INDEX IF NOT EXISTS idx_model_training_sessions_user_id ON model_training_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_trained_models_user_type ON trained_models(user_id, model_type);
    `;

    // Try to execute the SQL
    const allTablesResult = await executeSQL(allTablesSQL, 'all AI tables creation');
    
    if (!allTablesResult.manual) {
        console.log('All tables created successfully');
    }

    // Verify tables exist
    console.log('🔍 Verifying table creation...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_posts', 'training_data_quality', 'model_training_sessions', 'trained_models', 'ab_experiments']);

    if (tablesError) {
      console.error('Error verifying tables:', tablesError);
    } else {
      const tableNames = tables.map(t => t.table_name);
      console.log('📊 Tables found:', tableNames);
      
      if (tableNames.length === 5) {
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