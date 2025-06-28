# Database Setup Guide

This document outlines the consolidated database strategy for ClipsCommerce, which uses **Supabase** as the single source of truth for all database operations.

## Architecture Decision

**Selected Database Client: Supabase**

### Rationale:
- **Current Reality**: Supabase is already extensively used throughout the application (113+ files)
- **Feature Completeness**: Provides database, authentication, real-time subscriptions, and storage
- **No Active Prisma**: Despite the existence of a `prisma/` folder, there was no actual Prisma client implementation
- **Developer Experience**: Well-architected setup with proper SSR support for Next.js
- **Deployment Simplicity**: Already configured and working in the current environment

## Database Setup

### Prerequisites

Ensure you have the following environment variables in your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_SERVICE_ROLE_KEY=your_supabase_service_role_key  # For DDL operations
```

### Quick Setup

Run the unified database setup script:

```bash
npm run setup-database
```

This script will:
- ✅ Set up all required database extensions
- ✅ Create all application tables (pricing, AI, autoposting, etc.)
- ✅ Set up indexes for optimal performance  
- ✅ Configure triggers for automatic timestamp updates
- ✅ Insert initial data (pricing tiers and benefits)
- ✅ Verify the setup completed successfully

### Manual Setup (if automated setup fails)

If you don't have service role access, the script will output manual SQL that you can run in your Supabase SQL editor.

## Database Structure

### Core Tables

#### Authentication & Users
- `profiles` - Extended user profile information
- `usage_tracking` - Track user operation usage

#### Pricing & Subscriptions  
- `pricing_tiers` - Available subscription tiers
- `tier_benefits` - Benefits for each tier

#### AI & Machine Learning
- `user_posts` - Normalized social media posts across platforms
- `training_data_quality` - Data quality metrics for AI training
- `model_training_sessions` - Track AI model training processes
- `trained_models` - Metadata for trained AI models
- `ab_experiments` - A/B testing experiments for model comparison

#### Autoposting & Scheduling
- `autopost_schedule` - Scheduled social media posts
- `user_social_credentials` - Encrypted social platform credentials

### Client Architecture

The application uses a well-structured Supabase client setup:

```
src/lib/supabase/
├── client.ts     # Browser client with cookie handling
├── server.ts     # Server-side client for SSR
├── service.ts    # Service client wrapper
├── middleware.ts # Auth middleware
└── queries/      # Pre-built queries
    └── pricing.ts
```

### Key Features

1. **SSR Support**: Proper server-side rendering with cookie-based authentication
2. **Real-time**: Configured for real-time subscriptions
3. **Type Safety**: TypeScript integration with generated types
4. **Security**: Row Level Security (RLS) policies implemented
5. **Performance**: Optimized indexes for common query patterns

## Migration Management

### Current Migrations

All migrations are stored in `supabase/migrations/` and follow a chronological naming pattern:

- `20240527000000_pricing_tables.sql` - Pricing and subscription tables
- `20240611000000_profiles_table.sql` - User profiles and authentication
- `20240627000000_comprehensive_rls_policies.sql` - Security policies
- `20240627000001_create_storage_buckets.sql` - File storage setup
- `20240627000002_model_monitoring_tables.sql` - AI monitoring
- `20240627000003_autoposting_schema.sql` - Social media automation
- `ai_improvement_complete.sql` - Complete AI pipeline tables

### Running Individual Migrations

```bash
node scripts/run-migration.js migration_file_name.sql
```

## Development Workflow

### Local Development
1. Run `npm run setup-database` to initialize your local database
2. Use the Supabase client throughout your application:
   ```typescript
   import { createClient } from '@/lib/supabase/client'
   const supabase = createClient()
   ```

### Production Deployment
1. Ensure all environment variables are properly set
2. Run the setup script in your production environment
3. Verify all tables and data are correctly created

## Testing

The database setup includes verification steps that check:
- ✅ All expected tables exist
- ✅ Initial data is properly inserted
- ✅ Indexes are created
- ✅ Triggers are functioning

## Troubleshooting

### Common Issues

**"Database connection failed"**
- Verify your Supabase URL and keys in `.env.local`
- Ensure your Supabase project is active

**"Permission denied"**  
- Use service role key for DDL operations
- Check that RLS policies allow your operations

**"Table already exists"**
- This is normal - the script is idempotent and safe to re-run

### Getting Help

1. Check the Supabase dashboard for table structure
2. Review the setup script output for specific errors
3. Use the Supabase SQL editor to manually verify table creation

## Migration from Previous Setup

The consolidation process involved:

1. ✅ **Removed unused Prisma folder** - No actual Prisma client was implemented
2. ✅ **Migrated valuable SQL** - Moved all table definitions from `prisma/migrations/` to `supabase/migrations/`
3. ✅ **Consolidated setup scripts** - Combined 3 separate scripts into 1 unified script
4. ✅ **Maintained existing Supabase usage** - No breaking changes to existing code
5. ✅ **Enhanced with proper indexing and triggers** - Improved performance and data integrity

The application now has a single, consistent database strategy centered around Supabase.