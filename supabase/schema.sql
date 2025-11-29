-- ============================================
-- PadelTracker - Database Schema
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Category enum for Argentina padel rankings
CREATE TYPE player_category AS ENUM (
  '8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'
);

-- ============================================
-- TABLES
-- ============================================

-- 1. Profiles Table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  elo_score FLOAT DEFAULT 1400,
  category_label player_category DEFAULT '6ta',
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Players Table (match participants - can be real users or ghosts)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  is_ghost BOOLEAN DEFAULT FALSE,
  elo_score FLOAT DEFAULT 1400,
  category_label player_category DEFAULT '6ta',
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ghost_must_have_creator CHECK (
    (is_ghost = FALSE) OR (is_ghost = TRUE AND created_by_user_id IS NOT NULL)
  ),
  CONSTRAINT real_player_must_have_profile CHECK (
    (is_ghost = TRUE) OR (is_ghost = FALSE AND profile_id IS NOT NULL)
  )
);

-- 3. Matches Table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  venue TEXT,
  
  -- Team 1: player_1 and player_2
  player_1_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_2_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  
  -- Team 2: player_3 and player_4
  player_3_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_4_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  
  -- Score stored as JSONB array: [{"team1": 6, "team2": 4}, {"team1": 6, "team2": 2}]
  score_sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Winner: 1 = Team 1 (players 1 & 2), 2 = Team 2 (players 3 & 4)
  winner_team SMALLINT NOT NULL CHECK (winner_team IN (1, 2)),
  
  -- ELO changes stored for history
  elo_changes JSONB DEFAULT '{}'::jsonb,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Match Invitations (for future: invite players to confirm matches)
