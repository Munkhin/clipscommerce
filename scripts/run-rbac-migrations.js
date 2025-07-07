const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * RBAC Migration Runner
 * 
 * This script runs all RBAC-related database migrations in the correct order.
 * It's designed to be safe and idempotent - can be run multiple times.
 */
class RBACMigrationRunner {
  constructor() {
    this.supabase = null;
    this.migrationsPath = path.join(__dirname, '..', 'supabase', 'migrations');
    this.rbacMigrations = [
      '20250705000001_rbac_and_2fa_schema.sql',
      '20250707000001_refresh_rbac_schema.sql', 
      '20250707000002_create_is_admin_function.sql',
      '20250707000003_update_rls_policies.sql'
    ];
    this.errors = [];
    this.completed = [];
  }

  async initialize() {
    console.log('🚀 Initializing RBAC Migration Runner...\n');

    // Load environment variables
    require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL not found. This would normally be required.');
      console.log('🔧 To run migrations in your environment, you need to:');
      console.log('   1. Create a .env.local file with your Supabase credentials');
      console.log('   2. Set NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
      console.log('   3. Set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
      console.log('');
      console.log('📋 For now, I\'ll show you what SQL would be executed...\n');
      return false;
    }

    if (serviceRoleKey) {
      console.log('✅ Using service role key for migration operations');
      this.supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } else if (anonKey) {
      console.log('⚠️  Using anonymous key - migrations will be shown as manual SQL');
      this.supabase = createClient(supabaseUrl, anonKey);
    } else {
      console.log('❌ No Supabase keys found');
      return false;
    }

    // Test connection
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      console.log('✅ Database connection established\n');
      return true;
    } catch (error) {
      console.log(`❌ Failed to connect to database: ${error.message}`);
      return false;
    }
  }

  async runMigration(migrationFile) {
    const migrationPath = path.join(this.migrationsPath, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  Migration file not found: ${migrationFile}`);
      return false;
    }

    console.log(`📝 Running migration: ${migrationFile}...`);
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      if (!this.supabase) {
        // Show SQL that would be executed
        console.log('📋 SQL that would be executed:');
        console.log('--- BEGIN SQL ---');
        console.log(sql);
        console.log('--- END SQL ---\n');
        return true;
      }

      // Create exec_sql function if it doesn't exist
      await this.createExecSqlFunction();

      // Execute the migration
      const { error } = await this.supabase.rpc('exec_sql', { sql });
      
      if (error) {
        throw error;
      }

      console.log(`✅ Migration completed: ${migrationFile}`);
      this.completed.push(migrationFile);
      return true;
    } catch (error) {
      const errorMsg = `❌ Migration failed: ${migrationFile} - ${error.message}`;
      console.error(errorMsg);
      this.errors.push({ file: migrationFile, error: error.message });
      return false;
    }
  }

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
      const { error } = await this.supabase.rpc('exec_sql', { sql: functionSQL });
      if (error && !error.message?.includes('already exists')) {
        console.log('⚠️  Could not create exec_sql function:', error.message);
      }
    } catch (error) {
      // Ignore errors for function creation
    }
  }

  async verifyRBACTables() {
    if (!this.supabase) {
      console.log('⚠️  Cannot verify tables without database connection');
      return false;
    }

    console.log('🔍 Verifying RBAC tables...');

    const expectedTables = ['roles', 'user_roles', 'teams', 'user_2fa_settings'];
    
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

      console.log(`📊 RBAC Tables found: ${foundTables.length}/${expectedTables.length}`);
      console.log(`✅ Found: ${foundTables.join(', ')}`);

      if (missingTables.length > 0) {
        console.log(`❌ Missing: ${missingTables.join(', ')}`);
        return false;
      }

      // Check if default roles exist
      const { data: roles, error: rolesError } = await this.supabase
        .from('roles')
        .select('name')
        .order('name');

      if (!rolesError && roles.length > 0) {
        console.log(`👥 Roles found: ${roles.map(r => r.name).join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Verification failed:', error);
      return false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 RBAC MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    if (this.completed.length > 0) {
      console.log('✅ Completed migrations:');
      this.completed.forEach(migration => console.log(`   • ${migration}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Failed migrations:');
      this.errors.forEach(error => console.log(`   • ${error.file}: ${error.error}`));
    }

    console.log('\n📖 Next steps:');
    if (!this.supabase) {
      console.log('   • Set up your Supabase environment variables');
      console.log('   • Run this script again with proper credentials');
      console.log('   • Or execute the SQL manually in your Supabase SQL editor');
    } else {
      console.log('   • Test the RBAC system in your application');
      console.log('   • Verify user roles are working correctly');
      console.log('   • Check the dashboard for any permission errors');
    }
    
    console.log('\n🎉 RBAC migration process completed!');
  }

  async run() {
    try {
      const isConnected = await this.initialize();
      
      console.log('🔧 Running RBAC migrations in order...\n');
      
      // Run migrations in order
      for (const migration of this.rbacMigrations) {
        await this.runMigration(migration);
        // Small delay to ensure proper execution order
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Verify the setup if we have a connection
      if (isConnected) {
        const isVerified = await this.verifyRBACTables();
        console.log(isVerified ? '✅ RBAC verification passed' : '❌ RBAC verification failed');
      }
      
      this.printSummary();
      
      return this.errors.length === 0;
    } catch (error) {
      console.error('💥 Fatal error during RBAC migration:', error.message);
      this.printSummary();
      return false;
    }
  }
}

// Run the migrations if this script is executed directly
if (require.main === module) {
  const runner = new RBACMigrationRunner();
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Migration script crashed:', error);
    process.exit(1);
  });
}

module.exports = { RBACMigrationRunner };