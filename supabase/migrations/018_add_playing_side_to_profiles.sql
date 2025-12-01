-- ============================================
-- Vibo - Add Playing Side Field to Profiles
-- ============================================
-- Adds playing_side field to profiles table to store if player plays Drive or Revés
-- ============================================

-- Add playing_side column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS playing_side TEXT CHECK (playing_side IN ('Drive', 'Revés'));

-- Create index on playing_side for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_playing_side ON profiles(playing_side);

-- Add comment to column
COMMENT ON COLUMN profiles.playing_side IS 'Playing side: Drive (right side) or Revés (left side)';

