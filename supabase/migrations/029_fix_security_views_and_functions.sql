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

-- Fix handle_match_delete function (from 021_simplify_elo_system.sql)
CREATE OR REPLACE FUNCTION handle_match_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team1_won BOOLEAN;
  v_elo_change_1 FLOAT;
  v_elo_change_2 FLOAT;
  v_elo_change_3 FLOAT;
  v_elo_change_4 FLOAT;
BEGIN
  v_team1_won := OLD.winner_team = 1;
  
  -- Extract ELO changes from stored data
  v_elo_change_1 := COALESCE((OLD.elo_changes->'player_1'->>'change')::FLOAT, 0);
  v_elo_change_2 := COALESCE((OLD.elo_changes->'player_2'->>'change')::FLOAT, 0);
  v_elo_change_3 := COALESCE((OLD.elo_changes->'player_3'->>'change')::FLOAT, 0);
  v_elo_change_4 := COALESCE((OLD.elo_changes->'player_4'->>'change')::FLOAT, 0);
  
  -- Revert player 1 stats
  UPDATE players SET 
    elo_score = GREATEST(elo_score - v_elo_change_1, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_1, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = OLD.player_1_id;
  
  -- Revert player 2 stats
  UPDATE players SET 
    elo_score = GREATEST(elo_score - v_elo_change_2, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_2, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = OLD.player_2_id;
  
  -- Revert player 3 stats
  UPDATE players SET 
    elo_score = GREATEST(elo_score - v_elo_change_3, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_3, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = OLD.player_3_id;
  
  -- Revert player 4 stats
  UPDATE players SET 
    elo_score = GREATEST(elo_score - v_elo_change_4, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_4, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = OLD.player_4_id;
  
  -- Also sync to profiles
  UPDATE profiles SET 
    elo_score = GREATEST(elo_score - v_elo_change_1, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_1, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = OLD.player_1_id AND profile_id IS NOT NULL);
  
  UPDATE profiles SET 
    elo_score = GREATEST(elo_score - v_elo_change_2, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_2, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = OLD.player_2_id AND profile_id IS NOT NULL);
  
  UPDATE profiles SET 
    elo_score = GREATEST(elo_score - v_elo_change_3, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_3, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = OLD.player_3_id AND profile_id IS NOT NULL);
  
  UPDATE profiles SET 
    elo_score = GREATEST(elo_score - v_elo_change_4, 100),
    category_label = get_category_from_elo(GREATEST(elo_score - v_elo_change_4, 100)),
    matches_played = GREATEST(matches_played - 1, 0),
    matches_won = GREATEST(matches_won - CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END, 0),
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = OLD.player_4_id AND profile_id IS NOT NULL);
  
  RETURN OLD;
END;
$$;

-- Fix recalculate_all_elos function (from 020_chronological_elo_recalculation.sql)
-- Note: This function is admin-only, keeping it for reference but it's already restricted
CREATE OR REPLACE FUNCTION recalculate_all_elos()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_record RECORD;
  v_player1_elo FLOAT;
  v_player2_elo FLOAT;
  v_player3_elo FLOAT;
  v_player4_elo FLOAT;
  v_player1_matches INT;
  v_player2_matches INT;
  v_player3_matches INT;
  v_player4_matches INT;
  v_team1_avg FLOAT;
  v_team2_avg FLOAT;
  v_team1_won BOOLEAN;
  v_new_elo1 FLOAT;
  v_new_elo2 FLOAT;
  v_new_elo3 FLOAT;
  v_new_elo4 FLOAT;
  v_elo_changes JSONB;
  v_matches_processed INT := 0;
  v_players_reset INT := 0;
BEGIN
  -- PHASE 1: Create temp table and reset all players
  CREATE TEMP TABLE IF NOT EXISTS player_state (
    player_id UUID PRIMARY KEY,
    profile_id UUID,
    current_elo FLOAT,
    matches_played INT DEFAULT 0,
    matches_won INT DEFAULT 0
  ) ON COMMIT DROP;
  
  TRUNCATE player_state;
  
  INSERT INTO player_state (player_id, profile_id, current_elo, matches_played, matches_won)
  SELECT 
    id,
    profile_id,
    COALESCE(initial_elo, get_initial_elo(category_label), 1000),
    0,
    0
  FROM players;
  
  GET DIAGNOSTICS v_players_reset = ROW_COUNT;
  
  -- PHASE 2: Process matches chronologically
  FOR match_record IN 
    SELECT * FROM matches ORDER BY match_date ASC, created_at ASC
  LOOP
    SELECT current_elo, matches_played INTO v_player1_elo, v_player1_matches
    FROM player_state WHERE player_id = match_record.player_1_id;
    
    SELECT current_elo, matches_played INTO v_player2_elo, v_player2_matches
    FROM player_state WHERE player_id = match_record.player_2_id;
    
    SELECT current_elo, matches_played INTO v_player3_elo, v_player3_matches
    FROM player_state WHERE player_id = match_record.player_3_id;
    
    SELECT current_elo, matches_played INTO v_player4_elo, v_player4_matches
    FROM player_state WHERE player_id = match_record.player_4_id;
    
    v_player1_elo := COALESCE(v_player1_elo, 1000);
    v_player2_elo := COALESCE(v_player2_elo, 1000);
    v_player3_elo := COALESCE(v_player3_elo, 1000);
    v_player4_elo := COALESCE(v_player4_elo, 1000);
    v_player1_matches := COALESCE(v_player1_matches, 0);
    v_player2_matches := COALESCE(v_player2_matches, 0);
    v_player3_matches := COALESCE(v_player3_matches, 0);
    v_player4_matches := COALESCE(v_player4_matches, 0);
    
    v_team1_avg := (v_player1_elo + v_player2_elo) / 2;
    v_team2_avg := (v_player3_elo + v_player4_elo) / 2;
    v_team1_won := match_record.winner_team = 1;
    
    v_new_elo1 := calculate_new_elo(v_player1_elo, v_team2_avg, v_team1_won, v_player1_matches);
    v_new_elo2 := calculate_new_elo(v_player2_elo, v_team2_avg, v_team1_won, v_player2_matches);
    v_new_elo3 := calculate_new_elo(v_player3_elo, v_team1_avg, NOT v_team1_won, v_player3_matches);
    v_new_elo4 := calculate_new_elo(v_player4_elo, v_team1_avg, NOT v_team1_won, v_player4_matches);
    
    UPDATE player_state SET 
      current_elo = v_new_elo1,
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN v_team1_won THEN 1 ELSE 0 END
    WHERE player_id = match_record.player_1_id;
    
    UPDATE player_state SET 
      current_elo = v_new_elo2,
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN v_team1_won THEN 1 ELSE 0 END
    WHERE player_id = match_record.player_2_id;
    
    UPDATE player_state SET 
      current_elo = v_new_elo3,
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END
    WHERE player_id = match_record.player_3_id;
    
    UPDATE player_state SET 
      current_elo = v_new_elo4,
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END
    WHERE player_id = match_record.player_4_id;
    
    v_elo_changes := jsonb_build_object(
      'player_1', jsonb_build_object('before', v_player1_elo, 'after', v_new_elo1, 'change', v_new_elo1 - v_player1_elo),
      'player_2', jsonb_build_object('before', v_player2_elo, 'after', v_new_elo2, 'change', v_new_elo2 - v_player2_elo),
      'player_3', jsonb_build_object('before', v_player3_elo, 'after', v_new_elo3, 'change', v_new_elo3 - v_player3_elo),
      'player_4', jsonb_build_object('before', v_player4_elo, 'after', v_new_elo4, 'change', v_new_elo4 - v_player4_elo)
    );
    
    UPDATE matches SET elo_changes = v_elo_changes WHERE id = match_record.id;
    
    v_matches_processed := v_matches_processed + 1;
  END LOOP;
  
  -- PHASE 3: Apply final states
  UPDATE players p SET
    elo_score = ps.current_elo,
    category_label = get_category_from_elo(ps.current_elo),
    matches_played = ps.matches_played,
    matches_won = ps.matches_won
  FROM player_state ps
  WHERE p.id = ps.player_id;
  
  UPDATE profiles pr SET
    elo_score = ps.current_elo,
    category_label = get_category_from_elo(ps.current_elo),
    matches_played = ps.matches_played,
    matches_won = ps.matches_won
  FROM player_state ps
  WHERE pr.id = ps.profile_id AND ps.profile_id IS NOT NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'players_reset', v_players_reset,
    'matches_processed', v_matches_processed
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fix recalculate_elos_from_date function (from 020_chronological_elo_recalculation.sql)
-- Note: This function is deprecated but kept for reference
CREATE OR REPLACE FUNCTION recalculate_elos_from_date(p_from_date TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_record RECORD;
  v_player1_elo FLOAT;
  v_player2_elo FLOAT;
  v_player3_elo FLOAT;
  v_player4_elo FLOAT;
  v_player1_matches INT;
  v_player2_matches INT;
  v_player3_matches INT;
  v_player4_matches INT;
  v_team1_avg FLOAT;
  v_team2_avg FLOAT;
  v_team1_won BOOLEAN;
  v_new_elo1 FLOAT;
  v_new_elo2 FLOAT;
  v_new_elo3 FLOAT;
  v_new_elo4 FLOAT;
  v_elo_changes JSONB;
  v_matches_processed INT := 0;
  v_affected_players UUID[];
BEGIN
  -- Collect all players affected by matches from this date forward
  SELECT ARRAY_AGG(DISTINCT player_id) INTO v_affected_players
  FROM (
    SELECT player_1_id AS player_id FROM matches WHERE match_date >= p_from_date
    UNION SELECT player_2_id FROM matches WHERE match_date >= p_from_date
    UNION SELECT player_3_id FROM matches WHERE match_date >= p_from_date
    UNION SELECT player_4_id FROM matches WHERE match_date >= p_from_date
  ) affected;
  
  -- If no matches affected, return early
  IF v_affected_players IS NULL OR array_length(v_affected_players, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'matches_processed', 0,
      'message', 'No matches to recalculate'
    );
  END IF;
  
  -- Create temp table to track player states
  CREATE TEMP TABLE IF NOT EXISTS player_state_incremental (
    player_id UUID PRIMARY KEY,
    profile_id UUID,
    current_elo FLOAT,
    matches_played INT DEFAULT 0,
    matches_won INT DEFAULT 0
  ) ON COMMIT DROP;
  
  TRUNCATE player_state_incremental;
  
  -- Initialize affected players with their state BEFORE the from_date
  INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
  SELECT 
    p.id,
    p.profile_id,
    COALESCE(p.initial_elo, get_initial_elo(p.category_label), 1000),
    0,
    0
  FROM players p
  WHERE p.id = ANY(v_affected_players);
  
  -- Process all matches BEFORE from_date to build correct state
  FOR match_record IN 
    SELECT * FROM matches 
    WHERE match_date < p_from_date
    AND (
      player_1_id = ANY(v_affected_players) OR
      player_2_id = ANY(v_affected_players) OR
      player_3_id = ANY(v_affected_players) OR
      player_4_id = ANY(v_affected_players)
    )
    ORDER BY match_date ASC, created_at ASC
  LOOP
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0) 
    INTO v_player1_elo, v_player1_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_1_id;
    
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player2_elo, v_player2_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_2_id;
    
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player3_elo, v_player3_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_3_id;
    
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player4_elo, v_player4_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_4_id;
    
    v_team1_avg := (v_player1_elo + v_player2_elo) / 2;
    v_team2_avg := (v_player3_elo + v_player4_elo) / 2;
    v_team1_won := match_record.winner_team = 1;
    
    v_new_elo1 := calculate_new_elo(v_player1_elo, v_team2_avg, v_team1_won, v_player1_matches);
    v_new_elo2 := calculate_new_elo(v_player2_elo, v_team2_avg, v_team1_won, v_player2_matches);
    v_new_elo3 := calculate_new_elo(v_player3_elo, v_team1_avg, NOT v_team1_won, v_player3_matches);
    v_new_elo4 := calculate_new_elo(v_player4_elo, v_team1_avg, NOT v_team1_won, v_player4_matches);
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_1_id, profile_id, v_new_elo1, 1, CASE WHEN v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_1_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo1,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN v_team1_won THEN 1 ELSE 0 END;
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_2_id, profile_id, v_new_elo2, 1, CASE WHEN v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_2_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo2,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN v_team1_won THEN 1 ELSE 0 END;
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_3_id, profile_id, v_new_elo3, 1, CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_3_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo3,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END;
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_4_id, profile_id, v_new_elo4, 1, CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_4_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo4,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END;
  END LOOP;
  
  -- Now process matches FROM the date forward and update their elo_changes
  FOR match_record IN 
    SELECT * FROM matches 
    WHERE match_date >= p_from_date
    ORDER BY match_date ASC, created_at ASC
  LOOP
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player1_elo, v_player1_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_1_id;
    
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player2_elo, v_player2_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_2_id;
    
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player3_elo, v_player3_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_3_id;
    
    SELECT COALESCE(psi.current_elo, p.initial_elo, 1000), COALESCE(psi.matches_played, 0)
    INTO v_player4_elo, v_player4_matches
    FROM players p
    LEFT JOIN player_state_incremental psi ON psi.player_id = p.id
    WHERE p.id = match_record.player_4_id;
    
    v_team1_avg := (v_player1_elo + v_player2_elo) / 2;
    v_team2_avg := (v_player3_elo + v_player4_elo) / 2;
    v_team1_won := match_record.winner_team = 1;
    
    v_new_elo1 := calculate_new_elo(v_player1_elo, v_team2_avg, v_team1_won, v_player1_matches);
    v_new_elo2 := calculate_new_elo(v_player2_elo, v_team2_avg, v_team1_won, v_player2_matches);
    v_new_elo3 := calculate_new_elo(v_player3_elo, v_team1_avg, NOT v_team1_won, v_player3_matches);
    v_new_elo4 := calculate_new_elo(v_player4_elo, v_team1_avg, NOT v_team1_won, v_player4_matches);
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_1_id, profile_id, v_new_elo1, 1, CASE WHEN v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_1_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo1,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN v_team1_won THEN 1 ELSE 0 END;
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_2_id, profile_id, v_new_elo2, 1, CASE WHEN v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_2_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo2,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN v_team1_won THEN 1 ELSE 0 END;
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_3_id, profile_id, v_new_elo3, 1, CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_3_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo3,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END;
    
    INSERT INTO player_state_incremental (player_id, profile_id, current_elo, matches_played, matches_won)
    SELECT match_record.player_4_id, profile_id, v_new_elo4, 1, CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END
    FROM players WHERE id = match_record.player_4_id
    ON CONFLICT (player_id) DO UPDATE SET
      current_elo = v_new_elo4,
      matches_played = player_state_incremental.matches_played + 1,
      matches_won = player_state_incremental.matches_won + CASE WHEN NOT v_team1_won THEN 1 ELSE 0 END;
    
    v_elo_changes := jsonb_build_object(
      'player_1', jsonb_build_object('before', v_player1_elo, 'after', v_new_elo1, 'change', v_new_elo1 - v_player1_elo),
      'player_2', jsonb_build_object('before', v_player2_elo, 'after', v_new_elo2, 'change', v_new_elo2 - v_player2_elo),
      'player_3', jsonb_build_object('before', v_player3_elo, 'after', v_new_elo3, 'change', v_new_elo3 - v_player3_elo),
      'player_4', jsonb_build_object('before', v_player4_elo, 'after', v_new_elo4, 'change', v_new_elo4 - v_player4_elo)
    );
    
    UPDATE matches SET elo_changes = v_elo_changes WHERE id = match_record.id;
    
    v_matches_processed := v_matches_processed + 1;
  END LOOP;
  
  UPDATE players p SET
    elo_score = psi.current_elo,
    category_label = get_category_from_elo(psi.current_elo),
    matches_played = psi.matches_played,
    matches_won = psi.matches_won
  FROM player_state_incremental psi
  WHERE p.id = psi.player_id;
  
  UPDATE profiles pr SET
    elo_score = psi.current_elo,
    category_label = get_category_from_elo(psi.current_elo),
    matches_played = psi.matches_played,
    matches_won = psi.matches_won
  FROM player_state_incremental psi
  WHERE pr.id = psi.profile_id AND psi.profile_id IS NOT NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'matches_processed', v_matches_processed,
    'affected_players', array_length(v_affected_players, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fix calculate_new_elo function (from 011_fix_calculate_new_elo_ambiguity.sql)
CREATE OR REPLACE FUNCTION calculate_new_elo(
  current_elo FLOAT,
  opponent_avg_elo FLOAT,
  won BOOLEAN,
  total_matches_played INT
)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  expected FLOAT;
  actual FLOAT;
  new_elo FLOAT;
  k_factor FLOAT;
BEGIN
  expected := 1.0 / (1.0 + POWER(10, (opponent_avg_elo - current_elo) / 400.0));
  actual := CASE WHEN won THEN 1.0 ELSE 0.0 END;
  
  IF total_matches_played < 10 THEN
    k_factor := 64; 
  ELSE
    k_factor := 32;
  END IF;
  
  new_elo := current_elo + k_factor * (actual - expected);
  
  RETURN GREATEST(new_elo, 100);
END;
$$;

-- Fix update_match_elos function (from 011_fix_calculate_new_elo_ambiguity.sql)
CREATE OR REPLACE FUNCTION update_match_elos(match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_record matches%ROWTYPE;
  player1_elo FLOAT;
  player2_elo FLOAT;
  player3_elo FLOAT;
  player4_elo FLOAT;
  player1_matches INTEGER;
  player2_matches INTEGER;
  player3_matches INTEGER;
  player4_matches INTEGER;
  team1_avg_elo FLOAT;
  team2_avg_elo FLOAT;
  new_elo1 FLOAT;
  new_elo2 FLOAT;
  new_elo3 FLOAT;
  new_elo4 FLOAT;
  team1_won BOOLEAN;
  elo_changes_result JSONB;
BEGIN
  SELECT * INTO match_record FROM matches WHERE id = match_id;
  
  SELECT elo_score, matches_played INTO player1_elo, player1_matches 
  FROM players WHERE id = match_record.player_1_id;
  
  SELECT elo_score, matches_played INTO player2_elo, player2_matches 
  FROM players WHERE id = match_record.player_2_id;
  
  SELECT elo_score, matches_played INTO player3_elo, player3_matches 
  FROM players WHERE id = match_record.player_3_id;
  
  SELECT elo_score, matches_played INTO player4_elo, player4_matches 
  FROM players WHERE id = match_record.player_4_id;
  
  team1_avg_elo := (player1_elo + player2_elo) / 2;
  team2_avg_elo := (player3_elo + player4_elo) / 2;
  team1_won := match_record.winner_team = 1;
  
  new_elo1 := calculate_new_elo(player1_elo, team2_avg_elo, team1_won, player1_matches);
  new_elo2 := calculate_new_elo(player2_elo, team2_avg_elo, team1_won, player2_matches);
  new_elo3 := calculate_new_elo(player3_elo, team1_avg_elo, NOT team1_won, player3_matches);
  new_elo4 := calculate_new_elo(player4_elo, team1_avg_elo, NOT team1_won, player4_matches);
  
  UPDATE players SET 
    elo_score = new_elo1,
    category_label = get_category_from_elo(new_elo1),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = match_record.player_1_id;
  
  UPDATE players SET 
    elo_score = new_elo2,
    category_label = get_category_from_elo(new_elo2),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = match_record.player_2_id;
  
  UPDATE players SET 
    elo_score = new_elo3,
    category_label = get_category_from_elo(new_elo3),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN NOT team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = match_record.player_3_id;
  
  UPDATE players SET 
    elo_score = new_elo4,
    category_label = get_category_from_elo(new_elo4),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN NOT team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = match_record.player_4_id;
  
  UPDATE profiles SET 
    elo_score = new_elo1,
    category_label = get_category_from_elo(new_elo1),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_1_id AND profile_id IS NOT NULL);
  
  UPDATE profiles SET 
    elo_score = new_elo2,
    category_label = get_category_from_elo(new_elo2),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_2_id AND profile_id IS NOT NULL);
  
  UPDATE profiles SET 
    elo_score = new_elo3,
    category_label = get_category_from_elo(new_elo3),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN NOT team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_3_id AND profile_id IS NOT NULL);
  
  UPDATE profiles SET 
    elo_score = new_elo4,
    category_label = get_category_from_elo(new_elo4),
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN NOT team1_won THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_4_id AND profile_id IS NOT NULL);
  
  elo_changes_result := jsonb_build_object(
    'player_1', jsonb_build_object('before', player1_elo, 'after', new_elo1, 'change', new_elo1 - player1_elo),
    'player_2', jsonb_build_object('before', player2_elo, 'after', new_elo2, 'change', new_elo2 - player2_elo),
    'player_3', jsonb_build_object('before', player3_elo, 'after', new_elo3, 'change', new_elo3 - player3_elo),
    'player_4', jsonb_build_object('before', player4_elo, 'after', new_elo4, 'change', new_elo4 - player4_elo)
  );
  
  UPDATE matches SET elo_changes = elo_changes_result WHERE id = match_id;
  
  RETURN elo_changes_result;
END;
$$;

-- Fix create_club_with_owner function (from 022_clubs_and_tournaments.sql)
CREATE OR REPLACE FUNCTION create_club_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  INSERT INTO clubs (name, slug, description, city, province, is_public, created_by)
  VALUES (p_name, p_slug, p_description, p_city, p_province, p_is_public, v_user_id)
  RETURNING id INTO v_club_id;
  
  INSERT INTO club_memberships (club_id, profile_id, role)
  VALUES (v_club_id, v_user_id, 'owner');
  
  RETURN v_club_id;
END;
$$;

-- Fix invite_club_staff function (from 025_club_staff_invitations.sql)
CREATE OR REPLACE FUNCTION invite_club_staff(
  p_club_id UUID,
  p_email TEXT,
  p_role club_role DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_invitation_id UUID;
  v_existing_membership UUID;
  v_existing_profile UUID;
  v_token TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM club_memberships cm
    WHERE cm.club_id = p_club_id
    AND cm.profile_id = v_user_id
    AND cm.role IN ('owner', 'admin')
    AND cm.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Only club owners and admins can invite staff';
  END IF;
  
  SELECT cm.id INTO v_existing_membership
  FROM club_memberships cm
  JOIN profiles p ON p.id = cm.profile_id
  WHERE cm.club_id = p_club_id
  AND p.email = p_email
  AND cm.is_active = TRUE;
  
  IF v_existing_membership IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este usuario ya es miembro del club'
    );
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM club_staff_invitations
    WHERE club_id = p_club_id
    AND email = p_email
    AND status = 'pending'
    AND expires_at > NOW()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya existe una invitación pendiente para este email'
    );
  END IF;
  
  SELECT id INTO v_existing_profile
  FROM profiles
  WHERE email = p_email;
  
  v_token := encode(gen_random_bytes(16), 'hex');
  
  INSERT INTO club_staff_invitations (
    club_id,
    email,
    role,
    invited_by,
    invite_token,
    profile_id
  )
  VALUES (
    p_club_id,
    p_email,
    p_role,
    v_user_id,
    v_token,
    v_existing_profile
  )
  RETURNING id INTO v_invitation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'user_exists', v_existing_profile IS NOT NULL
  );
