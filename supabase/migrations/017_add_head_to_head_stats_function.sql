-- ============================================
-- Vibo - Head-to-Head Stats Function
-- ============================================
-- Function to calculate head-to-head statistics between two players
-- Analyzes match history where both players faced each other (opposite teams)
-- ============================================

-- Create composite indexes to optimize head-to-head queries
-- These indexes help with queries that filter by multiple player columns
CREATE INDEX IF NOT EXISTS idx_matches_team1_players ON matches(player_1_id, player_2_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_players ON matches(player_3_id, player_4_id);
CREATE INDEX IF NOT EXISTS idx_matches_date_winner ON matches(match_date DESC, winner_team);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_head_to_head_stats(UUID, UUID);

CREATE OR REPLACE FUNCTION get_head_to_head_stats(
  player_a_id UUID,
  player_b_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_matches_count INTEGER := 0;
  player_a_wins_count INTEGER := 0;
  player_b_wins_count INTEGER := 0;
  last_match_date_value DATE := NULL;
  first_match_date_value DATE := NULL;
  current_streak_value INTEGER := 0;
BEGIN
  -- Validate that both player IDs are provided and different
  IF player_a_id IS NULL OR player_b_id IS NULL THEN
    RETURN jsonb_build_object(
      'total_matches', 0,
      'player_a_wins', 0,
      'player_b_wins', 0,
      'last_match_date', NULL,
      'first_match_date', NULL,
      'current_streak', 0,
      'error', 'Both player IDs are required'
    );
  END IF;

  IF player_a_id = player_b_id THEN
    RETURN jsonb_build_object(
      'total_matches', 0,
      'player_a_wins', 0,
      'player_b_wins', 0,
      'last_match_date', NULL,
      'first_match_date', NULL,
      'current_streak', 0,
      'error', 'Player A and Player B must be different'
    );
  END IF;

  -- Find all matches where both players participated in opposite teams
  -- Case 1: Player A in Team 1 (player_1 or player_2) AND Player B in Team 2 (player_3 or player_4)
  -- Case 2: Player A in Team 2 (player_3 or player_4) AND Player B in Team 1 (player_1 or player_2)
  WITH head_to_head_matches AS (
    -- Case 1: Player A in Team 1, Player B in Team 2
    SELECT 
      m.id,
      m.match_date,
      m.winner_team,
      -- Player A wins if Team 1 wins
      CASE WHEN m.winner_team = 1 THEN 1 ELSE 0 END AS player_a_won
    FROM matches m
    WHERE (
      (m.player_1_id = player_a_id OR m.player_2_id = player_a_id)
      AND (m.player_3_id = player_b_id OR m.player_4_id = player_b_id)
    )
    
    UNION ALL
    
    -- Case 2: Player A in Team 2, Player B in Team 1
    SELECT 
      m.id,
      m.match_date,
      m.winner_team,
      -- Player A wins if Team 2 wins
      CASE WHEN m.winner_team = 2 THEN 1 ELSE 0 END AS player_a_won
    FROM matches m
    WHERE (
      (m.player_3_id = player_a_id OR m.player_4_id = player_a_id)
      AND (m.player_1_id = player_b_id OR m.player_2_id = player_b_id)
    )
  ),
  ordered_matches AS (
    SELECT 
      htm.match_date,
      htm.player_a_won,
      ROW_NUMBER() OVER (ORDER BY htm.match_date DESC) AS rn
    FROM head_to_head_matches htm
  ),
  streak_calculation AS (
    SELECT 
      -- Calculate streak: count consecutive wins/losses from most recent match
      CASE 
        WHEN (SELECT COUNT(*) FROM ordered_matches) = 0 THEN 0
        ELSE (
          -- Get the result of the most recent match
          WITH last_result AS (
            SELECT player_a_won FROM ordered_matches WHERE rn = 1 LIMIT 1
          )
          SELECT 
            COUNT(*)::INTEGER * 
            CASE WHEN (SELECT player_a_won FROM last_result) = 1 THEN 1 ELSE -1 END
          FROM ordered_matches om
          CROSS JOIN last_result lr
          WHERE om.rn <= (
            -- Find the position where result changes (or end of matches)
            SELECT COALESCE(
              MIN(om2.rn),
              (SELECT MAX(rn) FROM ordered_matches)
            )
            FROM ordered_matches om2
            CROSS JOIN last_result lr2
            WHERE om2.rn > 1
              AND om2.player_a_won != lr2.player_a_won
          )
          AND om.player_a_won = lr.player_a_won
        )
      END AS streak
    FROM ordered_matches
    WHERE rn = 1
  )
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(htm.player_a_won)::INTEGER, 0),
    COALESCE((COUNT(*) - COALESCE(SUM(htm.player_a_won), 0))::INTEGER, 0),
    MAX(htm.match_date),
    MIN(htm.match_date),
    COALESCE((SELECT streak FROM streak_calculation), 0)
  INTO 
    total_matches_count,
    player_a_wins_count,
    player_b_wins_count,
    last_match_date_value,
    first_match_date_value,
    current_streak_value
  FROM head_to_head_matches htm;

  -- Return results as JSONB
  RETURN jsonb_build_object(
    'total_matches', COALESCE(total_matches_count, 0),
    'player_a_wins', COALESCE(player_a_wins_count, 0),
    'player_b_wins', COALESCE(player_b_wins_count, 0),
    'last_match_date', last_match_date_value,
    'first_match_date', first_match_date_value,
    'current_streak', COALESCE(current_streak_value, 0)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_head_to_head_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_head_to_head_stats(UUID, UUID) TO anon;

