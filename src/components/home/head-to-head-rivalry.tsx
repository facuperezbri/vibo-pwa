'use client'

import { HeadToHeadStatsComponent } from '@/components/player/head-to-head-stats'
import { createClient } from '@/lib/supabase/client'
import { HeadToHeadStats } from '@/types/database'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Swords } from 'lucide-react'
import Link from 'next/link'

interface OpponentInfo {
  playerId: string
  playerName: string
  playerAvatarUrl: string | null
  matchCount: number
}

export function HeadToHeadRivalry() {
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null)
  const [stats, setStats] = useState<HeadToHeadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadHeadToHeadData() {
      setLoading(true)
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        // Get current player ID
        const { data: playerRecord } = await supabase
          .from('players')
          .select('id')
          .eq('profile_id', user.id)
          .eq('is_ghost', false)
          .maybeSingle()

        if (!playerRecord?.id) {
          setLoading(false)
          return
        }

        setCurrentPlayerId(playerRecord.id)

        // Find the most frequent opponent (head-to-head)
        // Get all matches where current player participated
        const { data: matches } = await supabase
          .from('matches')
          .select('player_1_id, player_2_id, player_3_id, player_4_id')
          .or(`player_1_id.eq.${playerRecord.id},player_2_id.eq.${playerRecord.id},player_3_id.eq.${playerRecord.id},player_4_id.eq.${playerRecord.id}`)
          .order('match_date', { ascending: false })
          .limit(50) // Limit to recent matches for performance

        if (!matches || matches.length === 0) {
          setLoading(false)
          return
        }

        // Count opponents (players in opposite team)
        const opponentIds = new Set<string>()

        matches.forEach((match) => {
          const currentPlayerInTeam1 = match.player_1_id === playerRecord.id || match.player_2_id === playerRecord.id
          
          if (currentPlayerInTeam1) {
            // Opponents are in team 2
            if (match.player_3_id && match.player_3_id !== playerRecord.id) {
              opponentIds.add(match.player_3_id)
            }
            if (match.player_4_id && match.player_4_id !== playerRecord.id) {
              opponentIds.add(match.player_4_id)
            }
          } else {
            // Opponents are in team 1
            if (match.player_1_id && match.player_1_id !== playerRecord.id) {
              opponentIds.add(match.player_1_id)
            }
            if (match.player_2_id && match.player_2_id !== playerRecord.id) {
              opponentIds.add(match.player_2_id)
            }
          }
        })

        // Count head-to-head matches for each opponent
        const opponentCounts = new Map<string, number>()
        
        for (const opponentId of opponentIds) {
          // Count matches where both players were in opposite teams
          const headToHeadMatches = matches.filter((match) => {
            const currentInTeam1 = match.player_1_id === playerRecord.id || match.player_2_id === playerRecord.id
            const opponentInTeam2 = match.player_3_id === opponentId || match.player_4_id === opponentId
            const currentInTeam2 = match.player_3_id === playerRecord.id || match.player_4_id === playerRecord.id
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
          setLoading(false)
          return
        }

        // Get opponent name and avatar
        const { data: opponentPlayer } = await supabase
          .from('players')
          .select('id, display_name, profile_id, is_ghost')
          .eq('id', mostFrequentOpponentId)
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

          setOpponent({
            playerId: mostFrequentOpponentId,
            playerName: opponentPlayer.display_name,
            playerAvatarUrl: avatarUrl,
            matchCount: maxCount
          })

          // Load head-to-head stats immediately after finding the opponent
          const { data: headToHeadStats, error: statsError } = await supabase.rpc(
            'get_head_to_head_stats',
            {
              player_a_id: mostFrequentOpponentId,
              player_b_id: playerRecord.id,
            }
          )

          if (!statsError && headToHeadStats && !headToHeadStats.error) {
            setStats(headToHeadStats as HeadToHeadStats)
          }
        }
      } catch (error) {
        console.error('Error loading head-to-head rivalry:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHeadToHeadData()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Swords className="h-4 w-4" />
              Rivalidad Principal
            </CardTitle>
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentPlayerId || !opponent) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4" />
            Rivalidad Principal
          </CardTitle>
          <Link
            href="/rivalries"
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <HeadToHeadStatsComponent
          playerAId={opponent.playerId}
          playerBId={currentPlayerId}
          playerAName={opponent.playerName}
          playerBName="Tú"
          playerAAvatarUrl={opponent.playerAvatarUrl}
          compact={true}
          title=""
          showLink={true}
          initialStats={stats}
        />
      </CardContent>
    </Card>
  )
}