END;
$$;

-- Fix accept_club_staff_invitation function (from 025_club_staff_invitations.sql)
CREATE OR REPLACE FUNCTION accept_club_staff_invitation(
  p_token TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation club_staff_invitations%ROWTYPE;
  v_user_id UUID;
  v_profile_email TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;
  
  SELECT * INTO v_invitation
  FROM club_staff_invitations
  WHERE invite_token = p_token;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitación no encontrada'
    );
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta invitación ya fue respondida'
    );
  END IF;
  
  IF v_invitation.expires_at < NOW() THEN
    UPDATE club_staff_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta invitación ha expirado'
    );
  END IF;
  
  SELECT email INTO v_profile_email
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_profile_email IS NOT NULL AND v_profile_email != v_invitation.email THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El email de tu cuenta no coincide con la invitación'
    );
  END IF;
  
  INSERT INTO club_memberships (
    club_id,
    profile_id,
    role,
    is_active
  )
  VALUES (
    v_invitation.club_id,
    v_user_id,
    v_invitation.role,
    TRUE
  )
  ON CONFLICT (club_id, profile_id) DO UPDATE
  SET 
    role = v_invitation.role,
    is_active = TRUE,
    joined_at = NOW();
  
  UPDATE club_staff_invitations
  SET 
    status = 'accepted',
    profile_id = v_user_id,
    responded_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'club_id', v_invitation.club_id,
    'role', v_invitation.role
  );
