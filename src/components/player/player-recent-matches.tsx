'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlayerMatches } from '@/lib/react-query/hooks'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { PlayerAvatar } from '@/components/ui/player-avatar'

interface PlayerRecentMatchesProps {
  playerId: string
}

export function PlayerRecentMatches({ playerId }: PlayerRecentMatchesProps) {
  const { data: matches = [], isLoading: loading } = usePlayerMatches(playerId, 10)

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimos Partidos</CardTitle>
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
          <CardTitle className="text-base">Últimos Partidos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no hay partidos registrados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Últimos Partidos</CardTitle>
          <Link
            href={`/player/${playerId}/matches`}
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {matches.map((match) => {
          // Determine player's team and if they won
          const playerPosition = 
            match.player_1_id === playerId ? 1 :
            match.player_2_id === playerId ? 2 :
            match.player_3_id === playerId ? 3 : 4
          
          const playerTeam = playerPosition <= 2 ? 1 : 2
          const won = match.winner_team === playerTeam

          // Get teammate
          const teammate = playerPosition === 1 ? match.player_2 :
                          playerPosition === 2 ? match.player_1 :
                          playerPosition === 3 ? match.player_4 : match.player_3

          // Get opponents
          const opponents = playerTeam === 1 
            ? [match.player_3, match.player_4]
            : [match.player_1, match.player_2]

          // Get team players
          const teamPlayers = playerTeam === 1 
            ? [match.player_1, match.player_2]
            : [match.player_3, match.player_4]

          return (
            <Link key={match.id} href={`/matches/${match.id}`} className="block">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted">
                <div className="flex items-center gap-2">
                  <div className={`flex -space-x-2 ${won ? 'ring-2 ring-green-500/50 rounded-full' : ''}`}>
                    {teamPlayers.map((player) => (
                      <PlayerAvatar
                        key={player.id}
                        name={player.display_name}
                        avatarUrl={player.avatar_url}
                        isGhost={player.is_ghost}
                        size="sm"
                        className="ring-2 ring-background"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <div className={`flex -space-x-2 ${!won ? 'ring-2 ring-red-500/50 rounded-full' : ''}`}>
                    {opponents.map((opponent) => (
                      <PlayerAvatar
                        key={opponent.id}
                        name={opponent.display_name}
                        avatarUrl={opponent.avatar_url}
                        isGhost={opponent.is_ghost}
                        size="sm"
                        className="ring-2 ring-background"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
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

