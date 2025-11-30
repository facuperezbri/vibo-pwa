'use client'

import { PartnerStatsComponent } from '@/components/profile/partner-stats'

interface PartnerChemistryContentProps {
  playerId: string | null
}

export function PartnerChemistryContent({ playerId }: PartnerChemistryContentProps) {
  return (
    <div className="space-y-6 p-4">
      <PartnerStatsComponent playerId={playerId} />
    </div>
  )
}

