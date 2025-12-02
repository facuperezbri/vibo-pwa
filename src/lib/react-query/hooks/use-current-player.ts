import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useCurrentPlayer() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['current-player'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return null
      }

      const { data: playerRecord } = await supabase
        .from('players')
        .select('id')
        .eq('profile_id', user.id)
        .eq('is_ghost', false)
        .maybeSingle()

      // Debug logging - TODO: Remove after fixing the issue
      console.log('[useCurrentPlayer] Debug:', {
        userId: user.id,
        playerId: playerRecord?.id || null,
        playerRecord: playerRecord
      })

      return playerRecord?.id || null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

