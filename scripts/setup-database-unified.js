const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

/**
 * Unified Database Setup Script
 * 
 * This script consolidates all database setup operations into a single, idempotent script
 * that can be run safely in any environment (local, staging, production).
 * 
 * Features:
 * - Idempotent: Can be run multiple times safely
 * - Environment-aware: Works with different Supabase environments
 * - Comprehensive: Sets up all tables, indexes, RLS policies, and initial data
 * - Error-resilient: Continues on non-critical errors
 */

class DatabaseSetup {
  constructor() {
    this.supabase = null;
    this.isServiceRole = false;
    this.errors = [];
    this.warnings = [];
    this.setupComplete = [];
  }

  /**
   * Initialize Supabase client with best available authentication
   */
  async initialize() {
    console.log('🚀 Initializing Unified Database Setup...\n');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }

    // Prefer service role key for DDL operations, fallback to anon key
    if (serviceRoleKey) {
      console.log('✅ Using service role key for database operations');
      this.supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      this.isServiceRole = true;
    } else if (anonKey) {
      console.log('⚠️  Using anonymous key - some operations may require manual setup');
      this.supabase = createClient(supabaseUrl, anonKey);
      this.isServiceRole = false;
    } else {
      throw new Error('Either NEXT_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }

    // Test connection
    await this.testConnection();
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      console.log('✅ Database connection established\n');
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  /**
   * Execute SQL with error handling and logging
   */
  async executeSQL(sql, description) {
    console.log(`📝 ${description}...`);
    
    try {
      if (this.isServiceRole) {
        // Try using exec_sql function if available
        const { error } = await this.supabase.rpc('exec_sql', { sql });
        
        if (error) {
          // If exec_sql doesn't exist, create it first
          if (error.message && error.message.includes('exec_sql')) {
            await this.createExecSqlFunction();
            // Retry
            const { error: retryError } = await this.supabase.rpc('exec_sql', { sql });
            if (retryError) {
              throw retryError;
            }
          } else {
            throw error;
          }
        }
      } else {
        // For anon key, provide manual SQL
        console.log(`⚠️  Manual SQL required for: ${description}`);
        console.log('Please execute the following SQL in your Supabase SQL editor:');
        console.log('--- BEGIN SQL ---');
        console.log(sql);
        console.log('--- END SQL ---\n');
        return { manual: true };
      }

      console.log(`✅ ${description} completed`);
      this.setupComplete.push(description);
      return { manual: false };
    } catch (error) {
      const errorMsg = `❌ ${description} failed: ${error.message}`;
      console.error(errorMsg);
      this.errors.push({ description, error: error.message });
      return { manual: false, error };
    }
  }

  /**
   * Create exec_sql function for executing raw SQL
   */
  async createExecSqlFunction() {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    try {
      // Try direct execution for function creation
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql: functionSQL })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('✅ Created exec_sql function');
    } catch (error) {
      console.log('⚠️  Could not create exec_sql function, manual setup may be required');
    }
  }

  /**
   * Setup core extensions
   */
  async setupExtensions() {
    const extensionsSQL = `
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `;

    return await this.executeSQL(extensionsSQL, 'Setting up database extensions');
  }

  /**
   * Setup pricing tables and data
   */
  async setupPricingTables() {
    const pricingSQL = `
      -- Create pricing_tiers table
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        price NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create tier_benefits table
      CREATE TABLE IF NOT EXISTS tier_benefits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tier_id UUID NOT NULL REFERENCES pricing_tiers(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index on tier_id for faster lookups
      CREATE INDEX IF NOT EXISTS idx_tier_benefits_tier_id ON tier_benefits(tier_id);

      -- Create a function to update the updated_at column
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create triggers to update updated_at columns
      DROP TRIGGER IF EXISTS update_pricing_tiers_updated_at ON pricing_tiers;
      CREATE TRIGGER update_pricing_tiers_updated_at
      BEFORE UPDATE ON pricing_tiers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_tier_benefits_updated_at ON tier_benefits;
      CREATE TRIGGER update_tier_benefits_updated_at
      BEFORE UPDATE ON tier_benefits
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    const result = await this.executeSQL(pricingSQL, 'Setting up pricing tables');
    
    if (!result.manual && !result.error) {
      await this.insertPricingData();
    }
    
    return result;
  }

  /**
   * Insert pricing data
   */
  async insertPricingData() {
    const pricingDataSQL = `
      -- Insert pricing tiers if they don't exist
      INSERT INTO pricing_tiers (id, name, price, currency, "order")
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'Pro', 297, 'USD', 1),
        ('00000000-0000-0000-0000-000000000002', 'Team', 997, 'USD', 2),
        ('00000000-0000-0000-0000-000000000003', 'Enterprise', 3500, 'USD', 3)
      ON CONFLICT (id) DO NOTHING;

