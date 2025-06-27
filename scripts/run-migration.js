const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250106000001_ai_improvement_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running AI improvement pipeline migration...');
    
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        console.log(`Executing: ${trimmedStatement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: trimmedStatement + ';' });
        if (error) {
          console.error('Error executing statement:', error);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_posts', 'training_data_quality', 'model_training_sessions', 'trained_models', 'ai_suggestions', 'ab_experiments']);
    
    if (tablesError) {
      console.error('Error verifying tables:', tablesError);
    } else {
      console.log('✅ Verified tables created:', tables.map(t => t.table_name));
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration(); 