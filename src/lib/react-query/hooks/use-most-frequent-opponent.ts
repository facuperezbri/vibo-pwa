import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface OpponentInfo {
  playerId: string
  playerName: string
  playerAvatarUrl: string | null
  matchCount: number
}

export function useMostFrequentOpponent(currentPlayerId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['most-frequent-opponent', currentPlayerId],
    queryFn: async (): Promise<OpponentInfo | null> => {
      if (!currentPlayerId) {
        return null
      }

      // Get all matches where current player participated
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('player_1_id, player_2_id, player_3_id, player_4_id')
        .or(`player_1_id.eq.${currentPlayerId},player_2_id.eq.${currentPlayerId},player_3_id.eq.${currentPlayerId},player_4_id.eq.${currentPlayerId}`)
        .order('match_date', { ascending: false })
        .limit(50) // Limit to recent matches for performance

      // Debug logging - TODO: Remove after fixing the issue
      console.log('[useMostFrequentOpponent] Debug:', {
        currentPlayerId,
        matchesFound: matches?.length || 0,
        matches: matches || [],
        error: matchesError?.message || null
      });

      if (!matches || matches.length === 0) {
        return null
      }

      // Count opponents (players in opposite team)
      const opponentIds = new Set<string>()

      matches.forEach((match) => {
        const currentPlayerInTeam1 = match.player_1_id === currentPlayerId || match.player_2_id === currentPlayerId
        
        if (currentPlayerInTeam1) {
          // Opponents are in team 2
          if (match.player_3_id && match.player_3_id !== currentPlayerId) {
            opponentIds.add(match.player_3_id)
          }
          if (match.player_4_id && match.player_4_id !== currentPlayerId) {
            opponentIds.add(match.player_4_id)
          }
        } else {
          // Opponents are in team 1
          if (match.player_1_id && match.player_1_id !== currentPlayerId) {
            opponentIds.add(match.player_1_id)
          }
          if (match.player_2_id && match.player_2_id !== currentPlayerId) {
            opponentIds.add(match.player_2_id)
          }
        }
      })

      // Count head-to-head matches for each opponent
      const opponentCounts = new Map<string, number>()
      
      for (const opponentId of opponentIds) {
        // Count matches where both players were in opposite teams
        const headToHeadMatches = matches.filter((match) => {
          const currentInTeam1 = match.player_1_id === currentPlayerId || match.player_2_id === currentPlayerId
          const opponentInTeam2 = match.player_3_id === opponentId || match.player_4_id === opponentId
          const currentInTeam2 = match.player_3_id === currentPlayerId || match.player_4_id === currentPlayerId
          const opponentInTeam1 = match.player_1_id === opponentId || match.player_2_id === opponentId
          
          return (currentInTeam1 && opponentInTeam2) || (currentInTeam2 && opponentInTeam1)
        })
        
        if (headToHeadMatches.length > 0) {
          opponentCounts.set(opponentId, headToHeadMatches.length)
        }
      }

      // Find the most frequent opponent
      let mostFrequentOpponentId: string | null = null
      let maxCount = 0

      opponentCounts.forEach((count, playerId) => {
        if (count > maxCount) {
          maxCount = count
          mostFrequentOpponentId = playerId
        }
      })

      if (!mostFrequentOpponentId) {
        return null
      }

      // Get opponent name and avatar
      const { data: opponentPlayer } = await supabase
        .from('players')
        .select('id, display_name, profile_id, is_ghost')
        .eq('id', mostFrequentOpponentId)
        .single()

      if (!opponentPlayer) {
        return null
      }

      let avatarUrl: string | null = null
      
      // Get avatar if player has a profile
      if (opponentPlayer.profile_id && !opponentPlayer.is_ghost) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', opponentPlayer.profile_id)
          .maybeSingle()
        
        avatarUrl = profile?.avatar_url || null
      }

      return {
        playerId: mostFrequentOpponentId,
        playerName: opponentPlayer.display_name,
        playerAvatarUrl: avatarUrl,
        matchCount: maxCount
      }
    },
    enabled: !!currentPlayerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

