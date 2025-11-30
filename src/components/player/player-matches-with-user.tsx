'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Trophy, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import type { Match, Player } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'

interface PlayerMatchesWithUserProps {
  targetPlayerId: string
  currentUserPlayerId: string
}

interface MatchWithPlayers extends Match {
  player_1: Player & { avatar_url?: string | null }
  player_2: Player & { avatar_url?: string | null }
  player_3: Player & { avatar_url?: string | null }
  player_4: Player & { avatar_url?: string | null }
}

export function PlayerMatchesWithUser({ targetPlayerId, currentUserPlayerId }: PlayerMatchesWithUserProps) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadMatches() {
      setLoading(true)

      // Get matches where target player participated
      const orConditions = `player_1_id.eq.${targetPlayerId},player_2_id.eq.${targetPlayerId},player_3_id.eq.${targetPlayerId},player_4_id.eq.${targetPlayerId}`
      
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          player_1:players!matches_player_1_id_fkey(*),
          player_2:players!matches_player_2_id_fkey(*),
          player_3:players!matches_player_3_id_fkey(*),
          player_4:players!matches_player_4_id_fkey(*)
        `)
        .or(orConditions)
        .order('match_date', { ascending: false })
        .limit(50)

      // Filter matches where both players participated together
      const filteredMatches = matchesData?.filter(match => {
        const playerIds = [
          match.player_1_id,
          match.player_2_id,
          match.player_3_id,
          match.player_4_id
        ]
        return playerIds.includes(targetPlayerId) && playerIds.includes(currentUserPlayerId)
      }) || []

      if (filteredMatches.length > 0) {
        // Get avatars for all players
        const profileIds = new Set<string>()
        filteredMatches.forEach(match => {
          const players = [match.player_1, match.player_2, match.player_3, match.player_4] as any[]
          players.forEach(player => {
            if (player?.profile_id && !player.is_ghost) {
              profileIds.add(player.profile_id)
            }
          })
        })

        let avatarsMap: Record<string, string | null> = {}
        if (profileIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', Array.from(profileIds))

          if (profiles) {
            profiles.forEach(profile => {
              avatarsMap[profile.id] = profile.avatar_url
            })
          }
        }

        const getAvatarUrl = (player: any): string | null => {
          if (player.is_ghost || !player.profile_id) return null
          return avatarsMap[player.profile_id] || null
        }

        const matchesWithAvatars = filteredMatches.map(match => ({
          ...match,
          player_1: { ...match.player_1, avatar_url: getAvatarUrl(match.player_1) },
          player_2: { ...match.player_2, avatar_url: getAvatarUrl(match.player_2) },
          player_3: { ...match.player_3, avatar_url: getAvatarUrl(match.player_3) },
          player_4: { ...match.player_4, avatar_url: getAvatarUrl(match.player_4) },
        })) as MatchWithPlayers[]

        setMatches(matchesWithAvatars)
      } else {
        setMatches([])
      }

      setLoading(false)
    }

    loadMatches()
  }, [targetPlayerId, currentUserPlayerId, supabase])

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
            className="text-sm text-primary hover:underline"
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

