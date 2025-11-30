'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { createClient } from '@/lib/supabase/client'
import { HeadToHeadStats } from '@/types/database'
import { Swords, Trophy, Calendar, Flame, TrendingUp, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HeadToHeadStatsProps {
  playerAId: string
  playerBId: string
  playerAName?: string
  playerBName?: string
  playerAAvatarUrl?: string | null
  compact?: boolean
  title?: string
  showLink?: boolean
}

export function HeadToHeadStatsComponent({
  playerAId,
  playerBId,
  playerAName,
  playerBName,
  playerAAvatarUrl,
  compact = false,
  title = 'Historial Rivalidades',
  showLink = true,
}: HeadToHeadStatsProps) {
  const [stats, setStats] = useState<HeadToHeadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadHeadToHeadStats() {
      if (!playerAId || !playerBId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_head_to_head_stats',
          {
            player_a_id: playerAId,
            player_b_id: playerBId,
          }
        )

        if (rpcError) {
          console.error('Error fetching head-to-head stats:', rpcError)
          setError('Error al cargar estadísticas de enfrentamientos')
          setStats(null)
        } else if (data?.error) {
          setError(data.error)
          setStats(null)
        } else {
          setStats(data)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Error inesperado al cargar estadísticas')
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    loadHeadToHeadStats()
  }, [playerAId, playerBId, supabase])

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A'
    
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Reset time for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Hoy'
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  function formatStreak(streak: number): { text: string; color: string; icon: 'flame' | 'trending-down' } {
    // streak > 0 means playerA is winning, streak < 0 means playerB is winning
    // We want to show from playerB's perspective (the user)
    if (streak > 0) {
      // PlayerA (rival) is winning
      return {
        text: `${Math.abs(streak)} victoria${Math.abs(streak) > 1 ? 's' : ''} de ${playerAName || 'Jugador A'}`,
        color: 'text-red-600',
        icon: 'trending-down'
      }
    } else if (streak < 0) {
      // PlayerB (user) is winning
      return {
        text: `${Math.abs(streak)} victoria${Math.abs(streak) > 1 ? 's' : ''}`,
        color: 'text-green-600',
        icon: 'flame'
      }
    } else {
      return {
        text: 'Sin racha',
        color: 'text-muted-foreground',
        icon: 'trending-down'
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            {!compact && <Skeleton className="h-16 w-full" />}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.total_matches === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay enfrentamientos registrados entre estos jugadores.
          </p>
        </CardContent>
      </Card>
    )
  }

  const playerAWinRate = stats.total_matches > 0
    ? Math.round((stats.player_a_wins / stats.total_matches) * 100 * 10) / 10
    : 0

  const streakInfo = formatStreak(stats.current_streak)

  const content = (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted cursor-pointer">
      <PlayerAvatar
        name={playerAName || 'Jugador A'}
        avatarUrl={playerAAvatarUrl}
        size="md"
        className="ring-2 ring-background"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{playerAName || 'Jugador A'}</p>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs pl-0 border-0 bg-transparent">
              {stats.total_matches} partidos
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="h-3 w-3 text-green-600" />
              <span className="font-medium text-green-600">
                {stats.player_a_wins}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-red-600">{stats.player_b_wins}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {stats.last_match_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Último: {formatDate(stats.last_match_date)}</span>
              </div>
            )}
            {stats.current_streak !== 0 && (
              <div className={`flex items-center gap-1 ${streakInfo.color}`}>
                {streakInfo.icon === 'flame' ? (
                  <Flame className="h-3 w-3 fill-current" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="font-medium">{streakInfo.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            {playerAWinRate.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">victorias</p>
      </div>
    </div>
  )

  if (!title) {
    // When no title, return just the content (used inside another Card)
    return showLink ? (
      <Link href={`/player/${playerAId}`} className="block">
        {content}
      </Link>
    ) : (
      content
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showLink ? (
          <Link href={`/player/${playerAId}`} className="block">
            {content}
          </Link>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  )
}

