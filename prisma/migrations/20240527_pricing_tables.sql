-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Insert pricing tiers if they don't exist
INSERT INTO pricing_tiers (id, name, price, currency, "order")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Pro', 297, 'USD', 1),
  ('00000000-0000-0000-0000-000000000002', 'Team', 997, 'USD', 2),
  ('00000000-0000-0000-0000-000000000003', 'Enterprise', 3500, 'USD', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert benefits for Pro tier if they don't exist
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
  AND description IN (
    'Pitching audio, captions, hashtags: Content acceleration optimizing engine that accelerates platform-specific formatting and technical aspects. Saves numerous hours of research for every post ($1,000 value). Performs better than competitors ($1,000 value).',
    'Posting at the right time: Precise automated posting. Ensures content reaches the most audience even if you have something better to do ($600 value). Offers freedom to live life.',
    'Content generation, algorithm anxiety, analytics review: Viral cycle of improvements. Consistently improves posts without endless analytics ($500 value). Generates top-performing content ideas without the stress and anxiety of underperformance.'
  )
);

-- Insert additional benefits for Team tier if they don't exist
INSERT INTO tier_benefits (tier_id, description)
SELECT '00000000-0000-0000-0000-000000000002', description
FROM (VALUES 
  ('Comprehensive Field Research: Distills all competitor tactics for use without a second spent ($500 value). Compiles all marketing specific to your niche ($500 value).')
) AS benefits(description)
WHERE NOT EXISTS (
  SELECT 1 FROM tier_benefits 
  WHERE tier_id = '00000000-0000-0000-0000-000000000002' 
  AND description = 'Comprehensive Field Research: Distills all competitor tactics for use without a second spent ($500 value). Compiles all marketing specific to your niche ($500 value).'
);

-- Insert additional benefits for Enterprise tier if they don't exist
INSERT INTO tier_benefits (tier_id, description)
SELECT '00000000-0000-0000-0000-000000000003', description
FROM (VALUES 
  ('Hash generator, Template generator: Boosts retention by 50% ($200 value). Helps avoid the need to figure out what works when boosting sales.'),
  ('X 10 for agencies + Custom AI model: Learns your brand voice ($1,000 value).')
) AS benefits(description)
WHERE NOT EXISTS (
  SELECT 1 FROM tier_benefits 
  WHERE tier_id = '00000000-0000-0000-0000-000000000003' 
  AND description IN (
    'Hash generator, Template generator: Boosts retention by 50% ($200 value). Helps avoid the need to figure out what works when boosting sales.',
    'X 10 for agencies + Custom AI model: Learns your brand voice ($1,000 value).'
  )
);