CREATE TABLE match_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  invited_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  invited_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(match_id, invited_player_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_elo ON profiles(elo_score DESC);
CREATE INDEX idx_profiles_username ON profiles(username);

CREATE INDEX idx_players_profile ON players(profile_id);
CREATE INDEX idx_players_creator ON players(created_by_user_id);
CREATE INDEX idx_players_ghost ON players(is_ghost);
CREATE INDEX idx_players_elo ON players(elo_score DESC);

CREATE INDEX idx_matches_date ON matches(match_date DESC);
CREATE INDEX idx_matches_creator ON matches(created_by);
CREATE INDEX idx_matches_player1 ON matches(player_1_id);
CREATE INDEX idx_matches_player2 ON matches(player_2_id);
CREATE INDEX idx_matches_player3 ON matches(player_3_id);
CREATE INDEX idx_matches_player4 ON matches(player_4_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to map category to initial ELO
CREATE OR REPLACE FUNCTION get_initial_elo(category player_category)
RETURNS FLOAT AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate ELO category from score
CREATE OR REPLACE FUNCTION get_category_from_elo(elo FLOAT)
RETURNS player_category AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate expected score (ELO formula)
CREATE OR REPLACE FUNCTION calculate_expected_score(player_elo FLOAT, opponent_elo FLOAT)
RETURNS FLOAT AS $$
BEGIN
  RETURN 1.0 / (1.0 + POWER(10, (opponent_elo - player_elo) / 400.0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate new ELO after a match
-- K-factor is 32 for all players (can be adjusted)
CREATE OR REPLACE FUNCTION calculate_new_elo(
  current_elo FLOAT,
  opponent_avg_elo FLOAT,
  won BOOLEAN,
  k_factor FLOAT DEFAULT 32
)
RETURNS FLOAT AS $$
DECLARE
  expected FLOAT;
  actual FLOAT;
  new_elo FLOAT;
BEGIN
  expected := calculate_expected_score(current_elo, opponent_avg_elo);
  actual := CASE WHEN won THEN 1.0 ELSE 0.0 END;
  new_elo := current_elo + k_factor * (actual - expected);
  
  -- Minimum ELO of 100
  RETURN GREATEST(new_elo, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update ELO for all players after a match
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
  elo_changes JSONB;
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
  elo_changes := jsonb_build_object(
    'player_1', jsonb_build_object('before', player1_elo, 'after', new_elo1, 'change', new_elo1 - player1_elo),
    'player_2', jsonb_build_object('before', player2_elo, 'after', new_elo2, 'change', new_elo2 - player2_elo),
    'player_3', jsonb_build_object('before', player3_elo, 'after', new_elo3, 'change', new_elo3 - player3_elo),
    'player_4', jsonb_build_object('before', player4_elo, 'after', new_elo4, 'change', new_elo4 - player4_elo)
  );
  
  -- Store ELO changes in match record
  UPDATE matches SET elo_changes = elo_changes WHERE id = match_id;
  
  RETURN elo_changes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: Auto-create player record when profile is created
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO players (profile_id, display_name, is_ghost, elo_score, category_label)
  VALUES (
    NEW.id,
    COALESCE(NEW.full_name, NEW.username, 'Player'),
    FALSE,
    NEW.elo_score,
    NEW.category_label
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- Trigger: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-calculate ELOs after match insert
CREATE OR REPLACE FUNCTION handle_new_match()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_match_elos(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_match_created
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION handle_new_match();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_invitations ENABLE ROW LEVEL SECURITY;

-- PROFILES Policies
-- Anyone can view profiles (for rankings/search)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but just in case)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PLAYERS Policies
-- Users can see:
-- 1. Their own player record (linked via profile_id)
-- 2. Ghost players they created
-- 3. All non-ghost players (for match creation)
CREATE POLICY "Users can view relevant players"
  ON players FOR SELECT
  USING (
    profile_id = auth.uid() OR
    created_by_user_id = auth.uid() OR
    is_ghost = FALSE
  );

-- Users can create ghost players
CREATE POLICY "Users can create ghost players"
  ON players FOR INSERT
  WITH CHECK (
    (is_ghost = TRUE AND created_by_user_id = auth.uid()) OR
    (is_ghost = FALSE AND profile_id = auth.uid())
  );

-- Users can update their own player or ghost players they created
CREATE POLICY "Users can update own or created players"
  ON players FOR UPDATE
  USING (
    profile_id = auth.uid() OR
    created_by_user_id = auth.uid()
  )
  WITH CHECK (
    profile_id = auth.uid() OR
    created_by_user_id = auth.uid()
  );

-- Users can delete ghost players they created
CREATE POLICY "Users can delete own ghost players"
  ON players FOR DELETE
  USING (
    is_ghost = TRUE AND created_by_user_id = auth.uid()
  );

-- MATCHES Policies
-- Users can view matches they participated in or created
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  USING (
    created_by = auth.uid() OR
    player_1_id IN (SELECT id FROM players WHERE profile_id = auth.uid()) OR
    player_2_id IN (SELECT id FROM players WHERE profile_id = auth.uid()) OR
    player_3_id IN (SELECT id FROM players WHERE profile_id = auth.uid()) OR
    player_4_id IN (SELECT id FROM players WHERE profile_id = auth.uid())
  );

-- Users can create matches
CREATE POLICY "Users can create matches"
  ON matches FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update matches they created
CREATE POLICY "Users can update own matches"
  ON matches FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete matches they created
CREATE POLICY "Users can delete own matches"
  ON matches FOR DELETE
  USING (created_by = auth.uid());

-- MATCH_INVITATIONS Policies
CREATE POLICY "Users can view their invitations"
  ON match_invitations FOR SELECT
  USING (invited_profile_id = auth.uid());

CREATE POLICY "Match creator can create invitations"
  ON match_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their invitations"
  ON match_invitations FOR UPDATE
  USING (invited_profile_id = auth.uid())
  WITH CHECK (invited_profile_id = auth.uid());

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Global ranking (all registered users)
CREATE OR REPLACE VIEW global_ranking AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.elo_score,
  p.category_label,
  p.matches_played,
  p.matches_won,
  CASE WHEN p.matches_played > 0 
    THEN ROUND((p.matches_won::numeric / p.matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_rate,
  RANK() OVER (ORDER BY p.elo_score DESC) as rank
FROM profiles p
WHERE p.matches_played > 0
ORDER BY p.elo_score DESC;

-- View: Player stats with match details
CREATE OR REPLACE VIEW player_stats AS
SELECT 
  pl.id,
  pl.display_name,
  pl.is_ghost,
  pl.profile_id,
  pl.created_by_user_id,
  pl.elo_score,
  pl.category_label,
  pl.matches_played,
  pl.matches_won,
  CASE WHEN pl.matches_played > 0 
    THEN ROUND((pl.matches_won::numeric / pl.matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_rate
FROM players pl;

-- ============================================
-- INITIAL DATA / SEED (Optional)
-- ============================================

-- You can add seed data here for testing
-- Example:
-- INSERT INTO profiles (id, username, full_name, elo_score, category_label)
-- VALUES ('your-test-user-id', 'testuser', 'Test User', 1400, '6ta');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on the enum type
GRANT USAGE ON TYPE player_category TO authenticated;
GRANT USAGE ON TYPE player_category TO anon;

-- Grant access to views
GRANT SELECT ON global_ranking TO authenticated;
GRANT SELECT ON player_stats TO authenticated;