END;
$$;

-- Fix get_club_staff_invitation_by_token function (from 025_club_staff_invitations.sql)
CREATE OR REPLACE FUNCTION get_club_staff_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  club_id UUID,
  club_name TEXT,
  email TEXT,
  role club_role,
  status TEXT,
  invite_token TEXT,
  expires_at TIMESTAMPTZ,
  invited_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csi.id,
    csi.club_id,
    c.name as club_name,
    csi.email,
    csi.role,
    csi.status,
    csi.invite_token,
    csi.expires_at,
    COALESCE(p.full_name, p.username, 'Usuario') as invited_by_name
  FROM club_staff_invitations csi
  JOIN clubs c ON c.id = csi.club_id
  JOIN profiles p ON p.id = csi.invited_by
  WHERE csi.invite_token = p_token;
END;
$$;

-- Fix get_initial_elo function (from 000_initial_schema.sql)
CREATE OR REPLACE FUNCTION get_initial_elo(category player_category)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE category
    WHEN '8va' THEN 1000
    WHEN '7ma' THEN 1200
    WHEN '6ta' THEN 1400
    WHEN '5ta' THEN 1600
    WHEN '4ta' THEN 1800
    WHEN '3ra' THEN 2000
    WHEN '2da' THEN 2200
    WHEN '1ra' THEN 2400
  END;
