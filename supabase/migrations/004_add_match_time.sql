-- ============================================
-- PadelTracker - Add Time Support to Matches
-- ============================================
-- This migration changes match_date from DATE to TIMESTAMPTZ
-- to support both date and time for matches
-- ============================================

-- Change match_date from DATE to TIMESTAMPTZ
-- Existing dates will be converted to midnight (00:00:00)
ALTER TABLE matches 
ALTER COLUMN match_date TYPE TIMESTAMPTZ USING match_date::TIMESTAMPTZ;

-- Update default to current timestamp instead of just date
ALTER TABLE matches 
ALTER COLUMN match_date SET DEFAULT NOW();

