'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlayerMatches, type MatchWithPlayers } from '@/lib/react-query/hooks'
import { Trophy, Calendar, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'

interface PlayerMatchesWithUserProps {
  targetPlayerId: string
  currentUserPlayerId: string
}

export function PlayerMatchesWithUser({ targetPlayerId, currentUserPlayerId }: PlayerMatchesWithUserProps) {
  const { data: allMatches = [], isLoading: loading } = usePlayerMatches(targetPlayerId, 50)

  // Filter matches where both players participated together
  const matches = useMemo(() => {
    return allMatches.filter(match => {
      const playerIds = [
        match.player_1_id,
        match.player_2_id,
        match.player_3_id,
        match.player_4_id
      ]
      return playerIds.includes(targetPlayerId) && playerIds.includes(currentUserPlayerId)
    })
  }, [allMatches, targetPlayerId, currentUserPlayerId])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Partidos Juntos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Partidos Juntos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no han jugado partidos juntos.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Partidos Juntos</CardTitle>
          <Link
            href={`/player/${targetPlayerId}/matches-with/${currentUserPlayerId}`}
            className="text-sm text-secondary hover:underline font-medium"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {matches.map((match) => {
          // Determine if players were teammates or opponents
          const targetPosition = 
            match.player_1_id === targetPlayerId ? 1 :
            match.player_2_id === targetPlayerId ? 2 :
            match.player_3_id === targetPlayerId ? 3 : 4
          
          const userPosition = 
            match.player_1_id === currentUserPlayerId ? 1 :
            match.player_2_id === currentUserPlayerId ? 2 :
            match.player_3_id === currentUserPlayerId ? 3 : 4

          const targetTeam = targetPosition <= 2 ? 1 : 2
          const userTeam = userPosition <= 2 ? 1 : 2
          const wereTeammates = targetTeam === userTeam
          const targetWon = match.winner_team === targetTeam

          // Get teammate and opponents
          const teammate = targetPosition === 1 ? match.player_2 :
                          targetPosition === 2 ? match.player_1 :
                          targetPosition === 3 ? match.player_4 : match.player_3
          
          const opponents = targetTeam === 1 
            ? [match.player_3, match.player_4]
            : [match.player_1, match.player_2]

          return (
            <Link key={match.id} href={`/matches/${match.id}`} className="block">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  targetWon ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                  {targetWon ? (
                    <Trophy className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {targetWon ? 'Victoria' : 'Derrota'}
                    </span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    {wereTeammates ? (
                      <div className="flex items-center gap-1">
                        {opponents.map((opponent, idx) => (
                          <span key={opponent.id} className="text-xs text-muted-foreground">
                            {opponent.display_name}
                            {idx < opponents.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">
                          Tú
                        </span>
                        <span className="text-xs text-muted-foreground">y</span>
                        <span className="text-xs text-muted-foreground">
                          {opponents.find(o => o.id !== currentUserPlayerId)?.display_name}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: new Date(match.match_date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      Con {teammate.display_name}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

