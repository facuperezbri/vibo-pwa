-- ============================================
-- Vibo - Simplify ELO System
-- ============================================
-- This migration:
-- 1. Removes retroactive ELO recalculation
-- 2. Uses fast path (instant calculation) for ALL matches
-- 3. Removes UPDATE trigger (matches cannot be edited)
-- 4. Simplifies DELETE to just revert stats (no recalc)
-- ============================================

-- ============================================
-- STEP 1: Simplify INSERT trigger (always fast path)
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Always use fast path - calculate ELO for this match only
  -- No retroactive recalculation regardless of match_date
  PERFORM update_match_elos(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it uses new function
DROP TRIGGER IF EXISTS on_match_created ON matches;
CREATE TRIGGER on_match_created
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION handle_new_match();

-- ============================================
-- STEP 2: Remove UPDATE trigger
-- Matches should not be editable after creation
-- ============================================

DROP TRIGGER IF EXISTS on_match_updated ON matches;
DROP FUNCTION IF EXISTS handle_match_update();

-- ============================================
-- STEP 3: Simplify DELETE trigger
-- Instead of recalculating all ELOs, just revert stats
-- ELO will be slightly "wrong" but acceptable for social app
-- ============================================

CREATE OR REPLACE FUNCTION handle_match_delete()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate DELETE trigger (BEFORE DELETE to access OLD values)
DROP TRIGGER IF EXISTS on_match_deleted ON matches;
CREATE TRIGGER on_match_deleted
  BEFORE DELETE ON matches
  FOR EACH ROW EXECUTE FUNCTION handle_match_delete();

-- ============================================
-- STEP 4: Keep recalculation functions for admin use only
-- But revoke public access
-- ============================================

-- Revoke public execute on recalculation functions
REVOKE EXECUTE ON FUNCTION recalculate_all_elos() FROM authenticated;
REVOKE EXECUTE ON FUNCTION recalculate_elos_from_date(TIMESTAMPTZ) FROM authenticated;

-- Add comments explaining they're admin-only
COMMENT ON FUNCTION recalculate_all_elos IS 
'ADMIN ONLY - Recalculates ALL player ELOs from scratch.
Use only for data recovery or maintenance via Supabase dashboard.';

COMMENT ON FUNCTION recalculate_elos_from_date IS 
'ADMIN ONLY - Recalculates ELOs from a specific date forward.
Use only for data recovery or maintenance via Supabase dashboard.';

