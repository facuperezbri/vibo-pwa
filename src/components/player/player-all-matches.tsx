'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Trophy, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import type { Match, Player } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'

interface PlayerAllMatchesProps {
  playerId: string
}

interface MatchWithPlayers extends Match {
  player_1: Player & { avatar_url?: string | null }
  player_2: Player & { avatar_url?: string | null }
  player_3: Player & { avatar_url?: string | null }
  player_4: Player & { avatar_url?: string | null }
}

export function PlayerAllMatches({ playerId }: PlayerAllMatchesProps) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadMatches() {
      setLoading(true)

      // Get matches where player participated
      const orConditions = `player_1_id.eq.${playerId},player_2_id.eq.${playerId},player_3_id.eq.${playerId},player_4_id.eq.${playerId}`
      
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

      if (matchesData) {
        // Get avatars for all players
        const profileIds = new Set<string>()
        matchesData.forEach(match => {
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

        const matchesWithAvatars = matchesData.map(match => ({
          ...match,
          player_1: { ...match.player_1, avatar_url: getAvatarUrl(match.player_1) },
          player_2: { ...match.player_2, avatar_url: getAvatarUrl(match.player_2) },
          player_3: { ...match.player_3, avatar_url: getAvatarUrl(match.player_3) },
          player_4: { ...match.player_4, avatar_url: getAvatarUrl(match.player_4) },
        })) as MatchWithPlayers[]

        setMatches(matchesWithAvatars)
      }

      setLoading(false)
    }

    loadMatches()
  }, [playerId, supabase])

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todos los Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-6 p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todos los Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aún no hay partidos registrados.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Todos los Partidos</CardTitle>
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

            return (
              <Link key={match.id} href={`/matches/${match.id}`} className="block">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    won ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {won ? (
                      <Trophy className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {won ? 'Victoria' : 'Derrota'}
                      </span>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <div className="flex items-center gap-1">
                        {opponents.map((opponent, idx) => (
                          <span key={opponent.id} className="text-xs text-muted-foreground">
                            {opponent.display_name}
                            {idx < opponents.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
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
    </div>
  )
}

