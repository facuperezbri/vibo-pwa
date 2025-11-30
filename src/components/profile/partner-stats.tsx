'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { PartnerStats } from '@/types/database'
import { Users, Trophy, TrendingUp, TrendingDown, Loader2, Calendar, Flame } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PartnerStatsProps {
  playerId: string | null
}

export function PartnerStatsComponent({ playerId }: PartnerStatsProps) {
  const [stats, setStats] = useState<PartnerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadPartnerStats() {
      if (!playerId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_player_partner_stats',
          {
            target_player_id: playerId,
          }
        )

        if (rpcError) {
          console.error('Error fetching partner stats:', rpcError)
          setError('Error al cargar estadísticas de pareja')
          setStats([])
        } else {
          setStats(data || [])
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Error inesperado al cargar estadísticas')
        setStats([])
      } finally {
        setLoading(false)
      }
    }

    loadPartnerStats()
  }, [playerId, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Química de Pareja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
            <Users className="h-4 w-4" />
            Química de Pareja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Química de Pareja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no has jugado partidos con compañeros registrados.
          </p>
        </CardContent>
      </Card>
    )
  }

  function formatDate(dateString: string): string {
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
    if (streak > 0) {
      return {
        text: `${streak} victoria${streak > 1 ? 's' : ''}`,
        color: 'text-green-600',
        icon: 'flame'
      }
    } else if (streak < 0) {
      return {
        text: `${Math.abs(streak)} derrota${Math.abs(streak) > 1 ? 's' : ''}`,
        color: 'text-red-600',
        icon: 'trending-down'
      }
    } else {
      return {
        text: 'Sin racha',
        color: 'text-muted-foreground',
        icon: 'trending-down'
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Química de Pareja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map((stat) => {
          const streakInfo = formatStreak(stat.current_streak)
          return (
            <div
              key={stat.partner_id}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
              <PlayerAvatar
                name={stat.partner_name}
                avatarUrl={stat.partner_avatar_url}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{stat.partner_name}</p>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {stat.total_matches} partidos
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Trophy className="h-3 w-3 text-green-600" />
                      <span className="font-medium text-green-600">
                        {stat.won_matches}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-red-600">{stat.lost_matches}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Último: {formatDate(stat.last_match_date)}</span>
                    </div>
                    {stat.current_streak !== 0 && (
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
                    {stat.win_rate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">victorias</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

