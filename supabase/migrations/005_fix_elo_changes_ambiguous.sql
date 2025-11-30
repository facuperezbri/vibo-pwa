-- Fix ambiguous column reference in update_match_elos function
CREATE OR REPLACE FUNCTION update_match_elos(match_id UUID)
RETURNS JSONB AS $$
DECLARE
  match_record matches%ROWTYPE;
  player1_elo FLOAT;
  player2_elo FLOAT;
  player3_elo FLOAT;
  player4_elo FLOAT;
  team1_avg_elo FLOAT;
  team2_avg_elo FLOAT;
  new_elo1 FLOAT;
  new_elo2 FLOAT;
  new_elo3 FLOAT;
  new_elo4 FLOAT;
  team1_won BOOLEAN;
  elo_changes_result JSONB;
BEGIN
  -- Get match details
  SELECT * INTO match_record FROM matches WHERE id = match_id;
  
  -- Get current ELOs
  SELECT elo_score INTO player1_elo FROM players WHERE id = match_record.player_1_id;
  SELECT elo_score INTO player2_elo FROM players WHERE id = match_record.player_2_id;
  SELECT elo_score INTO player3_elo FROM players WHERE id = match_record.player_3_id;
  SELECT elo_score INTO player4_elo FROM players WHERE id = match_record.player_4_id;
  
  -- Calculate team averages
  team1_avg_elo := (player1_elo + player2_elo) / 2;
  team2_avg_elo := (player3_elo + player4_elo) / 2;
  
  -- Determine winner
  team1_won := match_record.winner_team = 1;
  
  -- Calculate new ELOs
  new_elo1 := calculate_new_elo(player1_elo, team2_avg_elo, team1_won);
  new_elo2 := calculate_new_elo(player2_elo, team2_avg_elo, team1_won);
  new_elo3 := calculate_new_elo(player3_elo, team1_avg_elo, NOT team1_won);
  new_elo4 := calculate_new_elo(player4_elo, team1_avg_elo, NOT team1_won);
  
  -- Update players table
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
  
  -- Also sync to profiles if players are linked
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
  
  -- Build ELO changes JSON
  elo_changes_result := jsonb_build_object(
    'player_1', jsonb_build_object('before', player1_elo, 'after', new_elo1, 'change', new_elo1 - player1_elo),
    'player_2', jsonb_build_object('before', player2_elo, 'after', new_elo2, 'change', new_elo2 - player2_elo),
    'player_3', jsonb_build_object('before', player3_elo, 'after', new_elo3, 'change', new_elo3 - player3_elo),
    'player_4', jsonb_build_object('before', player4_elo, 'after', new_elo4, 'change', new_elo4 - player4_elo)
  );
  
  -- Store ELO changes in match record (fix ambiguous reference)
  UPDATE matches SET elo_changes = elo_changes_result WHERE id = match_id;
  
  RETURN elo_changes_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

