-- ============================================
-- PadelTracker - Feature Additions Migration
-- ============================================
-- Run this AFTER the initial schema.sql
-- This migration is IDEMPOTENT - safe to run multiple times
-- ============================================

-- 1. Add match_config column for Golden Point / Super Tie-break settings
-- Config structure: { "goldenPoint": boolean, "superTiebreak": boolean }
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS match_config JSONB DEFAULT '{"goldenPoint": false, "superTiebreak": false}'::jsonb;

-- 2. Add invite_token to match_invitations for shareable links
ALTER TABLE match_invitations 
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Add index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_match_invitations_token ON match_invitations(invite_token);

-- 3. Create push_subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One subscription per endpoint per user
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;

-- Push subscription policies
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- 4. Create notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('match_invite', 'match_confirmed', 'elo_change')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing notification policies (idempotent)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Notification policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- 5. Update match_invitations RLS to allow viewing by token (for WhatsApp links)
-- Drop existing policy first
DROP POLICY IF EXISTS "Users can view their invitations" ON match_invitations;
DROP POLICY IF EXISTS "Users can view invitations by token or profile" ON match_invitations;

-- Create new policy that allows viewing by token OR by profile_id
CREATE POLICY "Users can view invitations by token or profile"
  ON match_invitations FOR SELECT
  USING (
    invited_profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_invitations.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- 6. Create function to get invitation by token (bypasses RLS)
CREATE OR REPLACE FUNCTION get_invitation_by_token(token TEXT)
RETURNS TABLE (
  id UUID,
  match_id UUID,
  invited_player_id UUID,
  invited_profile_id UUID,
  status TEXT,
  invite_token TEXT,
  match_date DATE,
  venue TEXT,
  created_by_name TEXT,
  player_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.match_id,
    mi.invited_player_id,
    mi.invited_profile_id,
    mi.status,
    mi.invite_token,
    m.match_date,
    m.venue,
    COALESCE(p.full_name, p.username, 'Usuario') as created_by_name,
    ARRAY[
      (SELECT display_name FROM players WHERE id = m.player_1_id),
      (SELECT display_name FROM players WHERE id = m.player_2_id),
      (SELECT display_name FROM players WHERE id = m.player_3_id),
      (SELECT display_name FROM players WHERE id = m.player_4_id)
    ] as player_names
  FROM match_invitations mi
  JOIN matches m ON m.id = mi.match_id
  JOIN profiles p ON p.id = m.created_by
  WHERE mi.invite_token = token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to respond to invitation
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_token TEXT,
  p_response TEXT, -- 'accepted' or 'rejected'
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_invitation match_invitations%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation 
  FROM match_invitations 
  WHERE invite_token = p_token;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitación no encontrada');
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta invitación ya fue respondida');
  END IF;
  
  -- Update the invitation
  UPDATE match_invitations
  SET 
    status = p_response,
    responded_at = NOW(),
    invited_profile_id = COALESCE(p_user_id, invited_profile_id)
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'match_id', v_invitation.match_id,
    'status', p_response
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION get_invitation_by_token TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_token TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_invitation TO anon;
GRANT EXECUTE ON FUNCTION respond_to_invitation TO authenticated;

-- 9. Update timestamp trigger for new tables (only if doesn't exist)
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 10. STORAGE: Profile Avatars Bucket Setup
-- ============================================
-- Note: You need to create the bucket manually in Supabase Dashboard
-- Go to Storage > Create new bucket > Name: "avatars" > Public: true

-- Storage policies need to be created via Supabase Dashboard or SQL:
-- These policies allow users to upload their own avatar

-- ============================================
-- 11. MATCH EDITING: Add function to recalculate ELOs
-- ============================================

-- Function to reverse ELO changes from a match (for editing)
CREATE OR REPLACE FUNCTION reverse_match_elos(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  match_record matches%ROWTYPE;
  elo_changes JSONB;
BEGIN
  -- Get match details
  SELECT * INTO match_record FROM matches WHERE id = p_match_id;
  
  IF match_record IS NULL THEN
    RETURN;
  END IF;
  
  elo_changes := match_record.elo_changes;
  
  IF elo_changes IS NULL THEN
    RETURN;
  END IF;
  
  -- Reverse ELO changes for each player
  -- Player 1
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0))
  WHERE id = match_record.player_1_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_1'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_1_id AND profile_id IS NOT NULL);
  
  -- Player 2
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0))
  WHERE id = match_record.player_2_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 1 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_2'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_2_id AND profile_id IS NOT NULL);
  
  -- Player 3
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0))
  WHERE id = match_record.player_3_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_3'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_3_id AND profile_id IS NOT NULL);
  
  -- Player 4
  UPDATE players SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0))
  WHERE id = match_record.player_4_id;
  
  UPDATE profiles SET 
    elo_score = elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0),
    matches_played = GREATEST(0, matches_played - 1),
    matches_won = GREATEST(0, matches_won - CASE WHEN match_record.winner_team = 2 THEN 1 ELSE 0 END),
    category_label = get_category_from_elo(elo_score - COALESCE((elo_changes->'player_4'->>'change')::float, 0))
  WHERE id = (SELECT profile_id FROM players WHERE id = match_record.player_4_id AND profile_id IS NOT NULL);
  
  -- Clear elo_changes from match
  UPDATE matches SET elo_changes = NULL WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reverse_match_elos TO authenticated;
