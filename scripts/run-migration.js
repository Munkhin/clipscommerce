const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Get migration file from command line arguments
    const migrationFile = process.argv[2];
    if (!migrationFile) {
      throw new Error('Please provide a migration file name.');
    }

    // Load environment variables
    require('dotenv').config({ path: path.resolve(__dirname, '../.env.example') });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read the function creation file
    const functionMigrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20240627_add_exec_sql_function.sql');
    const functionSql = fs.readFileSync(functionMigrationPath, 'utf8');

    console.log('Creating exec_sql function...');
    const { error: functionError } = await supabase.rpc('exec_sql', { sql: functionSql });
    if (functionError) {
        // If the function already exists, we can ignore the error and continue.
        if (functionError.code !== '42723') {
            console.error('Error creating exec_sql function:', functionError);
            throw functionError;
        }
    }

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'ai_improvement_complete.sql');
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
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration(); 