-- ============================================
-- Padelio - Add Location and Contact Fields to Profiles
-- ============================================
-- Adds country, province, phone, and email fields to profiles table
-- ============================================

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on country for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);

-- Create index on province for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_province ON profiles(province);

-- Add comment to columns
COMMENT ON COLUMN profiles.country IS 'Country code (ISO 3166-1 alpha-2) or name';
COMMENT ON COLUMN profiles.province IS 'Province/State name';
COMMENT ON COLUMN profiles.phone IS 'Phone number';
COMMENT ON COLUMN profiles.email IS 'Email address (can be synced from auth.users)';

