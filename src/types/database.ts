export type PlayerCategory = '8va' | '7ma' | '6ta' | '5ta' | '4ta' | '3ra' | '2da' | '1ra'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          elo_score: number
          category_label: PlayerCategory
          matches_played: number
          matches_won: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          elo_score?: number
          category_label?: PlayerCategory
          matches_played?: number
          matches_won?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          elo_score?: number
          category_label?: PlayerCategory
          matches_played?: number
          matches_won?: number
          created_at?: string
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: string
          profile_id: string | null
          created_by_user_id: string | null
          display_name: string
          is_ghost: boolean
          elo_score: number
          category_label: PlayerCategory
          matches_played: number
          matches_won: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          created_by_user_id?: string | null
          display_name: string
          is_ghost?: boolean
          elo_score?: number
          category_label?: PlayerCategory
          matches_played?: number
          matches_won?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          created_by_user_id?: string | null
          display_name?: string
          is_ghost?: boolean
          elo_score?: number
          category_label?: PlayerCategory
          matches_played?: number
          matches_won?: number
          created_at?: string
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          created_by: string
          match_date: string
          venue: string | null
          player_1_id: string
          player_2_id: string
          player_3_id: string
          player_4_id: string
          score_sets: SetScore[]
          winner_team: 1 | 2
          elo_changes: EloChanges | null
          match_config: MatchConfig
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          match_date?: string
          venue?: string | null
          player_1_id: string
          player_2_id: string
          player_3_id: string
          player_4_id: string
          score_sets: SetScore[]
          winner_team: 1 | 2
          elo_changes?: EloChanges | null
          match_config?: MatchConfig
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          match_date?: string
          venue?: string | null
          player_1_id?: string
          player_2_id?: string
          player_3_id?: string
          player_4_id?: string
          score_sets?: SetScore[]
          winner_team?: 1 | 2
          elo_changes?: EloChanges | null
          match_config?: MatchConfig
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      match_invitations: {
        Row: {
          id: string
          match_id: string
          invited_player_id: string
          invited_profile_id: string | null
          status: 'pending' | 'accepted' | 'rejected'
          invite_token: string
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          invited_player_id: string
          invited_profile_id?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          invite_token?: string
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          invited_player_id?: string
          invited_profile_id?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          invite_token?: string
          responded_at?: string | null
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'match_invite' | 'match_confirmed' | 'elo_change'
          title: string
          body: string
          data: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'match_invite' | 'match_confirmed' | 'elo_change'
          title: string
          body: string
          data?: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'match_invite' | 'match_confirmed' | 'elo_change'
          title?: string
          body?: string
          data?: Json
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      global_ranking: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          elo_score: number
          category_label: PlayerCategory
          matches_played: number
          matches_won: number
          win_rate: number
          rank: number
        }
      }
      player_stats: {
        Row: {
          id: string
          display_name: string
          is_ghost: boolean
          profile_id: string | null
          created_by_user_id: string | null
          elo_score: number
          category_label: PlayerCategory
          matches_played: number
          matches_won: number
          win_rate: number
        }
      }
    }
    Functions: {
      get_initial_elo: {
        Args: { category: PlayerCategory }
        Returns: number
      }
      get_category_from_elo: {
        Args: { elo: number }
        Returns: PlayerCategory
      }
      calculate_expected_score: {
        Args: { player_elo: number; opponent_elo: number }
        Returns: number
      }
      calculate_new_elo: {
        Args: {
          current_elo: number
          opponent_avg_elo: number
          won: boolean
          k_factor?: number
        }
        Returns: number
      }
      update_match_elos: {
        Args: { match_id: string }
        Returns: EloChanges
      }
      get_invitation_by_token: {
        Args: { token: string }
        Returns: InvitationDetails[]
      }
      respond_to_invitation: {
        Args: {
          p_token: string
          p_response: string
          p_user_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      player_category: PlayerCategory
    }
  }
}

// Custom types for JSON fields
export interface SetScore {
  team1: number
  team2: number
  // For super tie-break (third set only)
  isTiebreak?: boolean
}

export interface MatchConfig {
  goldenPoint: boolean
  superTiebreak: boolean
}

export interface EloChange {
  before: number
  after: number
  change: number
}

export interface EloChanges {
  player_1: EloChange
  player_2: EloChange
  player_3: EloChange
  player_4: EloChange
}

export interface InvitationDetails {
  id: string
  match_id: string
  invited_player_id: string
  invited_profile_id: string | null
  status: string
  invite_token: string
  match_date: string
  venue: string | null
  created_by_name: string
  player_names: string[]
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Player = Database['public']['Tables']['players']['Row']
export type PlayerInsert = Database['public']['Tables']['players']['Insert']
export type PlayerUpdate = Database['public']['Tables']['players']['Update']

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

export type MatchInvitation = Database['public']['Tables']['match_invitations']['Row']
export type MatchInvitationInsert = Database['public']['Tables']['match_invitations']['Insert']

export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type PushSubscriptionInsert = Database['public']['Tables']['push_subscriptions']['Insert']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

export type GlobalRanking = Database['public']['Views']['global_ranking']['Row']
export type PlayerStats = Database['public']['Views']['player_stats']['Row']

// Match with player details (for display)
export interface MatchWithPlayers extends Match {
  player_1: Player
  player_2: Player
  player_3: Player
  player_4: Player
}

// Category to ELO mapping
export const CATEGORY_ELO_MAP: Record<PlayerCategory, number> = {
  '8va': 1000,
  '7ma': 1200,
  '6ta': 1400,
  '5ta': 1600,
  '4ta': 1800,
  '3ra': 2000,
  '2da': 2200,
  '1ra': 2400,
}

export const CATEGORY_LABELS: Record<PlayerCategory, string> = {
  '8va': '8va Categoría',
  '7ma': '7ma Categoría',
  '6ta': '6ta Categoría',
  '5ta': '5ta Categoría',
  '4ta': '4ta Categoría',
  '3ra': '3ra Categoría',
  '2da': '2da Categoría',
  '1ra': '1ra Categoría',
}

export const CATEGORIES: PlayerCategory[] = ['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra']

// Default match config
export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  goldenPoint: false,
  superTiebreak: false,
}
