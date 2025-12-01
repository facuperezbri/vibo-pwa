-- ============================================
-- Vibo - Add Gender to Ranking Views
-- ============================================
-- Adds gender field to ranking views for filtering
-- ============================================

-- Drop and recreate view to add gender column
DROP VIEW IF EXISTS global_ranking CASCADE;

CREATE VIEW global_ranking AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.elo_score,
  p.category_label,
  p.matches_played,
  p.matches_won,
  p.gender,
  CASE WHEN p.matches_played > 0 
    THEN ROUND((p.matches_won::numeric / p.matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_rate,
  RANK() OVER (ORDER BY p.elo_score DESC) as rank
FROM profiles p
WHERE p.matches_played > 0
ORDER BY p.elo_score DESC;

-- Re-grant permissions
GRANT SELECT ON global_ranking TO authenticated;

