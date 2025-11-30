-- Fix calculate_new_elo function ambiguity
-- This migration removes all old versions of calculate_new_elo to avoid conflicts
-- The new version uses total_matches_played (INT) instead of k_factor (FLOAT)

-- Drop all possible versions of the old calculate_new_elo function
DROP FUNCTION IF EXISTS calculate_new_elo(FLOAT, FLOAT, BOOLEAN, FLOAT);
DROP FUNCTION IF EXISTS calculate_new_elo(FLOAT, FLOAT, BOOLEAN);

-- Ensure the correct version exists (with total_matches_played INT parameter)
CREATE OR REPLACE FUNCTION calculate_new_elo(
  current_elo FLOAT,
  opponent_avg_elo FLOAT,
  won BOOLEAN,
  total_matches_played INT
)
RETURNS FLOAT AS $$
DECLARE
  expected FLOAT;
  actual FLOAT;
  new_elo FLOAT;
  k_factor FLOAT;
BEGIN
  -- 1. Calcular probabilidad de victoria
  expected := 1.0 / (1.0 + POWER(10, (opponent_avg_elo - current_elo) / 400.0));
  
  -- 2. Resultado real
  actual := CASE WHEN won THEN 1.0 ELSE 0.0 END;
  
  -- 3. Determinar K-Factor (Aceleración)
  -- Si jugó menos de 10 partidos, K es 64 (doble velocidad). Si no, es 32.
  IF total_matches_played < 10 THEN
    k_factor := 64; 
  ELSE
    k_factor := 32;
  END IF;
  
  -- 4. Calcular nuevo ELO
  new_elo := current_elo + k_factor * (actual - expected);
  
  -- Mínimo absoluto para no romper la escala
  RETURN GREATEST(new_elo, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

