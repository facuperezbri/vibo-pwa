'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePartnerStats } from '@/lib/react-query/hooks'
import { PartnerStats } from '@/types/database'
import { Users, Trophy, TrendingUp, TrendingDown, Calendar, Flame } from 'lucide-react'
import { useMemo } from 'react'
import Link from 'next/link'

interface PartnerStatsProps {
  playerId: string | null
  filterPartnerId?: string | null
  limit?: number
  showViewAllLink?: boolean
  initialLoading?: boolean
}

export function PartnerStatsComponent({ playerId, filterPartnerId, limit, showViewAllLink, initialLoading = false }: PartnerStatsProps) {
  const { data: allStats = [], isLoading, error: queryError } = usePartnerStats(playerId)

  // Filter and limit stats
  const stats = useMemo(() => {
    let filteredData: PartnerStats[] = allStats
    
    // Filter to show only stats with specific partner if filterPartnerId is provided
    if (filterPartnerId) {
      filteredData = filteredData.filter((stat: PartnerStats) => stat.partner_id === filterPartnerId)
    }
    
    // Apply limit if provided
    if (limit && limit > 0) {
      filteredData = filteredData.slice(0, limit)
    }
    
    return filteredData
  }, [allStats, filterPartnerId, limit])

  // Only show skeleton if we don't have data yet (first load)
  const loading = (isLoading && allStats.length === 0) || (initialLoading && allStats.length === 0)
  const error = queryError ? 'Error al cargar estadísticas de pareja' : null

  if (loading) {
    const skeletonCount = limit && limit > 0 ? limit : 3
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Química de Pareja
            </CardTitle>
            {showViewAllLink && (
              <Skeleton className="h-4 w-16" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
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
          ))}
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {filterPartnerId ? 'Química conmigo' : 'Química de Pareja'}
            </CardTitle>
            {showViewAllLink && (
              <Link
                href="/partner-chemistry"
                className="text-sm text-secondary hover:underline font-medium"
              >
                Ver todos
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No hay partidos registrados
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registrá partidos para ver tu química de pareja
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) {
      return 'N/A'
    }
    
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A'
    }
    
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Química de Pareja
          </CardTitle>
          {showViewAllLink && (
            <Link
              href="/partner-chemistry"
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map((stat) => {
          const streakInfo = formatStreak(stat.current_streak)
          return (
            <Link
              key={stat.partner_id}
              href={`/player/${stat.partner_id}`}
              className="block"
            >
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted cursor-pointer">
              <PlayerAvatar
                name={stat.partner_name}
                avatarUrl={stat.partner_avatar_url}
                size="md"
                className="ring-2 ring-background"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{stat.partner_name}</p>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs pl-0 border-0 bg-transparent">
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
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