END;
$$;

-- Fix get_category_from_elo function (from 000_initial_schema.sql)
CREATE OR REPLACE FUNCTION get_category_from_elo(elo FLOAT)
RETURNS player_category
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE
    WHEN elo < 1100 THEN '8va'
    WHEN elo < 1300 THEN '7ma'
    WHEN elo < 1500 THEN '6ta'
    WHEN elo < 1700 THEN '5ta'
    WHEN elo < 1900 THEN '4ta'
    WHEN elo < 2100 THEN '3ra'
    WHEN elo < 2300 THEN '2da'
    ELSE '1ra'
  END;
END;
$$;

-- Fix calculate_expected_score function (from 000_initial_schema.sql)
CREATE OR REPLACE FUNCTION calculate_expected_score(player_elo FLOAT, opponent_elo FLOAT)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN 1.0 / (1.0 + POWER(10, (opponent_elo - player_elo) / 400.0));
END;
$$;

-- Fix get_invitation_by_token function (from 001_add_features.sql)
CREATE OR REPLACE FUNCTION get_invitation_by_token(token TEXT)
RETURNS TABLE (
  id UUID,
  match_id UUID,
  invited_player_id UUID,
  invited_profile_id UUID,
  status TEXT,
  invite_token TEXT,
  match_date DATE,
  venue TEXT,
  created_by_name TEXT,
  player_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.match_id,
    mi.invited_player_id,
    mi.invited_profile_id,
    mi.status,
    mi.invite_token,
    m.match_date,
    m.venue,
    COALESCE(p.full_name, p.username, 'Usuario') as created_by_name,
    ARRAY[
      (SELECT display_name FROM players WHERE id = m.player_1_id),
      (SELECT display_name FROM players WHERE id = m.player_2_id),
      (SELECT display_name FROM players WHERE id = m.player_3_id),
      (SELECT display_name FROM players WHERE id = m.player_4_id)
    ] as player_names
  FROM match_invitations mi
  JOIN matches m ON m.id = mi.match_id
  JOIN profiles p ON p.id = m.created_by
  WHERE mi.invite_token = token;
END;
$$;

-- Fix reverse_match_elos function (from 001_add_features.sql)
CREATE OR REPLACE FUNCTION reverse_match_elos(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_record matches%ROWTYPE;
  elo_changes JSONB;
BEGIN
  SELECT * INTO match_record FROM matches WHERE id = p_match_id;
  
  IF match_record IS NULL THEN
    RETURN;
  END IF;
  
  elo_changes := match_record.elo_changes;
  
  IF elo_changes IS NULL THEN
    RETURN;
  END IF;
  
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0))
  WHERE id = match_record.player_1_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_1_id AND profile_id IS NOT NULL);
  
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0))
  WHERE id = match_record.player_2_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_2_id AND profile_id IS NOT NULL);
  
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0))
  WHERE id = match_record.player_3_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_3_id AND profile_id IS NOT NULL);
  
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0))
  WHERE id = match_record.player_4_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_4_id AND profile_id IS NOT NULL);
  
  UPDATE matches SET elo_changes = NULL WHERE id = p_match_id;
