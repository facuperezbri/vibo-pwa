'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { HeadToHeadStats } from '@/types/database'
import { Swords, Trophy, Calendar, Flame, TrendingUp, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'

interface HeadToHeadStatsProps {
  playerAId: string
  playerBId: string
  playerAName?: string
  playerBName?: string
  compact?: boolean
  title?: string
}

export function HeadToHeadStatsComponent({
  playerAId,
  playerBId,
  playerAName,
  playerBName,
  compact = false,
  title = 'Historial Rivalidades',
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

  function formatStreak(streak: number, playerAWin: boolean): { text: string; color: string; icon: 'flame' | 'trending-down' } {
    if (streak > 0) {
      const playerName = playerAWin ? (playerAName || 'Jugador A') : (playerBName || 'Jugador B')
      return {
        text: `${Math.abs(streak)} victoria${Math.abs(streak) > 1 ? 's' : ''} de ${playerName}`,
        color: 'text-green-600',
        icon: 'flame'
      }
    } else if (streak < 0) {
      const playerName = playerAWin ? (playerBName || 'Jugador B') : (playerAName || 'Jugador A')
      return {
        text: `${Math.abs(streak)} victoria${Math.abs(streak) > 1 ? 's' : ''} de ${playerName}`,
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

  const playerBWinRate = stats.total_matches > 0
    ? Math.round((stats.player_b_wins / stats.total_matches) * 100 * 10) / 10
    : 0

  const streakInfo = formatStreak(stats.current_streak, stats.current_streak > 0)
  const playerAIsWinning = stats.player_a_wins > stats.player_b_wins

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="h-4 w-4" />
          Historial Rivalidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Trophy className="h-3 w-3" />
              <span>Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total_matches}</p>
            <p className="text-xs text-muted-foreground mt-1">partidos</p>
          </div>
          
          <div className={`text-center rounded-lg p-3 ${
            playerAIsWinning ? 'bg-green-500/10 ring-2 ring-green-500/20' : 'bg-muted/50'
          }`}>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Trophy className={`h-3 w-3 ${playerAIsWinning ? 'text-green-600' : ''}`} />
              <span className={playerAIsWinning ? 'text-green-600 font-medium' : ''}>
                {playerAName || 'Jugador A'}
              </span>
            </div>
            <p className={`text-2xl font-bold ${playerAIsWinning ? 'text-green-600' : ''}`}>
              {stats.player_a_wins}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {playerAWinRate}% victorias
            </p>
          </div>

          <div className={`text-center rounded-lg p-3 ${
            !playerAIsWinning && stats.total_matches > 0 ? 'bg-green-500/10 ring-2 ring-green-500/20' : 'bg-muted/50'
          }`}>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Trophy className={`h-3 w-3 ${!playerAIsWinning && stats.total_matches > 0 ? 'text-green-600' : ''}`} />
              <span className={!playerAIsWinning && stats.total_matches > 0 ? 'text-green-600 font-medium' : ''}>
                {playerBName || 'Jugador B'}
              </span>
            </div>
            <p className={`text-2xl font-bold ${!playerAIsWinning && stats.total_matches > 0 ? 'text-green-600' : ''}`}>
              {stats.player_b_wins}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {playerBWinRate}% victorias
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {!compact && (
          <div className="space-y-2 pt-2 border-t">
            {/* Streak */}
            {stats.current_streak !== 0 && (
              <div className={`flex items-center gap-2 text-sm ${streakInfo.color}`}>
                {streakInfo.icon === 'flame' ? (
                  <Flame className="h-4 w-4 fill-current" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-medium">{streakInfo.text}</span>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {stats.first_match_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Primer partido: {formatDate(stats.first_match_date)}</span>
                </div>
              )}
              {stats.last_match_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Último: {formatDate(stats.last_match_date)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

