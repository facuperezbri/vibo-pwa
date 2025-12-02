-- ============================================
-- Fix Security Issues in Views and Functions
-- ============================================
-- This migration fixes:
-- 1. Views that execute with owner privileges (bypassing RLS)
-- 2. Functions with mutable search_path (security vulnerability)
-- ============================================

-- ============================================
-- STEP 1: Fix Views - Add security_invoker
-- ============================================
-- Views must be dropped and recreated because CREATE OR REPLACE
-- cannot change view options like security_invoker.

-- Drop existing views
DROP VIEW IF EXISTS club_summary;
DROP VIEW IF EXISTS tournament_summary;

-- Recreate club_summary view with security_invoker
CREATE VIEW club_summary
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  COUNT(DISTINCT cm.profile_id) FILTER (WHERE cm.is_active = TRUE) as member_count,
  COUNT(DISTINCT t.id) as tournament_count
FROM clubs c
LEFT JOIN club_memberships cm ON cm.club_id = c.id
LEFT JOIN tournaments t ON t.club_id = c.id
GROUP BY c.id;

-- Recreate tournament_summary view with security_invoker
CREATE VIEW tournament_summary
WITH (security_invoker = true)
AS
SELECT 
  t.*,
  c.name as club_name,
  c.slug as club_slug,
  COUNT(DISTINCT tr.id) FILTER (WHERE tr.status IN ('pending', 'confirmed')) as registration_count
FROM tournaments t
LEFT JOIN clubs c ON c.id = t.club_id
LEFT JOIN tournament_registrations tr ON tr.tournament_id = t.id
GROUP BY t.id, c.id;

-- Grant permissions (preserve existing grants)
GRANT SELECT ON club_summary TO authenticated;
GRANT SELECT ON tournament_summary TO authenticated;

-- ============================================
-- STEP 2: Fix Functions - Add SET search_path
-- ============================================

-- Fix link_ghost_player_to_user function
CREATE OR REPLACE FUNCTION link_ghost_player_to_user(
  p_ghost_player_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ghost_player players%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Verify user exists
  SELECT * INTO v_user_profile
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_user_profile IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
  END IF;
  
  -- Get ghost player
  SELECT * INTO v_ghost_player
  FROM players
  WHERE id = p_ghost_player_id;
  
  IF v_ghost_player IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Jugador invitado no encontrado'
    );
  END IF;
  
  -- Verify it's actually a ghost player
  IF v_ghost_player.is_ghost = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este jugador ya tiene una cuenta vinculada'
    );
  END IF;
  
  -- Verify ghost player is not already linked
  IF v_ghost_player.profile_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este jugador invitado ya está vinculado a otra cuenta'
    );
  END IF;
  
  -- Delete any existing player record for this user (created by trigger)
  -- We'll use the ghost player as the main player record
  DELETE FROM players
  WHERE profile_id = p_user_id
    AND id != p_ghost_player_id;
  
  -- Link the ghost player to the user
  -- Keep the ghost player's ELO and stats, but update display_name with user's name
  UPDATE players
  SET 
    profile_id = p_user_id,
    display_name = COALESCE(v_user_profile.full_name, v_user_profile.username, 'Usuario'),
    is_ghost = FALSE,
    updated_at = NOW()
  WHERE id = p_ghost_player_id;
  
  -- Update user's profile to match ghost player stats
  UPDATE profiles
  SET
    elo_score = v_ghost_player.elo_score,
    category_label = v_ghost_player.category_label,
    matches_played = v_ghost_player.matches_played,
    matches_won = v_ghost_player.matches_won,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'ghost_player_id', p_ghost_player_id,
    'user_id', p_user_id,
    'message', 'Jugador invitado vinculado exitosamente'
  );
END;
$$;

-- Fix calculate_true_initial_elo function
CREATE OR REPLACE FUNCTION calculate_true_initial_elo(p_player_id UUID)
RETURNS FLOAT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_elo FLOAT;
  v_total_change FLOAT := 0;
  match_record RECORD;
BEGIN
  SELECT elo_score INTO v_current_elo FROM players WHERE id = p_player_id;
  
  FOR match_record IN 
    SELECT elo_changes, player_1_id, player_2_id, player_3_id, player_4_id
    FROM matches 
    WHERE player_1_id = p_player_id 
       OR player_2_id = p_player_id 
       OR player_3_id = p_player_id 
       OR player_4_id = p_player_id
  LOOP
    IF match_record.player_1_id = p_player_id THEN
      v_total_change := v_total_change + COALESCE((match_record.elo_changes->'player_1'->>'change')::FLOAT, 0);
    ELSIF match_record.player_2_id = p_player_id THEN
      v_total_change := v_total_change + COALESCE((match_record.elo_changes->'player_2'->>'change')::FLOAT, 0);
    ELSIF match_record.player_3_id = p_player_id THEN
      v_total_change := v_total_change + COALESCE((match_record.elo_changes->'player_3'->>'change')::FLOAT, 0);
    ELSIF match_record.player_4_id = p_player_id THEN
      v_total_change := v_total_change + COALESCE((match_record.elo_changes->'player_4'->>'change')::FLOAT, 0);
    END IF;
  END LOOP;
  
  RETURN GREATEST(COALESCE(v_current_elo, 1000) - v_total_change, 100);
END;
$$;

-- Fix create_club_account function
CREATE OR REPLACE FUNCTION create_club_account(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'Argentina',
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_instagram TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_club_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Update profile to club type
  UPDATE profiles
  SET user_type = 'club'
  WHERE id = v_user_id;
  
  -- Create club
  INSERT INTO clubs (
    name, 
    slug, 
    description, 
    city, 
    province, 
    country,
    phone,
    email,
    website,
    instagram,
    is_public, 
    created_by
  )
  VALUES (
    p_name, 
    p_slug, 
    p_description, 
    p_city, 
    p_province, 
    p_country,
    p_phone,
    p_email,
    p_website,
    p_instagram,
    p_is_public, 
    v_user_id
  )
  RETURNING id INTO v_club_id;
  
  -- Add creator as owner
  INSERT INTO club_memberships (club_id, profile_id, role)
  VALUES (v_club_id, v_user_id, 'owner')
  ON CONFLICT (club_id, profile_id) DO NOTHING;
  
  RETURN v_club_id;
END;
$$;

-- Preserve existing grants and comments
GRANT EXECUTE ON FUNCTION link_ghost_player_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION link_ghost_player_to_user TO anon;
COMMENT ON FUNCTION link_ghost_player_to_user IS 'Links a ghost player to a user account, transferring ELO and stats to the new user';

COMMENT ON FUNCTION calculate_true_initial_elo IS 'Calculates true initial ELO by reversing all match changes. Used for data recovery.';

GRANT EXECUTE ON FUNCTION create_club_account TO authenticated;

