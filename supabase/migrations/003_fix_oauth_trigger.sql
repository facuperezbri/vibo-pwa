-- ============================================
-- PadelTracker - Fix OAuth User Creation Trigger
-- ============================================
-- This fixes the trigger to handle OAuth users properly
-- ============================================

-- Drop and recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract user metadata with fallbacks
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'email',
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  
  -- Insert profile with default values for required fields
  INSERT INTO profiles (id, username, full_name, avatar_url, elo_score, category_label)
  VALUES (
    NEW.id,
    v_username,
    v_full_name,
    v_avatar_url,
    1400, -- Default ELO
    '6ta' -- Default category
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update handle_new_profile to be more robust
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create player if it doesn't exist
  INSERT INTO players (profile_id, display_name, is_ghost, elo_score, category_label)
  VALUES (
    NEW.id,
    COALESCE(NEW.full_name, NEW.username, 'Player'),
    FALSE,
    COALESCE(NEW.elo_score, 1400),
    COALESCE(NEW.category_label, '6ta')
  )
  ON CONFLICT DO NOTHING; -- Prevent errors if player already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Error creating player for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint on players.profile_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'players_profile_id_key'
  ) THEN
    ALTER TABLE players 
    ADD CONSTRAINT players_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

