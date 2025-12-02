import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { Player, Profile } from '@/types/database'
import type { User } from '@supabase/supabase-js'

interface ProfileData {
  profile: Profile
  playerId: string | null
  ghostPlayers: Player[]
  user: User | null
}

export function useProfile() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<ProfileData | null> => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        throw authError
      }
      
      if (!user) {
        return null
      }

      // Load profile, player record, and ghost players in parallel
      const [profileResult, playerResult, ghostPlayersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, elo_score, category_label, country, province, phone, email, gender, user_type')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('players')
          .select('id')
          .eq('profile_id', user.id)
          .eq('is_ghost', false)
          .maybeSingle(),
        supabase
          .from('players')
          .select('id, display_name, elo_score, category_label, matches_played')
          .eq('created_by_user_id', user.id)
          .eq('is_ghost', true)
          .order('display_name')
      ])

      if (profileResult.error) {
        // Si el error es "no rows found", retornar null en lugar de lanzar error
        if (profileResult.error.code === 'PGRST116') {
          return null
        }
        throw profileResult.error
      }

      const profile = profileResult.data as Profile | null
      const playerRecord = playerResult.data as Player | null
      const ghostPlayers = (ghostPlayersResult.data || []) as Player[]

      if (!profile) {
        return null
      }

      return {
        profile,
        playerId: playerRecord?.id || null,
        ghostPlayers,
        user
      }
    },
    staleTime: QUERY_STALE_TIME,
  })
}

