import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { HeadToHeadStats } from '@/types/database'

export function useHeadToHeadStats(playerAId: string | null, playerBId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['head-to-head-stats', playerAId, playerBId],
    queryFn: async () => {
      if (!playerAId || !playerBId) {
        return null
      }

      const { data, error } = await supabase.rpc('get_head_to_head_stats', {
        player_a_id: playerAId,
        player_b_id: playerBId,
      })

      // Debug logging - TODO: Remove after fixing the issue
      console.log('[useHeadToHeadStats] Debug:', {
        playerAId,
        playerBId,
        data: data || null,
        error: error?.message || null
      });

      if (error) {
        throw error
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data as HeadToHeadStats | null
    },
    enabled: !!playerAId && !!playerBId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

