# Database Migrations

This directory contains database migration scripts for the SocialSchedule application.

## Setting Up the Database

1. **Run the Migration Script**
   - Use your Supabase SQL editor or a PostgreSQL client to run the migration script:
     ```sql
     \i prisma/migrations/20240527_pricing_tables.sql
     ```
   - Or copy and paste the contents of the SQL file into your Supabase SQL editor and run it.

2. **Verify the Setup**
   - After running the migration, verify that the following tables were created:
     - `pricing_tiers`
     - `tier_benefits`
   - Check that the data was inserted correctly by running:
     ```sql
     SELECT * FROM pricing_tiers;
     SELECT * FROM tier_benefits;
     ```

## Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

- The pricing page is available at `/pricing`
- The page is server-rendered and fetches data directly from Supabase
- The UI is responsive and works on both mobile and desktop devices

## Testing

To test the pricing page:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/pricing` in your browser

3. You should see three pricing cards with their respective benefits

## Adding or Modifying Pricing Tiers

1. Update the SQL migration file with your changes
2. Run the migration script again (it's idempotent, so it won't create duplicates)
3. The changes will be reflected on the pricing page automatically

## Troubleshooting

- If you don't see any pricing tiers, check the browser console for errors
- Make sure your Supabase tables have the correct data by running the SQL queries mentioned above
- Verify that your environment variables are correctly set in `.env.local`