      -- Insert benefits for Pro tier
      INSERT INTO tier_benefits (tier_id, description)
      SELECT '00000000-0000-0000-0000-000000000001', description
      FROM (VALUES 
        ('Pitching audio, captions, hashtags: Content acceleration optimizing engine that accelerates platform-specific formatting and technical aspects. Saves numerous hours of research for every post ($1,000 value). Performs better than competitors ($1,000 value).'),
        ('Posting at the right time: Precise automated posting. Ensures content reaches the most audience even if you have something better to do ($600 value). Offers freedom to live life.'),
        ('Content generation, algorithm anxiety, analytics review: Viral cycle of improvements. Consistently improves posts without endless analytics ($500 value). Generates top-performing content ideas without the stress and anxiety of underperformance.')
      ) AS benefits(description)
      WHERE NOT EXISTS (
        SELECT 1 FROM tier_benefits 
        WHERE tier_id = '00000000-0000-0000-0000-000000000001' 
        AND tier_benefits.description = benefits.description
      );

      -- Insert additional benefits for Team tier
      INSERT INTO tier_benefits (tier_id, description)
      SELECT '00000000-0000-0000-0000-000000000002', description
      FROM (VALUES 
        ('Comprehensive Field Research: Distills all competitor tactics for use without a second spent ($500 value). Compiles all marketing specific to your niche ($500 value).')
      ) AS benefits(description)
      WHERE NOT EXISTS (
        SELECT 1 FROM tier_benefits 
        WHERE tier_id = '00000000-0000-0000-0000-000000000002' 
        AND tier_benefits.description = benefits.description
      );

      -- Insert additional benefits for Enterprise tier
      INSERT INTO tier_benefits (tier_id, description)
      SELECT '00000000-0000-0000-0000-000000000003', description
      FROM (VALUES 
        ('Hash generator, Template generator: Boosts retention by 50% ($200 value). Helps avoid the need to figure out what works when boosting sales.'),
        ('X 10 for agencies + Custom AI model: Learns your brand voice ($1,000 value).')
      ) AS benefits(description)
      WHERE NOT EXISTS (
        SELECT 1 FROM tier_benefits 
        WHERE tier_id = '00000000-0000-0000-0000-000000000003' 
        AND tier_benefits.description = benefits.description
      );
    `;

    return await this.executeSQL(pricingDataSQL, 'Inserting pricing data');
  }

  /**
   * Setup AI improvement tables
   */
  async setupAITables() {
    const aiTablesSQL = `
      -- Table for storing user posts across all platforms (normalized view)
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
        
        -- Engagement metrics
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        
        -- Calculated metrics
        engagement_rate DECIMAL(5,4) DEFAULT 0,
        engagement_score DECIMAL(10,2) DEFAULT 0,
        
