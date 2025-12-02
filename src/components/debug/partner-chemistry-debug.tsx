'use client'

import { useCurrentPlayer } from '@/lib/react-query/hooks'
import { usePartnerStats } from '@/lib/react-query/hooks'
import { useMostFrequentOpponent } from '@/lib/react-query/hooks'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { Bug } from 'lucide-react'

export function PartnerChemistryDebug() {
  const { data: currentPlayerId, isLoading: loadingPlayer } = useCurrentPlayer()
  const { data: partnerStats, isLoading: loadingStats } = usePartnerStats(currentPlayerId)
  const { data: opponent, isLoading: loadingOpponent } = useMostFrequentOpponent(currentPlayerId)
  const [matchesInfo, setMatchesInfo] = useState<any>(null)

  useEffect(() => {
    if (!currentPlayerId) return

    async function fetchMatchesInfo() {
      const supabase = createClient()
      const { data: matches, error } = await supabase
        .from('matches')
        .select('id, player_1_id, player_2_id, player_3_id, player_4_id, match_date, created_by')
        .or(`player_1_id.eq.${currentPlayerId},player_2_id.eq.${currentPlayerId},player_3_id.eq.${currentPlayerId},player_4_id.eq.${currentPlayerId}`)
        .order('match_date', { ascending: false })
        .limit(5)

      setMatchesInfo({ matches: matches || [], error: error?.message || null })
    }

    fetchMatchesInfo()
  }, [currentPlayerId])

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
          <Bug className="h-4 w-4" />
          Debug Info - Partner Chemistry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <strong>Current Player ID:</strong>{' '}
          {loadingPlayer ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : currentPlayerId ? (
            <code className="text-green-600">{currentPlayerId}</code>
          ) : (
            <span className="text-red-600">NULL - No player found!</span>
          )}
        </div>
        <div>
          <strong>Partner Stats:</strong>{' '}
          {loadingStats ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : partnerStats && partnerStats.length > 0 ? (
            <span className="text-green-600">{partnerStats.length} partners found</span>
          ) : (
            <span className="text-red-600">0 partners - No matches found</span>
          )}
        </div>
        <div>
          <strong>Most Frequent Opponent:</strong>{' '}
          {loadingOpponent ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : opponent ? (
            <span className="text-green-600">{opponent.playerName} ({opponent.matchCount} matches)</span>
          ) : (
            <span className="text-red-600">None found</span>
          )}
        </div>
        {matchesInfo && (
          <div>
            <strong>Recent Matches:</strong>{' '}
            {matchesInfo.error ? (
              <span className="text-red-600">Error: {matchesInfo.error}</span>
            ) : matchesInfo.matches.length > 0 ? (
              <span className="text-green-600">{matchesInfo.matches.length} matches found</span>
            ) : (
              <span className="text-red-600">0 matches found</span>
            )}
            {matchesInfo.matches.length > 0 && (
              <div className="mt-1 ml-4 space-y-1">
                {matchesInfo.matches.map((match: any, idx: number) => (
                  <div key={match.id} className="text-xs">
                    Match {idx + 1}: Players: [{match.player_1_id?.substring(0, 8)}...,
                    {match.player_2_id?.substring(0, 8)}..., {match.player_3_id?.substring(0, 8)}...,
                    {match.player_4_id?.substring(0, 8)}...] - Current player matches:{' '}
                    {[
                      match.player_1_id === currentPlayerId ? 'P1' : null,
                      match.player_2_id === currentPlayerId ? 'P2' : null,
                      match.player_3_id === currentPlayerId ? 'P3' : null,
                      match.player_4_id === currentPlayerId ? 'P4' : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'NONE'}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mt-2 text-muted-foreground">
          Check browser console for detailed logs
        </div>
      </CardContent>
    </Card>
  )
}

