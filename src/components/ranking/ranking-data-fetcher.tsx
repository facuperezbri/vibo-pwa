'use client'

import { RankingContent } from './ranking-content'
import { useRanking } from '@/lib/react-query/hooks'
import { PadelBallLoader } from '@/components/ui/padel-ball-loader'

export function RankingContentWrapper() {
  const { data, isLoading, error, isFetching } = useRanking()

  // Only show skeleton if we don't have data yet (first load)
  const shouldShowSkeleton = isLoading && !data

  if (shouldShowSkeleton) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <PadelBallLoader size="lg" />
      </div>
    )
  }

  if (error) {
    console.error('Error loading ranking:', error)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Error al cargar el ranking</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
      </div>
    )
  }

  // Show ranking even if currentUserId is null (for public viewing)
  return <RankingContent rankings={data.rankings} currentUserId={data.currentUserId} />
}