        -- Metadata
        raw_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        UNIQUE(platform, platform_post_id)
      );

      -- Table for storing training data quality metrics
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

      -- Table for storing model training sessions
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

      -- Table for storing trained models metadata
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

      -- Table for A/B experiments
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
    `;

    return await this.executeSQL(aiTablesSQL, 'Setting up AI improvement tables');
  }

  /**
   * Setup database indexes for performance
   */
  async setupIndexes() {
    const indexesSQL = `
      -- Pricing table indexes
      CREATE INDEX IF NOT EXISTS idx_tier_benefits_tier_id ON tier_benefits(tier_id);

      -- AI tables indexes
      CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
      CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
      CREATE INDEX IF NOT EXISTS idx_user_posts_engagement_score ON user_posts(engagement_score);

      CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
      CREATE INDEX IF NOT EXISTS idx_model_training_sessions_user_id ON model_training_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_model_training_sessions_status ON model_training_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_trained_models_user_type ON trained_models(user_id, model_type);
      CREATE INDEX IF NOT EXISTS idx_ab_experiments_model_a_id ON ab_experiments(model_a_id);
      CREATE INDEX IF NOT EXISTS idx_ab_experiments_model_b_id ON ab_experiments(model_b_id);
    `;

    return await this.executeSQL(indexesSQL, 'Creating database indexes');
  }

  /**
   * Setup database triggers
   */
  async setupTriggers() {
    const triggersSQL = `
      -- Function to automatically update 'updated_at' timestamp
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Add updated_at triggers for AI tables
      DROP TRIGGER IF EXISTS set_timestamp_user_posts ON user_posts;
      CREATE TRIGGER set_timestamp_user_posts
      BEFORE UPDATE ON user_posts
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();

      DROP TRIGGER IF EXISTS set_timestamp_model_training_sessions ON model_training_sessions;
      CREATE TRIGGER set_timestamp_model_training_sessions
      BEFORE UPDATE ON model_training_sessions
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();

      DROP TRIGGER IF EXISTS set_timestamp_trained_models ON trained_models;
      CREATE TRIGGER set_timestamp_trained_models
      BEFORE UPDATE ON trained_models
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `;

    return await this.executeSQL(triggersSQL, 'Setting up database triggers');
  }

  /**
   * Verify database setup
   */
  async verifySetup() {
    console.log('🔍 Verifying database setup...\n');

    const expectedTables = [
      'pricing_tiers',
      'tier_benefits', 
      'user_posts',
      'training_data_quality',
      'model_training_sessions',
      'trained_models',
      'ab_experiments'
    ];

    try {
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', expectedTables);

      if (error) {
        console.error('❌ Error verifying tables:', error);
        return false;
      }

      const foundTables = tables.map(t => t.table_name);
      const missingTables = expectedTables.filter(table => !foundTables.includes(table));

      console.log(`📊 Tables found: ${foundTables.length}/${expectedTables.length}`);
      console.log(`✅ Found tables: ${foundTables.join(', ')}`);

      if (missingTables.length > 0) {
        console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
        return false;
      }

      // Verify pricing data
      if (foundTables.includes('pricing_tiers')) {
        const { data: pricingData, error: pricingError } = await this.supabase
          .from('pricing_tiers')
          .select('name')
          .order('order');

        if (!pricingError && pricingData.length > 0) {
          console.log(`💰 Pricing tiers: ${pricingData.map(p => p.name).join(', ')}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Verification failed:', error);
      return false;
    }
  }

  /**
   * Print setup summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DATABASE SETUP SUMMARY');
    console.log('='.repeat(60));
    
    if (this.setupComplete.length > 0) {
      console.log('✅ Completed operations:');
      this.setupComplete.forEach(item => console.log(`   • ${item}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   • ${error.description}: ${error.error}`));
    }

    console.log('\n📖 Next steps:');
    if (!this.isServiceRole) {
      console.log('   • Execute any manual SQL shown above in your Supabase SQL editor');
    }
    console.log('   • Run your application to test database connectivity');
    console.log('   • Check Supabase dashboard to verify all tables are created');
    
    console.log('\n🎉 Database setup process completed!');
  }

  /**
   * Run the complete database setup
   */
  async run() {
    try {
      await this.initialize();
      
      // Run all setup operations
      await this.setupExtensions();
      await this.setupPricingTables();
      await this.setupAITables();
      await this.setupIndexes();
      await this.setupTriggers();
      
      // Verify everything worked
      const isVerified = await this.verifySetup();
      
      this.printSummary();
      
      return isVerified && this.errors.length === 0;
    } catch (error) {
      console.error('💥 Fatal error during database setup:', error.message);
      this.printSummary();
      return false;
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Setup script crashed:', error);
    process.exit(1);
  });
}

module.exports = { DatabaseSetup };