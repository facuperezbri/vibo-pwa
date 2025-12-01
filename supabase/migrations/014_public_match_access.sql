-- ============================================
-- Vibo - Public Match Access for Sharing
-- ============================================
-- Allows public access to matches via share links
-- ============================================

-- Create function to get match by ID (bypasses RLS for public sharing)
CREATE OR REPLACE FUNCTION get_match_by_id(match_id UUID)
RETURNS TABLE (
  id UUID,
  match_date TIMESTAMPTZ,
  venue TEXT,
  score_sets JSONB,
  winner_team INTEGER,
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
    m.match_config,
    m.created_by,
    m.player_1_id,
    m.player_2_id,
    m.player_3_id,
    m.player_4_id
  FROM matches m
  WHERE m.id = match_id;
  
  -- If no rows returned, return empty result (don't raise error)
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_match_by_id TO anon;
GRANT EXECUTE ON FUNCTION get_match_by_id TO authenticated;

-- Also allow public read access to players for shared matches
-- This allows viewing player names in shared matches
DROP POLICY IF EXISTS "Public can view players in shared matches" ON players;
CREATE POLICY "Public can view players in shared matches"
  ON players FOR SELECT
  USING (true); -- Allow viewing all players for shared match display

