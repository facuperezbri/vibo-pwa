-- ============================================
-- Add Ghost Player Claiming Functionality
-- ============================================
-- Allows users to claim ghost players by name to link historical matches
-- ============================================

-- Agregar campo para vincular ghost players a usuarios reales
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS claimed_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Crear índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_players_claimed_by ON players(claimed_by_profile_id);

-- Función para buscar ghost players con sus partidos
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
) AS $$
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
    -- Obtener los últimos 10 partidos del ghost player como JSONB
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para reclamar ghost players
CREATE OR REPLACE FUNCTION claim_ghost_players(
  p_user_id UUID,
  p_ghost_player_ids UUID[]
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para desvincular ghost players
CREATE OR REPLACE FUNCTION unclaim_ghost_players(
  p_user_id UUID,
  p_ghost_player_ids UUID[]
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

