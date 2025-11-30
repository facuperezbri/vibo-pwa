'use client'

import { HeadToHeadList } from '@/components/player/head-to-head-list'

interface HeadToHeadContentProps {
  playerId: string | null
}

export function HeadToHeadContent({ playerId }: HeadToHeadContentProps) {
  return (
    <div className="space-y-6">
      <HeadToHeadList currentPlayerId={playerId} />
    </div>
  )
}

