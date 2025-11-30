-- ============================================
-- Change Default Category to 8va
-- ============================================
-- Updates all default category values from '6ta' to '8va'
-- ============================================

-- Update default value in profiles table
ALTER TABLE profiles 
ALTER COLUMN category_label SET DEFAULT '8va';

-- Update default value in players table
ALTER TABLE players 
ALTER COLUMN category_label SET DEFAULT '8va';

-- Update handle_new_profile function to use '8va' as default
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
    COALESCE(NEW.category_label, '8va')
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

-- Update handle_new_user function to use '8va' as default
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
    '8va' -- Default category
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

