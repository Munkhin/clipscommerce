# Workflow: Add a New Supabase Migration

This workflow outlines the steps to create and apply a new database migration using Supabase CLI.

## 1. Create a New Migration

Use the Supabase CLI to generate a new migration file. This command creates a timestamped SQL file in the `supabase/migrations` directory.

```bash
supabase migration new <migration_name>
```

Replace `<migration_name>` with a descriptive name for your migration (e.g., `add_users_table`, `alter_products_column`).

## 2. Edit the Migration File

Open the newly created SQL file in `supabase/migrations/`.

Add your SQL statements to define the schema changes. This typically includes `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, etc.

**Example:** `supabase/migrations/20231027120000_add_users_table.sql`

```sql
-- Add new table
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies if needed
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data." ON public.users
  FOR SELECT USING (auth.uid() = id);

-- You can also add down migration logic here for reverting changes
-- For example:
-- DROP TABLE public.users;
```

## 3. Apply the Migration Locally

Apply the migration to your local Supabase development environment to test the changes.

```bash
supabase db diff
supabase db reset
```

`supabase db diff` will show you the changes that will be applied. `supabase db reset` will reset your local database and apply all migrations from scratch. This is useful for ensuring your migrations are idempotent and work correctly from an empty state.

## 4. Verify Changes

After applying the migration, verify the database schema changes using a database client or by interacting with your application locally.

## 5. Commit Changes

Commit the new migration file and any related code changes to your version control system.

```bash
git add supabase/migrations/<your_migration_file>.sql
git commit -m "feat: Add <migration_name> migration"
```

## 6. Deploy to Production (if applicable)

For production environments, follow your deployment process for Supabase migrations. This usually involves running `supabase migration up` on the production server or using Supabase's dashboard to apply pending migrations.

**Note:** Always back up your production database before applying migrations.