END;
$$;

-- Fix handle_new_user function (from 008_change_default_category_to_8va.sql)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
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
  
  INSERT INTO profiles (id, username, full_name, avatar_url, elo_score, category_label)
  VALUES (
    NEW.id,
    v_username,
    v_full_name,
    v_avatar_url,
    1400,
    '8va'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at function (from 000_initial_schema.sql)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix handle_new_match function (from 021_simplify_elo_system.sql)
CREATE OR REPLACE FUNCTION handle_new_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_match_elos(NEW.id);
  RETURN NEW;
END;
$$;

-- Fix respond_to_invitation function (from 001_add_features.sql)
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_token TEXT,
  p_response TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation match_invitations%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_invitation 
  FROM match_invitations 
  WHERE invite_token = p_token;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitación no encontrada');
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta invitación ya fue respondida');
  END IF;
  
  UPDATE match_invitations
  SET 
    status = p_response,
    responded_at = NOW(),
    invited_profile_id = COALESCE(p_user_id, invited_profile_id)
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'match_id', v_invitation.match_id,
    'status', p_response
  );
END;
$$;

-- Fix claim_ghost_players function (from 007_add_ghost_player_claiming.sql)
CREATE OR REPLACE FUNCTION claim_ghost_players(
  p_user_id UUID,
  p_ghost_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ghost_id UUID;
  claimed_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  FOREACH ghost_id IN ARRAY p_ghost_player_ids
  LOOP
    IF EXISTS (
      SELECT 1 FROM players 
      WHERE id = ghost_id 
      AND is_ghost = TRUE 
      AND claimed_by_profile_id IS NULL
    ) THEN
      UPDATE players
      SET claimed_by_profile_id = p_user_id
      WHERE id = ghost_id;
      
      claimed_count := claimed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'claimed_count', claimed_count
  );
