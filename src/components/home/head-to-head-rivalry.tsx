'use client'

import { HeadToHeadStatsComponent } from '@/components/player/head-to-head-stats'
import { useCurrentPlayer, useMostFrequentOpponent, useHeadToHeadStats } from '@/lib/react-query/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Swords } from 'lucide-react'
import Link from 'next/link'

export function HeadToHeadRivalry() {
  const { data: currentPlayerId, isLoading: isLoadingPlayer } = useCurrentPlayer()
  const { data: opponent, isLoading: isLoadingOpponent } = useMostFrequentOpponent(currentPlayerId)
  const { data: stats } = useHeadToHeadStats(
    opponent?.playerId || null,
    currentPlayerId
  )

  // Only show skeleton if we don't have data yet (first load)
  const loading = (isLoadingPlayer && !currentPlayerId) || (isLoadingOpponent && !opponent)

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

  // Si no hay datos, mostrar estado vacío
  if (!currentPlayerId || !opponent) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Swords className="h-4 w-4" />
              Rivalidad Principal
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Swords className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No hay partidos registrados
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registrá partidos para ver tus rivalidades
            </p>
          </div>
        </CardContent>
      </Card>
    )
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
            className="text-sm text-secondary hover:underline font-medium"
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
          initialStats={stats || undefined}
        />
      </CardContent>
    </Card>
  )
}

