-- ============================================
-- Vibo - Limit Gender to Masculino/Femenino Only
-- ============================================
-- Restricts gender field to only 'Masculino' or 'Femenino' (or NULL)
-- Removes 'Otro' and 'Prefiero no decir' options
-- ============================================

-- First, update any existing invalid values to NULL
UPDATE profiles
SET gender = NULL
WHERE gender NOT IN ('Masculino', 'Femenino') AND gender IS NOT NULL;

-- Add CHECK constraint to enforce valid values
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_gender_check 
CHECK (gender IS NULL OR gender IN ('Masculino', 'Femenino'));

-- Update comment to reflect new constraint
COMMENT ON COLUMN profiles.gender IS 'Gender: Masculino or Femenino only (for ranking filters)';

-- Create index on gender for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);

