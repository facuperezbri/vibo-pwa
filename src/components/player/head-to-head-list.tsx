'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { HeadToHeadStats } from '@/types/database'
import { Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HeadToHeadStatsComponent } from './head-to-head-stats'

interface HeadToHeadListItem {
  opponentId: string
  opponentName: string
  opponentAvatarUrl: string | null
  stats: HeadToHeadStats
}

interface HeadToHeadListProps {
  currentPlayerId: string | null
}

export function HeadToHeadList({ currentPlayerId }: HeadToHeadListProps) {
  const [rivalries, setRivalries] = useState<HeadToHeadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadAllRivalries() {
      if (!currentPlayerId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Get all matches where current player participated
        const { data: matches } = await supabase
          .from('matches')
          .select('player_1_id, player_2_id, player_3_id, player_4_id')
          .or(`player_1_id.eq.${currentPlayerId},player_2_id.eq.${currentPlayerId},player_3_id.eq.${currentPlayerId},player_4_id.eq.${currentPlayerId}`)
          .order('match_date', { ascending: false })

        if (!matches || matches.length === 0) {
          setLoading(false)
          return
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

        // Get head-to-head stats for each opponent
        const rivalriesList: HeadToHeadListItem[] = []

        for (const opponentId of opponentIds) {
          // Get head-to-head stats
          const { data: stats } = await supabase.rpc('get_head_to_head_stats', {
            player_a_id: opponentId,
            player_b_id: currentPlayerId,
          })

          if (stats && stats.total_matches > 0) {
            // Get opponent info
            const { data: opponentPlayer } = await supabase
              .from('players')
              .select('id, display_name, profile_id, is_ghost')
              .eq('id', opponentId)
              .single()

            if (opponentPlayer) {
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

              rivalriesList.push({
                opponentId,
                opponentName: opponentPlayer.display_name,
                opponentAvatarUrl: avatarUrl,
                stats: stats as HeadToHeadStats,
              })
            }
          }
        }

        // Sort by total matches (descending)
        rivalriesList.sort((a, b) => b.stats.total_matches - a.stats.total_matches)

        setRivalries(rivalriesList)
      } catch (err) {
        console.error('Error loading rivalries:', err)
        setError('Error al cargar rivalidades')
      } finally {
        setLoading(false)
      }
    }

    loadAllRivalries()
  }, [currentPlayerId, supabase])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (rivalries.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay rivalidades registradas aún.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {rivalries.map((rivalry) => (
        <Card key={rivalry.opponentId}>
          <CardContent className="p-0">
            <HeadToHeadStatsComponent
              playerAId={rivalry.opponentId}
              playerBId={currentPlayerId!}
              playerAName={rivalry.opponentName}
              playerBName="Tú"
              playerAAvatarUrl={rivalry.opponentAvatarUrl}
              compact={false}
              title=""
              showLink={true}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