END;
$$;

-- Fix search_claimable_ghost_players_with_matches function (from 007_add_ghost_player_claiming.sql)
CREATE OR REPLACE FUNCTION search_claimable_ghost_players_with_matches(
  p_search_name TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  elo_score FLOAT,
  category_label player_category,
  matches_played INTEGER,
  matches_won INTEGER,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  matches JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.elo_score,
    p.category_label,
    p.matches_played,
    p.matches_won,
    COALESCE(prof.full_name, prof.username, 'Usuario') as created_by_name,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'match_date', m.match_date,
            'venue', m.venue,
            'score_sets', m.score_sets,
            'winner_team', m.winner_team,
            'player_1_name', p1.display_name,
            'player_2_name', p2.display_name,
            'player_3_name', p3.display_name,
            'player_4_name', p4.display_name,
            'player_position', CASE 
              WHEN m.player_1_id = p.id THEN 1
              WHEN m.player_2_id = p.id THEN 2
              WHEN m.player_3_id = p.id THEN 3
              WHEN m.player_4_id = p.id THEN 4
              ELSE 0
            END
          ) ORDER BY m.match_date DESC
        )
        FROM matches m
        LEFT JOIN players p1 ON m.player_1_id = p1.id
        LEFT JOIN players p2 ON m.player_2_id = p2.id
        LEFT JOIN players p3 ON m.player_3_id = p3.id
        LEFT JOIN players p4 ON m.player_4_id = p4.id
        WHERE (m.player_1_id = p.id OR m.player_2_id = p.id OR m.player_3_id = p.id OR m.player_4_id = p.id)
        LIMIT 10
      ),
      '[]'::jsonb
    ) as matches
  FROM players p
  LEFT JOIN profiles prof ON p.created_by_user_id = prof.id
  WHERE p.is_ghost = TRUE
    AND p.claimed_by_profile_id IS NULL
    AND LOWER(p.display_name) LIKE LOWER('%' || p_search_name || '%')
    AND p.created_by_user_id != p_user_id
  ORDER BY p.display_name
  LIMIT 20;
