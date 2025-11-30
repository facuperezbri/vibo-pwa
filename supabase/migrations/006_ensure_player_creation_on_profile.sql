-- ============================================
-- Ensure Player Creation on Profile Creation
-- ============================================
-- This ensures that every profile automatically gets a player record
-- Rule: Can have player without user, but NOT user without player
-- ============================================

-- Update handle_new_profile to explicitly handle the unique constraint on profile_id
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Always create player record when profile is created
  -- Use ON CONFLICT with the specific unique constraint on profile_id
  INSERT INTO players (profile_id, display_name, is_ghost, elo_score, category_label)
  VALUES (
    NEW.id,
    COALESCE(NEW.full_name, NEW.username, 'Player'),
    FALSE,
    COALESCE(NEW.elo_score, 1400),
    COALESCE(NEW.category_label, '6ta')
  )
  ON CONFLICT (profile_id) DO NOTHING; -- Explicitly use profile_id constraint
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    -- This ensures profile creation always succeeds even if player creation fails
    RAISE WARNING 'Error creating player for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- Also ensure that handle_new_user creates the profile properly
-- This is already handled in migration 003, but we ensure it's correct
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
  -- The trigger on_profile_created will automatically create the player record
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

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

