-- ============================================
-- Vibo - Fix get_match_by_id Function
-- ============================================
-- Fixes the function to properly handle return types and empty results
-- ============================================

-- Drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS get_match_by_id(UUID);

CREATE OR REPLACE FUNCTION get_match_by_id(match_id UUID)
RETURNS TABLE (
  id UUID,
  match_date TIMESTAMPTZ,
  venue TEXT,
  score_sets JSONB,
  winner_team SMALLINT,
  match_config JSONB,
  created_by UUID,
  player_1_id UUID,
  player_2_id UUID,
  player_3_id UUID,
  player_4_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.match_date,
    m.venue,
    m.score_sets,
    m.winner_team,
    COALESCE(m.match_config, '{}'::jsonb) as match_config,
    m.created_by,
    m.player_1_id,
    m.player_2_id,
    m.player_3_id,
    m.player_4_id
  FROM matches m
  WHERE m.id = match_id;
END;
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_match_by_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_match_by_id(UUID) TO authenticated;