END;
$$;

-- Fix unclaim_ghost_players function (from 007_add_ghost_player_claiming.sql)
CREATE OR REPLACE FUNCTION unclaim_ghost_players(
  p_user_id UUID,
  p_ghost_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unclaimed_count INTEGER := 0;
BEGIN
  UPDATE players
  SET claimed_by_profile_id = NULL
  WHERE id = ANY(p_ghost_player_ids)
    AND claimed_by_profile_id = p_user_id;
  
  GET DIAGNOSTICS unclaimed_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'unclaimed_count', unclaimed_count
  );
END;
$$;

-- Fix handle_new_profile function (from 020_chronological_elo_recalculation.sql)
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial_elo FLOAT;
BEGIN
  v_initial_elo := COALESCE(NEW.elo_score, get_initial_elo(COALESCE(NEW.category_label, '8va')));
  
  INSERT INTO players (profile_id, display_name, is_ghost, elo_score, category_label, initial_elo)
  VALUES (
    NEW.id,
    COALESCE(NEW.full_name, NEW.username, 'Player'),
    FALSE,
    v_initial_elo,
    COALESCE(NEW.category_label, '8va'),
    v_initial_elo
  )
  ON CONFLICT (profile_id) DO NOTHING;
  
  IF NEW.initial_elo IS NULL THEN
    UPDATE profiles SET initial_elo = v_initial_elo WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating player for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Preserve existing grants and comments
GRANT EXECUTE ON FUNCTION link_ghost_player_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION link_ghost_player_to_user TO anon;
COMMENT ON FUNCTION link_ghost_player_to_user IS 'Links a ghost player to a user account, transferring ELO and stats to the new user';

COMMENT ON FUNCTION calculate_true_initial_elo IS 'Calculates true initial ELO by reversing all match changes. Used for data recovery.';

GRANT EXECUTE ON FUNCTION create_club_account TO authenticated;

GRANT EXECUTE ON FUNCTION create_club_with_owner TO authenticated;

GRANT EXECUTE ON FUNCTION invite_club_staff TO authenticated;
GRANT EXECUTE ON FUNCTION accept_club_staff_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_club_staff_invitation TO anon;
GRANT EXECUTE ON FUNCTION get_club_staff_invitation_by_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_club_staff_invitation_by_token TO anon;

GRANT EXECUTE ON FUNCTION get_invitation_by_token TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_token TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_invitation TO anon;
GRANT EXECUTE ON FUNCTION respond_to_invitation TO authenticated;

GRANT EXECUTE ON FUNCTION reverse_match_elos TO authenticated;

