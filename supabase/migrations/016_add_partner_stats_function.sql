-- ============================================
-- Padelio - Partner Stats Function
-- ============================================
-- Function to calculate partner statistics (Química de Pareja)
-- Analyzes match history and calculates win/loss stats with each partner
-- ============================================

CREATE OR REPLACE FUNCTION get_player_partner_stats(target_player_id UUID)
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_avatar_url TEXT,
  total_matches INTEGER,
  won_matches INTEGER,
  lost_matches INTEGER,
  win_rate NUMERIC,
  last_match_date DATE,
  current_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH partner_matches AS (
    -- Case 1: Target player is player_1, partner is player_2 (Team 1)
    SELECT 
      m.player_2_id AS partner_id,
      m.match_date,
      m.winner_team,
      CASE WHEN m.winner_team = 1 THEN 1 ELSE 0 END AS won
    FROM matches m
    WHERE m.player_1_id = target_player_id
    
    UNION ALL
    
    -- Case 2: Target player is player_2, partner is player_1 (Team 1)
    SELECT 
      m.player_1_id AS partner_id,
      m.match_date,
      m.winner_team,
      CASE WHEN m.winner_team = 1 THEN 1 ELSE 0 END AS won
    FROM matches m
    WHERE m.player_2_id = target_player_id
    
    UNION ALL
    
    -- Case 3: Target player is player_3, partner is player_4 (Team 2)
    SELECT 
      m.player_4_id AS partner_id,
      m.match_date,
      m.winner_team,
      CASE WHEN m.winner_team = 2 THEN 1 ELSE 0 END AS won
    FROM matches m
    WHERE m.player_3_id = target_player_id
    
    UNION ALL
    
    -- Case 4: Target player is player_4, partner is player_3 (Team 2)
    SELECT 
      m.player_3_id AS partner_id,
      m.match_date,
      m.winner_team,
      CASE WHEN m.winner_team = 2 THEN 1 ELSE 0 END AS won
    FROM matches m
    WHERE m.player_4_id = target_player_id
  ),
  partner_matches_ordered AS (
    SELECT 
      pm.partner_id,
      pm.match_date,
      pm.won,
      ROW_NUMBER() OVER (PARTITION BY pm.partner_id ORDER BY pm.match_date DESC) AS rn
    FROM partner_matches pm
  ),
  streak_calculation AS (
    SELECT 
      pmo.partner_id,
      pmo.won AS last_result,
      -- Calculate streak: count consecutive wins/losses from most recent match
      (SELECT COUNT(*)::INTEGER
       FROM partner_matches_ordered pmo2
       WHERE pmo2.partner_id = pmo.partner_id
         AND pmo2.rn <= (
           -- Find the position where result changes
           SELECT COALESCE(MIN(pmo3.rn), 999999)
           FROM partner_matches_ordered pmo3
           WHERE pmo3.partner_id = pmo.partner_id
             AND pmo3.rn > 1
             AND pmo3.won != pmo.won
         )
       AND pmo2.won = pmo.won) AS streak_count
    FROM partner_matches_ordered pmo
    WHERE pmo.rn = 1
  ),
  partner_stats AS (
    SELECT 
      pm.partner_id,
      COUNT(*)::INTEGER AS total_matches,
      SUM(pm.won)::INTEGER AS won_matches,
      (COUNT(*) - SUM(pm.won))::INTEGER AS lost_matches,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((SUM(pm.won)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0 
      END AS win_rate,
      MAX(pm.match_date) AS last_match_date
    FROM partner_matches pm
    GROUP BY pm.partner_id
  )
  SELECT 
    ps.partner_id,
    COALESCE(p.display_name, 'Unknown') AS partner_name,
    pr.avatar_url AS partner_avatar_url,
    ps.total_matches,
    ps.won_matches,
    ps.lost_matches,
    ps.win_rate,
    ps.last_match_date,
    COALESCE(
      CASE 
        WHEN sc.last_result = 1 THEN sc.streak_count
        WHEN sc.last_result = 0 THEN -sc.streak_count
        ELSE 0
      END,
      0
    )::INTEGER AS current_streak
  FROM partner_stats ps
  LEFT JOIN players p ON p.id = ps.partner_id
  LEFT JOIN profiles pr ON pr.id = p.profile_id
  LEFT JOIN streak_calculation sc ON sc.partner_id = ps.partner_id
  ORDER BY ps.total_matches DESC, ps.win_rate DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_player_partner_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_partner_stats(UUID) TO anon;

